/**
 * Avatar URL normalization & resolution utility for React Native
 * Converts SVGs (like Dicebear) to PNG, resolves Supabase storage paths,
 * relative API endpoints, and inspects all nested user/author avatar fields.
 */

const SUPABASE_STORAGE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "") ||
  "https://tgbjgyhcfhqvwayvvwkl.supabase.co";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, "") ||
  "https://aiic-bbs.vercel.app";

export function formatAvatarUrl(url?: string | null): string | null {
  if (!url || typeof url !== "string") return null;
  let trimmed = url.trim();
  if (!trimmed) return null;

  // Dicebear SVG to PNG conversion for React Native Image rendering
  if (trimmed.includes("api.dicebear.com")) {
    if (trimmed.includes("/svg?") || trimmed.includes("/svg")) {
      trimmed = trimmed.replace("/svg?", "/png?").replace("/svg", "/png");
    }
  }

  // Handle Supabase Storage Paths (e.g. avatars/xyz.png)
  if (
    trimmed.startsWith("avatars/") ||
    trimmed.startsWith("server-icons/") ||
    trimmed.startsWith("attachments/") ||
    trimmed.startsWith("stickers/")
  ) {
    return `${SUPABASE_STORAGE_URL}/storage/v1/object/public/${trimmed}`;
  }

  // Handle relative storage paths
  if (trimmed.startsWith("/storage/v1/object/public/")) {
    return `${SUPABASE_STORAGE_URL}${trimmed}`;
  }

  // Handle relative API/uploads endpoints
  if (trimmed.startsWith("/")) {
    return `${API_BASE_URL}${trimmed}`;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return trimmed;
}

export function resolveUserAvatar(userOrAuthor?: any): string | null {
  if (!userOrAuthor) return null;
  if (typeof userOrAuthor === "string") return formatAvatarUrl(userOrAuthor);

  const rawUrl =
    userOrAuthor.avatarUrl ||
    userOrAuthor.avatar_url ||
    userOrAuthor.avatar ||
    userOrAuthor.profilePicture ||
    userOrAuthor.profile_picture ||
    userOrAuthor.profileImage ||
    userOrAuthor.profile_image ||
    userOrAuthor.imageUrl ||
    userOrAuthor.image_url ||
    userOrAuthor.photoUrl ||
    userOrAuthor.photo_url ||
    userOrAuthor.user_metadata?.avatar_url ||
    userOrAuthor.raw_user_meta_data?.avatar_url ||
    userOrAuthor.user?.avatarUrl ||
    userOrAuthor.user?.avatar_url ||
    userOrAuthor.user?.avatar ||
    userOrAuthor.author?.avatarUrl ||
    userOrAuthor.author?.avatar_url ||
    userOrAuthor.author?.avatar ||
    null;

  return formatAvatarUrl(rawUrl);
}
