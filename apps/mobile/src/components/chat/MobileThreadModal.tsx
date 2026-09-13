import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  StyleSheet,
  View,
  Text,
  Pressable,
  FlatList,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius } from "../../theme/tokens";
import { NativeHaptics } from "../../lib/haptics";
import { parseMessageAttachments, AttachmentCard } from "./AttachmentCard";
import { RichMarkdown, ReasoningTrace } from "./RichMarkdown";
import { formatAvatarUrl } from "../../lib/avatar";
import { useChatStore } from "../../stores/chat-store";
import {
  X,
  MessagesSquare,
  Send,
  CornerUpLeft,
  Smile,
  Check,
  Share2,
} from "lucide-react-native";

export interface ThreadStarterMessage {
  id: string;
  user?: {
    id: string;
    displayName: string;
    avatarUrl?: string | null;
    roleColor?: string;
  };
  author?: {
    id: string;
    name: string;
    avatar?: string | null;
  };
  content?: string;
  text?: string;
  createdAt?: string;
  at?: string;
  reactions?: Array<{
    emoji: string;
    count: number;
    reacted?: boolean;
  }>;
}

interface MobileThreadModalProps {
  visible: boolean;
  parentMessage: ThreadStarterMessage | null;
  channelId: string;
  currentUserId?: string;
  currentUser?: any;
  onClose: () => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
}

