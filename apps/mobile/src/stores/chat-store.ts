import { create } from "zustand";
import { ChatMessage } from "../lib/types";
import { getSupabaseClient } from "../lib/supabase";
import {
  fetchChannelMessages,
  sendChannelMessage,
  fetchDMMessages,
  sendDMMessage,
  deleteChannelMessage,
  deleteDMMessage,
  editDMMessage,
  addDMReaction,
  removeDMReaction,
  addMessageReaction,
  removeMessageReaction,
} from "../lib/api";
import { offlineManager } from "../lib/offline-manager";
import { notificationService } from "../lib/notifications";
import { NativeHaptics } from "../lib/haptics";

interface ChatState {
  messages: Record<string, ChatMessage[]>;
  dmMessages: Record<string, ChatMessage[]>;
  activeChannelSubscription: any | null;
  activeDMSubscription: any | null;
  channelPollTimer: any | null;
  dmPollTimer: any | null;
  typingUsers: Record<string, string[]>;
  isLoadingMessages: boolean;

  // Actions
  loadChannelMessages: (channelId: string) => Promise<void>;
  sendChannelMessageAction: (channelId: string, content: string, replyToId?: string) => Promise<void>;
  deleteChannelMessageAction: (channelId: string, messageId: string) => Promise<void>;
  loadDMMessagesAction: (dmId: string) => Promise<void>;
  sendDMMessageAction: (dmId: string, content: string, replyToId?: string) => Promise<void>;
  deleteDMMessageAction: (dmId: string, messageId: string) => Promise<void>;
  editDMMessageAction: (dmId: string, messageId: string, content: string) => Promise<void>;
  toggleDMReaction: (dmId: string, messageId: string, emoji: string) => Promise<void>;
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
    // 1. Instant hydration from offline cache if available
    const cached = await offlineManager.getCache<ChatMessage[]>(`channel_msgs_${channelId}`);
    if (cached && cached.length > 0) {
      set((state) => ({
        messages: {
          ...state.messages,
          [channelId]: cached,
        },
      }));
    }

    set({ isLoadingMessages: !cached });
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

      // Cache fresh messages
      await offlineManager.setCache(`channel_msgs_${channelId}`, formatted);

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
    NativeHaptics.medium();

