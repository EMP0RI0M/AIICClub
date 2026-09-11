import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/shared/supabase/admin";
import { getAuthUser } from "@/app/api/auth-helper";
import { getAnnouncements } from "@/shared/lib/aiic-data";

export async function GET(req: NextRequest) {
  try {
    const announcements = await getAnnouncements();
    return NextResponse.json({ announcements });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch announcements" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Authentication required to publish notices." }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    // Resolve user's elevated role
    const { data: assignments } = await supabase
      .from("organization_role_assignments")
      .select("role:organization_roles(key, hierarchy_level)")
      .eq("user_id", user.id)
      .eq("is_active", true);

    const roles = (assignments || []).map((a: any) => a.role?.key?.toLowerCase()).filter(Boolean);
    const isElevated =
      roles.some((r) => ["president_admin", "admin", "president", "vice_president", "teacher", "staff", "owner"].includes(r)) ||
      ["president_admin", "admin", "president", "vice_president", "teacher", "staff"].includes((user as any).role?.toLowerCase());

    if (!isElevated) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to publish institutional notices." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { title, content, category, priority, isPinned, author, coverImage } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Notice title is required." }, { status: 400 });
    }

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Notice content is required." }, { status: 400 });
    }

    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString().slice(-4)}`.replace(/^-|-$/g, "");

    const { data: notice, error: dbErr } = await supabase
      .from("announcements")
      .insert({
        title: title.trim(),
        slug,
        content: content.trim(),
        author: author?.trim() || user.displayName || user.username || "AIIC Executive Board",
        author_id: user.id,
        category: category || "General",
        priority: priority || "normal",
        is_pinned: !!isPinned,
        featured: !!isPinned,
        cover_image: coverImage || null,
        published_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbErr) {
      console.error("[ANNOUNCEMENT_CREATE_ERROR]", dbErr);
      throw dbErr;
    }

    return NextResponse.json({ success: true, notice }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to publish announcement" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Authentication required to edit notices." }, { status: 401 });
    }

    const body = await req.json();
    const { id, title, content, category, priority, isPinned, coverImage } = body;

    if (!id) {
      return NextResponse.json({ error: "Notice ID is required for editing." }, { status: 400 });
    }

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Notice title is required." }, { status: 400 });
    }

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Notice content is required." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Fetch existing notice
    const { data: existing, error: fetchErr } = await supabase
      .from("announcements")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Notice not found." }, { status: 404 });
    }

    // Resolve user's elevated role
    const { data: assignments } = await supabase
      .from("organization_role_assignments")
      .select("role:organization_roles(key, hierarchy_level)")
      .eq("user_id", user.id)
      .eq("is_active", true);

    const roles = (assignments || []).map((a: any) => a.role?.key?.toLowerCase()).filter(Boolean);
    const isElevated =
      roles.some((r) => ["president_admin", "admin", "president", "vice_president", "teacher", "staff", "owner"].includes(r)) ||
      ["president_admin", "admin", "president", "vice_president", "teacher", "staff"].includes((user as any).role?.toLowerCase());

    const isCreator = existing.author_id && existing.author_id === user.id;

    if (!isCreator && !isElevated) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to edit this notice." },
        { status: 403 }
      );
    }

    const { data: updatedNotice, error: updateErr } = await supabase
      .from("announcements")
      .update({
        title: title.trim(),
        content: content.trim(),
        category: category || existing.category || "General",
        priority: priority || existing.priority || "normal",
        is_pinned: isPinned !== undefined ? !!isPinned : existing.is_pinned,
        featured: isPinned !== undefined ? !!isPinned : existing.featured,
        cover_image: coverImage !== undefined ? coverImage : existing.cover_image,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateErr) {
      console.error("[ANNOUNCEMENT_UPDATE_ERROR]", updateErr);
      throw updateErr;
    }

    return NextResponse.json({
      success: true,
      notice: {
        id: updatedNotice.id,
        title: updatedNotice.title,
        slug: updatedNotice.slug,
        content: updatedNotice.content,
        author: updatedNotice.author,
        authorId: updatedNotice.author_id,
        coverImage: updatedNotice.cover_image,
        publishedAt: updatedNotice.published_at,
        category: updatedNotice.category,
        priority: updatedNotice.priority,
        isPinned: updatedNotice.is_pinned,
        featured: updatedNotice.featured,
        createdAt: updatedNotice.created_at,
        updatedAt: updatedNotice.updated_at,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update notice" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Authentication required to delete notices." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");
    if (!id) {
      try {
        const body = await req.json();
        id = body?.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ error: "Notice ID is required for deletion." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Fetch existing notice
    const { data: existing, error: fetchErr } = await supabase
      .from("announcements")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Notice not found." }, { status: 404 });
    }

    // Resolve user's elevated role
    const { data: assignments } = await supabase
      .from("organization_role_assignments")
      .select("role:organization_roles(key, hierarchy_level)")
      .eq("user_id", user.id)
      .eq("is_active", true);

    const roles = (assignments || []).map((a: any) => a.role?.key?.toLowerCase()).filter(Boolean);
    const isElevated =
      roles.some((r) => ["president_admin", "admin", "president", "vice_president", "teacher", "staff", "owner"].includes(r)) ||
      ["president_admin", "admin", "president", "vice_president", "teacher", "staff"].includes((user as any).role?.toLowerCase());

    const isCreator = existing.author_id && existing.author_id === user.id;

    if (!isCreator && !isElevated) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to delete this notice." },
        { status: 403 }
      );
    }

    const { error: deleteErr } = await supabase
      .from("announcements")
      .delete()
      .eq("id", id);

    if (deleteErr) {
      console.error("[ANNOUNCEMENT_DELETE_ERROR]", deleteErr);
      throw deleteErr;
    }

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete notice" }, { status: 500 });
  }
}
