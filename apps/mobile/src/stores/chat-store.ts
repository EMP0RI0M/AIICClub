import { create } from "zustand";
import { ChatMessage } from "../lib/types";
import { getSupabaseClient } from "../lib/supabase";
import {
  fetchChannelMessages,
  sendChannelMessage,
  fetchDMMessages,
  sendDMMessage,
  addMessageReaction,
  removeMessageReaction,
} from "../lib/api";

interface ChatState {
  messages: Record<string, ChatMessage[]>;
  dmMessages: Record<string, ChatMessage[]>;
  activeChannelSubscription: any | null;
  activeDMSubscription: any | null;
  typingUsers: Record<string, string[]>;
  isLoadingMessages: boolean;

  // Actions
  loadChannelMessages: (channelId: string) => Promise<void>;
  sendChannelMessageAction: (channelId: string, content: string, replyToId?: string) => Promise<void>;
  loadDMMessagesAction: (dmId: string) => Promise<void>;
  sendDMMessageAction: (dmId: string, content: string, replyToId?: string) => Promise<void>;
  toggleReaction: (channelId: string, messageId: string, emoji: string) => Promise<void>;

  addMessage: (channelId: string, message: ChatMessage) => void;
  addDMMessage: (dmId: string, message: ChatMessage) => void;
  subscribeToChannel: (channelId: string) => void;
  unsubscribeFromChannel: () => void;
  subscribeToDM: (dmId: string) => void;
  unsubscribeFromDM: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: {},
  dmMessages: {},
  activeChannelSubscription: null,
  activeDMSubscription: null,
  typingUsers: {},
  isLoadingMessages: false,

  loadChannelMessages: async (channelId: string) => {
    set({ isLoadingMessages: true });
    try {
      const res = await fetchChannelMessages(channelId);
      const formatted: ChatMessage[] = (res.messages || []).map((m: any) => ({
        id: m.id,
        author: {
          id: m.author?.id || m.authorId,
          name: m.author?.displayName || m.author?.username || "Member",
          avatar: m.author?.avatarUrl || null,
        },
        at: m.createdAt,
        text: m.content,
        replyTo: m.replyTo ? { id: m.replyTo.id, authorName: m.replyTo.author?.displayName || "User", text: m.replyTo.content } : undefined,
        reactions: m.reactions || [],
        pinned: m.pinned || false,
      }));

      set((state) => ({
        messages: {
          ...state.messages,
          [channelId]: formatted,
        },
        isLoadingMessages: false,
      }));
    } catch (err) {
      console.warn("[ChatStore] loadChannelMessages error:", err);
      set({ isLoadingMessages: false });
    }
  },

  sendChannelMessageAction: async (channelId: string, content: string, replyToId?: string) => {
    try {
      const res = await sendChannelMessage(channelId, content, replyToId);
      if (res?.message) {
        const m = res.message;
        const msgObj: ChatMessage = {
          id: m.id,
          author: {
            id: m.author?.id || m.authorId,
            name: m.author?.displayName || m.author?.username || "Me",
            avatar: m.author?.avatarUrl || null,
          },
          at: m.createdAt,
          text: m.content,
          reactions: [],
        };
        get().addMessage(channelId, msgObj);
      }
    } catch (err) {
      console.error("[ChatStore] sendChannelMessage error:", err);
      throw err;
    }
  },

  loadDMMessagesAction: async (dmId: string) => {
    set({ isLoadingMessages: true });
    try {
      const res = await fetchDMMessages(dmId);
      const formatted: ChatMessage[] = (res.messages || []).map((m: any) => ({
        id: m.id,
        author: {
          id: m.author?.id || m.authorId,
          name: m.author?.displayName || m.author?.username || "User",
          avatar: m.author?.avatarUrl || null,
        },
        at: m.createdAt,
        text: m.content,
        reactions: m.reactions || [],
      }));

      set((state) => ({
        dmMessages: {
          ...state.dmMessages,
          [dmId]: formatted,
        },
        isLoadingMessages: false,
      }));
    } catch (err) {
      console.warn("[ChatStore] loadDMMessages error:", err);
      set({ isLoadingMessages: false });
    }
  },

  sendDMMessageAction: async (dmId: string, content: string, replyToId?: string) => {
    try {
      const res = await sendDMMessage(dmId, content, replyToId);
      if (res?.message) {
        const m = res.message;
        const msgObj: ChatMessage = {
          id: m.id,
          author: {
            id: m.author?.id || m.authorId,
            name: m.author?.displayName || m.author?.username || "Me",
            avatar: m.author?.avatarUrl || null,
          },
          at: m.createdAt,
          text: m.content,
          reactions: [],
        };
        get().addDMMessage(dmId, msgObj);
      }
    } catch (err) {
      console.error("[ChatStore] sendDMMessage error:", err);
      throw err;
    }
  },

