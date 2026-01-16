import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/lib/db";
import { flows, webhookLogs, deliveryAttempts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyWebhookSignature, createSignatureHeader } from "@/lib/security/hmac";
import { rateLimitByIp, rateLimitByFlow, getRateLimitHeaders } from "@/lib/security/rate-limit";
import { publishFlowEvent } from "@/lib/events";

// Helper to extract inbound routes from flow config
function extractInboundPaths(config: any): string[] {
    if (!config?.nodes) return [];
    return config.nodes
        .filter((n: any) => n.type === 'inbound')
        .map((n: any) => (n.data?.path as string) || (n.data?.route as string) || '')
        .filter(Boolean);
}

// Helper to extract outbound destinations from flow config
function extractOutboundDestinations(config: any): Array<{ id: string; url: string; isActive: boolean }> {
    if (!config?.nodes) return [];
    return config.nodes
        .filter((n: any) => n.type === 'outbound')
        .map((n: any) => ({
            id: n.id,
            url: (n.data?.url as string) || (n.data?.route as string) || '',
            isActive: true, // All nodes on canvas are considered active
        }))
        .filter((d: any) => d.url);
}

// Helper to get allowed IPs for a specific inbound path
function getInboundAllowedIps(config: any, path: string): string[] | null {
    if (!config?.nodes) return null;
    const inboundNode = config.nodes.find(
        (n: any) => n.type === 'inbound' &&
            ((n.data?.path as string) === path || (n.data?.route as string) === path)
    );
    const allowedIps = inboundNode?.data?.allowedIps;
    if (!allowedIps || !Array.isArray(allowedIps) || allowedIps.length === 0) {
        return null; // No restriction
    }
    return allowedIps;
}

// Helper to parse CIDR notation and check if IP is in range
function isIpInCidr(ip: string, cidr: string): boolean {
    try {
        const [range, bits] = cidr.split('/');
        const mask = parseInt(bits, 10);
        if (isNaN(mask) || mask < 0 || mask > 32) return false;

        const ipToInt = (ipStr: string): number => {
            const parts = ipStr.split('.').map(Number);
            if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return -1;
            return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
        };

        const ipInt = ipToInt(ip);
        const rangeInt = ipToInt(range);
        if (ipInt === -1 || rangeInt === -1) return false;

        const maskBits = mask === 0 ? 0 : (~0 << (32 - mask)) >>> 0;
        return (ipInt & maskBits) === (rangeInt & maskBits);
    } catch {
        return false;
    }
}

// Check if source IP is allowed
function isIpAllowed(ip: string, allowedIps: string[]): boolean {
    // Normalize IP (trim whitespace)
    const normalizedIp = ip.trim();

    return allowedIps.some(allowed => {
        const normalizedAllowed = allowed.trim();
        if (normalizedAllowed.includes('/')) {
            // CIDR notation
            return isIpInCidr(normalizedIp, normalizedAllowed);
        }
        // Exact match
        return normalizedIp === normalizedAllowed;
    });
}

// Find flow by inbound path
async function findFlowByPath(path: string) {
    const allFlows = await db.query.flows.findMany({
        where: eq(flows.isActive, true),
        with: { destinations: true },
    });

    for (const flow of allFlows) {
        const inboundPaths = extractInboundPaths(flow.config);
        if (inboundPaths.includes(path)) {
            return flow;
        }
    }
    return null;
}

// Deliver webhook to a destination (synchronous)
async function deliverToDestination(
    destination: { id: string; url: string; headers: Record<string, string> | null; timeoutMs: number },
    webhookLogId: string,
    flowId: string,
    payload: { method: string; headers: Record<string, string>; body: string | null }
) {
    const attemptId = crypto.randomUUID();
    const startTime = Date.now();

    try {
        const signatureHeader = createSignatureHeader(flowId, payload.body || "");

        const headers: Record<string, string> = {
            ...payload.headers,
            ...(destination.headers || {}),
            "X-Hooki-Signature": signatureHeader,
            "X-Hooki-Delivery-Id": attemptId,
        };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), destination.timeoutMs);

        const response = await fetch(destination.url, {
            method: payload.method,
            headers,
            body: payload.body,
            signal: controller.signal,
        });

        clearTimeout(timeout);

        const responseBody = await response.text();
        const responseTimeMs = Date.now() - startTime;

        await db.insert(deliveryAttempts).values({
            id: attemptId,
            webhookLogId,
            destinationId: null, // Config-based destinations don't have FK
            destinationUrl: destination.url,
            attemptNumber: 1,
            status: response.ok ? "success" : "failed",
            responseStatus: response.status,
            responseBody: responseBody.slice(0, 10000),
            responseTimeMs,
            completedAt: new Date(),
        });

        return { success: response.ok, status: response.status, responseTimeMs, url: destination.url, responseBody };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const responseTimeMs = Date.now() - startTime;

        await db.insert(deliveryAttempts).values({
            id: attemptId,
            webhookLogId,
            destinationId: null,
            destinationUrl: destination.url,
            attemptNumber: 1,
            status: "failed",
            errorMessage,
            responseTimeMs,
            completedAt: new Date(),
        });

        return { success: false, error: errorMessage, responseTimeMs, url: destination.url, responseBody: null };
    }
}

