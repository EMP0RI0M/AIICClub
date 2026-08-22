import { getSupabaseAdmin } from "../lib/supabase.js";

export interface User {
    id: string;
    email: string;
    username: string;
    displayName: string;
    passwordHash?: string | null;
    googleId?: string | null;
    avatarUrl?: string | null;
    bio?: string | null;
    role?: string | null;
    classYear?: string | null;
    section?: string | null;
    githubUrl?: string | null;
    linkedinUrl?: string | null;
    websiteUrl?: string | null;
    interests?: string[];
    skills?: string[];
    status: string;
    onboardingCompleted: boolean;
    emailVerified: boolean;
    emailVerifyToken?: string | null;
    emailVerifyExpires?: Date | null;
    passwordResetToken?: string | null;
    passwordResetExpires?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

function mapToUser(row: any): User | null {
    if (!row) return null;
    return {
        id: row.id,
        email: row.email,
        username: row.username,
        displayName: row.display_name,
        passwordHash: row.password_hash,
        googleId: row.google_id,
        avatarUrl: row.avatar_url,
        bio: row.bio,
        role: row.role ?? null,
        classYear: row.class_year ?? null,
        section: row.section ?? null,
        githubUrl: row.github_url ?? null,
        linkedinUrl: row.linkedin_url ?? null,
        websiteUrl: row.website_url ?? null,
        interests: Array.isArray(row.interests) ? row.interests : [],
        skills: Array.isArray(row.skills) ? row.skills : [],
        status: row.status ?? "offline",
        onboardingCompleted: Boolean(row.onboarding_completed),
        emailVerified: Boolean(row.email_verified),
        emailVerifyToken: row.email_verify_token,
        emailVerifyExpires: row.email_verify_expires ? new Date(row.email_verify_expires) : null,
        passwordResetToken: row.password_reset_token,
        passwordResetExpires: row.password_reset_expires ? new Date(row.password_reset_expires) : null,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}

export const userRepository = {
    async findById(id: string): Promise<User | null> {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.from("users").select("*").eq("id", id).maybeSingle();
        if (error) console.error("[userRepository.findById error]", error);
        return mapToUser(data);
    },

    async findByUsername(username: string): Promise<User | null> {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.from("users").select("*").eq("username", username).maybeSingle();
        if (error) console.error("[userRepository.findByUsername error]", error);
        return mapToUser(data);
    },

    /** Case-insensitive email lookup */
    async findByEmailInsensitive(email: string): Promise<User | null> {
        const supabase = getSupabaseAdmin();
        const normalized = email.trim().toLowerCase();
        const { data, error } = await supabase.from("users").select("*").ilike("email", normalized).maybeSingle();
        if (error) console.error("[userRepository.findByEmailInsensitive error]", error);
        return mapToUser(data);
    },

    async create(data: Partial<User>): Promise<User> {
        const supabase = getSupabaseAdmin();
        const dbData: Record<string, any> = {
            email: data.email?.trim().toLowerCase(),
            username: data.username,
            display_name: data.displayName,
            avatar_url: data.avatarUrl,
            bio: data.bio,
            status: data.status || "offline",
            onboarding_completed: data.onboardingCompleted ?? false,
            email_verified: data.emailVerified ?? false,
        };
        if (data.passwordHash) dbData.password_hash = data.passwordHash;
        if (data.googleId) dbData.google_id = data.googleId;

        const { data: created, error } = await supabase.from("users").insert(dbData).select().single();
        if (error) {
            console.error("[userRepository.create error]", error);
            throw error;
        }
        return mapToUser(created)!;
    },

    async update(id: string, data: Partial<User>): Promise<User> {
        const supabase = getSupabaseAdmin();
        const dbData: Record<string, any> = {};
        if (data.displayName !== undefined) dbData.display_name = data.displayName;
        if (data.avatarUrl !== undefined) dbData.avatar_url = data.avatarUrl;
        if (data.bio !== undefined) dbData.bio = data.bio;
        if (data.status !== undefined) dbData.status = data.status;
        if (data.username !== undefined) dbData.username = data.username;
        if (data.onboardingCompleted !== undefined) dbData.onboarding_completed = data.onboardingCompleted;
        if (data.emailVerified !== undefined) dbData.email_verified = data.emailVerified;
        if (data.classYear !== undefined) dbData.class_year = data.classYear;
        if (data.section !== undefined) dbData.section = data.section;
        if (data.githubUrl !== undefined) dbData.github_url = data.githubUrl;
        if (data.linkedinUrl !== undefined) dbData.linkedin_url = data.linkedinUrl;
        if (data.websiteUrl !== undefined) dbData.website_url = data.websiteUrl;
        if (data.interests !== undefined) dbData.interests = data.interests;
        if (data.skills !== undefined) dbData.skills = data.skills;

        const { data: updated, error } = await supabase.from("users").update(dbData).eq("id", id).select().single();
        if (error) {
            console.error("[userRepository.update error]", error);
            throw error;
        }
        return mapToUser(updated)!;
    },

    async deleteById(id: string): Promise<User | null> {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.from("users").delete().eq("id", id).select().maybeSingle();
        if (error) {
            console.error("[userRepository.deleteById error]", error);
            throw error;
        }
        return mapToUser(data);
    },
};
