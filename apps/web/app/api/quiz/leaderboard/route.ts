import { NextRequest, NextResponse } from "next/server";
import { getGlobalLeaderboardServer } from "@/shared/lib/quiz/server-authoritative-engine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lectureId = searchParams.get("lectureId") || undefined;

    const leaderboard = await getGlobalLeaderboardServer(lectureId);
    return NextResponse.json({ success: true, leaderboard });
  } catch (err: any) {
    console.error("[QUIZ_LEADERBOARD_API_ERROR]", err);
    return NextResponse.json({ error: err.message || "Failed to fetch leaderboard" }, { status: 500 });
  }
}
