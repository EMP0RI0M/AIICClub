import { create } from "zustand";
import {
  SpaceSummary,
  ChannelSection,
  ChannelSummary,
  DMSummary,
  FriendEntry,
  BoardData,
  DocContent,
  PullRequest,
} from "../lib/types";
import {
  fetchSpaces,
  fetchChannels,
  fetchDMConversations,
  fetchFriendsDashboard,
  createSpace as apiCreateSpace,
  createChannel as apiCreateChannel,
  createDMConversation as apiCreateDM,
  fetchChannelGitHub,
} from "../lib/api";
import { offlineManager } from "../lib/offline-manager";
import { parseMessageAttachments } from "../components/chat/AttachmentCard";

interface WorkspaceState {
  spaces: SpaceSummary[];
  sections: Record<string, ChannelSection[]>;
  dms: DMSummary[];
  friends: FriendEntry[];
  incomingRequests: any[];
  outgoingRequests: any[];
  boards: Record<string, BoardData>;
  docs: Record<string, DocContent[]>;
  prs: Record<string, PullRequest[]>;

  activeSpaceId: string | null;
  activeChannelId: string | null;
  activeDMId: string | null;

  isLoadingSpaces: boolean;
  isLoadingChannels: boolean;
  isLoadingDMs: boolean;
  isLoadingFriends: boolean;

  // Actions
  loadSpaces: () => Promise<void>;
  loadChannelsForSpace: (spaceId: string) => Promise<void>;
  loadDMs: (currentUserId?: string) => Promise<void>;
  loadFriends: () => Promise<void>;
  loadChannelGitHub: (channelId: string) => Promise<void>;
  setActiveSpace: (id: string | null) => void;
  setActiveChannel: (id: string | null) => void;
  setActiveDM: (id: string | null) => void;
  markChannelAsRead: (channelId: string) => void;
  markDMAsRead: (dmId: string) => void;
  createSpaceAction: (name: string, description?: string) => Promise<any>;
  createChannelAction: (
    spaceId: string,
    name: string,
    type?: string,
    category?: string
  ) => Promise<any>;
  createDMAction: (participantIds: string[], name?: string) => Promise<any>;
  updateBoard: (channelId: string, board: BoardData) => void;
  updateDoc: (channelId: string, docs: DocContent[]) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  spaces: [],
  sections: {},
  dms: [],
  friends: [],
  incomingRequests: [],
  outgoingRequests: [],
  boards: {},
  docs: {},
  prs: {},

  activeSpaceId: null,
  activeChannelId: null,
  activeDMId: null,

  isLoadingSpaces: false,
  isLoadingChannels: false,
  isLoadingDMs: false,
  isLoadingFriends: false,

  loadSpaces: async () => {
    // 1. Hydrate from cache immediately
    const cached = await offlineManager.getCache<SpaceSummary[]>("spaces_list");
    if (cached && cached.length > 0) {
      set({
        spaces: cached,
        activeSpaceId: get().activeSpaceId || cached[0].id,
      });
    }

    set({ isLoadingSpaces: !cached });
    try {
      const res = await fetchSpaces();
      const rawServers = res?.servers || [];
      const formattedSpaces: SpaceSummary[] = rawServers.map((s: any) => ({
        id: s.id,
        name: s.name,
        icon: s.iconUrl || null,
        unread: false,
      }));

      const activeId = get().activeSpaceId || (formattedSpaces[0]?.id ?? null);
      await offlineManager.setCache("spaces_list", formattedSpaces);

      set({
        spaces: formattedSpaces,
        activeSpaceId: activeId,
        isLoadingSpaces: false,
      });

      if (activeId) {
        get().loadChannelsForSpace(activeId);
      }
    } catch (err) {
      console.warn("[WorkspaceStore] loadSpaces error:", err);
      set({ isLoadingSpaces: false });
    }
  },

  loadChannelsForSpace: async (spaceId: string) => {
    const cachedSections = await offlineManager.getCache<ChannelSection[]>(`sections_${spaceId}`);
    if (cachedSections && cachedSections.length > 0) {
      set((state) => ({
        sections: {
          ...state.sections,
          [spaceId]: cachedSections,
        },
      }));
    }

    set({ isLoadingChannels: !cachedSections });
    try {
      const res = await fetchChannels(spaceId);
      const rawChannels = res?.channels || [];

      // Group channels into categories/sections
      const sectionMap = new Map<string, ChannelSummary[]>();
      for (const ch of rawChannels) {
        const cat = ch.category || "General";
        if (!sectionMap.has(cat)) sectionMap.set(cat, []);
        sectionMap.get(cat)!.push({
          id: ch.id,
          name: ch.name,
          type: ch.type,
          unread: false,
        });
      }

      const sections: ChannelSection[] = Array.from(sectionMap.entries()).map(
        ([name, channels], idx) => ({
          id: `sec-${spaceId}-${idx}`,
          name: name.toUpperCase(),
          channels,
        })
      );

      const firstChanId = sections[0]?.channels[0]?.id ?? null;
      await offlineManager.setCache(`sections_${spaceId}`, sections);

      set((state) => ({
        sections: {
          ...state.sections,
          [spaceId]: sections,
        },
        activeChannelId: state.activeChannelId || firstChanId,
        isLoadingChannels: false,
      }));
    } catch (err) {
      console.warn("[WorkspaceStore] loadChannels error:", err);
      set({ isLoadingChannels: false });
    }
  },

