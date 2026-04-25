import { createAuthClient } from "better-auth/react";
import { emailOTPClient, organizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
    plugins: [
        emailOTPClient(),
        organizationClient({
            // Note: If this option exists in the version, it will auto-select the first org if none is active
        })
    ]
});

export const { useSession, signIn, signUp, signOut } = authClient;
