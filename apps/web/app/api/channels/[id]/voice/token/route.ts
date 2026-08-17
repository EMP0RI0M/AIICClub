import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { AccessToken } from "livekit-server-sdk";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthUser(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: channelId } = await context.params;

        const apiKey = process.env.LIVEKIT_API_KEY || "devkey";
        const apiSecret = process.env.LIVEKIT_API_SECRET || "secret";
        const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || "wss://aiic.livekit.cloud";

        const at = new AccessToken(apiKey, apiSecret, {
            identity: user.id,
            name: user.displayName || user.username,
        });

        at.addGrant({
            room: channelId,
            roomJoin: true,
            canPublish: true,
            canSubscribe: true,
        });

        const token = await at.toJwt();

        return NextResponse.json({
            url: livekitUrl,
            token,
            channelId,
        });
    } catch (err: any) {
        return NextResponse.json({
            url: "wss://aiic.livekit.cloud",
            token: "preview_token",
            channelId: "voice_preview"
        });
    }
}
