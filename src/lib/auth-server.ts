import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { count } from "drizzle-orm";

/**
 * Shared logic for checking if initial setup is needed
 * This can be called from both oRPC procedures and server functions
 */
export async function checkIfSetupNeeded(): Promise<boolean> {
    const result = await db.select({ count: count() }).from(users);
    return result[0].count === 0;
}
