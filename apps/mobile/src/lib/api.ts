import { NativeStorage } from "./storage";
import {
  SpaceSummary,
  ChannelSection,
  ChatMessage,
  DMSummary,
  FriendEntry,
  AIICProject,
  AIICEvent,
  AIICAchievement,
  AIICMemberProfile,
  AIICAnnouncement,
  AIICArchiveEntry,
  BoardData,
  DocContent,
  IncidentMeta,
  PullRequest,
} from "./types";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, "") ||
  "https://aiic-bbs.vercel.app/api";

let memoryToken: string | null = null;

export function setAuthToken(token: string | null) {
  memoryToken = token;
  if (token) {
    NativeStorage.setItem("aiic_auth_token", token);
  } else {
    NativeStorage.removeItem("aiic_auth_token");
  }
}

export async function getAuthToken(): Promise<string | null> {
  if (memoryToken) return memoryToken;
  memoryToken = await NativeStorage.getItem("aiic_auth_token");
  return memoryToken;
}

export interface CustomRequestInit extends RequestInit {
  timeoutMs?: number;
}

export async function api<T>(path: string, options: CustomRequestInit = {}): Promise<T> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_BASE_URL}${normalizedPath}`;
  const method = options.method || "GET";
  const timeoutMs = options.timeoutMs ?? 15000;

  console.log(`[API ${method}] -> ${url}`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timer);

    console.log(`[API ${res.status}] <- ${url}`);

    const contentType = res.headers.get("content-type") || "";
    let data: any = null;

    if (contentType.includes("application/json")) {
      data = await res.json().catch(() => null);
    } else {
      const text = await res.text().catch(() => "");
      // If response is an HTML error page (404/500/Vercel fallback), extract a clean error string
      if (text.includes("<!DOCTYPE") || text.includes("<html")) {
        data = { error: `HTTP ${res.status}: Route returned HTML instead of JSON (${normalizedPath})` };
      } else {
        data = text ? { error: text } : null;
      }
    }

    if (!res.ok) {
      const errMessage =
        data?.error || data?.message || "Unable to complete request. Please try again.";
      const err = new Error(errMessage);
      (err as any).status = res.status;
      throw err;
    }

    return (data ?? ({} as T)) as T;
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      throw new Error("Connection timed out. Retrying in background...");
    }
    throw new Error(err.message || "Network connection error");
  }
}

// ─────────────────────────────────────────────────────────────
// 1. AUTH & USER PROFILE
// ─────────────────────────────────────────────────────────────

export async function fetchCurrentProfile() {
  return api<{ user: any }>("/auth/profile");
}

export async function updateProfile(data: {
  displayName?: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
  classYear?: string;
  section?: string;
  githubUrl?: string;
  websiteUrl?: string;
  linkedinUrl?: string;
  interests?: string[];
  skills?: string[];
  status?: string;
}) {
  return api<{ user: any }>("/auth/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// ─────────────────────────────────────────────────────────────
// 2. SPACES & CHANNELS
// ─────────────────────────────────────────────────────────────

export async function fetchSpaces(): Promise<{ servers: any[] }> {
  return api<{ servers: any[] }>("/servers");
}

export async function fetchChannels(spaceId: string): Promise<{ channels: any[] }> {
  return api<{ channels: any[] }>(`/servers/${spaceId}/channels`);
}

export async function createSpace(
  payloadOrName:
    | string
    | {
        name: string;
        description?: string;
        iconUrl?: string;
        channels?: Array<{ name: string; type: string; category?: string }>;
      },
  description?: string
) {
  const body =
    typeof payloadOrName === "string"
      ? { name: payloadOrName, description }
      : payloadOrName;

  return api<{ server: any }>("/servers", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function createChannel(
  spaceId: string,
  name: string,
  type: string = "text",
  category: string = "General",
  topic?: string
) {
  return api<{ channel: any }>(`/servers/${spaceId}/channels`, {
    method: "POST",
    body: JSON.stringify({ name, type, category, topic }),
  });
}

// ─────────────────────────────────────────────────────────────
// 3. MESSAGES & REACTIONS
// ─────────────────────────────────────────────────────────────

export async function fetchChannelMessages(
  channelId: string,
  limit = 50,
  cursor?: string | null
) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (cursor) query.set("cursor", cursor);
  return api<{ messages: any[]; nextCursor: string | null; hasMore: boolean }>(
    `/channels/${channelId}/messages?${query.toString()}`
  );
}

export async function sendChannelMessage(
  channelId: string,
  content: string,
  replyToId?: string
) {
  return api<{ message: any }>(`/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content, replyToId }),
  });
}

