import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Zap } from "lucide-react";

export const Route = createFileRoute("/_auth")({
    component: AuthLayout,
});

function AuthLayout() {
    return (
        <section className="flex min-h-screen bg-muted/30 px-4 py-16 md:py-32">
            <div className="bg-muted m-auto h-fit w-full max-w-sm overflow-hidden rounded-[calc(var(--radius)+.125rem)] border shadow-md shadow-black/5">
                <div className="bg-card -m-px rounded-[calc(var(--radius)+.125rem)] border p-8 pb-6">
                    <div className="text-center">
                        <div className="mx-auto w-fit">
                            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
                                <Zap className="w-5 h-5 fill-current" />
                            </div>
                        </div>
                        <h1 className="mb-1 mt-4 text-xl font-semibold">Hooki</h1>
                    </div>

                    <Outlet />
                </div>
            </div>
        </section>
    );
}
