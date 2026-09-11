import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { startQuizAttemptServer } from "@/shared/lib/quiz/server-authoritative-engine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const body = await req.json().catch(() => ({}));
    const { quizId, userName, userHandle } = body;

    if (!quizId || typeof quizId !== "string") {
      return NextResponse.json({ error: "quizId is required." }, { status: 400 });
    }

    const studentName = userName || (user as any)?.name || (user as any)?.displayName || "AIIC Member";
    const studentHandle =
      userHandle ||
      ((user as any)?.username
        ? `@${(user as any).username}`
        : (user as any)?.email
        ? `@${(user as any).email.split("@")[0]}`
        : `@${studentName.toLowerCase().replace(/[^a-z0-9_]/g, "") || "member"}`);

    const result = await startQuizAttemptServer({
      quizId,
      userId: user?.id || undefined,
      userName: studentName,
      userHandle: studentHandle.startsWith("@") ? studentHandle : `@${studentHandle}`,
      userAvatar: (user as any)?.avatarUrl || undefined,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to start quiz." }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[QUIZ_START_API_ERROR]", err);
    return NextResponse.json({ error: err.message || "Failed to start quiz." }, { status: 500 });
  }
}
