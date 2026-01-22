import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { runMigrations } from "./migrate";

const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString);
export const db = drizzle(client, { schema });

// Run Drizzle migrations on startup using the proper migration files
runMigrations().catch(console.error);
