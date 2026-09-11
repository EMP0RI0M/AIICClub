import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import {
  getPublicQuizCatalogAsync,
  getUserAllQuizAttemptCountsServer,
} from "@/shared/lib/quiz/server-authoritative-engine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const { searchParams } = new URL(req.url);
    const handleParam = searchParams.get("handle");

    const catalog = await getPublicQuizCatalogAsync();

    const studentIdentifier =
      handleParam ||
      user?.id ||
      (user as any)?.username ||
      (user as any)?.email?.split("@")[0] ||
      "";

    let attemptCounts: Record<string, { attemptsUsed: number; maxAttempts: number; attemptsRemaining: number }> = {};
    if (studentIdentifier) {
      attemptCounts = await getUserAllQuizAttemptCountsServer(studentIdentifier);
    }

    return NextResponse.json({
      success: true,
      catalog,
      attemptCounts,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch quiz catalog" }, { status: 500 });
  }
}
