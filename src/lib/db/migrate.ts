import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import { env } from "@/lib/env";

/**
 * Run database migrations programmatically.
 * This creates a dedicated connection for migrations and closes it after completion.
 */
export async function runMigrations() {
    const connectionString = env.DATABASE_URL;

    if (!connectionString) {
        console.error("DATABASE_URL is not set, skipping migrations");
        return;
    }

    console.log("🔄 Running database migrations...");

    // Create a dedicated connection for migrations (max 1 connection)
    const migrationClient = postgres(connectionString, { max: 1 });
    const db = drizzle(migrationClient);

    try {
        await migrate(db, { migrationsFolder: "./drizzle" });
        console.log("✅ Database migrations completed successfully");
    } catch (error) {
        console.error("❌ Database migration failed:", error);
        throw error;
    } finally {
        // Close the migration connection
        await migrationClient.end();
    }
}

