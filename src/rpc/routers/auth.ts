import { pub } from "../os";
import { checkIfSetupNeeded } from "@/lib/auth-server";

// Public auth procedures (no authentication required)
export const authRouter = pub.router({
    // Check if initial setup is required
    needsSetup: pub
        .handler(async () => {
            const needsSetup = await checkIfSetupNeeded();
            return { needsSetup };
        }),
});
