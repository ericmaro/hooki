import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { signUp, authClient } from "@/lib/auth-client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createServerFn } from "@tanstack/react-start";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { env } from "@/lib/env";

// Server function to check if signup should be allowed
const checkSignupAllowed = createServerFn({ method: "GET" }).handler(async () => {
    // In self-hosted mode, only allow signup if no users exist yet
    if (env.HOOKI_MODE === "self-hosted") {
        const existingUsers = await db.select({ id: users.id }).from(users).limit(1);
        if (existingUsers.length > 0) {
            return { allowed: false };
        }
    }
    return { allowed: true };
});

export const Route = createFileRoute("/_auth/signup")({
    beforeLoad: async () => {
        const { allowed } = await checkSignupAllowed();
        if (!allowed) {
            throw redirect({ to: "/login" });
        }
    },
    component: SignupPage,
});

function SignupPage() {
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm({
        defaultValues: {
            name: "",
            email: "",
            password: "",
            confirmPassword: "",
        },
        onSubmit: async ({ value }) => {
            setError("");

            if (value.password !== value.confirmPassword) {
                setError("Passwords do not match");
                return;
            }

            if (value.password.length < 8) {
                setError("Password must be at least 8 characters");
                return;
            }

            setIsLoading(true);

            try {
                const result = await signUp.email({
                    name: value.name,
                    email: value.email,
                    password: value.password,
                });

                if (result.error) {
                    setError(result.error.message ?? "Registration failed");
                    return;
                }

                const { data: org, error: orgError } = await authClient.organization.create({
                    name: value.name,
                    slug: value.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Math.random().toString(36).substring(2, 6),
                });

                if (orgError) {
                    console.error("Failed to create auto-organization:", orgError);
                    window.location.href = "/app";
                    return;
                }

                if (org) {
                    await authClient.organization.setActive({ organizationId: org.id });
                }

                window.location.href = "/app";
            } catch (err) {
                setError(err instanceof Error ? err.message : "Registration failed");
            } finally {
                setIsLoading(false);
            }
        },
    });

    return (
        <>
            <p className="text-center text-sm text-muted-foreground mb-6">Create your account to get started</p>

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
                    name="name"
                    validators={{
                        onChange: ({ value }) => (!value ? "Name is required" : undefined),
                    }}
                >
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor={field.name} className="text-sm">Full Name</Label>
                            <Input
                                id={field.name}
                                type="text"
                                name={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) => field.handleChange(e.target.value)}
                                placeholder="John Doe"
                                required
                            />
                        </div>
                    )}
                </form.Field>

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
                        </div>
                    )}
                </form.Field>

                <form.Field
                    name="password"
                    validators={{
                        onChange: ({ value }) =>
                            !value ? "Password is required" :
                                value.length < 8 ? "Password must be at least 8 characters" : undefined,
                    }}
                >
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor={field.name} className="text-sm">Password</Label>
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
                        </div>
                    )}
                </form.Field>

                <form.Field
                    name="confirmPassword"
                    validators={{
                        onChangeListenTo: ["password"],
                        onChange: ({ value, fieldApi }) => {
                            if (!value) return "Please confirm your password";
                            if (value !== fieldApi.form.getFieldValue("password")) {
                                return "Passwords do not match";
                            }
                            return undefined;
                        },
                    }}
                >
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor={field.name} className="text-sm">Confirm Password</Label>
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
                        </div>
                    )}
                </form.Field>

                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating Account..." : "Create Account"}
                </Button>
            </form>

            <div className="mt-6 -mx-8 -mb-6 p-3 bg-muted border-t">
                <p className="text-accent-foreground text-center text-sm">
                    Already have an account?
                    <Link to="/login" className="font-medium text-primary hover:underline px-2">
                        Sign in
                    </Link>
                </p>
            </div>
        </>
    );
}
