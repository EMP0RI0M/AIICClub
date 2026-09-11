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
import { colors, radius } from "../../theme/tokens";
import { NativeHaptics } from "../../lib/haptics";
import { parseMessageAttachments, AttachmentCard } from "./AttachmentCard";
import {
  X,
  MessagesSquare,
  Send,
  CornerUpLeft,
  Smile,
  Check,
  Share2,
} from "lucide-react-native";

export interface ThreadMessage {
  id: string;
  user: {
    id: string;
    displayName: string;
    avatarUrl?: string | null;
    roleColor?: string;
  };
  content: string;
  createdAt: string;
  replyTo?: {
    id: string;
    authorName: string;
    text?: string;
  };
  reactions?: Array<{
    emoji: string;
    count: number;
    reacted?: boolean;
  }>;
}

interface MobileThreadModalProps {
  visible: boolean;
  parentMessage: ThreadMessage | null;
  allMessages: ThreadMessage[];
  currentUserId?: string;
  onClose: () => void;
  onSendReply: (content: string, replyToId: string) => Promise<void>;
  onToggleReaction?: (messageId: string, emoji: string) => void;
}

export function MobileThreadModal({
  visible,
  parentMessage,
  allMessages,
  currentUserId,
  onClose,
  onSendReply,
  onToggleReaction,
}: MobileThreadModalProps) {
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  if (!parentMessage) return null;

  // Filter replies that belong to this parent message
  const replies = allMessages.filter(
    (m) => m.replyTo?.id === parentMessage.id && m.id !== parentMessage.id
  );

  const handleSend = async () => {
    const trimmed = replyText.trim();
    if (!trimmed || sending) return;

    NativeHaptics.medium();
    setSending(true);
    try {
      await onSendReply(trimmed, parentMessage.id);
      setReplyText("");
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } finally {
      setSending(false);
    }
  };

  const { cleanText: parentCleanText, attachments: parentAttachments } =
    parseMessageAttachments(parentMessage.content || "");

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
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
          style={styles.keyboardContainer}
        >
          <FlatList
            ref={flatListRef}
            data={replies}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.feedContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={() => (
              <View style={styles.parentCardContainer}>
                {/* Parent Message Glass Card */}
                <View style={styles.parentCard}>
                  <View style={styles.parentHeader}>
                    {parentMessage.user?.avatarUrl ? (
                      <Image
                        source={{ uri: parentMessage.user.avatarUrl }}
                        style={styles.avatar}
                      />
                    ) : (
                      <View style={styles.avatarFallback}>
                        <Text style={styles.avatarLetter}>
                          {(parentMessage.user?.displayName || "U")
                            .charAt(0)
                            .toUpperCase()}
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
                        {parentMessage.user?.displayName || "Member"}
                      </Text>
                      <Text style={styles.timestamp}>
                        {parentMessage.createdAt
                          ? new Date(parentMessage.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </Text>
                    </View>
                  </View>

                  {parentCleanText ? (
                    <Text style={styles.parentContentText}>
                      {parentCleanText}
                    </Text>
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
                      {replies.length} {replies.length === 1 ? "Reply" : "Replies"}
                    </Text>
                  </View>
                  <View style={styles.separatorLine} />
                </View>

                {replies.length === 0 && (
                  <View style={styles.emptyReplies}>
                    <Text style={styles.emptyRepliesText}>
                      No replies in this thread yet.
                    </Text>
                    <Text style={styles.emptyRepliesSub}>
                      Send a message below to start the thread discussion.
                    </Text>
                  </View>
                )}
              </View>
            )}
            renderItem={({ item }) => {
              const { cleanText, attachments } = parseMessageAttachments(
                item.content || ""
              );
              return (
                <View style={styles.replyRow}>
                  {item.user?.avatarUrl ? (
                    <Image
                      source={{ uri: item.user.avatarUrl }}
                      style={styles.replyAvatar}
                    />
                  ) : (
                    <View style={styles.replyAvatarFallback}>
                      <Text style={styles.avatarLetterSmall}>
                        {(item.user?.displayName || "U").charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.replyBody}>
                    <View style={styles.replyMeta}>
                      <Text
                        style={[
                          styles.replyDisplayName,
                          {
                            color:
                              item.user?.roleColor || colors.textPrimary,
                          },
                        ]}
                      >
                        {item.user?.displayName || "Member"}
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
                      <Text style={styles.replyText}>{cleanText}</Text>
                    ) : null}

                    {attachments.map((att, idx) => (
                      <AttachmentCard key={idx} attachment={att} />
                    ))}

                    {/* Reactions */}
                    {item.reactions && item.reactions.length > 0 && (
                      <View style={styles.reactionsRow}>
                        {item.reactions.map((r: any) => (
                          <Pressable
                            key={r.emoji}
                            onPress={() =>
                              onToggleReaction?.(item.id, r.emoji)
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
    backgroundColor: "#050505",
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
    backgroundColor: "#0d0d10",
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