export async function addMessageReaction(
  _channelId: string,
  messageId: string,
  emoji: string
) {
  return api<any>(`/messages/${messageId}/reactions`, {
    method: "POST",
    body: JSON.stringify({ emoji }),
  });
}

export async function removeMessageReaction(
  _channelId: string,
  messageId: string,
  emoji: string
) {
  return api<any>(`/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`, {
    method: "DELETE",
  });
}

export async function deleteChannelMessage(messageId: string) {
  return api<{ message: string }>(`/messages/${messageId}`, {
    method: "DELETE",
  });
}

// ─────────────────────────────────────────────────────────────
// 4. DIRECT MESSAGES & FRIENDS
// ─────────────────────────────────────────────────────────────

export async function fetchDMConversations() {
  return api<{ conversations: any[] }>("/dms");
}

export async function createDMConversation(participantIds: string[], name?: string) {
  return api<{ conversation: any; created: boolean }>("/dms", {
    method: "POST",
    body: JSON.stringify({ participantIds, name }),
  });
}

export async function fetchDMMessages(
  dmId: string,
  limit = 50,
  cursor?: string | null
) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (cursor) query.set("cursor", cursor);
  return api<{ messages: any[]; nextCursor: string | null; hasMore: boolean }>(
    `/dms/${dmId}/messages?${query.toString()}`
  );
}

export async function sendDMMessage(
  dmId: string,
  content: string,
  replyToId?: string
) {
  return api<{ message: any }>(`/dms/${dmId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content, replyToId }),
  });
}

export async function deleteDMMessage(dmId: string, messageId: string) {
  return api<{ message: string }>(`/dms/${dmId}/messages/${messageId}`, {
    method: "DELETE",
  });
}

export async function editDMMessage(dmId: string, messageId: string, content: string) {
  return api<{ message: any }>(`/dms/${dmId}/messages/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify({ content }),
  });
}

export async function addDMReaction(dmId: string, messageId: string, emoji: string) {
  return api<any>(`/dms/${dmId}/messages/${messageId}/reactions`, {
    method: "POST",
    body: JSON.stringify({ emoji }),
  });
}

export async function removeDMReaction(dmId: string, messageId: string, emoji: string) {
  return api<any>(`/dms/${dmId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`, {
    method: "DELETE",
  });
}

export async function fetchGifs(
  query?: string,
  category?: string,
  type: "gifs" | "stickers" | "memes" = "gifs"
) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (category) params.set("category", category);
  if (type) params.set("type", type);
  return api<{
    gifs: Array<{ id: string; title: string; url: string; previewUrl?: string }>;
    items?: Array<{ id: string; title: string; url: string; previewUrl?: string }>;
  }>(`/gifs?${params.toString()}`);
}

export async function fetchExpressions(
  type: "gifs" | "stickers" | "memes",
  query?: string,
  category?: string
) {
  return fetchGifs(query, category, type);
}

export async function fetchFriendsDashboard() {
  return api<{
    friends: any[];
    pendingIncoming: any[];
    pendingOutgoing: any[];
    blocked: any[];
  }>("/friends");
}

export async function sendFriendRequest(target: string) {
  return api<{ message: string; status: string; user: any; request?: any }>(
    "/friends/requests",
    {
      method: "POST",
      body: JSON.stringify({ target }),
    }
  );
}

export async function acceptFriendRequest(requestId: string) {
  return api<{ message: string; user: any }>(
    `/friends/requests/${requestId}/accept`,
    { method: "POST" }
  );
}

