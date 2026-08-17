import crypto from "crypto";

/**
 * Validates GitHub's X-Hub-Signature-256 header against the raw request body.
 * Uses timingSafeEqual to guard against timing attacks.
 */
export function verifyGitHubWebhookSignature(
    rawBody: string,
    signatureHeader: string | null
): { valid: boolean; reason?: string } {
    const secret = process.env.GITHUB_APP_WEBHOOK_SECRET?.trim();

    if (!secret) {
        // If no secret configured in development/test, warn but fail closed in production
        if (process.env.NODE_ENV === "development") {
            console.warn("[WEBHOOK_SIGNATURE_WARNING] GITHUB_APP_WEBHOOK_SECRET is not set.");
            return { valid: true };
        }
        return { valid: false, reason: "Server webhook secret is not configured." };
    }

    if (!signatureHeader) {
        return { valid: false, reason: "Missing X-Hub-Signature-256 header." };
    }

    const parts = signatureHeader.split("=");
    if (parts.length !== 2 || parts[0] !== "sha256") {
        return { valid: false, reason: "Invalid signature format (expected sha256=...)." };
    }

    const signature = parts[1];
    const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(rawBody, "utf-8")
        .digest("hex");

    try {
        const sigBuffer = Buffer.from(signature, "hex");
        const expBuffer = Buffer.from(expectedSignature, "hex");

        if (sigBuffer.length !== expBuffer.length) {
            return { valid: false, reason: "Signature digest length mismatch." };
        }

        const matches = crypto.timingSafeEqual(sigBuffer, expBuffer);
        return { valid: matches, reason: matches ? undefined : "Signature mismatch." };
    } catch {
        return { valid: false, reason: "Cryptographic signature comparison failed." };
    }
}
