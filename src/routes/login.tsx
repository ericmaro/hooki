import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { signIn } from "@/lib/auth-client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createServerFn } from "@tanstack/react-start";
import { checkIfSetupNeeded } from "@/lib/auth-server";

// Server function using shared oRPC logic
const checkSetupNeeded = createServerFn({ method: "GET" }).handler(async () => {
    return checkIfSetupNeeded();
});

export const Route = createFileRoute("/login")({
    beforeLoad: async () => {
        const needsSetup = await checkSetupNeeded();
        if (needsSetup) {
            throw redirect({ to: "/setup" });
        }
    },
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
                window.location.href = "/";
            } catch (err) {
                setError(err instanceof Error ? err.message : "Login failed");
            } finally {
                setIsLoading(false);
            }
        },
    });

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <Card className="w-full max-w-md mx-4">
                <CardHeader className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground mx-auto mb-2">
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                        </svg>
                    </div>
                    <CardTitle className="text-2xl">Hooki</CardTitle>
                    <CardDescription>Sign in to your account</CardDescription>
                </CardHeader>
                <CardContent>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            form.handleSubmit();
                        }}
                        className="space-y-4"
                    >
                        {error && (
                            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                                {error}
                            </div>
                        )}

                        <form.Field
                            name="email"
                            validators={{
                                onChange: ({ value }) =>
                                    !value ? "Email is required" : undefined,
                            }}
                        >
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor={field.name}>Email Address</Label>
                                    <Input
                                        id={field.name}
                                        type="email"
                                        name={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                        placeholder="you@example.com"
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
                                onChange: ({ value }) =>
                                    !value ? "Password is required" : undefined,
                            }}
                        >
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor={field.name}>Password</Label>
                                    <Input
                                        id={field.name}
                                        type="password"
                                        name={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                        placeholder="••••••••"
                                    />
                                    {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                                        <p className="text-xs text-destructive">
                                            {field.state.meta.errors.join(", ")}
                                        </p>
                                    )}
                                </div>
                            )}
                        </form.Field>

                        <form.Subscribe
                            selector={(state) => [state.canSubmit, state.isSubmitting]}
                        >
                            {([canSubmit]) => (
                                <Button
                                    type="submit"
                                    disabled={!canSubmit || isLoading}
                                    className="w-full"
                                >
                                    {isLoading ? "Signing in..." : "Sign In"}
                                </Button>
                            )}
                        </form.Subscribe>

                        <p className="text-center text-sm text-muted-foreground">
                            Don't have an account?{" "}
                            <Link to="/setup" className="text-primary hover:underline">
                                Get started
                            </Link>
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