export async function declineFriendRequest(requestId: string) {
  return api<{ message: string }>(
    `/friends/requests/${requestId}/decline`,
    { method: "POST" }
  );
}

export async function searchUsers(query: string) {
  return api<{ users: any[] }>(`/friends/search?query=${encodeURIComponent(query)}`);
}

export async function fetchUserProfile(userId: string) {
  return api<{ user: any }>(`/friends/users/${encodeURIComponent(userId)}/profile`);
}

export async function fetchVoiceParticipants(channelId: string) {
  return api<{ participants: Array<{ userId: string; username: string; displayName: string; avatarUrl?: string | null }> }>(
    `/channels/${channelId}/voice/participants`
  );
}

export async function leaveVoiceChannel(channelId: string) {
  return api<{ message: string }>(`/channels/${channelId}/voice/leave`, { method: "POST" });
}

// ─────────────────────────────────────────────────────────────
// 5. GITHUB INTEGRATION & ARCHIVE
// ─────────────────────────────────────────────────────────────

export async function fetchChannelGitHub(channelId: string) {
  return api<{
    integration: any | null;
    repository: any | null;
    pullRequests: any[];
    authorizedRepositories: any[];
    channel: any;
  }>(`/channels/${channelId}/github`);
}

export async function bindChannelGitHub(
  channelId: string,
  repositoryId: string,
  options: {
    notifyPullRequests?: boolean;
    notifyIssues?: boolean;
    notifyPushes?: boolean;
    notifyReleases?: boolean;
    notifyWorkflowRuns?: boolean;
  } = {}
) {
  return api<{ integration: any }>(`/channels/${channelId}/github`, {
    method: "POST",
    body: JSON.stringify({ repositoryId, ...options }),
  });
}

export async function fetchArchiveRecords(type?: string, session?: string, q?: string) {
  const query = new URLSearchParams();
  if (type) query.set("type", type);
  if (session) query.set("session", session);
  if (q) query.set("q", q);
  return api<{ records: any[]; stats: any }>(`/archive/records?${query.toString()}`);
}

// ─────────────────────────────────────────────────────────────
// 6. ANNOUNCEMENTS & ADMIN
// ─────────────────────────────────────────────────────────────

export async function fetchAnnouncements() {
  return api<{ announcements: any[] }>("/announcements");
}