  toggleReaction: async (channelId: string, messageId: string, emoji: string) => {
    const channelMsgs = get().messages[channelId] || [];
    const targetMsg = channelMsgs.find((m) => m.id === messageId);
    const existingReaction = targetMsg?.reactions?.find((r) => r.emoji === emoji);

    // Optimistic update
    set((state) => {
      return {
        messages: {
          ...state.messages,
          [channelId]: channelMsgs.map((m) => {
            if (m.id !== messageId) return m;
            const safeReactions = m.reactions || [];
            const exists = safeReactions.find((r) => r.emoji === emoji);
            if (exists) {
              return {
                ...m,
                reactions: safeReactions
                  .map((r) =>
                    r.emoji === emoji
                      ? { ...r, count: r.reacted ? r.count - 1 : r.count + 1, reacted: !r.reacted }
                      : r
                  )
                  .filter((r) => r.count > 0),
              };
            }
            return {
              ...m,
              reactions: [...safeReactions, { emoji, count: 1, reacted: true }],
            };
          }),
        },
      };
    });

    try {
      if (existingReaction?.reacted) {
        await removeMessageReaction(channelId, messageId, emoji);
      } else {
        await addMessageReaction(channelId, messageId, emoji);
      }
    } catch (err) {
      console.warn("[ChatStore] toggleReaction error:", err);
      // Revert if needed
    }
  },

  addMessage: (channelId: string, message: ChatMessage) =>
    set((state: ChatState) => {
      const existing = state.messages[channelId] || [];
      if (existing.some((m) => m.id === message.id)) return state;
      return {
        messages: {
          ...state.messages,
          [channelId]: [...existing, message],
        },
      };
    }),

  addDMMessage: (dmId: string, message: ChatMessage) =>
    set((state: ChatState) => {
      const existing = state.dmMessages[dmId] || [];
      if (existing.some((m) => m.id === message.id)) return state;
      return {
        dmMessages: {
          ...state.dmMessages,
          [dmId]: [...existing, message],
        },
      };
    }),

  subscribeToChannel: (channelId: string) => {
    get().unsubscribeFromChannel();
    try {
      const supabase = getSupabaseClient();
      const channel = supabase.channel(`channel:${channelId}`, {
        config: { broadcast: { self: false } },
      });

      channel
        .on("broadcast", { event: "new_message" }, ({ payload }: { payload: any }) => {
          if (payload) {
            get().addMessage(channelId, payload);
          }
        })
        .on("broadcast", { event: "typing" }, ({ payload }: { payload: any }) => {
          if (payload?.username) {
            set((s: ChatState) => ({
              typingUsers: {
                ...s.typingUsers,
                [channelId]: [...new Set([...(s.typingUsers[channelId] || []), payload.username])],
              },
            }));
            setTimeout(() => {
              set((s: ChatState) => ({
                typingUsers: {
                  ...s.typingUsers,
                  [channelId]: (s.typingUsers[channelId] || []).filter((u: string) => u !== payload.username),
                },
              }));
            }, 3000);
          }
        })
        .subscribe();

      set({ activeChannelSubscription: channel });
    } catch {}
  },

  unsubscribeFromChannel: () => {
    const sub = get().activeChannelSubscription;
    if (sub) {
      try {
        const supabase = getSupabaseClient();
        supabase.removeChannel(sub);
      } catch {}
      set({ activeChannelSubscription: null });
    }
  },

  subscribeToDM: (dmId: string) => {
    get().unsubscribeFromDM();
    try {
      const supabase = getSupabaseClient();
      const channel = supabase.channel(`dm:${dmId}`, {
        config: { broadcast: { self: false } },
      });

      channel
        .on("broadcast", { event: "new_message" }, ({ payload }: { payload: any }) => {
          if (payload) {
            get().addDMMessage(dmId, payload);
          }
        })
        .subscribe();

      set({ activeDMSubscription: channel });
    } catch {}
  },

  unsubscribeFromDM: () => {
    const sub = get().activeDMSubscription;
    if (sub) {
      try {
        const supabase = getSupabaseClient();
        supabase.removeChannel(sub);
      } catch {}
      set({ activeDMSubscription: null });
    }
  },
}));
