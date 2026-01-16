import { Queue, QueueEvents } from "bullmq";
import { redis } from "../redis";

// Webhook delivery queue
export const webhookDeliveryQueue = new Queue("webhook-delivery", {
    connection: redis,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 1000,
        },
        removeOnComplete: {
            age: 3600 * 24, // 24 hours
            count: 1000,
        },
        removeOnFail: {
            age: 3600 * 24 * 7, // 7 days
        },
    },
});

// Queue events for real-time monitoring
export const webhookQueueEvents = new QueueEvents("webhook-delivery", {
    connection: redis,
});

// Job data types
export interface WebhookDeliveryJob {
    webhookLogId: string;
    destinationId: string;
    flowId: string;
    destination: {
        url: string;
        headers?: Record<string, string>;
        timeoutMs: number;
    };
    payload: {
        method: string;
        headers: Record<string, string>;
        body: string | null;
    };
}
