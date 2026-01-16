import { z } from "zod";
import { protectedProcedure } from "../middleware";
import { pub } from "../os";
import { db } from "@/lib/db";
import { webhookLogs, flows } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { subscribeToFlowEvents } from "@/lib/events";

export const streamsRouter = pub.router({
    // Real-time log stream for a flow
    flowLogs: protectedProcedure
        .input(z.object({ flowId: z.string() }))
        .handler(async function* ({ context, input }) {
            // Verify ownership
            const flow = await db.query.flows.findFirst({
                where: eq(flows.id, input.flowId),
                with: { project: true },
            });

            if (!flow || flow.project.userId !== context.user.id) {
                throw new Error("Flow not found");
            }

            // Late subscriber protection - send recent logs first
            const recentLogs = await db.query.webhookLogs.findMany({
                where: eq(webhookLogs.flowId, input.flowId),
                orderBy: [desc(webhookLogs.receivedAt)],
                limit: 20,
            });

            // Send recent logs in chronological order (oldest first)
            for (const log of recentLogs.reverse()) {
                yield {
                    type: "log:created" as const,
                    flowId: input.flowId,
                    log: {
                        id: log.id,
                        flowId: log.flowId,
                        method: log.method,
                        path: log.path,
                        sourceIp: log.sourceIp,
                        status: log.status,
                        receivedAt: log.receivedAt.toISOString(),
                    },
                };
            }

            // Subscribe to live events with heartbeat
            const eventGenerator = subscribeToFlowEvents(input.flowId);
            const iterator = eventGenerator[Symbol.asyncIterator]();

            try {
                while (true) {
                    // Race between next event and heartbeat timeout
                    const result = await Promise.race([
                        iterator.next(),
                        new Promise<{ heartbeat: true }>((resolve) =>
                            setTimeout(() => resolve({ heartbeat: true }), 15000)
                        ),
                    ]);

                    if ("heartbeat" in result) {
                        // Send heartbeat to keep connection alive
                        yield { type: "heartbeat" as const, timestamp: Date.now() };
                        continue;
                    }

                    if (result.done) break;
                    yield result.value;
                }
            } finally {
                await iterator.return?.(undefined as never);
            }
        }),

    // Real-time delivery status for a specific log entry
    deliveryStatus: protectedProcedure
        .input(z.object({ flowId: z.string(), logId: z.string() }))
        .handler(async function* ({ context, input }) {
            // Verify ownership
            const flow = await db.query.flows.findFirst({
                where: eq(flows.id, input.flowId),
                with: { project: true },
            });

            if (!flow || flow.project.userId !== context.user.id) {
                throw new Error("Flow not found");
            }

            // Subscribe to flow events but filter for this log
            const eventGenerator = subscribeToFlowEvents(input.flowId);

            for await (const event of eventGenerator) {
                // Only yield events for this specific log
                if (
                    (event.type === "delivery:started" ||
                        event.type === "delivery:completed" ||
                        event.type === "delivery:failed") &&
                    event.logId === input.logId
                ) {
                    yield event;
                }
            }
        }),
});
