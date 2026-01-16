import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { authClient } from "./auth-client";
import type { router } from "@/rpc/router";

// Infer the client type from the router type
type RouterType = typeof router;

const getBaseUrl = () => {
    if (typeof window !== "undefined") {
        return window.location.origin;
    }
    return process.env.BETTER_AUTH_URL || "http://localhost:5004";
};

const link = new RPCLink({
    url: `${getBaseUrl()}/rpc`,
    headers: async () => {
        // If on the server, forward the current request's headers (including cookies)
        if (import.meta.env.SSR) {
            try {
                const { getRequest } = await import("@tanstack/react-start/server");
                const req = getRequest();
                return Object.fromEntries(req.headers.entries());
            } catch (e) {
                // Not in a request context (e.g. build time)
                console.warn("[RPC Client] Failed to get request context for header forwarding:", e);
            }
        }

        // Auto-attach session token to every request (runs on client or if SSR request context is missing)
        const session = await authClient.getSession();
        const token = session.data?.session.token;
        return token ? { Authorization: `Bearer ${token}` } : {};
    },
});

// @ts-expect-error - oRPC generic constraint issue with nested routers
export const rpc = createORPCClient<RouterType>(link);