export function MobileThreadModal({
  visible,
  parentMessage,
  channelId,
  currentUserId,
  currentUser,
  onClose,
  onToggleReaction,
}: MobileThreadModalProps) {
  const [replyText, setReplyText] = useState("");
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const {
    messages,
    threadMessages,
    isLoadingThread,
    sendChannelMessageAction,
  } = useChatStore();

  if (!parentMessage) return null;

  // Combine thread replies from channel messages and threadMessages store
  const channelMsgs = messages[channelId] || [];
  const channelReplies = channelMsgs
    .filter((m) => m.replyTo?.id === parentMessage.id && m.id !== parentMessage.id)
    .map((m) => ({
      id: m.id,
      threadId: parentMessage.id,
      content: m.text,
      author: {
        id: m.author?.id || "unknown",
        name: m.author?.name || "Member",
        avatar: m.author?.avatar || null,
      },
      createdAt: m.at,
    }));

  const rawThreadReplies = threadMessages[parentMessage.id] || [];
  const allRepliesMap = new Map<string, any>();
  channelReplies.forEach((r) => allRepliesMap.set(r.id, r));
  rawThreadReplies.forEach((r) => allRepliesMap.set(r.id, r));
  const isolatedReplies = Array.from(allRepliesMap.values());

  const handleSend = async () => {
    const trimmed = replyText.trim();
    if (!trimmed || sending) return;

    NativeHaptics.medium();
    setSending(true);
    try {
      await sendChannelMessageAction(channelId, trimmed, parentMessage.id);
      setReplyText("");
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
    } catch (err) {
      console.warn("[MobileThreadModal] send error:", err);
    } finally {
      setSending(false);
    }
  };

  const parentAuthorName =
    parentMessage.user?.displayName || parentMessage.author?.name || "Member";
  const parentAuthorAvatar = formatAvatarUrl(
    parentMessage.user?.avatarUrl || parentMessage.author?.avatar
  );
  const parentText = parentMessage.content || parentMessage.text || "";
  const parentCreatedAt = parentMessage.createdAt || parentMessage.at || "";

  const {
    cleanText: parentCleanText,
    reasoningText: parentReasoningText,
    attachments: parentAttachments,
  } = parseMessageAttachments(parentText);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleWrap}>
            <View style={styles.headerIcon}>
              <MessagesSquare size={16} color={colors.accent} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Thread</Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                Started by {parentMessage.user?.displayName || "Member"}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => {
              NativeHaptics.light();
              onClose();
            }}
            style={styles.closeBtn}
            hitSlop={10}
          >
            <X size={18} color={colors.textPrimary} />
          </Pressable>
        </View>

        {/* Thread Feed Area */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
          style={styles.keyboardContainer}
        >
          <FlatList
            ref={flatListRef}
            data={isolatedReplies}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.feedContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={() => (
              <View style={styles.parentCardContainer}>
                {/* Parent Message Glass Card */}
                <View style={styles.parentCard}>
                  <View style={styles.parentHeader}>
                    {parentAuthorAvatar ? (
                      <Image
                        source={{ uri: parentAuthorAvatar }}
                        style={styles.avatar}
                      />
                    ) : (
                      <View style={styles.avatarFallback}>
                        <Text style={styles.avatarLetter}>
                          {parentAuthorName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.parentMeta}>
                      <Text
                        style={[
                          styles.parentDisplayName,
                          {
                            color:
                              parentMessage.user?.roleColor ||
                              colors.textPrimary,
                          },
                        ]}
                      >
                        {parentAuthorName}
                      </Text>
                      <Text style={styles.timestamp}>
                        {parentCreatedAt
                          ? new Date(parentCreatedAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </Text>
                    </View>
                  </View>

                  {parentCleanText ? (
                    <RichMarkdown
                      content={parentCleanText}
                      textColor={colors.textPrimary}
                    />
                  ) : null}

                  {parentAttachments.map((att, idx) => (
                    <AttachmentCard key={idx} attachment={att} />
                  ))}

                  {/* Parent Reactions */}
                  {parentMessage.reactions && parentMessage.reactions.length > 0 && (
                    <View style={styles.reactionsRow}>
                      {parentMessage.reactions.map((r) => (
                        <Pressable
                          key={r.emoji}
                          onPress={() =>
                            onToggleReaction?.(parentMessage.id, r.emoji)
                          }
                          style={[
                            styles.reactionBadge,
                            r.reacted && styles.reactionBadgeActive,
                          ]}
                        >
                          <Text style={styles.reactionText}>
                            {r.emoji} {r.count}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>

                {/* Reply count separator */}
                <View style={styles.separator}>
                  <View style={styles.separatorLine} />
                  <View style={styles.replyCountPill}>
                    <Text style={styles.replyCountText}>
                      {isolatedReplies.length} {isolatedReplies.length === 1 ? "Thread Message" : "Thread Messages"}
                    </Text>
                  </View>
                  <View style={styles.separatorLine} />
                </View>

                {isLoadingThread && isolatedReplies.length === 0 && (
                  <View style={{ paddingVertical: 20, alignItems: "center" }}>
                    <ActivityIndicator size="small" color={colors.accent} />
                  </View>
                )}

                {!isLoadingThread && isolatedReplies.length === 0 && (
                  <View style={styles.emptyReplies}>
                    <Text style={styles.emptyRepliesText}>
                      No messages in this thread yet.
                    </Text>
                    <Text style={styles.emptyRepliesSub}>
                      Send a message below to discuss this topic in an isolated thread.
                    </Text>
                  </View>
                )}
              </View>
            )}
            renderItem={({ item }) => {
              const { cleanText, reasoningText, attachments } = parseMessageAttachments(
                item.content || ""
              );
              const authorName = item.author?.name || "Member";
              const authorAvatar = formatAvatarUrl(item.author?.avatar);

              return (
                <View style={styles.replyRow}>
                  {authorAvatar ? (
                    <Image
                      source={{ uri: authorAvatar }}
                      style={styles.replyAvatar}
                    />
                  ) : (
                    <View style={styles.replyAvatarFallback}>
                      <Text style={styles.avatarLetterSmall}>
                        {authorName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.replyBody}>
                    <View style={styles.replyMeta}>
                      <Text
                        style={[
                          styles.replyDisplayName,
                          {
                            color: colors.textPrimary,
                          },
                        ]}
                      >
                        {authorName}
                      </Text>
                      <Text style={styles.timestamp}>
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </Text>
                    </View>

                    {cleanText ? (
                      <RichMarkdown
                        content={cleanText}
                        textColor={colors.textPrimary}
                      />
                    ) : null}

                    {attachments.map((att, idx) => (
                      <AttachmentCard key={idx} attachment={att} />
                    ))}
                  </View>
                </View>
              );
            }}
          />

          {/* Thread Message Composer */}
          <View style={styles.composerContainer}>
            <View style={styles.composerInputWrap}>
              <TextInput
                value={replyText}
                onChangeText={setReplyText}
                placeholder="Reply in thread..."
                placeholderTextColor={colors.textMuted}
                style={styles.composerInput}
                multiline
                maxLength={2000}
              />
              <Pressable
                onPress={handleSend}
                disabled={!replyText.trim() || sending}
                style={[
                  styles.sendBtn,
                  replyText.trim() && !sending && styles.sendBtnActive,
                ]}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <Send
                    size={15}
                    color={
                      replyText.trim() ? colors.accentContrast : colors.textMuted
                    }
                  />
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "rgba(5, 6, 10, 0.96)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(10, 10, 12, 0.95)",
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: "rgba(212, 160, 23, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "JetBrainsMono_700Bold",
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: "bold",
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  keyboardContainer: {
    flex: 1,
  },
  feedContent: {
    paddingBottom: 20,
  },
  parentCardContainer: {
    padding: 12,
  },
  parentCard: {
    backgroundColor: "rgba(212, 160, 23, 0.04)",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(212, 160, 23, 0.2)",
    padding: 12,
  },
  parentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    marginRight: 10,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarLetter: {
    color: colors.accent,
    fontWeight: "bold",
    fontSize: 14,
  },
  parentMeta: {
    flex: 1,
  },
  parentDisplayName: {
    fontSize: 13,
    fontWeight: "bold",
  },
  timestamp: {
    fontSize: 10,
    color: colors.textMuted,
    fontFamily: "JetBrainsMono_400Regular",
    marginTop: 1,
  },
  parentContentText: {
    fontSize: 13.5,
    color: colors.textPrimary,
    lineHeight: 19,
  },
  reactionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  reactionBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  reactionBadgeActive: {
    backgroundColor: "rgba(212, 160, 23, 0.15)",
    borderColor: "rgba(212, 160, 23, 0.4)",
  },
  reactionText: {
    fontSize: 11,
    color: colors.textPrimary,
  },
  separator: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 14,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  replyCountPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: "rgba(18, 18, 26, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    marginHorizontal: 8,
  },
  replyCountText: {
    fontFamily: "JetBrainsMono_700Bold",
    fontSize: 10,
    color: colors.accent,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emptyReplies: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyRepliesText: {
    fontSize: 12,
    fontFamily: "JetBrainsMono_400Regular",
    color: colors.textMuted,
  },
  emptyRepliesSub: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.3)",
    marginTop: 4,
    textAlign: "center",
  },
  replyRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  replyAvatar: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    marginRight: 10,
    marginTop: 2,
  },
  replyAvatarFallback: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginTop: 2,
  },
  avatarLetterSmall: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  replyBody: {
    flex: 1,
  },
  replyMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  replyDisplayName: {
    fontSize: 12,
    fontWeight: "600",
  },
  replyText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  composerContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(10, 10, 12, 0.95)",
  },
  composerInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 8 : 4,
    gap: 8,
  },
  composerInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    maxHeight: 90,
  },
  sendBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.md,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnActive: {
    backgroundColor: colors.accent,
  },
});
