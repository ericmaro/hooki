import { URL } from "url";

// Private/internal IP ranges to block
const BLOCKED_IP_RANGES = [
    // Loopback
    /^127\./,
    /^::1$/,
    /^localhost$/i,
    // Private networks (RFC 1918)
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    // Link-local
    /^169\.254\./,
    /^fe80:/i,
    // Cloud metadata endpoints
    /^169\.254\.169\.254$/,
    /^metadata\.google\.internal$/i,
    /^metadata\.aws$/i,
];

// Blocked hostnames (cloud metadata services)
const BLOCKED_HOSTNAMES = [
    "metadata.google.internal",
    "metadata.goog",
    "169.254.169.254",
    "instance-data",
    "metadata.aws",
];

/**
 * Check if a URL points to a private/internal address (SSRF protection)
 */
export function isPrivateUrl(urlString: string): boolean {
    try {
        const url = new URL(urlString);
        const hostname = url.hostname.toLowerCase();

        // Check blocked hostnames
        if (BLOCKED_HOSTNAMES.some((blocked) => hostname.includes(blocked))) {
            return true;
        }

        // Check IP pattern matches
        for (const pattern of BLOCKED_IP_RANGES) {
            if (pattern.test(hostname)) {
                return true;
            }
        }

        return false;
    } catch {
        // Invalid URL
        return true;
    }
}

/**
 * Validate destination URL for security
 */
export function validateDestinationUrl(urlString: string): {
    valid: boolean;
    error?: string;
} {
    try {
        const url = new URL(urlString);

        // Only allow HTTPS in production (HTTP allowed for localhost dev)
        if (url.protocol !== "https:" && url.protocol !== "http:") {
            return { valid: false, error: "Only HTTP(S) protocols allowed" };
        }

        // Block private/internal IPs
        if (isPrivateUrl(urlString)) {
            return {
                valid: false,
                error: "Private/internal addresses not allowed (SSRF protection)",
            };
        }

        // Block file:// and other dangerous protocols
        if (!["http:", "https:"].includes(url.protocol)) {
            return { valid: false, error: "Invalid protocol" };
        }

        return { valid: true };
    } catch {
        return { valid: false, error: "Invalid URL format" };
    }
}

/**
 * Sanitize URL for logging (remove sensitive parts)
 */
export function sanitizeUrlForLogging(urlString: string): string {
    try {
        const url = new URL(urlString);
        // Remove auth info
        url.username = "";
        url.password = "";
        return url.toString();
    } catch {
        return "[invalid-url]";
    }
}