    // Optimistic temporary message
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      author: {
        id: "me",
        name: "Me",
        avatar: null,
      },
      at: new Date().toISOString(),
      text: content,
      reactions: [],
    };
    get().addMessage(channelId, optimisticMsg);

    try {
      const res = await sendChannelMessage(channelId, content, replyToId);
      if (res?.message) {
        const m = res.message;
        const finalMsg: ChatMessage = {
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
        // Replace temp msg with real message
        set((state) => ({
          messages: {
            ...state.messages,
            [channelId]: (state.messages[channelId] || []).map((msg) => (msg.id === tempId ? finalMsg : msg)),
          },
        }));
      }
    } catch (err) {
      console.warn("[ChatStore] Network send failed, queueing in outbox:", err);
      await offlineManager.queueMessage({
        type: "channel",
        targetId: channelId,
        content,
        replyToId,
      });
      notificationService.show({
        title: "Offline",
        body: "Message saved to outbox. Will send automatically once online.",
        type: "info",
      });
    }
  },

  loadDMMessagesAction: async (dmId: string) => {
    // 1. Instant hydration from offline cache
    const cached = await offlineManager.getCache<ChatMessage[]>(`dm_msgs_${dmId}`);
    if (cached && cached.length > 0) {
      set((state) => ({
        dmMessages: {
          ...state.dmMessages,
          [dmId]: cached,
        },
      }));
    }

    set({ isLoadingMessages: !cached });
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

      await offlineManager.setCache(`dm_msgs_${dmId}`, formatted);

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
    NativeHaptics.medium();

    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      author: {
        id: "me",
        name: "Me",
        avatar: null,
      },
      at: new Date().toISOString(),
      text: content,
      reactions: [],
    };
    get().addDMMessage(dmId, optimisticMsg);

    try {
      const res = await sendDMMessage(dmId, content, replyToId);
      if (res?.message) {
        const m = res.message;
        const finalMsg: ChatMessage = {
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
        set((state) => ({
          dmMessages: {
            ...state.dmMessages,
            [dmId]: (state.dmMessages[dmId] || []).map((msg) => (msg.id === tempId ? finalMsg : msg)),
          },
        }));
      }
    } catch (err) {
      console.warn("[ChatStore] DM send failed, queueing in outbox:", err);
      await offlineManager.queueMessage({
        type: "dm",
        targetId: dmId,
        content,
        replyToId,
      });
      notificationService.show({
        title: "Offline",
        body: "Direct message saved to outbox. Will send automatically once online.",
        type: "info",
      });
    }
  },

  deleteChannelMessageAction: async (channelId: string, messageId: string) => {
    NativeHaptics.heavy();
    const previousMsgs = get().messages[channelId] || [];

    // Optimistic deletion
    const nextMsgs = previousMsgs.filter((m) => m.id !== messageId);
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: nextMsgs,
      },
    }));
    await offlineManager.setCache(`channel_msgs_${channelId}`, nextMsgs);

    try {
      await deleteChannelMessage(messageId);
      notificationService.show({
        title: "Message Deleted",
        body: "Your message was removed from the channel.",
        type: "info",
      });
    } catch (err: any) {
      console.error("[ChatStore] Failed to delete channel message:", err);
      // Rollback on error
      set((state) => ({
        messages: {
          ...state.messages,
          [channelId]: previousMsgs,
        },
      }));
      await offlineManager.setCache(`channel_msgs_${channelId}`, previousMsgs);
      notificationService.show({
        title: "Deletion Failed",
        body: err?.message || "Could not delete message.",
        type: "warning",
      });
      throw err;
    }
  },

  deleteDMMessageAction: async (dmId: string, messageId: string) => {
    NativeHaptics.heavy();
    const previousMsgs = get().dmMessages[dmId] || [];

    // Optimistic deletion
    const nextMsgs = previousMsgs.filter((m) => m.id !== messageId);
    set((state) => ({
      dmMessages: {
        ...state.dmMessages,
        [dmId]: nextMsgs,
      },
    }));
    await offlineManager.setCache(`dm_msgs_${dmId}`, nextMsgs);

    try {
      await deleteDMMessage(dmId, messageId);
      notificationService.show({
        title: "Message Deleted",
        body: "Your direct message was removed.",
        type: "info",
      });
    } catch (err: any) {
      console.error("[ChatStore] Failed to delete DM message:", err);
      // Rollback on error
      set((state) => ({
        dmMessages: {
          ...state.dmMessages,
          [dmId]: previousMsgs,
        },
      }));
      await offlineManager.setCache(`dm_msgs_${dmId}`, previousMsgs);
      notificationService.show({
        title: "Deletion Failed",
        body: err?.message || "Could not delete direct message.",
        type: "warning",
      });
      throw err;
    }
  },

  editDMMessageAction: async (dmId: string, messageId: string, content: string) => {
    NativeHaptics.medium();
    const previousMsgs = get().dmMessages[dmId] || [];

    // Optimistic edit
    const nextMsgs = previousMsgs.map((m) =>
      m.id === messageId ? { ...m, text: content } : m
    );
    set((state) => ({
      dmMessages: {
        ...state.dmMessages,
        [dmId]: nextMsgs,
      },
    }));
    await offlineManager.setCache(`dm_msgs_${dmId}`, nextMsgs);

    try {
      await editDMMessage(dmId, messageId, content);
      notificationService.show({
        title: "Message Edited",
        body: "Your message has been updated.",
        type: "success",
      });
    } catch (err: any) {
      console.error("[ChatStore] Failed to edit DM message:", err);
      set((state) => ({
        dmMessages: {
          ...state.dmMessages,
          [dmId]: previousMsgs,
        },
      }));
      await offlineManager.setCache(`dm_msgs_${dmId}`, previousMsgs);
      notificationService.show({
        title: "Edit Failed",
        body: err?.message || "Could not edit message.",
        type: "warning",
      });
      throw err;
    }
  },

  toggleDMReaction: async (dmId: string, messageId: string, emoji: string) => {
    const dmMsgs = get().dmMessages[dmId] || [];
    const targetMsg = dmMsgs.find((m) => m.id === messageId);
    const existingReaction = targetMsg?.reactions?.find((r) => r.emoji === emoji);

    // Optimistic update
    set((state) => {
      const msgs = (state.dmMessages[dmId] || []).map((msg) => {
        if (msg.id !== messageId) return msg;
        const reactions = [...(msg.reactions || [])];
        const match = reactions.find((r) => r.emoji === emoji);

        if (match) {
          if (match.reacted) {
            match.count = Math.max(0, match.count - 1);
            match.reacted = false;
          } else {
            match.count += 1;
            match.reacted = true;
          }
        } else {
          reactions.push({ emoji, count: 1, reacted: true });
        }
        return { ...msg, reactions: reactions.filter((r) => r.count > 0) };
      });

      return {
        dmMessages: {
          ...state.dmMessages,
          [dmId]: msgs,
        },
      };
    });

    try {
      if (existingReaction?.reacted) {
        await removeDMReaction(dmId, messageId, emoji);
      } else {
        await addDMReaction(dmId, messageId, emoji);
      }
    } catch (err) {
      console.warn("[ChatStore] Failed to toggle DM reaction:", err);
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

  channelPollTimer: null,
  dmPollTimer: null,

  subscribeToChannel: (channelId: string) => {
    get().unsubscribeFromChannel();
    try {
      const supabase = getSupabaseClient();
      const channel = supabase.channel(`channel:${channelId}`, {
        config: { broadcast: { self: false } },
      });

      channel
        .on("broadcast", { event: "new_message" }, ({ payload }: { payload: any }) => {
          const raw = payload?.message || payload;
          if (raw && (raw.id || raw.text || raw.content)) {
            const formatted: ChatMessage = {
              id: raw.id,
              author: {
                id: raw.author?.id || raw.authorId || "unknown",
                name: raw.author?.displayName || raw.author?.username || raw.author?.name || "Member",
                avatar: raw.author?.avatarUrl || raw.author?.avatar || null,
              },
              at: raw.createdAt || raw.at || new Date().toISOString(),
              text: raw.content ?? raw.text ?? "",
              replyTo: raw.replyTo,
              reactions: raw.reactions || [],
              pinned: raw.pinned || false,
            };
            get().addMessage(channelId, formatted);
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
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "messages",
            filter: `channel_id=eq.${channelId}`,
          },
          async (payload: any) => {
            if (payload.eventType === "INSERT") {
              const row = payload.new;
              if (!row) return;

              const currentList = get().messages[channelId] || [];
              if (currentList.some((m) => m.id === row.id)) return;

              const { data: authorUser } = await supabase
                .from("users")
                .select("id, username, display_name, avatar_url")
                .eq("id", row.author_id)
                .maybeSingle();

              const msg: ChatMessage = {
                id: row.id,
                author: {
                  id: row.author_id,
                  name: authorUser?.display_name || authorUser?.username || "Member",
                  avatar: authorUser?.avatar_url || null,
                },
                at: row.created_at,
                text: row.content,
                replyTo: row.reply_to_id ? { id: row.reply_to_id, authorName: "User", text: "" } : undefined,
                reactions: [],
                pinned: row.pinned || false,
              };

              get().addMessage(channelId, msg);
            } else if (payload.eventType === "DELETE") {
              const row = payload.old;
              if (row?.id) {
                set((state) => ({
                  messages: {
                    ...state.messages,
                    [channelId]: (state.messages[channelId] || []).filter((m) => m.id !== row.id),
                  },
                }));
              }
            } else if (payload.eventType === "UPDATE") {
              const row = payload.new;
              if (row?.id) {
                set((state) => ({
                  messages: {
                    ...state.messages,
                    [channelId]: (state.messages[channelId] || []).map((m) =>
                      m.id === row.id ? { ...m, text: row.content, pinned: row.pinned || false } : m
                    ),
                  },
                }));
              }
            }
          }
        )
        .subscribe();

      // Fast sync polling (2s) to guarantee real-time delivery across network transitions
      const pollTimer = setInterval(() => {
        fetchChannelMessages(channelId, 30)
          .then((res) => {
            if (res.messages && res.messages.length > 0) {
              const formatted: ChatMessage[] = res.messages.map((m: any) => ({
                id: m.id,
                author: {
                  id: m.author?.id || m.authorId,
                  name: m.author?.displayName || m.author?.username || "Member",
                  avatar: m.author?.avatarUrl || null,
                },
                at: m.createdAt,
                text: m.content,
                replyTo: m.replyTo
                  ? { id: m.replyTo.id, authorName: m.replyTo.author?.displayName || "User", text: m.replyTo.content }
                  : undefined,
                reactions: m.reactions || [],
                pinned: m.pinned || false,
              }));

              const current = get().messages[channelId] || [];
              if (
                current.length !== formatted.length ||
                (formatted.length > 0 && current[current.length - 1]?.id !== formatted[formatted.length - 1]?.id)
              ) {
                set((state) => ({
                  messages: {
                    ...state.messages,
                    [channelId]: formatted,
                  },
                }));
              }
            }
          })
          .catch(() => {});
      }, 2000);

      set({ activeChannelSubscription: channel, channelPollTimer: pollTimer });
    } catch {}
  },

  unsubscribeFromChannel: () => {
    const { activeChannelSubscription, channelPollTimer } = get();
    if (channelPollTimer) clearInterval(channelPollTimer);
    if (activeChannelSubscription) {
      try {
        const supabase = getSupabaseClient();
        supabase.removeChannel(activeChannelSubscription);
      } catch {}
      set({ activeChannelSubscription: null, channelPollTimer: null });
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
          const raw = payload?.message || payload;
          if (raw && (raw.id || raw.text || raw.content)) {
            const formatted: ChatMessage = {
              id: raw.id,
              author: {
                id: raw.author?.id || raw.authorId || "unknown",
                name: raw.author?.displayName || raw.author?.username || raw.author?.name || "User",
                avatar: raw.author?.avatarUrl || raw.author?.avatar || null,
              },
              at: raw.createdAt || raw.at || new Date().toISOString(),
              text: raw.content ?? raw.text ?? "",
              reactions: raw.reactions || [],
            };
            get().addDMMessage(dmId, formatted);
          }
        })
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "dm_messages",
            filter: `conversation_id=eq.${dmId}`,
          },
          async (payload: any) => {
            if (payload.eventType === "INSERT") {
              const row = payload.new;
              if (!row) return;

              const currentList = get().dmMessages[dmId] || [];
              if (currentList.some((m) => m.id === row.id)) return;

              const { data: authorUser } = await supabase
                .from("users")
                .select("id, username, display_name, avatar_url")
                .eq("id", row.author_id)
                .maybeSingle();

              const msg: ChatMessage = {
                id: row.id,
                author: {
                  id: row.author_id,
                  name: authorUser?.display_name || authorUser?.username || "User",
                  avatar: authorUser?.avatar_url || null,
                },
                at: row.created_at,
                text: row.content,
                reactions: [],
              };

              get().addDMMessage(dmId, msg);
            } else if (payload.eventType === "DELETE") {
              const row = payload.old;
              if (row?.id) {
                set((state) => ({
                  dmMessages: {
                    ...state.dmMessages,
                    [dmId]: (state.dmMessages[dmId] || []).filter((m) => m.id !== row.id),
                  },
                }));
              }
            }
          }
        )
        .subscribe();

      // Fast sync polling (2s)
      const pollTimer = setInterval(() => {
        fetchDMMessages(dmId, 30)
          .then((res) => {
            if (res.messages && res.messages.length > 0) {
              const formatted: ChatMessage[] = res.messages.map((m: any) => ({
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

              const current = get().dmMessages[dmId] || [];
              if (
                current.length !== formatted.length ||
                (formatted.length > 0 && current[current.length - 1]?.id !== formatted[formatted.length - 1]?.id)
              ) {
                set((state) => ({
                  dmMessages: {
                    ...state.dmMessages,
                    [dmId]: formatted,
                  },
                }));
              }
            }
          })
          .catch(() => {});
      }, 2000);

      set({ activeDMSubscription: channel, dmPollTimer: pollTimer });
    } catch {}
  },

  unsubscribeFromDM: () => {
    const { activeDMSubscription, dmPollTimer } = get();
    if (dmPollTimer) clearInterval(dmPollTimer);
    if (activeDMSubscription) {
      try {
        const supabase = getSupabaseClient();
        supabase.removeChannel(activeDMSubscription);
      } catch {}
      set({ activeDMSubscription: null, dmPollTimer: null });
    }
  },
}));
