import { Resend } from "resend";
import { env } from "@/lib/env";

type ResendClient = Pick<Resend, "emails">;

interface PasswordResetOtpEmailInput {
    email: string;
    otp: string;
}

interface PasswordResetEmailMessage {
    from: string;
    to: Array<string>;
    subject: string;
    html: string;
    text: string;
}

let resendClient: ResendClient | null = null;

function getResendClient() {
    if (!env.RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY is required to send password reset emails.");
    }

    resendClient ??= new Resend(env.RESEND_API_KEY);
    return resendClient;
}

function getResendFromEmail() {
    if (!env.RESEND_FROM_EMAIL) {
        throw new Error("RESEND_FROM_EMAIL is required to send password reset emails.");
    }

    return env.RESEND_FROM_EMAIL;
}

export function buildPasswordResetOtpEmail({
    email,
    otp,
}: PasswordResetOtpEmailInput): PasswordResetEmailMessage {
    const subject = "Reset your Hooki password";

    return {
        from: getResendFromEmail(),
        to: [email],
        subject,
        html: `
            <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
                <h1 style="font-size: 20px; margin: 0 0 16px;">Reset your Hooki password</h1>
                <p style="margin: 0 0 16px;">Use this verification code to reset your password:</p>
                <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 0 0 16px;">${otp}</p>
                <p style="margin: 0 0 16px;">This code expires in 5 minutes.</p>
                <p style="margin: 0;">If you did not request a password reset, you can safely ignore this email.</p>
            </div>
        `.trim(),
        text: [
            "Reset your Hooki password",
            "",
            `Use this verification code to reset your password: ${otp}`,
            "",
            "This code expires in 5 minutes.",
            "If you did not request a password reset, you can safely ignore this email.",
        ].join("\n"),
    };
}

export async function sendPasswordResetOtpEmail(input: PasswordResetOtpEmailInput) {
    const message = buildPasswordResetOtpEmail(input);
    const { data, error } = await getResendClient().emails.send(message);

    if (error) {
        throw new Error(`Resend failed to send password reset email: ${error.message}`);
    }

    return data;
}
