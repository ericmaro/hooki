import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

// Singleton Redis connection for BullMQ and Pub/Sub
export const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Required for BullMQ
});

// Separate connection for pub/sub (Redis requires separate connections)
export const redisSub = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
});

export const redisPub = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
});