  loadDMs: async (currentUserId?: string) => {
    set({ isLoadingDMs: true });
    try {
      const res = await fetchDMConversations();
      const rawConvos = res?.conversations || [];
      const dms: DMSummary[] = rawConvos.map((c: any) => {
        const otherParticipant =
          (c.participants || []).find((p: any) => (currentUserId ? p.id !== currentUserId : true)) ||
          c.participants?.[0] ||
          null;

        let lastLabel = "";
        if (c.lastMessage?.createdAt) {
          const d = new Date(c.lastMessage.createdAt);
          const now = new Date();
          if (d.toDateString() === now.toDateString()) {
            lastLabel = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          } else {
            lastLabel = d.toLocaleDateString([], { month: "short", day: "numeric" });
          }
        }

        let snippet = "Start a conversation";
        if (c.lastMessage?.content) {
          const safeSnippet = parseMessageAttachments(c.lastMessage.content || "").cleanText || "Attachment";
          snippet = c.lastMessage.isMe ? `You: ${safeSnippet}` : safeSnippet;
        }

        return {
          id: c.id,
          name: c.name || otherParticipant?.displayName || otherParticipant?.username || "Conversation",
          avatar: otherParticipant?.avatarUrl || null,
          presence: otherParticipant?.status || "offline",
          unreadCount: 0,
          lastLabel,
          snippet,
          group: c.type === "group" ? c.participants : undefined,
        };
      });

      set({ dms, isLoadingDMs: false });
    } catch (err) {
      console.warn("[WorkspaceStore] loadDMs error:", err);
      set({ isLoadingDMs: false });
    }
  },

  loadFriends: async () => {
    set({ isLoadingFriends: true });
    try {
      const res = await fetchFriendsDashboard();
      const friendsList: FriendEntry[] = (res?.friends || []).map((f: any) => ({
        id: f.user.id,
        name: f.user.displayName || f.user.username,
        avatar: f.user.avatarUrl || null,
        presence: f.user.status || "offline",
        status: f.user.bio || undefined,
      }));

      set({
        friends: friendsList,
        incomingRequests: res?.pendingIncoming || [],
        outgoingRequests: res?.pendingOutgoing || [],
        isLoadingFriends: false,
      });
    } catch (err) {
      console.warn("[WorkspaceStore] loadFriends error:", err);
      set({ isLoadingFriends: false });
    }
  },

  loadChannelGitHub: async (channelId: string) => {
    try {
      const res = await fetchChannelGitHub(channelId);
      if (res?.pullRequests) {
        set((state) => ({
          prs: {
            ...state.prs,
            [channelId]: res.pullRequests,
          },
        }));
      }
    } catch (err) {
      console.warn("[WorkspaceStore] loadChannelGitHub error:", err);
    }
  },

  setActiveSpace: (id) => {
    set({ activeSpaceId: id });
    if (id) {
      get().loadChannelsForSpace(id);
    }
  },

  setActiveChannel: (id) => {
    set({ activeChannelId: id });
    if (id) {
      get().markChannelAsRead(id);
    }
  },
  setActiveDM: (id) => {
    set({ activeDMId: id });
    if (id) {
      get().markDMAsRead(id);
    }
  },

  markChannelAsRead: (channelId: string) => {
    set((state) => {
      const nextSections = { ...state.sections };
      for (const spaceId in nextSections) {
        nextSections[spaceId] = nextSections[spaceId].map((sec) => ({
          ...sec,
          channels: sec.channels.map((ch) =>
            ch.id === channelId ? { ...ch, unread: false, unreadCount: 0 } : ch
          ),
        }));
      }
      return { sections: nextSections };
    });
  },

  markDMAsRead: (dmId: string) => {
    set((state) => ({
      dms: state.dms.map((d) => (d.id === dmId ? { ...d, unreadCount: 0 } : d)),
    }));
  },

  createSpaceAction: async (name: string, description?: string) => {
    const res = await apiCreateSpace(name, description);
    await get().loadSpaces();
    return res;
  },

  createChannelAction: async (spaceId: string, name: string, type = "text", category = "General") => {
    const res = await apiCreateChannel(spaceId, name, type, category);
    await get().loadChannelsForSpace(spaceId);
    return res;
  },

  createDMAction: async (participantIds: string[], name?: string) => {
    const res = await apiCreateDM(participantIds, name);
    await get().loadDMs();
    return res;
  },

  updateBoard: (channelId, board) =>
    set((state) => ({ boards: { ...state.boards, [channelId]: board } })),
  updateDoc: (channelId, docs) =>
    set((state) => ({ docs: { ...state.docs, [channelId]: docs } })),
}));
