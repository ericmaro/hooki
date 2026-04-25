import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP, organization } from "better-auth/plugins";
import { db } from "./db";
import * as schema from "./db/schema";
import { sendPasswordResetOtpEmail } from "./email/resend";

export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5004",
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: {
            user: schema.users,
            session: schema.sessions,
            account: schema.accounts,
            verification: schema.verifications,
            organization: schema.organizations,
            member: schema.members,
            invitation: schema.invitations,
        },
    }),
    emailAndPassword: {
        enabled: true,
        revokeSessionsOnPasswordReset: true,
    },
    user: {
        additionalFields: {
            role: {
                type: "string",
                defaultValue: "user",
                input: false,
                // Make role visible to client-side session hooks
                public: true,
            },
        },
    },
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // 1 day
    },
    plugins: [
        emailOTP({
            otpLength: 6,
            expiresIn: 300,
            allowedAttempts: 3,
            storeOTP: "hashed",
            disableSignUp: true,
            async sendVerificationOTP({ email, otp, type }) {
                if (type !== "forget-password") {
                    return;
                }

                await sendPasswordResetOtpEmail({ email, otp });
            },
        }),
        organization(),
    ],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
