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
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
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
  Smile,
  Paperclip,
  X,
  Trash2,
  Mic,
  Copy,
  Edit3,
  SmilePlus,
  Check,
  Plus,
} from "lucide-react-native";
import { AttachmentCard, parseMessageAttachments } from "../../../components/chat/AttachmentCard";
import { UserProfileModal, type UserProfileData } from "../../../components/profile/UserProfileModal";
import {
  MobileAttachmentSheet,
  MobileGifModal,
  MobileEmojiModal,
  MobileGiftPickerModal,
} from "../../../components/chat/MobileMediaPickers";
import { NativeHaptics } from "../../../lib/haptics";
import { fetchUserProfile } from "../../../lib/api";

const QUICK_REACTION_EMOJIS = ["👍", "❤️", "🔥", "😂", "🎉", "🚀", "👀", "💯"];

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
    editDMMessageAction,
    toggleDMReaction,
    subscribeToDM,
    unsubscribeFromDM,
    isLoadingMessages,
  } = useChatStore();

  const [inputText, setInputText] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfileData | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [messageActionOpen, setMessageActionOpen] = useState(false);
  const [attachSheetOpen, setAttachSheetOpen] = useState(false);
  const [gifModalOpen, setGifModalOpen] = useState(false);
  const [composerEmojiOpen, setComposerEmojiOpen] = useState(false);
  const [reactModalOpen, setReactModalOpen] = useState(false);
  const [messageToReact, setMessageToReact] = useState<any | null>(null);
  const [giftModalOpen, setGiftModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editText, setEditText] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [copyToast, setCopyToast] = useState(false);

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

  const handleCopyMessage = async (msg: any) => {
    const { cleanText } = parseMessageAttachments(msg?.text || "");
    const textToCopy = cleanText || msg?.text || "";
    if (textToCopy) {
      await Clipboard.setStringAsync(textToCopy);
      NativeHaptics.selection();
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 2000);
    }
  };

  const handleOpenEdit = (msg: any) => {
    const { cleanText } = parseMessageAttachments(msg?.text || "");
    setEditText(cleanText || msg?.text || "");
    setSelectedMessage(msg);
    setMessageActionOpen(false);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedMessage || !editText.trim()) return;
    setIsSavingEdit(true);
    try {
      await editDMMessageAction(convoId, selectedMessage.id, editText.trim());
      setEditModalOpen(false);
      setSelectedMessage(null);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to update message");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteMessage = (msg: any) => {
    const msgId = msg.id;
    setMessageActionOpen(false);
    Alert.alert(
      "Delete Message",
      "Are you sure you want to permanently delete this message?",
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
  };

  const handleQuickReaction = async (msg: any, emoji: string) => {
    NativeHaptics.medium();
    setMessageActionOpen(false);
    try {
      await toggleDMReaction(convoId, msg.id, emoji);
    } catch (err) {
      console.error("Failed to toggle reaction:", err);
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      {/* Floating Copy Feedback Toast */}
      {copyToast && (
        <View style={styles.toastBanner}>
          <Check size={14} color="#000" />
          <Text style={styles.toastText}>Message copied to clipboard!</Text>
        </View>
      )}

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
              const hasReactions = item.reactions && item.reactions.length > 0;

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
                  <View style={{ maxWidth: "78%", alignItems: isMe ? "flex-end" : "flex-start" }}>
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

                    {/* Reactions Display Strip */}
                    {hasReactions && (
                      <View style={[styles.reactionsStrip, isMe && styles.myReactionsStrip]}>
                        {item.reactions!.map((reaction, rIdx) => {
                          const userReacted = reaction.reacted;
                          return (
                            <TouchableOpacity
                              key={`${reaction.emoji}-${rIdx}`}
                              onPress={() => {
                                NativeHaptics.selection();
                                toggleDMReaction(convoId, item.id, reaction.emoji);
                              }}
                              style={[
                                styles.reactionBadge,
                                userReacted && styles.reactionBadgeActive,
                              ]}
                            >
                              <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                              {reaction.count > 1 && (
                                <Text
                                  style={[
                                    styles.reactionCount,
                                    userReacted && styles.reactionCountActive,
                                  ]}
                                >
                                  {reaction.count}
                                </Text>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                        <TouchableOpacity
                          onPress={() => {
                            NativeHaptics.light();
                            setMessageToReact(item);
                            setReactModalOpen(true);
                          }}
                          style={styles.reactionAddBtn}
                          hitSlop={6}
                        >
                          <Plus size={11} color={colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
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
                  setComposerEmojiOpen(true);
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

            {/* Detached Action Button */}
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

      {/* DM Message Options Modal (Delete, Copy, Edit, React) */}
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
            <View style={styles.sheetHandle} />

            {/* Quick Reaction Bar */}
            {selectedMessage && (
              <View style={styles.quickReactionsRow}>
                {QUICK_REACTION_EMOJIS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => handleQuickReaction(selectedMessage, emoji)}
                    style={styles.quickReactionBtn}
                  >
                    <Text style={styles.quickReactionEmoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  onPress={() => {
                    const target = selectedMessage;
                    setMessageActionOpen(false);
                    setMessageToReact(target);
                    setReactModalOpen(true);
                  }}
                  style={styles.quickReactionAddBtn}
                >
                  <Plus size={16} color={colors.accent} />
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.actionModalTitle}>Message Options</Text>

            <View style={{ gap: 8 }}>
              {/* React Message Option */}
              <Pressable
                style={styles.actionMenuRow}
                onPress={() => {
                  const target = selectedMessage;
                  setMessageActionOpen(false);
                  setMessageToReact(target);
                  setReactModalOpen(true);
                }}
              >
                <View style={[styles.menuIconWrap, { backgroundColor: "rgba(212, 160, 23, 0.12)" }]}>
                  <SmilePlus size={17} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionMenuText}>React to Message</Text>
                  <Text style={styles.actionMenuSub}>Choose from thousands of popular emojis & symbols</Text>
                </View>
              </Pressable>

              {/* Copy Message Option */}
              <Pressable
                style={styles.actionMenuRow}
                onPress={() => {
                  const msg = selectedMessage;
                  setMessageActionOpen(false);
                  handleCopyMessage(msg);
                }}
              >
                <View style={[styles.menuIconWrap, { backgroundColor: "rgba(56, 189, 248, 0.12)" }]}>
                  <Copy size={17} color="#38bdf8" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionMenuText}>Copy Message</Text>
                  <Text style={styles.actionMenuSub}>Copy text content to your clipboard</Text>
                </View>
              </Pressable>

              {/* Edit Message Option (if own message) */}
              {selectedMessage &&
                (selectedMessage.author.id === (user?.id || "u-anon") ||
                  selectedMessage.author.id === "me") && (
                  <Pressable
                    style={styles.actionMenuRow}
                    onPress={() => handleOpenEdit(selectedMessage)}
                  >
                    <View style={[styles.menuIconWrap, { backgroundColor: "rgba(168, 85, 247, 0.12)" }]}>
                      <Edit3 size={17} color="#a855f7" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.actionMenuText}>Edit Message</Text>
                      <Text style={styles.actionMenuSub}>Update and save your message text</Text>
                    </View>
                  </Pressable>
                )}

              {/* Delete Message Option (if own message) */}
              {selectedMessage &&
                (selectedMessage.author.id === (user?.id || "u-anon") ||
                  selectedMessage.author.id === "me") && (
                  <Pressable
                    style={[styles.actionMenuRow, styles.actionDeleteRow]}
                    onPress={() => handleDeleteMessage(selectedMessage)}
                  >
                    <View style={[styles.menuIconWrap, { backgroundColor: "rgba(255, 77, 79, 0.15)" }]}>
                      <Trash2 size={17} color={colors.danger} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.actionMenuText, { color: colors.danger }]}>
                        Delete Message
                      </Text>
                      <Text style={[styles.actionMenuSub, { color: "rgba(255, 77, 79, 0.7)" }]}>
                        Permanently remove this message
                      </Text>
                    </View>
                  </Pressable>
                )}
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Edit Message Modal */}
      <Modal
        visible={editModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.editModalContainer}
        >
          <Pressable style={styles.sheetBackdrop} onPress={() => setEditModalOpen(false)}>
            <Pressable style={styles.editModalSheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.sheetHandle} />
              <View style={styles.editModalHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Edit3 size={18} color={colors.accent} />
                  <Text style={styles.editModalTitle}>Edit Message</Text>
                </View>
                <Pressable onPress={() => setEditModalOpen(false)} hitSlop={8}>
                  <X size={18} color={colors.textMuted} />
                </Pressable>
              </View>

              <TextInput
                style={styles.editTextInput}
                value={editText}
                onChangeText={setEditText}
                placeholder="Edit message..."
                placeholderTextColor={colors.textMuted}
                multiline
                autoFocus
              />

              <View style={styles.editActionsRow}>
                <TouchableOpacity
                  style={styles.editCancelBtn}
                  onPress={() => setEditModalOpen(false)}
                >
                  <Text style={styles.editCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.editSaveBtn, !editText.trim() && { opacity: 0.5 }]}
                  disabled={!editText.trim() || isSavingEdit}
                  onPress={handleSaveEdit}
                >
                  {isSavingEdit ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={styles.editSaveText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
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

      {/* Composer Emoji Picker Modal */}
      <MobileEmojiModal
        visible={composerEmojiOpen}
        title="Insert Emoji"
        onClose={() => setComposerEmojiOpen(false)}
        onSelectEmoji={(emoji) => {
          setInputText((prev) => prev + emoji);
        }}
      />

      {/* Message Reaction Emoji Picker Modal (with full catalog of thousands of emojis) */}
      <MobileEmojiModal
        visible={reactModalOpen}
        title="React to Message"
        onClose={() => {
          setReactModalOpen(false);
          setMessageToReact(null);
        }}
        onSelectEmoji={(emoji) => {
          if (messageToReact) {
            toggleDMReaction(convoId, messageToReact.id, emoji);
          }
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
  toastBanner: {
    position: "absolute",
    top: 50,
    alignSelf: "center",
    zIndex: 9999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "monospace",
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
  reactionsStrip: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },
  myReactionsStrip: {
    justifyContent: "flex-end",
  },
  reactionBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 3,
  },
  reactionBadgeActive: {
    backgroundColor: "rgba(212, 160, 23, 0.2)",
    borderColor: colors.accent,
  },
  reactionEmoji: {
    fontSize: 13,
  },
  reactionCount: {
    fontSize: 10,
    fontFamily: "monospace",
    fontWeight: "700",
    color: colors.textMuted,
  },
  reactionCountActive: {
    color: colors.accent,
  },
  reactionAddBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
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
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  actionModalSheet: {
    backgroundColor: "#13141F",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    padding: 16,
    paddingBottom: 36,
    gap: 12,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignSelf: "center",
    marginBottom: 4,
  },
  quickReactionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  quickReactionBtn: {
    padding: 4,
  },
  quickReactionEmoji: {
    fontSize: 22,
  },
  quickReactionAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(212, 160, 23, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(212, 160, 23, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionModalTitle: {
    fontSize: 11,
    fontFamily: "monospace",
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 2,
  },
  actionMenuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionMenuText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  actionMenuSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  actionDeleteRow: {
    backgroundColor: "rgba(255, 77, 79, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 77, 79, 0.2)",
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  editModalContainer: {
    flex: 1,
  },
  editModalSheet: {
    backgroundColor: "#13141F",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    gap: 14,
  },
  editModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  editModalTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  editTextInput: {
    backgroundColor: "#1b1e2e",
    borderRadius: radius.md,
    padding: 12,
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 80,
    maxHeight: 160,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  editActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  editCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  editCancelText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  editSaveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  editSaveText: {
    color: "#000",
    fontSize: 13,
    fontWeight: "700",
  },
});
