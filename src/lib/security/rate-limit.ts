import { redis } from "../redis";

interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: number;
    retryAfter?: number;
}

/**
 * Check rate limit using Redis sliding window
 */
export async function checkRateLimit(
    key: string,
    limit: number,
    windowMs: number
): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - windowMs;
    const redisKey = `ratelimit:${key}`;

    // Use Redis pipeline for atomic operations
    const pipeline = redis.pipeline();

    // Remove old entries outside the window
    pipeline.zremrangebyscore(redisKey, 0, windowStart);

    // Count current entries in window
    pipeline.zcard(redisKey);

    // Add current request
    pipeline.zadd(redisKey, now, `${now}:${Math.random()}`);

    // Set expiry
    pipeline.pexpire(redisKey, windowMs);

    const results = await pipeline.exec();

    // Get count before adding current request
    const count = (results?.[1]?.[1] as number) || 0;

    const allowed = count < limit;
    const remaining = Math.max(0, limit - count - 1);
    const resetAt = now + windowMs;

    if (!allowed) {
        return {
            allowed: false,
            remaining: 0,
            resetAt,
            retryAfter: Math.ceil(windowMs / 1000),
        };
    }

    return { allowed, remaining, resetAt };
}

/**
 * Rate limit by IP address
 */
export async function rateLimitByIp(
    ip: string,
    limit: number = 100,
    windowMs: number = 60000
): Promise<RateLimitResult> {
    return checkRateLimit(`ip:${ip}`, limit, windowMs);
}

/**
 * Rate limit by flow ID
 */
export async function rateLimitByFlow(
    flowId: string,
    limit: number = 1000,
    windowMs: number = 60000
): Promise<RateLimitResult> {
    return checkRateLimit(`flow:${flowId}`, limit, windowMs);
}

/**
 * Create rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
    const headers: Record<string, string> = {
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": result.resetAt.toString(),
    };

    if (result.retryAfter) {
        headers["Retry-After"] = result.retryAfter.toString();
    }

    return headers;
}
