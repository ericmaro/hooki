import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    // Auto-detects origin from window.location in browser
});

export const { useSession, signIn, signUp, signOut } = authClient;
