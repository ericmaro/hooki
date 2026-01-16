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
    } catch (error: any) {
        // If the error is 'relation already exists' (42P07), we can skip it gracefully
        // Drizzle migrator should ideally handle this, but sometimes it doesn't if the migration state is out of sync
        if (error?.cause?.code === '42P07' || error?.code === '42P07' || (error?.message && error.message.includes('already exists'))) {
            console.log("ℹ️ Database tables already exist, skipping migration steps.");
            return;
        }

        console.error("❌ Database migration failed:", error);
        throw error;
    } finally {
        // Close the migration connection
        await migrationClient.end();
    }
}

