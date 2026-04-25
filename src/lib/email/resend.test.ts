import { beforeEach, describe, expect, it, vi } from "vitest";

const resendMock = vi.hoisted(() => {
    const send = vi.fn();
    const Resend = vi.fn().mockImplementation(() => ({
        emails: { send },
    }));

    return { Resend, send };
});

vi.mock("resend", () => ({
    Resend: resendMock.Resend,
}));

describe("sendPasswordResetOtpEmail", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.unstubAllEnvs();
        resendMock.Resend.mockClear();
        resendMock.send.mockReset();
        resendMock.send.mockResolvedValue({ data: { id: "email-1" }, error: null });
    });

    it("sends the reset OTP to the requested email", async () => {
        vi.stubEnv("RESEND_API_KEY", "re_test");
        vi.stubEnv("RESEND_FROM_EMAIL", "Hooki <noreply@example.com>");

        const { sendPasswordResetOtpEmail } = await import("./resend");

        await expect(
            sendPasswordResetOtpEmail({
                email: "person@example.com",
                otp: "123456",
            }),
        ).resolves.toEqual({ id: "email-1" });

        expect(resendMock.Resend).toHaveBeenCalledWith("re_test");
        expect(resendMock.send).toHaveBeenCalledWith(
            expect.objectContaining({
                from: "Hooki <noreply@example.com>",
                to: ["person@example.com"],
                subject: "Reset your Hooki password",
            }),
        );
    });

    it("includes the OTP in html and text content", async () => {
        vi.stubEnv("RESEND_API_KEY", "re_test");
        vi.stubEnv("RESEND_FROM_EMAIL", "Hooki <noreply@example.com>");

        const { sendPasswordResetOtpEmail } = await import("./resend");

        await sendPasswordResetOtpEmail({
            email: "person@example.com",
            otp: "654321",
        });

        const payload = resendMock.send.mock.calls[0]?.[0];

        expect(payload.html).toContain("654321");
        expect(payload.text).toContain("654321");
    });

    it("throws when the Resend API key is missing", async () => {
        vi.stubEnv("RESEND_FROM_EMAIL", "Hooki <noreply@example.com>");

        const { sendPasswordResetOtpEmail } = await import("./resend");

        await expect(
            sendPasswordResetOtpEmail({
                email: "person@example.com",
                otp: "123456",
            }),
        ).rejects.toThrow("RESEND_API_KEY");
    });

    it("throws when the Resend sender is missing", async () => {
        vi.stubEnv("RESEND_API_KEY", "re_test");

        const { sendPasswordResetOtpEmail } = await import("./resend");

        await expect(
            sendPasswordResetOtpEmail({
                email: "person@example.com",
                otp: "123456",
            }),
        ).rejects.toThrow("RESEND_FROM_EMAIL");
    });

    it("surfaces Resend API errors", async () => {
        vi.stubEnv("RESEND_API_KEY", "re_test");
        vi.stubEnv("RESEND_FROM_EMAIL", "Hooki <noreply@example.com>");
        resendMock.send.mockResolvedValue({
            data: null,
            error: {
                message: "Invalid sender",
                name: "invalid_from_address",
                statusCode: 400,
            },
        });

        const { sendPasswordResetOtpEmail } = await import("./resend");

        await expect(
            sendPasswordResetOtpEmail({
                email: "person@example.com",
                otp: "123456",
            }),
        ).rejects.toThrow("Invalid sender");
    });
});
