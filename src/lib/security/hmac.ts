import { createHmac, timingSafeEqual } from "crypto";

/**
 * Generate a new signing secret for a flow
 */
export function generateSigningSecret(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

/**
 * Create HMAC-SHA256 signature for a payload
 */
export function createSignature(secret: string, payload: string): string {
    return createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Verify webhook signature
 * Header format: sha256=<signature>
 */
export function verifyWebhookSignature(
    secret: string,
    signature: string | null,
    body: string,
    maxAgeMs: number = 5 * 60 * 1000 // 5 minutes
): { valid: boolean; error?: string } {
    if (!signature) {
        return { valid: false, error: "Missing signature header" };
    }

    // Parse signature header
    const parts = signature.split(",");
    let timestamp: number | null = null;
    let sig: string | null = null;

    for (const part of parts) {
        const [key, value] = part.split("=");
        if (key === "t") timestamp = parseInt(value, 10);
        if (key === "v1") sig = value;
    }

    if (!timestamp || !sig) {
        return { valid: false, error: "Invalid signature format" };
    }

    // Check timestamp freshness (replay attack prevention)
    const now = Date.now();
    if (now - timestamp > maxAgeMs) {
        return { valid: false, error: "Signature expired (replay attack prevention)" };
    }

    // Compute expected signature
    const signedPayload = `${timestamp}.${body}`;
    const expectedSignature = createSignature(secret, signedPayload);

    // Timing-safe comparison
    const sigBuffer = Buffer.from(sig, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (sigBuffer.length !== expectedBuffer.length) {
        return { valid: false, error: "Invalid signature" };
    }

    if (!timingSafeEqual(sigBuffer, expectedBuffer)) {
        return { valid: false, error: "Invalid signature" };
    }

    return { valid: true };
}

/**
 * Create signature header for outbound webhooks
 */
export function createSignatureHeader(secret: string, body: string): string {
    const timestamp = Date.now();
    const signedPayload = `${timestamp}.${body}`;
    const signature = createSignature(secret, signedPayload);
    return `t=${timestamp},v1=${signature}`;
}
