import { Worker, Job } from "bullmq";
import { redis } from "../redis";
import { db } from "../db";
import { deliveryAttempts, webhookLogs } from "../db/schema";
import { eq } from "drizzle-orm";
import { publishFlowEvent } from "../events/publisher";
import { createSignatureHeader } from "../security/hmac";
import type { WebhookDeliveryJob } from "./index";

// Create webhook delivery worker
export function createWebhookWorker() {
    const worker = new Worker<WebhookDeliveryJob>(
        "webhook-delivery",
        async (job: Job<WebhookDeliveryJob>) => {
            const { webhookLogId, destinationId, flowId, destination, payload } =
                job.data;

            const attemptId = crypto.randomUUID();
            const startTime = Date.now();

            // Publish delivery started event
            await publishFlowEvent(flowId, {
                type: "delivery:started",
                logId: webhookLogId,
                destinationId,
            });

            try {
                // Create signature header for outbound webhook
                const signatureHeader = createSignatureHeader(
                    job.data.flowId, // Using flowId as signing key for now
                    payload.body || ""
                );

                // Prepare headers
                const headers: Record<string, string> = {
                    ...payload.headers,
                    ...destination.headers,
                    "X-Hooki-Signature": signatureHeader,
                    "X-Hooki-Delivery-Id": attemptId,
                };

                // Make the HTTP request
                const controller = new AbortController();
                const timeout = setTimeout(
                    () => controller.abort(),
                    destination.timeoutMs
                );

                const response = await fetch(destination.url, {
                    method: payload.method,
                    headers,
                    body: payload.body,
                    signal: controller.signal,
                });

                clearTimeout(timeout);

                const responseBody = await response.text();
                const responseTimeMs = Date.now() - startTime;

                // Record successful attempt
                await db.insert(deliveryAttempts).values({
                    id: attemptId,
                    webhookLogId,
                    destinationId,
                    attemptNumber: job.attemptsMade + 1,
                    status: response.ok ? "success" : "failed",
                    responseStatus: response.status,
                    responseBody: responseBody.slice(0, 10000), // Limit size
                    responseTimeMs,
                    completedAt: new Date(),
                });

                // Publish completion event
                await publishFlowEvent(flowId, {
                    type: "delivery:completed",
                    logId: webhookLogId,
                    attempt: {
                        id: attemptId,
                        webhookLogId,
                        destinationId,
                        attemptNumber: job.attemptsMade + 1,
                        status: response.ok ? "success" : "failed",
                        responseStatus: response.status,
                        responseTimeMs,
                    },
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${responseBody.slice(0, 100)}`);
                }

                // Update parent log status to completed
                await db.update(webhookLogs)
                    .set({ status: "completed", completedAt: new Date() })
                    .where(eq(webhookLogs.id, webhookLogId));

                return { success: true, status: response.status, responseTimeMs };
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : "Unknown error";
                const responseTimeMs = Date.now() - startTime;

                // Record failed attempt
                await db.insert(deliveryAttempts).values({
                    id: attemptId,
                    webhookLogId,
                    destinationId,
                    attemptNumber: job.attemptsMade + 1,
                    status: job.attemptsMade + 1 >= 3 ? "failed" : "retrying",
                    errorMessage,
                    responseTimeMs,
                    completedAt: new Date(),
                });

                // Publish failure event
                await publishFlowEvent(flowId, {
                    type: "delivery:failed",
                    logId: webhookLogId,
                    attempt: {
                        id: attemptId,
                        webhookLogId,
                        destinationId,
                        attemptNumber: job.attemptsMade + 1,
                        status: "failed",
                        responseTimeMs,
                        errorMessage,
                    },
                });

                // If this was the last attempt, mark log as failed
                if (job.attemptsMade + 1 >= 3) {
                    await db.update(webhookLogs)
                        .set({ status: "failed", completedAt: new Date() })
                        .where(eq(webhookLogs.id, webhookLogId));
                }

                throw error; // Will trigger retry
            }
        },
        {
            connection: redis,
            concurrency: 10,
            limiter: {
                max: 100,
                duration: 1000,
            },
        }
    );

    worker.on("completed", (job) => {
        console.log(`[Queue] Job ${job.id} completed`);
    });

    worker.on("failed", (job, err) => {
        console.error(`[Queue] Job ${job?.id} failed:`, err.message);
    });

    return worker;
}
