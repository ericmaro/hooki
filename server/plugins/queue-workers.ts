import { createWebhookWorker } from "../../src/lib/queue/workers";

let worker: ReturnType<typeof createWebhookWorker> | null = null;

export default async function startQueueWorkers() {
    if (worker) {
        console.log("[Queue] Workers already running");
        return;
    }

    console.log("[Queue] Starting webhook delivery worker...");
    worker = createWebhookWorker();
    console.log("[Queue] Webhook delivery worker started");
}

// Auto-start in non-browser environment
if (typeof window === "undefined") {
    startQueueWorkers().catch(console.error);
}
