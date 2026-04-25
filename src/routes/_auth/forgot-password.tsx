import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_auth/forgot-password")({
    component: ForgotPasswordPage,
});

type ResetStep = "email" | "reset" | "success";

const GENERIC_OTP_MESSAGE = "If an account exists, we sent a reset code.";

function ForgotPasswordPage() {
    const [step, setStep] = useState<ResetStep>("email");
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [isRequestingOtp, setIsRequestingOtp] = useState(false);
    const [isResettingPassword, setIsResettingPassword] = useState(false);

    const requestOtp = async () => {
        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail) {
            setError("Email is required");
            return;
        }

        setError("");
        setMessage("");
        setEmail(normalizedEmail);
        setIsRequestingOtp(true);

        try {
            await authClient.emailOtp.sendVerificationOtp({
                email: normalizedEmail,
                type: "forget-password",
            });
            setMessage(GENERIC_OTP_MESSAGE);
            setStep("reset");
        } catch {
            setMessage(GENERIC_OTP_MESSAGE);
            setStep("reset");
        } finally {
            setIsRequestingOtp(false);
        }
    };

    const resetPassword = async () => {
        setError("");
        setMessage("");

        if (!otp.trim()) {
            setError("Reset code is required");
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setIsResettingPassword(true);

        try {
            const result = await authClient.emailOtp.resetPassword({
                email,
                otp: otp.trim(),
                password,
            });

            if (result.error) {
                setError(result.error.message ?? "Invalid or expired reset code");
                return;
            }

            setStep("success");
            setOtp("");
            setPassword("");
            setConfirmPassword("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Invalid or expired reset code");
        } finally {
            setIsResettingPassword(false);
        }
    };

    if (step === "success") {
        return (
            <>
                <p className="text-center text-sm text-muted-foreground mb-6">
                    Password updated. Sign in with your new password.
                </p>

                <Link to="/login" className={buttonVariants({ className: "w-full" })}>
                    Back to sign in
                </Link>
            </>
        );
    }

    return (
        <>
            <p className="text-center text-sm text-muted-foreground mb-6">
                {step === "email" ? "Reset your password" : "Confirm your reset code"}
            </p>

            {step === "email" ? (
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        requestOtp();
                    }}
                    className="space-y-6"
                >
                    {error && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="forgot-email" className="text-sm">Email</Label>
                        <Input
                            id="forgot-email"
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="you@example.com"
                            required
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={isRequestingOtp}>
                        {isRequestingOtp ? "Sending code..." : "Send reset code"}
                    </Button>
                </form>
            ) : (
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        resetPassword();
                    }}
                    className="space-y-4"
                >
                    {message && (
                        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-primary text-sm">
                            {message}
                        </div>
                    )}

                    {error && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="reset-otp" className="text-sm">Reset code</Label>
                        <Input
                            id="reset-otp"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            value={otp}
                            onChange={(event) => setOtp(event.target.value)}
                            placeholder="123456"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="reset-password" className="text-sm">New password</Label>
                        <Input
                            id="reset-password"
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="reset-confirm-password" className="text-sm">Confirm password</Label>
                        <Input
                            id="reset-confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={isResettingPassword}>
                        {isResettingPassword ? "Updating password..." : "Update password"}
                    </Button>

                    <Button
                        type="button"
                        variant="ghost"
                        className="w-full"
                        disabled={isRequestingOtp}
                        onClick={requestOtp}
                    >
                        {isRequestingOtp ? "Sending code..." : "Resend code"}
                    </Button>
                </form>
            )}

            <div className="mt-6 -mx-8 -mb-6 p-3 bg-muted border-t">
                <p className="text-accent-foreground text-center text-sm">
                    Remembered your password?
                    <Link to="/login" className="font-medium text-primary hover:underline px-2">
                        Sign in
                    </Link>
                </p>
            </div>
        </>
    );
}
