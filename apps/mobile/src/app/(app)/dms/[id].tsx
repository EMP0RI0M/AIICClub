import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Pressable,
  Modal,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius } from "../../../theme/tokens";
import { Avatar } from "../../../components/ui/Avatar";
import { useWorkspaceStore } from "../../../stores/workspace-store";
import { useChatStore } from "../../../stores/chat-store";
import { useAuthStore } from "../../../stores/auth-store";
import {
  ArrowLeft,
  Send,
  Phone,
  Video,
  MoreVertical,
  Smile,
  Paperclip,
  MessagesSquare,
  ChevronRight,
  Plus,
  X,
  Trash2,
  Mic,
  CornerUpLeft,
} from "lucide-react-native";
import { AttachmentCard, parseMessageAttachments } from "../../../components/chat/AttachmentCard";
import { UserProfileModal, type UserProfileData } from "../../../components/profile/UserProfileModal";
import { MobileThreadModal } from "../../../components/chat/MobileThreadModal";
import {
  MobileAttachmentSheet,
  MobileGifModal,
  MobileEmojiModal,
  MobileGiftPickerModal,
} from "../../../components/chat/MobileMediaPickers";
import { NativeHaptics } from "../../../lib/haptics";
import { fetchUserProfile } from "../../../lib/api";

