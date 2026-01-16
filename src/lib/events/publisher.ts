import { redisPub, redisSub } from "../redis";

// Event types for real-time updates
export type HookiEvent =
    | { type: "log:created"; flowId: string; log: WebhookLogEvent }
    | { type: "delivery:started"; logId: string; destinationId: string }
    | { type: "delivery:completed"; logId: string; attempt: DeliveryAttemptEvent }
    | { type: "delivery:failed"; logId: string; attempt: DeliveryAttemptEvent };

export interface WebhookLogEvent {
    id: string;
    flowId: string;
    method: string;
    path: string;
    sourceIp: string | null;
    status: string;
    receivedAt: string;
}

export interface DeliveryAttemptEvent {
    id: string;
    webhookLogId: string;
    destinationId: string;
    attemptNumber: number;
    status: string;
    responseStatus?: number;
    responseTimeMs?: number;
    errorMessage?: string;
}

const CHANNEL_PREFIX = "hooki:events:";

/**
 * Publish event to Redis channel
 */
export async function publishEvent(
    channel: string,
    event: HookiEvent
): Promise<void> {
    await redisPub.publish(
        `${CHANNEL_PREFIX}${channel}`,
        JSON.stringify(event)
    );
}

/**
 * Publish event for a specific flow
 */
export async function publishFlowEvent(
    flowId: string,
    event: HookiEvent
): Promise<void> {
    await publishEvent(`flow:${flowId}`, event);
}

/**
 * Subscribe to events for a channel
 */
export async function* subscribeToEvents(
    channel: string,
    signal?: AbortSignal
): AsyncGenerator<HookiEvent> {
    const fullChannel = `${CHANNEL_PREFIX}${channel}`;

    // Create a message queue for this subscription
    const messageQueue: HookiEvent[] = [];
    let resolver: ((value: HookiEvent) => void) | null = null;
    let isAborted = false;

    // Handle abort signal
    if (signal) {
        signal.addEventListener("abort", () => {
            isAborted = true;
            redisSub.unsubscribe(fullChannel);
        });
    }

    // Subscribe to channel
    await redisSub.subscribe(fullChannel);

    // Message handler
    const messageHandler = (ch: string, message: string) => {
        if (ch !== fullChannel) return;

        try {
            const event = JSON.parse(message) as HookiEvent;

            if (resolver) {
                resolver(event);
                resolver = null;
            } else {
                messageQueue.push(event);
            }
        } catch {
            // Invalid message, ignore
        }
    };

    redisSub.on("message", messageHandler);

    try {
        while (!isAborted) {
            // Check if there's a queued message
            if (messageQueue.length > 0) {
                yield messageQueue.shift()!;
                continue;
            }

            // Wait for next message or heartbeat timeout
            const event = await Promise.race([
                new Promise<HookiEvent>((resolve) => {
                    resolver = resolve;
                }),
                new Promise<null>((resolve) =>
                    setTimeout(() => resolve(null), 15000)
                ),
            ]);

            if (event) {
                yield event;
            }
            // If null (timeout), loop continues for heartbeat
        }
    } finally {
        redisSub.off("message", messageHandler);
        await redisSub.unsubscribe(fullChannel);
    }
}

/**
 * Subscribe to events for a specific flow
 */
export function subscribeToFlowEvents(
    flowId: string,
    signal?: AbortSignal
): AsyncGenerator<HookiEvent> {
    return subscribeToEvents(`flow:${flowId}`, signal);
}
