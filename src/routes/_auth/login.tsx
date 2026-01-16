import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { signIn } from "@/lib/auth-client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_auth/login")({
    component: LoginPage,
});

function LoginPage() {
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm({
        defaultValues: {
            email: "",
            password: "",
        },
        onSubmit: async ({ value }) => {
            setError("");
            setIsLoading(true);

            try {
                await signIn.email({
                    email: value.email,
                    password: value.password,
                });
                window.location.href = "/app";
            } catch (err) {
                setError(err instanceof Error ? err.message : "Login failed");
            } finally {
                setIsLoading(false);
            }
        },
    });

    return (
        <>
            <p className="text-center text-sm text-muted-foreground mb-6">Welcome back! Sign in to continue</p>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    form.handleSubmit();
                }}
                className="space-y-6"
            >
                {error && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                        {error}
                    </div>
                )}

                <form.Field
                    name="email"
                    validators={{
                        onChange: ({ value }) => (!value ? "Email is required" : undefined),
                    }}
                >
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor={field.name} className="text-sm">Email</Label>
                            <Input
                                id={field.name}
                                type="email"
                                name={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) => field.handleChange(e.target.value)}
                                placeholder="you@example.com"
                                required
                            />
                            {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                                <p className="text-xs text-destructive">
                                    {field.state.meta.errors.join(", ")}
                                </p>
                            )}
                        </div>
                    )}
                </form.Field>

                <form.Field
                    name="password"
                    validators={{
                        onChange: ({ value }) => (!value ? "Password is required" : undefined),
                    }}
                >
                    {(field) => (
                        <div className="space-y-0.5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor={field.name} className="text-sm">Password</Label>
                                <Link to="/signup" className="text-sm text-primary hover:underline">
                                    Forgot your Password?
                                </Link>
                            </div>
                            <Input
                                id={field.name}
                                type="password"
                                name={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) => field.handleChange(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                            {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                                <p className="text-xs text-destructive">
                                    {field.state.meta.errors.join(", ")}
                                </p>
                            )}
                        </div>
                    )}
                </form.Field>

                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing In..." : "Sign In"}
                </Button>
            </form>

            <div className="mt-6 -mx-8 -mb-6 p-3 bg-muted border-t">
                <p className="text-accent-foreground text-center text-sm">
                    Don't have an account?
                    <Link to="/signup" className="font-medium text-primary hover:underline px-2">
                        Create account
                    </Link>
                </p>
            </div>
        </>
    );
}