export default function DMDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { dms } = useWorkspaceStore();
  const { user } = useAuthStore();
  const {
    dmMessages,
    loadDMMessagesAction,
    sendDMMessageAction,
    deleteDMMessageAction,
    subscribeToDM,
    unsubscribeFromDM,
    isLoadingMessages,
  } = useChatStore();

  const [inputText, setInputText] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfileData | null>(null);
  const [activeThreadMessage, setActiveThreadMessage] = useState<any | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [messageActionOpen, setMessageActionOpen] = useState(false);
  const [attachSheetOpen, setAttachSheetOpen] = useState(false);
  const [gifModalOpen, setGifModalOpen] = useState(false);
  const [emojiModalOpen, setEmojiModalOpen] = useState(false);
  const [giftModalOpen, setGiftModalOpen] = useState(false);
  const [stagedAttachment, setStagedAttachment] = useState<{
    url: string;
    name: string;
    type?: string;
    size?: number;
  } | null>(null);
  const convoId = id as string;

  const conversation = dms.find((d) => d.id === convoId) || {
    id: convoId,
    name: "Direct Message",
    presence: "online" as const,
  };

  useEffect(() => {
    if (convoId) {
      loadDMMessagesAction(convoId);
      subscribeToDM(convoId);
    }
    return () => {
      unsubscribeFromDM();
    };
  }, [convoId]);

  const messagesList = dmMessages[convoId] || [];

  const handleSend = async () => {
    const rawText = inputText.trim();
    if (!rawText && !stagedAttachment) return;
    let finalContent = rawText;
    if (stagedAttachment) {
      const attPayload = `attachment:${JSON.stringify(stagedAttachment)}`;
      finalContent = rawText ? `${rawText}\n${attPayload}` : attPayload;
    }
    setInputText("");
    setStagedAttachment(null);
    try {
      await sendDMMessageAction(convoId, finalContent);
    } catch (err) {
      console.error("Failed to send DM:", err);
    }
  };

  const handleSelectGif = async (gifUrl: string) => {
    try {
      const attPayload = `attachment:${JSON.stringify({ url: gifUrl, name: "GIF", type: "image/gif" })}`;
      await sendDMMessageAction(convoId, inputText.trim() ? `${inputText.trim()}\n${attPayload}` : attPayload);
      setInputText("");
    } catch (err) {
      console.error("Failed to send GIF DM:", err);
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      {/* Curved Web-Parity Floating DM Capsule Header */}
      <View style={styles.headerCapsule}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <ArrowLeft size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerCenter}
          onPress={async () => {
            const profile = await fetchUserProfile((conversation as any).user_id || conversation.id).catch(() => null);
            setSelectedUser(profile?.user || {
              id: (conversation as any).user_id || conversation.id,
              displayName: conversation.name,
              username: (conversation as any).username || conversation.name.toLowerCase().replace(/\s+/g, ""),
              avatarUrl: (conversation as any).avatarUrl || null,
              status: conversation.presence,
              role: (conversation as any).role || "member",
              roleName: (conversation as any).roleName,
              bio: (conversation as any).bio,
              classYear: (conversation as any).classYear,
              section: (conversation as any).section,
              githubUrl: (conversation as any).githubUrl,
              linkedinUrl: (conversation as any).linkedinUrl,
              websiteUrl: (conversation as any).websiteUrl,
              skills: (conversation as any).skills,
              interests: (conversation as any).interests,
            });
          }}
        >
          <Avatar
            name={conversation.name}
            presence={conversation.presence}
            size={32}
          />
          <View style={{ minWidth: 0, flex: 1 }}>
            <Text style={styles.headerName} numberOfLines={1}>
              {conversation.name}
            </Text>
            <Text style={styles.headerSub}>AIIC · DIRECT MESSAGE</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push(`/(app)/voice/${convoId}`)}
          >
            <Phone size={16} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push(`/(app)/voice/${convoId}`)}
          >
            <Video size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Message Feed */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        style={{ flex: 1 }}
      >
        {isLoadingMessages && messagesList.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        ) : (
          <FlatList
            data={messagesList}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const isMe = item.author.id === (user?.id || "u-anon") || item.author.id === "me";
              const { cleanText, attachments } = parseMessageAttachments(item.text || "");
              return (
                <View
                  style={[
                    styles.messageBubbleWrap,
                    isMe ? styles.myMessageWrap : styles.theirMessageWrap,
                  ]}
                >
                  {!isMe && (
                    <TouchableOpacity
                      onPress={() => {
                        fetchUserProfile(item.author.id).then((res) => setSelectedUser(res.user)).catch(() => setSelectedUser({
                          id: item.author.id,
                          displayName: item.author.name,
                          username: item.author.name.toLowerCase().replace(/\s+/g, ""),
                          avatarUrl: item.author.avatar,
                          status: "online",
                        }));
                      }}
                    >
                      <Avatar name={item.author.name} size={28} url={item.author.avatar} />
                    </TouchableOpacity>
                  )}
                  <Pressable
                    delayLongPress={150}
                    onLongPress={() => {
                      NativeHaptics.medium();
                      setSelectedMessage(item);
                      setMessageActionOpen(true);
                    }}
                    style={[
                      styles.bubble,
                      isMe ? styles.myBubble : styles.theirBubble,
                    ]}
                  >
                    {cleanText ? (
                      <Text
                        style={[
                          styles.bubbleText,
                          isMe ? styles.myBubbleText : styles.theirBubbleText,
                        ]}
                      >
                        {cleanText}
                      </Text>
                    ) : null}

                    {/* Decoded Attachments */}
                    {attachments.map((att, idx) => (
                      <AttachmentCard key={idx} attachment={att} />
                    ))}

                    {/* Thread Indicator Badge if message has replies */}
                    {messagesList.filter((m) => (m as any).replyTo?.id === item.id).length > 0 ? (
                      <TouchableOpacity
                        onPress={() => setActiveThreadMessage({
                          id: item.id,
                          user: {
                            id: item.author.id,
                            displayName: item.author.name,
                            avatarUrl: item.author.avatar,
                          },
                          content: item.text,
                          createdAt: item.at,
                          replyTo: (item as any).replyTo,
                          reactions: item.reactions,
                        })}
                        style={styles.threadBadge}
                        hitSlop={6}
                      >
                        <MessagesSquare size={12} color={colors.accent} />
                        <Text style={styles.threadBadgeText}>
                          {messagesList.filter((m) => (m as any).replyTo?.id === item.id).length}{" "}
                          {messagesList.filter((m) => (m as any).replyTo?.id === item.id).length === 1 ? "reply" : "replies"}
                        </Text>
                        <ChevronRight size={11} color={colors.textMuted} />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => {
                          NativeHaptics.light();
                          setActiveThreadMessage({
                            id: item.id,
                            user: {
                              id: item.author.id,
                              displayName: item.author.name,
                              avatarUrl: item.author.avatar,
                            },
                            content: item.text,
                            createdAt: item.at,
                            replyTo: (item as any).replyTo,
                            reactions: item.reactions,
                          });
                        }}
                        style={[styles.threadBadge, { opacity: 0.85, marginTop: 4 }]}
                        hitSlop={6}
                      >
                        <CornerUpLeft size={11} color={colors.textMuted} />
                        <Text style={[styles.threadBadgeText, { color: colors.textMuted }]}>
                          Reply in thread
                        </Text>
                      </TouchableOpacity>
                    )}

                    <Text
                      style={[
                        styles.bubbleTime,
                        isMe ? styles.myBubbleTime : styles.theirBubbleTime,
                      ]}
                    >
                      {new Date(item.at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </Pressable>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Avatar name={conversation.name} size={54} />
                <Text style={styles.emptyTitle}>{conversation.name}</Text>
                <Text style={styles.emptySubtitle}>
                  This is the beginning of your direct message history with {conversation.name}.
                </Text>
              </View>
            }
          />
        )}

        {/* Staged Attachment Preview Banner */}
        {stagedAttachment && (
          <View style={styles.stagedAttachmentBanner}>
            <View style={styles.stagedAttachmentInner}>
              <Paperclip size={13} color={colors.accent} />
              <Text style={styles.stagedAttachmentName} numberOfLines={1}>
                {stagedAttachment.name}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setStagedAttachment(null)} hitSlop={8}>
              <X size={14} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* WhatsApp-Style Pill Bar + Detached Floating Circle */}
        <View style={styles.composerWrapper}>
          <View style={styles.composerRow}>
            <View style={styles.composerPill}>
              {/* Emoji button inside left of pill */}
              <TouchableOpacity
                style={styles.pillIconBtn}
                onPress={() => {
                  NativeHaptics.light();
                  setEmojiModalOpen(true);
                }}
                hitSlop={8}
              >
                <Smile size={21} color="#86899E" />
              </TouchableOpacity>

              <TextInput
                style={styles.composerInput}
                placeholder={`Message ${conversation.name}...`}
                placeholderTextColor="#72768B"
                value={inputText}
                onChangeText={setInputText}
                multiline
              />

              {/* Attachment Paperclip button */}
              <TouchableOpacity
                style={styles.pillIconBtn}
                onPress={() => {
                  NativeHaptics.light();
                  setAttachSheetOpen(true);
                }}
                hitSlop={8}
              >
                <Paperclip size={20} color="#86899E" />
              </TouchableOpacity>

              {/* GIF Button */}
              <TouchableOpacity
                style={styles.gifBadgeBtn}
                onPress={() => {
                  NativeHaptics.light();
                  setGifModalOpen(true);
                }}
                hitSlop={8}
              >
                <View style={styles.gifBadge}>
                  <Text style={styles.gifBadgeText}>GIF</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* WhatsApp-Style Detached Action Button */}
            <TouchableOpacity
              style={[
                styles.detachedActionButton,
                (inputText.trim() || stagedAttachment) && styles.detachedActionButtonActive,
              ]}
              onPress={() => {
                if (inputText.trim() || stagedAttachment) {
                  handleSend();
                } else {
                  NativeHaptics.selection();
                }
              }}
              hitSlop={6}
            >
              {inputText.trim() || stagedAttachment ? (
                <Send size={18} color="#000" />
              ) : (
                <Mic size={20} color={colors.accent} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* DM Message Options Modal (Thread / Delete) */}
      <Modal
        visible={messageActionOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMessageActionOpen(false)}
      >
        <Pressable
          style={styles.actionModalBackdrop}
          onPress={() => setMessageActionOpen(false)}
        >
          <View style={styles.actionModalSheet}>
            <Text style={styles.actionModalTitle}>Message Actions</Text>
            <View style={{ gap: 8 }}>
              <Pressable
                style={styles.actionMenuRow}
                onPress={() => {
                  if (selectedMessage) {
                    setActiveThreadMessage({
                      id: selectedMessage.id,
                      user: {
                        id: selectedMessage.author.id,
                        displayName: selectedMessage.author.name,
                        avatarUrl: selectedMessage.author.avatar,
                      },
                      content: selectedMessage.text,
                      createdAt: selectedMessage.at,
                      replyTo: (selectedMessage as any).replyTo,
                      reactions: selectedMessage.reactions,
                    });
                  }
                  setMessageActionOpen(false);
                }}
              >
                <MessagesSquare size={16} color={colors.accent} />
                <Text style={styles.actionMenuText}>Open Thread</Text>
              </Pressable>

              {/* Delete Message if Own Message */}
              {selectedMessage &&
                (selectedMessage.author.id === (user?.id || "u-anon") ||
                  selectedMessage.author.id === "me") && (
                  <Pressable
                    style={[styles.actionMenuRow, styles.actionDeleteRow]}
                    onPress={() => {
                      const msgId = selectedMessage.id;
                      setMessageActionOpen(false);
                      Alert.alert(
                        "Delete Message",
                        "Are you sure you want to delete this message permanently?",
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Delete",
                            style: "destructive",
                            onPress: async () => {
                              try {
                                await deleteDMMessageAction(convoId, msgId);
                              } catch (e: any) {
                                Alert.alert("Error", e?.message || "Failed to delete message");
                              }
                            },
                          },
                        ]
                      );
                    }}
                  >
                    <Trash2 size={16} color={colors.danger} />
                    <Text style={[styles.actionMenuText, { color: colors.danger }]}>
                      Delete Message
                    </Text>
                  </Pressable>
                )}
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Pickers & Modals */}
      <MobileAttachmentSheet
        visible={attachSheetOpen}
        onClose={() => setAttachSheetOpen(false)}
        onOpenGift={() => setGiftModalOpen(true)}
        onSelectImage={(asset) => {
          setStagedAttachment({
            url: asset.uri,
            name: asset.name || "image.jpg",
            type: asset.type || "image/jpeg",
            size: asset.size,
          });
        }}
        onSelectDocument={(doc) => {
          setStagedAttachment({
            url: doc.uri,
            name: doc.name,
            type: doc.mimeType || "application/octet-stream",
            size: doc.size,
          });
        }}
      />

      <MobileGiftPickerModal
        visible={giftModalOpen}
        onClose={() => setGiftModalOpen(false)}
        onSendGift={async (giftData) => {
          try {
            const giftPayload = `🎁 **Sent a ${giftData.name}!** ${giftData.emoji}${giftData.message ? `\n> *"${giftData.message}"*` : ""}`;
            await sendDMMessageAction(convoId, giftPayload);
          } catch (e) {
            console.warn("Failed to send gift DM:", e);
          }
        }}
      />

      <MobileGifModal
        visible={gifModalOpen}
        onClose={() => setGifModalOpen(false)}
        onSelectGif={handleSelectGif}
      />

      <MobileEmojiModal
        visible={emojiModalOpen}
        onClose={() => setEmojiModalOpen(false)}
        onSelectEmoji={(emoji) => {
          setInputText((prev) => prev + emoji);
        }}
      />

      {/* Thread Drawer Modal */}
      <MobileThreadModal
        visible={Boolean(activeThreadMessage)}
        parentMessage={activeThreadMessage}
        allMessages={messagesList.map((m) => ({
          id: m.id,
          user: {
            id: m.author.id,
            displayName: m.author.name,
            avatarUrl: m.author.avatar,
          },
          content: m.text,
          createdAt: m.at,
          replyTo: (m as any).replyTo,
          reactions: m.reactions,
        }))}
        currentUserId={user?.id}
        onClose={() => setActiveThreadMessage(null)}
        onSendReply={async (content, replyToId) => {
          await sendDMMessageAction(convoId, content, replyToId);
        }}
      />

      {/* Detailed Contact Profile Modal */}
      <UserProfileModal
        visible={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        user={selectedUser}
        onCall={(video) => {
          setSelectedUser(null);
          router.push(`/(app)/voice/${convoId}`);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerCapsule: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 12,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(18, 23, 34, 0.75)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  backBtn: {
    padding: 6,
    borderRadius: 10,
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    marginLeft: 4,
  },
  headerName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  headerSub: {
    color: colors.accent,
    fontSize: 9,
    fontFamily: "monospace",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: "row",
    gap: 6,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    padding: 16,
    paddingBottom: 24,
  },
  messageBubbleWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 10,
  },
  myMessageWrap: {
    justifyContent: "flex-end",
  },
  theirMessageWrap: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "75%",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
  },
  myBubble: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: "rgba(23, 24, 33, 0.8)",
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 19,
  },
  myBubbleText: {
    color: colors.accentContrast,
  },
  theirBubbleText: {
    color: colors.textPrimary,
  },
  threadBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(212, 160, 23, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(212, 160, 23, 0.3)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
    gap: 5,
  },
  threadBadgeText: {
    fontFamily: "monospace",
    fontSize: 10,
    fontWeight: "700",
    color: colors.accent,
  },
  bubbleTime: {
    fontSize: 10,
    alignSelf: "flex-end",
    marginTop: 3,
    fontFamily: "monospace",
  },
  myBubbleTime: {
    color: "rgba(26, 18, 6, 0.7)",
  },
  theirBubbleTime: {
    color: colors.textMuted,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 8,
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  stagedAttachmentBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(212, 160, 23, 0.12)",
    marginHorizontal: 12,
    marginBottom: 6,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(212, 160, 23, 0.25)",
  },
  stagedAttachmentInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  stagedAttachmentName: {
    fontSize: 12,
    color: colors.accent,
    fontFamily: "monospace",
    fontWeight: "700",
  },
  gifBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  gifBadgeText: {
    fontFamily: "monospace",
    fontSize: 10,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  composerWrapper: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    paddingBottom: Platform.OS === "ios" ? 10 : 8,
    backgroundColor: "transparent",
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  composerPill: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    backgroundColor: "#171924",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.09)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pillIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  composerInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 20,
    paddingHorizontal: 6,
    paddingVertical: Platform.OS === "ios" ? 8 : 6,
    maxHeight: 110,
    textAlignVertical: "center",
  },
  gifBadgeBtn: {
    paddingHorizontal: 4,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  detachedActionButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#171924",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.09)",
    alignItems: "center",
    justifyContent: "center",
  },
  detachedActionButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  actionModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  actionModalSheet: {
    backgroundColor: "#13141F",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    padding: 16,
    paddingBottom: 36,
    gap: 12,
  },
  actionModalTitle: {
    fontSize: 12,
    fontFamily: "monospace",
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  actionMenuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  actionMenuText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  actionDeleteRow: {
    backgroundColor: "rgba(255, 77, 79, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 77, 79, 0.25)",
  },
});
