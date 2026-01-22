import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString);
export const db = drizzle(client, { schema });

// Auto-apply critical schema migrations on startup
// This ensures new columns are added without manual intervention
async function applyIncrementalMigrations() {
    try {
        // Add secure_headers column if it doesn't exist (migration 0003)
        await client`
            ALTER TABLE flows 
            ADD COLUMN IF NOT EXISTS secure_headers jsonb 
            DEFAULT '["authorization"]'::jsonb
        `;
        console.log("[DB] Schema migrations applied successfully");
    } catch (error) {
        // Ignore errors (column might already exist or other non-critical issues)
        console.log("[DB] Migration check completed");
    }
}

// Run migrations asynchronously on module load
applyIncrementalMigrations();
