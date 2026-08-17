import { create } from "zustand";
import type { MessageData } from "@/shared/lib/api";

const MAX_MESSAGES_PER_CHANNEL = 1000;

function trimMessages(messages: MessageData[]) {
    if (messages.length <= MAX_MESSAGES_PER_CHANNEL) return messages;
    return messages.slice(-MAX_MESSAGES_PER_CHANNEL);
}

function dedupeMessages(messages: MessageData[]) {
    const seen = new Set<string>();
    return messages.filter((message) => {
        if (!message || !message.id) return false;
        if (seen.has(message.id)) return false;
        seen.add(message.id);
        return true;
    });
}

function sortMessagesChronologically(messages: MessageData[]) {
    return dedupeMessages(messages).sort((a, b) => {
        const ta = new Date(a.createdAt || 0).getTime();
        const tb = new Date(b.createdAt || 0).getTime();
        if (ta !== tb) return ta - tb;
        return (a.id || "").localeCompare(b.id || "");
    });
}

interface TypingUser {
    userId: string;
    username: string;
    timeout: ReturnType<typeof setTimeout>;
}

interface ChatState {
    // Messages per channel
    messages: Record<string, MessageData[]>;
    // Pagination cursors per channel
    cursors: Record<string, string | null>;
    hasMore: Record<string, boolean>;
    // Typing indicators per channel
    typingUsers: Record<string, TypingUser[]>;
    // Loading states
    loadingChannels: Set<string>;

    // Actions
    setMessages: (channelId: string, messages: MessageData[], cursor: string | null, hasMore: boolean) => void;
    prependMessages: (channelId: string, messages: MessageData[], cursor: string | null, hasMore: boolean) => void;
    addMessage: (channelId: string, message: MessageData) => void;
    updateMessage: (channelId: string, messageId: string, updates: Partial<MessageData>) => void;
    deleteMessage: (channelId: string, messageId: string) => void;
    addReaction: (channelId: string, messageId: string, emoji: string, userId: string, currentUserId: string) => void;
    removeReaction: (channelId: string, messageId: string, emoji: string, userId: string, currentUserId: string) => void;
    setTyping: (channelId: string, userId: string, username: string) => void;
    clearTyping: (channelId: string, userId: string) => void;
    setLoading: (channelId: string, loading: boolean) => void;
    clearChannel: (channelId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
    messages: {},
    cursors: {},
    hasMore: {},
    typingUsers: {},
    loadingChannels: new Set(),

    setMessages: (channelId, messages, cursor, hasMore) =>
        set((state) => ({
            messages: { ...state.messages, [channelId]: trimMessages(sortMessagesChronologically(messages)) },
            cursors: { ...state.cursors, [channelId]: cursor },
            hasMore: { ...state.hasMore, [channelId]: hasMore },
        })),

    prependMessages: (channelId, messages, cursor, hasMore) =>
        set((state) => ({
            messages: {
                ...state.messages,
                [channelId]: trimMessages(sortMessagesChronologically([
                    ...messages,
                    ...(state.messages[channelId] || []),
                ])),
            },
            cursors: { ...state.cursors, [channelId]: cursor },
            hasMore: { ...state.hasMore, [channelId]: hasMore },
        })),

    addMessage: (channelId, message) =>
        set((state) => {
            const existing = state.messages[channelId] || [];
            // Deduplicate
            if (existing.some((m) => m.id === message.id)) return state;
            return {
                messages: {
                    ...state.messages,
                    [channelId]: trimMessages(sortMessagesChronologically([...existing, message])),
                },
            };
        }),

    updateMessage: (channelId, messageId, updates) =>
        set((state) => ({
            messages: {
                ...state.messages,
                [channelId]: (state.messages[channelId] || []).map((m) =>
                    m.id === messageId ? { ...m, ...updates } : m
                ),
            },
        })),

    deleteMessage: (channelId, messageId) =>
        set((state) => ({
            messages: {
                ...state.messages,
                [channelId]: (state.messages[channelId] || []).filter(
                    (m) => m.id !== messageId
                ),
            },
        })),

    addReaction: (channelId, messageId, emoji, userId, currentUserId) =>
        set((state) => {
            const channelMsgs = state.messages[channelId] || [];
            return {
                messages: {
                    ...state.messages,
                    [channelId]: channelMsgs.map((m) => {
                        if (m.id !== messageId) return m;
                        const safeReactions = m.reactions || [];
                        const existing = safeReactions.find((r) => r.emoji === emoji);
                        if (existing) {
                            return {
                                ...m,
                                reactions: safeReactions.map((r) =>
                                    r.emoji === emoji
                                        ? {
                                              ...r,
                                              count: r.count + 1,
                                              reacted: r.reacted || userId === currentUserId,
                                          }
                                        : r
                                ),
                            };
                        }
                        return {
                            ...m,
                            reactions: [
                                ...safeReactions,
                                {
                                    emoji,
                                    count: 1,
                                    reacted: userId === currentUserId,
                                },
                            ],
                        };
                    }),
                },
            };
        }),

    removeReaction: (channelId, messageId, emoji, userId, currentUserId) =>
        set((state) => {
            const channelMsgs = state.messages[channelId] || [];
            return {
                messages: {
                    ...state.messages,
                    [channelId]: channelMsgs.map((m) => {
                        if (m.id !== messageId) return m;
                        const safeReactions = m.reactions || [];
                        return {
                            ...m,
                            reactions: safeReactions
                                .map((r) => {
                                    if (r.emoji !== emoji) return r;
                                    return {
                                        ...r,
                                        count: Math.max(0, r.count - 1),
                                        reacted: userId === currentUserId ? false : r.reacted,
                                    };
                                })
                                .filter((r) => r.count > 0),
                        };
                    }),
                },
            };
        }),

    setTyping: (channelId, userId, username) => {
        const { typingUsers } = get();
        const channelTyping = typingUsers[channelId] || [];
        const existing = channelTyping.find((t) => t.userId === userId);

        if (existing) {
            clearTimeout(existing.timeout);
        }

        const timeout = setTimeout(() => {
            get().clearTyping(channelId, userId);
        }, 3000);

        const filtered = channelTyping.filter((t) => t.userId !== userId);
        set({
            typingUsers: {
                ...typingUsers,
                [channelId]: [...filtered, { userId, username, timeout }],
            },
        });
    },

    clearTyping: (channelId, userId) => {
        const { typingUsers } = get();
        const channelTyping = typingUsers[channelId] || [];
        const user = channelTyping.find((t) => t.userId === userId);
        if (user) clearTimeout(user.timeout);

        set({
            typingUsers: {
                ...typingUsers,
                [channelId]: channelTyping.filter((t) => t.userId !== userId),
            },
        });
    },

    setLoading: (channelId, loading) => {
        const { loadingChannels } = get();
        const updated = new Set(loadingChannels);
        if (loading) updated.add(channelId);
        else updated.delete(channelId);
        set({ loadingChannels: updated });
    },

    clearChannel: (channelId) =>
        set((state) => {
            const { [channelId]: _, ...restMessages } = state.messages;
            const { [channelId]: __, ...restCursors } = state.cursors;
            const { [channelId]: ___, ...restHasMore } = state.hasMore;
            return {
                messages: restMessages,
                cursors: restCursors,
                hasMore: restHasMore,
            };
        }),
}));
