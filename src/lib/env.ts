import { z } from "zod";

/**
 * Environment variable schema definition for Hooki.
 */
const envSchema = z.object({
    // Core Infrastructure
    DATABASE_URL: z.string().url().optional(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    APP_NAME: z.string().default("Hooki"),

    // Authentication
    BETTER_AUTH_SECRET: z.string().min(10).optional(),
    BETTER_AUTH_URL: z.string().url().optional(),

    // Redis (for BullMQ)
    REDIS_URL: z.string().optional(),
});

// Process and validate environment variables
const processEnv = {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    APP_NAME: process.env.APP_NAME,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    REDIS_URL: process.env.REDIS_URL,
};

const parsed = envSchema.safeParse(processEnv);

if (!parsed.success) {
    console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
}

export const env = parsed.success ? parsed.data : processEnv as z.infer<typeof envSchema>;

/**
 * Helper to check if critical services are configured
 */
export const checkServiceHealth = () => {
    return {
        database: !!env.DATABASE_URL,
        auth: !!(env.BETTER_AUTH_SECRET && env.BETTER_AUTH_URL),
        redis: !!env.REDIS_URL,
    };
};
