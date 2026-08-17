import { AccessToken } from "livekit-server-sdk";

const LIVEKIT_URL = process.env.LIVEKIT_URL || "wss://aiic-blnsii2r.livekit.cloud";
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "APIqytQn9G8y4KL";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "Wos6eLnZ4w2hVFNzN5mxLqM3etyO8TbxPKZQZ5VRI87";

export async function generateVoiceToken(
    roomName: string,
    participantIdentity: string,
    participantName: string,
    options?: { canPublish?: boolean; canSubscribe?: boolean }
): Promise<string> {
    const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
        identity: participantIdentity,
        name: participantName,
        ttl: "6h",
    });

    token.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: options?.canPublish ?? true,
        canSubscribe: options?.canSubscribe ?? true,
    });

    return await token.toJwt();
}

export function getLiveKitUrl(): string {
    return LIVEKIT_URL;
}
