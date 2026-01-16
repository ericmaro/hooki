import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/lib/db";
import { flows, webhookLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyWebhookSignature } from "@/lib/security/hmac";
import { rateLimitByIp, rateLimitByFlow, getRateLimitHeaders } from "@/lib/security/rate-limit";
import { webhookDeliveryQueue } from "@/lib/queue";
import { publishFlowEvent } from "@/lib/events";

export const Route = createFileRoute("/api/webhook/$flowId")({
    server: {
        handlers: {
            ANY: async ({ request, params }) => {
                const { flowId } = params;
                const startTime = Date.now();

                try {
                    // Get client IP
                    const sourceIp =
                        request.headers.get("x-forwarded-for")?.split(",")[0] ||
                        request.headers.get("cf-connecting-ip") ||
                        "unknown";

                    // Rate limit by IP
                    const ipRateLimit = await rateLimitByIp(sourceIp);
                    if (!ipRateLimit.allowed) {
                        return new Response(
                            JSON.stringify({ error: "Rate limit exceeded" }),
                            {
                                status: 429,
                                headers: {
                                    "Content-Type": "application/json",
                                    ...getRateLimitHeaders(ipRateLimit),
                                },
                            }
                        );
                    }

                    // Look up flow
                    const flow = await db.query.flows.findFirst({
                        where: eq(flows.id, flowId),
                        with: { destinations: true },
                    });

                    if (!flow) {
                        return new Response(JSON.stringify({ error: "Flow not found" }), {
                            status: 404,
                            headers: { "Content-Type": "application/json" },
                        });
                    }

                    if (!flow.isActive) {
                        return new Response(JSON.stringify({ error: "Flow is inactive" }), {
                            status: 503,
                            headers: { "Content-Type": "application/json" },
                        });
                    }

                    // Rate limit by flow
                    const flowRateLimit = await rateLimitByFlow(
                        flowId,
                        flow.rateLimitPerMinute ?? 1000
                    );
                    if (!flowRateLimit.allowed) {
                        return new Response(
                            JSON.stringify({ error: "Flow rate limit exceeded" }),
                            {
                                status: 429,
                                headers: {
                                    "Content-Type": "application/json",
                                    ...getRateLimitHeaders(flowRateLimit),
                                },
                            }
                        );
                    }

                    // Get request body
                    const body = await request.text();

                    // Verify HMAC signature
                    const signature = request.headers.get("x-hookio-signature");
                    const verification = verifyWebhookSignature(
                        flow.signingSecret,
                        signature,
                        body
                    );

                    if (!verification.valid) {
                        return new Response(
                            JSON.stringify({ error: verification.error }),
                            {
                                status: 401,
                                headers: { "Content-Type": "application/json" },
                            }
                        );
                    }

                    // Create webhook log
                    const logId = crypto.randomUUID();
                    const url = new URL(request.url);
                    const headers: Record<string, string> = {};
                    request.headers.forEach((value, key) => {
                        // Exclude sensitive headers
                        if (!["authorization", "cookie", "x-hookio-signature"].includes(key.toLowerCase())) {
                            headers[key] = value;
                        }
                    });

                    await db.insert(webhookLogs).values({
                        id: logId,
                        flowId,
                        method: request.method,
                        path: url.pathname + url.search,
                        headers,
                        body: body || null,
                        sourceIp,
                        status: "processing",
                    });

                    // Publish log created event (real-time UI update)
                    await publishFlowEvent(flowId, {
                        type: "log:created",
                        flowId,
                        log: {
                            id: logId,
                            flowId,
                            method: request.method,
                            path: url.pathname,
                            sourceIp,
                            status: "processing",
                            receivedAt: new Date().toISOString(),
                        },
                    });

                    // Queue delivery to all active destinations
                    const activeDestinations = flow.destinations.filter((d) => d.isActive);

                    for (const destination of activeDestinations) {
                        await webhookDeliveryQueue.add(
                            `${logId}-${destination.id}`,
                            {
                                webhookLogId: logId,
                                destinationId: destination.id,
                                flowId,
                                destination: {
                                    url: destination.url,
                                    headers: destination.headers ?? undefined,
                                    timeoutMs: destination.timeoutMs,
                                },
                                payload: {
                                    method: request.method,
                                    headers,
                                    body: body || null,
                                },
                            },
                            { attempts: destination.maxRetries }
                        );
                    }

                    const processingTimeMs = Date.now() - startTime;

                    return new Response(
                        JSON.stringify({
                            success: true,
                            logId,
                            queuedDestinations: activeDestinations.length,
                            processingTimeMs,
                        }),
                        {
                            status: 200,
                            headers: {
                                "Content-Type": "application/json",
                                "X-Hookio-Log-Id": logId,
                            },
                        }
                    );
                } catch (error) {
                    console.error("[Webhook Ingress] Error:", error);
                    return new Response(
                        JSON.stringify({ error: "Internal server error" }),
                        {
                            status: 500,
                            headers: { "Content-Type": "application/json" },
                        }
                    );
                }
            },
        },
    },
});
