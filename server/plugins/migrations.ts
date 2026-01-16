import { definePlugin } from "nitro";
import { runMigrations } from "../../src/lib/db/migrate";

export default definePlugin(async () => {
    // Only run migrations in production
    if (process.env.NODE_ENV === "production") {
        try {
            await runMigrations();
        } catch (error) {
            console.error("Failed to run migrations on startup:", error);
            // You can choose to throw here if you want to prevent server start on migration failure
            // throw error;
        }
    }
});

