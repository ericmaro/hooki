import { ORPCError } from "@orpc/server";
import { pub } from "./os";
import { auth } from "@/lib/auth";

// Auth middleware - requires authenticated session
export const requireAuth = pub.middleware(async ({ context, next }) => {
    // Get session from Better Auth
    const session = await auth.api.getSession({
        headers: new Headers(context.headers),
    });

    if (!session?.user) {
        throw new ORPCError("UNAUTHORIZED", {
            message: "Authentication required",
        });
    }

    console.log("RPC Session Data:", {
        userId: session.user.id,
        activeOrgId: (session.session as any).activeOrganizationId
    });

    // Extend context with user info
    return next({
        context: {
            ...context,
            user: {
                id: session.user.id,
                name: session.user.name,
                email: session.user.email,
                role: (session.user as { role?: string }).role || "user",
            },
            session: {
                id: session.session.id,
                token: session.session.token,
                activeOrganizationId: (session.session as any).activeOrganizationId,
            },
        },
    });
});

// Protected procedure builder
export const protectedProcedure = pub.use(requireAuth);