export const Route = createFileRoute("/api/webhook/$")({
    server: {
        handlers: {
            ANY: async ({ request, params }) => {
                const splatPath = (params as any)._splat || '';
                const inboundPath = `/api/webhook/${splatPath}`;
                const startTime = Date.now();

                try {
                    const sourceIp =
                        request.headers.get("x-forwarded-for")?.split(",")[0] ||
                        request.headers.get("cf-connecting-ip") ||
                        "unknown";

                    const ipRateLimit = await rateLimitByIp(sourceIp);
                    if (!ipRateLimit.allowed) {
                        return new Response(
                            JSON.stringify({ error: "Rate limit exceeded" }),
                            { status: 429, headers: { "Content-Type": "application/json", ...getRateLimitHeaders(ipRateLimit) } }
                        );
                    }

                    const flow = await findFlowByPath(inboundPath);
                    if (!flow) {
                        return new Response(
                            JSON.stringify({ error: "No flow configured for this path" }),
                            { status: 404, headers: { "Content-Type": "application/json" } }
                        );
                    }

                    const flowRateLimit = await rateLimitByFlow(flow.id, flow.rateLimitPerMinute ?? 1000);
                    if (!flowRateLimit.allowed) {
                        return new Response(
                            JSON.stringify({ error: "Flow rate limit exceeded" }),
                            { status: 429, headers: { "Content-Type": "application/json", ...getRateLimitHeaders(flowRateLimit) } }
                        );
                    }

                    // Check IP whitelist for this inbound path
                    const allowedIps = getInboundAllowedIps(flow.config, inboundPath);
                    if (allowedIps && !isIpAllowed(sourceIp, allowedIps)) {
                        return new Response(
                            JSON.stringify({ error: "IP not allowed", sourceIp }),
                            { status: 403, headers: { "Content-Type": "application/json" } }
                        );
                    }

                    const body = await request.text();

                    // Verify signature if required
                    if (flow.requireSignature) {
                        const signature = request.headers.get("x-hooki-signature");
                        const verification = verifyWebhookSignature(flow.signingSecret, signature, body);
                        if (!verification.valid) {
                            return new Response(
                                JSON.stringify({ error: verification.error }),
                                { status: 401, headers: { "Content-Type": "application/json" } }
                            );
                        }
                    }

                    // Create webhook log
                    const logId = crypto.randomUUID();
                    const reqHeaders: Record<string, string> = {};
                    request.headers.forEach((value, key) => {
                        if (!["authorization", "cookie", "x-hooki-signature"].includes(key.toLowerCase())) {
                            reqHeaders[key] = value;
                        }
                    });

                    await db.insert(webhookLogs).values({
                        id: logId,
                        flowId: flow.id,
                        method: request.method,
                        path: inboundPath,
                        headers: reqHeaders,
                        body: body || null,
                        sourceIp,
                        status: "processing",
                    });

                    await publishFlowEvent(flow.id, {
                        type: "log:created",
                        flowId: flow.id,
                        log: { id: logId, flowId: flow.id, method: request.method, path: inboundPath, sourceIp, status: "processing", receivedAt: new Date().toISOString() },
                    });

                    // Deliver synchronously to all destinations from flow config
                    const outboundDestinations = extractOutboundDestinations(flow.config);
                    const deliveryResults = [];

                    for (const destination of outboundDestinations) {
                        const result = await deliverToDestination(
                            { ...destination, headers: null, timeoutMs: 30000 },
                            logId,
                            flow.id,
                            { method: request.method, headers: reqHeaders, body: body || null }
                        );
                        deliveryResults.push({ destinationId: destination.id, ...result });
                    }

                    // Update log status
                    const allSucceeded = deliveryResults.every((r) => r.success);
                    const finalStatus = outboundDestinations.length === 0 ? "completed" : allSucceeded ? "completed" : "failed";

                    await db.update(webhookLogs)
                        .set({ status: finalStatus, completedAt: new Date() })
                        .where(eq(webhookLogs.id, logId));

                    const processingTimeMs = Date.now() - startTime;

                    // In sync mode (default), return the first outbound response directly
                    if (!flow.asyncMode && deliveryResults.length > 0) {
                        const firstResult = deliveryResults[0];
                        // Pass through the outbound response status and body
                        return new Response(
                            firstResult.responseBody || JSON.stringify({
                                success: firstResult.success,
                                error: firstResult.error,
                                processingTimeMs
                            }),
                            {
                                status: firstResult.status || (firstResult.success ? 200 : 502),
                                headers: {
                                    "Content-Type": "application/json",
                                    "X-Hooki-Log-Id": logId,
                                    "X-Hooki-Mode": "sync"
                                }
                            }
                        );
                    }

                    // Async mode or no destinations
                    return new Response(
                        JSON.stringify({ success: true, logId, deliveries: deliveryResults.length, allSucceeded, processingTimeMs }),
                        { status: 200, headers: { "Content-Type": "application/json", "X-Hooki-Log-Id": logId, "X-Hooki-Mode": "async" } }
                    );
                } catch (error) {
                    console.error("[Webhook Ingress] Error:", error);
                    return new Response(
                        JSON.stringify({ error: "Internal server error" }),
                        { status: 500, headers: { "Content-Type": "application/json" } }
                    );
                }
            },
        },
    },
});
