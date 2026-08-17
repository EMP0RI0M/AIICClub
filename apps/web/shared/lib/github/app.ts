import crypto from "crypto";
import jwt from "jsonwebtoken";

/**
 * Generates an RS256 JWT for authenticating as the GitHub App.
 * Uses GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY from server-only environment.
 * Token is valid for 9 minutes (GitHub max is 10 minutes).
 */
export function generateAppJWT(): string | null {
    const appId = process.env.GITHUB_APP_ID?.trim();
    let privateKey = process.env.GITHUB_APP_PRIVATE_KEY?.trim();

    if (!appId || !privateKey) {
        return null;
    }

    // Handle base64-encoded private key or escaped newlines
    if (!privateKey.includes("-----BEGIN") && !privateKey.includes("\n")) {
        try {
            privateKey = Buffer.from(privateKey, "base64").toString("utf-8");
        } catch {
            // Keep original if not valid base64
        }
    } else {
        privateKey = privateKey.replace(/\\n/g, "\n");
    }

    const now = Math.floor(Date.now() / 1000);
    const payload = {
        iat: now - 60, // 60 seconds in the past to allow for clock drift
        exp: now + 9 * 60, // 9 minutes expiration
        iss: appId,
    };

    try {
        return jwt.sign(payload, privateKey, { algorithm: "RS256" });
    } catch (err) {
        console.error("[GITHUB_APP_JWT_ERROR]", err);
        return null;
    }
}
