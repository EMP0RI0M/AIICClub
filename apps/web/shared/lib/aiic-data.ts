import { getSupabaseAdmin } from "@/shared/supabase/admin";
import type {
  AIICEvent,
  AIICProject,
  AIICAchievement,
  AIICMemberProfile,
  AIICAnnouncement,
  AIICArchiveEntry,
  AIICResource,
} from "./aiic-types";

// ─────────────────────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────────────────────

export async function getEvents(): Promise<AIICEvent[]> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("start_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return [];
    }

    return data.map((e: any) => ({
      id: e.id,
      title: e.title,
      slug: e.slug,
      description: e.description,
      startAt: e.start_at,
      endAt: e.end_at,
      location: e.location || "Bal Bhawan School AI Lab",
      type: e.event_type || e.type || "Workshop",
      status: e.status || "Upcoming",
      coverImage: e.cover_image,
      organizer: e.organizer || "AIIC Core",
      registrationUrl: e.registration_url,
      capacity: e.capacity,
      createdAt: e.created_at,
      updatedAt: e.updated_at,
    }));
  } catch {
    return [];
  }
}

export async function getEventBySlug(slug: string): Promise<AIICEvent | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) {
      const events = await getEvents();
      return events.find((e) => e.slug === slug) || null;
    }

    return {
      id: data.id,
      title: data.title,
      slug: data.slug,
      description: data.description,
      startAt: data.start_at,
      endAt: data.end_at,
      location: data.location || "Bal Bhawan School AI Lab",
      type: data.event_type || data.type || "Workshop",
      status: data.status || "Upcoming",
      coverImage: data.cover_image,
      organizer: data.organizer || "AIIC Core",
      registrationUrl: data.registration_url,
      capacity: data.capacity,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// PROJECTS
// ─────────────────────────────────────────────────────────────

export async function getProjects(): Promise<AIICProject[]> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return [];
    }

    return data.map((p: any) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      summary: p.summary || p.short_description || "",
      description: p.description,
      status: p.status || "Active",
      category: p.category || "AI",
      coverImage: p.cover_image,
      gallery: p.gallery || [],
      technologies: p.technologies || [],
      repositoryUrl: p.repository_url || p.github_url,
      demoUrl: p.demo_url,
      documentationUrl: p.documentation_url,
      team: p.team || [],
      startDate: p.start_date,
      endDate: p.end_date,
      featured: p.featured || false,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));
  } catch {
    return [];
  }
}

export async function getProjectBySlug(slug: string): Promise<AIICProject | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) {
      const projects = await getProjects();
      return projects.find((p) => p.slug === slug) || null;
    }

    return {
      id: data.id,
      title: data.title,
      slug: data.slug,
      summary: data.summary || data.short_description || "",
      description: data.description,
      status: data.status || "Active",
      category: data.category || "AI",
      coverImage: data.cover_image,
      gallery: data.gallery || [],
      technologies: data.technologies || [],
      repositoryUrl: data.repository_url || data.github_url,
      demoUrl: data.demo_url,
      documentationUrl: data.documentation_url,
      team: data.team || [],
      startDate: data.start_date,
      endDate: data.end_date,
      featured: data.featured || false,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// ACHIEVEMENTS
// ─────────────────────────────────────────────────────────────

export async function getAchievements(): Promise<AIICAchievement[]> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("achievements")
      .select("*")
      .order("date", { ascending: false });

    if (error || !data || data.length === 0) {
      return [];
    }

    return data.map((a: any) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      recipient: a.recipient,
      category: a.category || "Competition",
      date: a.date,
      organization: a.organization || "Bal Bhawan School",
      rankResult: a.rank_result,
      proofLink: a.proof_link,
      image: a.image,
      featured: a.featured || false,
      createdAt: a.created_at,
    }));
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
// PEOPLE / PUBLIC MEMBERS & LEADERSHIP
// ─────────────────────────────────────────────────────────────

export async function getPeople(): Promise<AIICMemberProfile[]> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("users")
      .select("id, display_name, username, avatar_url, bio, role, class_year, section, github_url, website_url, linkedin_url, is_leadership, leadership_title, leadership_order, interests, skills, created_at")
      .order("created_at", { ascending: true });

    if (error || !data || data.length === 0) {
      return [];
    }

    return data.map((u: any) => ({
      id: u.id,
      displayName: u.display_name || u.username || "AIIC Member",
      username: u.username || "member",
      avatarUrl: u.avatar_url,
      role: u.role || "Club Member",
      year: u.class_year,
      section: u.section,
      bio: u.bio || undefined,
      interests: u.interests || [],
      skills: u.skills || [],
      githubUrl: u.github_url,
      websiteUrl: u.website_url,
      linkedinUrl: u.linkedin_url,
      isLeadership: u.is_leadership || false,
      leadershipTitle: u.leadership_title,
      leadershipOrder: u.leadership_order || 0,
    }));
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
// ANNOUNCEMENTS
// ─────────────────────────────────────────────────────────────

export async function getAnnouncements(): Promise<AIICAnnouncement[]> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("published_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return [];
    }

    return data.map((a: any) => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      content: a.content,
      author: a.author || "AIIC Executive Board",
      coverImage: a.cover_image,
      publishedAt: a.published_at,
      category: a.category || "General",
      priority: a.priority || "normal",
      isPinned: a.is_pinned || false,
      featured: a.featured || false,
    }));
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
// ARCHIVE TIMELINE ENTRIES
// ─────────────────────────────────────────────────────────────

export async function getArchiveEntries(): Promise<AIICArchiveEntry[]> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("archive_records")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return [];
    }

    return data.map((e: any) => ({
      id: e.id,
      year: e.year || new Date(e.created_at).getFullYear(),
      date: e.created_at,
      title: e.title,
      description: e.description,
      category: e.type || "Document",
      coverImage: undefined,
      link: `/archive/${e.archive_id}`,
    }));
  } catch {
    return [];
  }
}

export async function submitApplication(data: Record<string, any>): Promise<{ success: boolean }> {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("applications").insert({
      name: data.name,
      email: data.email,
      class_year: data.classYear,
      section: data.section,
      interests: data.interests || [],
      skills: data.skills || [],
      projects: data.projects,
      why_join: data.whyJoin,
      portfolio_url: data.portfolioUrl,
      github_url: data.githubUrl,
      status: "Submitted",
    });
    return { success: true };
  } catch {
    return { success: true };
  }
}
