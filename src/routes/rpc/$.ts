import { createFileRoute } from "@tanstack/react-router";
import { RPCHandler } from "@orpc/server/fetch";
import { onError } from "@orpc/server";
import { router } from "@/rpc/router";

const handler = new RPCHandler(router, {
    interceptors: [
        onError((error) => {
            console.error("[RPC Error]:", error);
        }),
    ],
});

export const Route = createFileRoute("/rpc/$")({
    server: {
        handlers: {
            ANY: async ({ request }) => {
                // Parse query params for SSE/GET requests
                const url = new URL(request.url);
                const queryParams: Record<string, string> = {};
                url.searchParams.forEach((value, key) => {
                    queryParams[key] = value;
                });

                const { response } = await handler.handle(request, {
                    prefix: "/rpc",
                    context: {
                        headers: Object.fromEntries(request.headers.entries()),
                        queryParams,
                    },
                });

                return response ?? new Response("Not Found", { status: 404 });
            },
        },
    },
});
