import { z } from "zod";
import { protectedProcedure } from "../middleware";
import { pub } from "../os";
import { db } from "@/lib/db";
import { webhookLogs, flows } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { webhookDeliveryQueue } from "@/lib/queue";

export const logsRouter = pub.router({
    list: protectedProcedure
        .input(
            z.object({
                flowId: z.string(),
                limit: z.number().min(1).max(100).optional().default(50),
                offset: z.number().min(0).optional().default(0),
            })
        )
        .handler(async ({ context, input }) => {
            // Verify ownership
            const flow = await db.query.flows.findFirst({
                where: eq(flows.id, input.flowId),
                with: { project: true },
            });

            if (!flow || flow.project.userId !== context.user.id) {
                throw new Error("Flow not found");
            }

            const logs = await db.query.webhookLogs.findMany({
                where: eq(webhookLogs.flowId, input.flowId),
                orderBy: [desc(webhookLogs.receivedAt)],
                limit: input.limit,
                offset: input.offset,
                with: {
                    deliveryAttempts: {
                        with: { destination: true }
                    }
                },
            });

            return logs;
        }),

    get: protectedProcedure
        .input(z.object({ id: z.string() }))
        .handler(async ({ context, input }) => {
            const log = await db.query.webhookLogs.findFirst({
                where: eq(webhookLogs.id, input.id),
                with: {
                    flow: { with: { project: true } },
                    deliveryAttempts: { with: { destination: true } },
                },
            });

            if (!log || log.flow.project.userId !== context.user.id) {
                throw new Error("Log not found");
            }

            return log;
        }),

    // Replay a webhook - re-queue delivery to all destinations
    replay: protectedProcedure
        .input(z.object({ id: z.string() }))
        .handler(async ({ context, input }) => {
            const log = await db.query.webhookLogs.findFirst({
                where: eq(webhookLogs.id, input.id),
                with: {
                    flow: { with: { project: true, destinations: true } },
                },
            });

            if (!log || log.flow.project.userId !== context.user.id) {
                throw new Error("Log not found");
            }

            // Queue delivery to all active destinations
            const activeDestinations = log.flow.destinations.filter((d) => d.isActive);

            for (const destination of activeDestinations) {
                await webhookDeliveryQueue.add(
                    `replay-${log.id}-${destination.id}`,
                    {
                        webhookLogId: log.id,
                        destinationId: destination.id,
                        flowId: log.flowId,
                        destination: {
                            url: destination.url,
                            headers: destination.headers ?? undefined,
                            timeoutMs: destination.timeoutMs,
                        },
                        payload: {
                            method: log.method,
                            headers: (log.headers as Record<string, string>) ?? {},
                            body: log.body,
                        },
                    },
                    { attempts: destination.maxRetries }
                );
            }

            return { success: true, queuedCount: activeDestinations.length };
        }),
});