export async function publishAnnouncement(data: {
  title: string;
  content: string;
  category?: string;
  priority?: string;
  isPinned?: boolean;
  coverImage?: string;
}) {
  return api<{ success: boolean; notice: any }>("/announcements", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function fetchAdminOverview() {
  return api<{
    stats: {
      totalUsers: number;
      pendingApprovals: number;
      roleCounts: Record<string, number>;
      activeSpaces: number;
      unofficialSpaces: number;
      activeTeams: number;
    };
    adminUser: any;
    recentAudit: any[];
  }>("/admin/overview");
}

export async function fetchOrgMembers(spaceId: string) {
  return api<{ members: any[] }>(`/org/members?spaceId=${encodeURIComponent(spaceId)}`);
}

// ─────────────────────────────────────────────────────────────
// 7. SPECIALIZED MODULE STATE (BOARD, DOCS, INCIDENT, CANVAS, VOICE)
// ─────────────────────────────────────────────────────────────

export async function joinVoiceChannel(channelId: string) {
  return api<{
    url: string;
    token: string;
    roomName: string;
    channelName: string;
    participants: Array<{ userId: string; username: string; displayName: string; avatarUrl?: string | null }>;
  }>(`/channels/${channelId}/voice/join`, { method: "POST" });
}

export async function fetchWorkspaceModules(spaceId: string) {
  return api<{
    boardsByChannel: Record<string, any>;
    docsByChannel: Record<string, any>;
    incidentsByChannel: Record<string, any>;
    canvasesByChannel: Record<string, any>;
    githubByChannel: Record<string, any>;
  }>(`/servers/${spaceId}/modules`);
}

export async function saveBoardState(channelId: string, board: any) {
  return api<{ board: any }>(`/channels/${channelId}/board`, {
    method: "PUT",
    body: JSON.stringify({ board }),
  });
}

export async function saveDocsState(channelId: string, docs: any) {
  return api<{ docs: any }>(`/channels/${channelId}/docs`, {
    method: "PUT",
    body: JSON.stringify({ docs }),
  });
}

export async function saveIncidentState(channelId: string, incident: any) {
  return api<{ incident: any }>(`/channels/${channelId}/incident`, {
    method: "PUT",
    body: JSON.stringify({ incident }),
  });
}

export async function saveCanvasState(channelId: string, data: any) {
  return api<{ data: any }>(`/channels/${channelId}/canvas`, {
    method: "PUT",
    body: JSON.stringify({ data }),
  });
}

// ─────────────────────────────────────────────────────────────
// 8. SPACE CREATION & ADMIN MUTATIONS
// ─────────────────────────────────────────────────────────────

export async function deleteSpace(spaceId: string, reason?: string) {
  return api<{ success: boolean; action: string }>("/admin/spaces/manage", {
    method: "POST",
    body: JSON.stringify({ spaceId, action: "delete", reason }),
  });
}

export async function assignUserRole(
  targetUserId: string,
  roleKey: string,
  reason?: string,
  confirmHighPrivilege?: boolean
) {
  return api<{ success: boolean; user: any }>("/admin/users/role", {
    method: "POST",
    body: JSON.stringify({
      targetUserId,
      roleKey,
      reason,
      confirmHighPrivilege,
    }),
  });
}

export async function appointTeamLeader(
  teamId: string,
  userId: string,
  reason?: string
) {
  return api<{ success: boolean; action: string }>("/admin/teams/mutate", {
    method: "POST",
    body: JSON.stringify({
      teamId,
      action: "appoint_leader",
      userId,
      reason,
    }),
  });
}

export async function removeTeamLeader(teamId: string, reason?: string) {
  return api<{ success: boolean; action: string }>("/admin/teams/mutate", {
    method: "POST",
    body: JSON.stringify({
      teamId,
      action: "remove_leader",
      reason,
    }),
  });
}

export async function setTeamPool(
  teamId: string,
  pool: "Upper Pool" | "Lower Pool",
  position?: number
) {
  return api<{ success: boolean; action: string; position: number; pool: string }>(
    "/admin/teams/mutate",
    {
      method: "POST",
      body: JSON.stringify({
        teamId,
        action: "set_pool",
        pool,
        position,
      }),
    }
  );
}

export async function addTeamMember(
  teamId: string,
  userId: string,
  role = "member"
) {
  return api<{ success: boolean; action: string }>("/admin/teams/mutate", {
    method: "POST",
    body: JSON.stringify({
      teamId,
      action: "add_member",
      userId,
      role,
    }),
  });
}

export async function removeTeamMember(teamId: string, userId: string) {
  return api<{ success: boolean; action: string }>("/admin/teams/mutate", {
    method: "POST",
    body: JSON.stringify({
      teamId,
      action: "remove_member",
      userId,
    }),
  });
}

// ─────────────────────────────────────────────────────────────
// 12. DEDICATED THREADS (SEPARATE FROM INLINE REPLIES)
// ─────────────────────────────────────────────────────────────

export async function fetchChannelThreads(channelId: string) {
  return api<{ threads: any[] }>(`/channels/${channelId}/threads`);
}

export async function fetchThreadForMessage(channelId: string, messageId: string) {
  return api<{ thread: any; parentMessage: any }>(`/threads/by-message/${messageId}`);
}

export async function createThread(channelId: string, parentMessageId: string, title?: string) {
  return api<{ thread: any; parentMessage: any }>("/threads", {
    method: "POST",
    body: JSON.stringify({ channelId, parentMessageId, title }),
  });
}

export async function fetchThreadMessages(threadId: string) {
  return api<{ messages: any[] }>(`/threads/${threadId}/messages`);
}

export async function sendThreadMessage(threadId: string, content: string) {
  return api<{ message: any }>(`/threads/${threadId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}
