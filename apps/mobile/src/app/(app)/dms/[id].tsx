import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Pressable,
  Image,
  Modal,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  PanResponder,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, useAppTheme } from "../../../theme/tokens";
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
  Camera,
  X,
  Trash2,
  Mic,
  Copy,
  Edit3,
  SmilePlus,
  Check,
  CheckCheck,
  Plus,
  CornerUpLeft,
  Palette,
  MessageSquare,
} from "lucide-react-native";
import { AttachmentCard, parseMessageAttachments } from "../../../components/chat/AttachmentCard";
import { encodeAttachmentContent } from "../../../lib/attachments";
import { soundService } from "../../../lib/sound-service";
import { RichMarkdown, ReasoningTrace } from "../../../components/chat/RichMarkdown";
import { formatAvatarUrl } from "../../../lib/avatar";
import { UserProfileModal, type UserProfileData } from "../../../components/profile/UserProfileModal";
import {
  MobileAttachmentSheet,
  MobileGifModal,
  MobileEmojiModal,
  MobileGiftPickerModal,
} from "../../../components/chat/MobileMediaPickers";
import { ExpressionSheet, type ExpressionTab } from "../../../components/chat/ExpressionSheet";
import { WallpaperBackground } from "../../../components/theme/WallpaperBackground";
import { GlassBackButton } from "../../../components/ui/GlassBackButton";
import { ThemeCustomizerModal } from "../../../components/theme/ThemeCustomizerModal";
import { useThemeStore } from "../../../stores/theme-store";
import { useVoiceRecorder } from "../../../lib/voice-recorder";
import { NativeHaptics } from "../../../lib/haptics";
import { fetchUserProfile } from "../../../lib/api";

const QUICK_REACTION_EMOJIS = ["👍", "❤️", "🔥", "😂", "🎉", "🚀", "👀", "💯"];

function DoubleTapHeartOverlay({ visible }: { visible: boolean }) {
  const scale = useRef(new Animated.Value(0.2)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scale.setValue(0.2);
      opacity.setValue(1);
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1.3,
          friction: 4,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(350),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.doubleTapHeartWrapper,
        {
          opacity,
          transform: [{ scale }],
        },
      ]}
    >
      <Text style={{ fontSize: 34 }}>❤️</Text>
    </Animated.View>
  );
}

function SwipeableMessageRow({
  children,
  timestamp,
  onSwipeReply,
}: {
  children: React.ReactNode;
  timestamp?: string;
  onSwipeReply?: () => void;
}) {
  const panX = useRef(new Animated.Value(0)).current;
  const replyTriggered = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          Math.abs(gestureState.dx) > 12 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.8
        );
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          // Swipe Left -> reveal timestamp
          panX.setValue(Math.max(-75, gestureState.dx));
        } else if (gestureState.dx > 0 && onSwipeReply) {
          // Swipe Right -> pull to reply
          panX.setValue(Math.min(70, gestureState.dx));
          if (gestureState.dx > 45 && !replyTriggered.current) {
            replyTriggered.current = true;
            NativeHaptics.light();
          } else if (gestureState.dx <= 45 && replyTriggered.current) {
            replyTriggered.current = false;
          }
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 45 && onSwipeReply && replyTriggered.current) {
          NativeHaptics.medium();
          onSwipeReply();
        }
        replyTriggered.current = false;
        Animated.spring(panX, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
          tension: 40,
        }).start();
      },
      onPanResponderTerminate: () => {
        replyTriggered.current = false;
        Animated.spring(panX, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
          tension: 40,
        }).start();
      },
    })
  ).current;

  const formattedTime = useMemo(() => {
    if (!timestamp) return "";
    try {
      return new Date(timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }, [timestamp]);

  return (
    <View style={styles.swipeRowWrapper}>
      {/* Swipe Left: Timestamp */}
      <View style={styles.swipeTimestampContainer}>
        <Text style={styles.swipeTimestampText}>{formattedTime}</Text>
      </View>

      <Animated.View
        style={{
          transform: [{ translateX: panX }],
          width: "100%",
        }}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

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
    typingUsers,
    sendDMTyping,
    startDMCall,
  } = useChatStore();

  const handleStartCall = (isVideo: boolean = false) => {
    NativeHaptics.medium();
    if (user) {
      startDMCall(
        convoId,
        {
          id: user.id,
          name: user.displayName || user.username || "You",
          avatar: user.avatar,
        },
        isVideo
      );
    }
    router.push({
      pathname: `/(app)/voice/${convoId}`,
      params: {
        type: isVideo ? "video" : "voice",
        title: conversation.name,
      },
    } as any);
  };

  const [inputText, setInputText] = useState("");
  const {
    isRecording,
    durationSec,
    formattedDuration,
    metering,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useVoiceRecorder();
  const [selectedUser, setSelectedUser] = useState<UserProfileData | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [messageActionOpen, setMessageActionOpen] = useState(false);
  const [attachSheetOpen, setAttachSheetOpen] = useState(false);
  const [expressionSheetOpen, setExpressionSheetOpen] = useState(false);
  const [expressionTab, setExpressionTab] = useState<ExpressionTab>("emoji");
  const [reactModalOpen, setReactModalOpen] = useState(false);
  const [messageToReact, setMessageToReact] = useState<any | null>(null);
  const [giftModalOpen, setGiftModalOpen] = useState(false);
  const [themeStudioOpen, setThemeStudioOpen] = useState(false);
  const [dmOptionsOpen, setDmOptionsOpen] = useState(false);
  const theme = useAppTheme();
  const themeAccent = theme.colors.accent;
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editText, setEditText] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [copyToast, setCopyToast] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [heartPoppingId, setHeartPoppingId] = useState<string | null>(null);
  const lastTapTime = useRef<{ [msgId: string]: number }>({});
  const flatListRef = useRef<FlatList<any>>(null);

  const handleMessagePress = (item: any) => {
    const now = Date.now();
    const lastTime = lastTapTime.current[item.id] || 0;
    if (now - lastTime < 320) {
      lastTapTime.current[item.id] = 0;
      NativeHaptics.success();
      setHeartPoppingId(item.id);
      toggleDMReaction(convoId, item.id, "❤️");
      setTimeout(() => {
        setHeartPoppingId((curr) => (curr === item.id ? null : curr));
      }, 700);
    } else {
      lastTapTime.current[item.id] = now;
    }
  };

  const handleJumpToMessage = (targetId: string) => {
    const targetIndex = messagesList.findIndex((m) => m.id === targetId);
    if (targetIndex !== -1 && flatListRef.current) {
      try {
        flatListRef.current.scrollToIndex({
          index: targetIndex,
          animated: true,
          viewPosition: 0.5,
        });
      } catch {
        flatListRef.current.scrollToOffset({
          offset: Math.max(0, targetIndex * 70),
          animated: true,
        });
      }
      setHighlightedMessageId(targetId);
      NativeHaptics.light();
      setTimeout(() => {
        setHighlightedMessageId((curr) => (curr === targetId ? null : curr));
      }, 2000);
    }
  };

  const [stagedAttachment, setStagedAttachment] = useState<{
    url: string;
    name: string;
    type?: string;
    kind?: "image" | "video" | "file" | "gif" | "audio";
    size?: number | string;
    duration?: string;
  } | null>(null);
  const convoId = id as string;

  const conversation = dms.find((d) => d.id === convoId) || {
    id: convoId,
    name: "Direct Message",
    presence: "online" as const,
  };

  useEffect(() => {
    if (convoId) {
      soundService.setActiveScreen("dm", convoId);
      loadDMMessagesAction(convoId);
      subscribeToDM(convoId);
    }
    return () => {
      soundService.setActiveScreen("none", null);
      unsubscribeFromDM();
    };
  }, [convoId]);

  const messagesList = dmMessages[convoId] || [];

  const handleSend = async () => {
    const rawText = inputText.trim();
    if (!rawText && !stagedAttachment) return;
    let finalContent = rawText;
    if (stagedAttachment) {
      const attPayload = encodeAttachmentContent({
        url: stagedAttachment.url,
        name: stagedAttachment.name,
        size: stagedAttachment.size,
        mimeType: stagedAttachment.type,
        kind: stagedAttachment.kind || "image",
        duration: stagedAttachment.duration,
      });
      finalContent = rawText ? `${rawText}\n${attPayload}` : attPayload;
    }
    const replyId = replyingTo?.id;
    setInputText("");
    setStagedAttachment(null);
    setReplyingTo(null);
    try {
      await sendDMMessageAction(convoId, finalContent, replyId);
    } catch (err) {
      console.error("Failed to send DM:", err);
    }
  };

  const handleSelectGif = async (gifUrl: string) => {
    setExpressionSheetOpen(false);
    NativeHaptics.selection();
    try {
      const attPayload = encodeAttachmentContent({
        url: gifUrl,
        name: "GIF",
        mimeType: "image/gif",
        kind: "gif",
      });
      await sendDMMessageAction(convoId, attPayload);
    } catch (err) {
      console.error("Failed to send GIF:", err);
    }
  };

  const handleSelectSticker = async (stickerUrl: string, title?: string) => {
    setExpressionSheetOpen(false);
    NativeHaptics.selection();
    try {
      const attPayload = encodeAttachmentContent({
        url: stickerUrl,
        name: title || "Sticker",
        mimeType: "image/webp",
        kind: "sticker",
      });
      await sendDMMessageAction(convoId, attPayload);
    } catch (err) {
      console.error("Failed to send sticker:", err);
    }
  };

  const handleSelectMeme = async (memeUrl: string, title?: string) => {
    setExpressionSheetOpen(false);
    NativeHaptics.selection();
    try {
      const attPayload = encodeAttachmentContent({
        url: memeUrl,
        name: title || "Meme",
        mimeType: "image/jpeg",
        kind: "image",
      });
      await sendDMMessageAction(convoId, attPayload);
    } catch (err) {
      console.error("Failed to send meme:", err);
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

        {/* Individual DM conversation header: separate glass modules */}
        <View style={styles.headerCapsuleWrap}>
          <View style={styles.headerCapsule}>
            <GlassBackButton
              fallbackRoute="/(app)/dms"
              size={48}
              iconSize={21}
              style={{ borderRadius: 24 }}
            />

            <TouchableOpacity
              style={styles.headerCenter}
              onPress={() => setDmOptionsOpen(true)}
            >
              <Avatar
                name={conversation.name}
                presence={conversation.presence}
                size={48}
                url={(conversation as any)?.avatar || (conversation as any)?.avatarUrl}
              />
              <View style={{ minWidth: 0, flex: 1 }}>
                <Text style={styles.headerName} numberOfLines={1}>
                  {conversation.name}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => handleStartCall(false)}
              >
                <Phone size={16} color={themeAccent} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => handleStartCall(true)}
              >
                <Video size={16} color={themeAccent} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

      {/* Message Feed */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        style={{ flex: 1 }}
      >
        {isLoadingMessages && messagesList.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messagesList}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const isMe = item.author.id === (user?.id || "u-anon") || item.author.id === "me";
              const { cleanText, attachments } = parseMessageAttachments(item.text || "");
              const stickerOnly = attachments.length === 1 && attachments[0].kind === "sticker" && !cleanText;
              const hasReactions = item.reactions && item.reactions.length > 0;
              const isHighlighted = item.id === highlightedMessageId;

              let replyAuthorName = "User";
              if (item.replyTo) {
                if (item.replyTo.authorId && (item.replyTo.authorId === user?.id || item.replyTo.authorId === "me")) {
                  replyAuthorName = "You";
                } else if (item.replyTo.authorName) {
                  replyAuthorName = item.replyTo.authorName;
                } else {
                  const orig = messagesList.find((m) => m.id === item.replyTo?.id);
                  if (orig) {
                    replyAuthorName = (orig.author.id === user?.id || orig.author.id === "me") ? "You" : orig.author.name;
                  }
                }
              }

              return (
                <SwipeableMessageRow
                  timestamp={item.at}
                  onSwipeReply={() => setReplyingTo(item)}
                >
                  <View
                    style={[
                      styles.messageBubbleWrap,
                      isMe ? styles.myMessageWrap : styles.theirMessageWrap,
                      isHighlighted && styles.messageHighlighted,
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
                    <View style={{ alignItems: isMe ? "flex-end" : "flex-start" }}>
                      {/* Match channel-message reply layout: preview sits above the bubble. */}
                      {item.replyTo && (
                        <Pressable
                          onPress={() => item.replyTo?.id && handleJumpToMessage(item.replyTo.id)}
                          style={[styles.dmReplyHeader, { borderLeftColor: themeAccent, backgroundColor: `${themeAccent}18` }]}
                          hitSlop={4}
                        >
                          <CornerUpLeft size={11} color={themeAccent} />
                          <Text style={[styles.dmReplyAuthor, { color: themeAccent }]}>{replyAuthorName}:</Text>
                          <Text style={styles.dmReplySnippet} numberOfLines={1}>
                            {parseMessageAttachments(item.replyTo.text || "").cleanText || "Attachment"}
                          </Text>
                        </Pressable>
                      )}

                      <Pressable
                        delayLongPress={150}
                        onPress={() => handleMessagePress(item)}
                        onLongPress={() => {
                          NativeHaptics.medium();
                          setSelectedMessage(item);
                          setMessageActionOpen(true);
                        }}
                        style={[
                        styles.bubbleGlassWrap,
                        stickerOnly && styles.stickerOnlyBubble,
                          isMe ? styles.myBubbleGlassWrap : styles.theirBubbleGlassWrap,
                        ]}
                      >
                        <DoubleTapHeartOverlay visible={heartPoppingId === item.id} />

                        <BlurView
                          intensity={isMe ? 20 : 25}
                          tint="dark"
                          style={[
                            styles.bubbleInner,
                            isMe ? styles.myBubbleInner : styles.theirBubbleInner,
                          ]}
                        >
                          <LinearGradient
                            colors={
                              isMe
                                ? ["rgba(232, 163, 61, 0.12)", "rgba(232, 163, 61, 0.04)"]
                                : ["rgba(255, 255, 255, 0.04)", "rgba(255, 255, 255, 0.01)"]
                            }
                            style={StyleSheet.absoluteFillObject}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                          />

                          {/* Rich Markdown & LaTeX Message Body */}
                          {cleanText ? (
                            <RichMarkdown
                              content={cleanText}
                              textColor={isMe ? "#FFFFFF" : colors.textPrimary}
                            />
                          ) : null}

                          {/* Decoded Attachments */}
                          {attachments.map((att, idx) => (
                            <AttachmentCard key={idx} attachment={att} />
                          ))}

                          <View style={styles.bubbleMetaRow}>
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
                            {isMe && (
                              <CheckCheck size={12} color="rgba(232, 163, 61, 0.85)" style={{ marginLeft: 3 }} />
                            )}
                          </View>
                        </BlurView>
                      </Pressable>

                      {/* Translucent Liquid Glass Reaction Strip */}
                      {hasReactions && (
                        <View style={[styles.reactionsStrip, isMe && styles.myReactionsStrip]}>
                          {item.reactions!.map((reaction: any, rIdx: number) => {
                            const userReacted = reaction.reacted;
                            return (
                              <TouchableOpacity
                                key={`${item.id}_${reaction.emoji}_${rIdx}`}
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
                </SwipeableMessageRow>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Avatar name={conversation.name} size={54} url={(conversation as any)?.avatar || (conversation as any)?.avatarUrl} />
                <Text style={styles.emptyTitle}>{conversation.name}</Text>
                <Text style={styles.emptySubtitle}>
                  This is the beginning of your direct message history with {conversation.name}.
                </Text>
              </View>
            }
          />
        )}

        {/* Replying Preview Bar */}
        {replyingTo && (
          <View style={[styles.replyingBar, { borderColor: `${themeAccent}55`, backgroundColor: `${themeAccent}18` }]}>
            <View style={styles.replyingLeft}>
              <CornerUpLeft size={13} color={themeAccent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.replyingAuthor}>
                  Replying to {(replyingTo.author?.id === user?.id || replyingTo.author?.id === "me") ? "yourself" : replyingTo.author?.name}
                </Text>
                <Text style={styles.replyingSnippet} numberOfLines={1}>
                  {parseMessageAttachments(replyingTo.text || "").cleanText || "Attachment"}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)} hitSlop={8}>
              <X size={14} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Staged Attachment Preview Banner */}
        {stagedAttachment && (
          <View style={styles.stagedAttachmentBanner}>
            <View style={styles.stagedAttachmentInner}>
              {stagedAttachment.url && (stagedAttachment.kind === "image" || stagedAttachment.kind === "gif" || stagedAttachment.type?.startsWith("image/")) ? (
                <Image
                  source={{ uri: stagedAttachment.url }}
                  style={{ width: 24, height: 24, borderRadius: 5, marginRight: 6 }}
                  resizeMode="cover"
                />
              ) : (
                <Paperclip size={13} color={colors.accent} />
              )}
              <Text style={styles.stagedAttachmentName} numberOfLines={1}>
                {stagedAttachment.name}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setStagedAttachment(null)} hitSlop={8}>
              <X size={14} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Real-Time Live Typing Indicator */}
        {(typingUsers[convoId] || []).length > 0 && (
          <View style={styles.typingIndicatorRow}>
            <View style={styles.typingDotWrap}>
              <View style={[styles.typingDot, { backgroundColor: themeAccent }]} />
              <View style={[styles.typingDot, { backgroundColor: themeAccent, opacity: 0.7 }]} />
              <View style={[styles.typingDot, { backgroundColor: themeAccent, opacity: 0.4 }]} />
            </View>
            <Text style={styles.typingIndicatorText} numberOfLines={1}>
              {(typingUsers[convoId] || []).join(", ")} {(typingUsers[convoId] || []).length === 1 ? "is" : "are"} typing...
            </Text>
          </View>
        )}

        {/* Floating Liquid Glass Composer Bar */}
        <View style={styles.composerWrapper}>
          <View style={styles.composerRow}>
            <BlurView
              intensity={35}
              tint="dark"
              style={[styles.composerPill, { borderColor: theme.colors.accentBorder }]}
            >
              <LinearGradient
                colors={["rgba(255,255,255,0.08)", "rgba(255,255,255,0.02)"]}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />

              {isRecording ? (
                <View style={styles.recordingPillInner}>
                  <View style={styles.recordingPulseDot} />
                  <Text style={styles.recordingTimerText}>{formattedDuration}</Text>
                  <View style={styles.waveformContainer}>
                    {(metering.length > 0
                      ? metering.slice(-12)
                      : [0.3, 0.6, 0.9, 0.4, 0.7, 0.2, 0.8, 0.5]
                    ).map((val, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.waveformBar,
                          { height: Math.max(4, Math.min(22, val * 22)) },
                        ]}
                      />
                    ))}
                  </View>
                  <TouchableOpacity
                    onPress={cancelRecording}
                    style={styles.cancelRecordButton}
                    hitSlop={8}
                  >
                    <Trash2 size={16} color="#FF5555" />
                    <Text style={styles.cancelRecordText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {/* Emoji button inside left of pill */}
                  <TouchableOpacity
                    style={styles.pillIconBtn}
                    onPress={() => {
                      NativeHaptics.light();
                      setExpressionTab("emoji");
                      setExpressionSheetOpen(true);
                    }}
                    hitSlop={8}
                  >
                    <Smile size={21} color={theme.colors.textMuted} />
                  </TouchableOpacity>

                  <TextInput
                    style={[styles.composerInput, { color: theme.colors.textPrimary }]}
                    placeholder={`Message ${conversation.name}...`}
                    placeholderTextColor={theme.colors.textMuted}
                    value={inputText}
                    onChangeText={(t) => {
                      setInputText(t);
                      if (t && user) {
                        sendDMTyping(convoId, user.displayName || user.username || "Member");
                      }
                    }}
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
                    <Paperclip size={20} color={theme.colors.textMuted} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.pillIconBtn}
                    onPress={() => {
                      NativeHaptics.light();
                      setAttachSheetOpen(true);
                    }}
                    hitSlop={8}
                  >
                    <Camera size={20} color={theme.colors.textMuted} />
                  </TouchableOpacity>

                  {/* GIF / Expression Button */}
                  <TouchableOpacity
                    style={styles.gifBadgeBtn}
                    onPress={() => {
                      NativeHaptics.light();
                      setExpressionTab("gifs");
                      setExpressionSheetOpen(true);
                    }}
                    hitSlop={8}
                  >
                    <View style={styles.gifBadge}>
                      <Text style={styles.gifBadgeText}>GIF</Text>
                    </View>
                  </TouchableOpacity>
                </>
              )}
            </BlurView>

            {/* Detached Action Button */}
            <TouchableOpacity
              style={[
                styles.detachedActionButton,
                { backgroundColor: `${theme.colors.surface}CC`, borderColor: theme.colors.accentBorder },
                (inputText.trim() || stagedAttachment) && styles.detachedActionButtonActive,
                isRecording && styles.detachedActionButtonRecording,
              ]}
              onPressIn={() => {
                if (!inputText.trim() && !stagedAttachment) {
                  startRecording();
                }
              }}
              onPressOut={async () => {
                if (isRecording) {
                  const rec = await stopRecording();
                  if (rec && rec.durationSec >= 1) {
                    const attPayload = `attachment:${JSON.stringify({
                      url: rec.uri,
                      name: "Voice Note",
                      type: "audio/m4a",
                      kind: "audio",
                      duration: rec.formattedDuration,
                    })}`;
                    const finalContent = inputText.trim() ? `${inputText.trim()}\n${attPayload}` : attPayload;
                    const replyId = replyingTo?.id;
                    setInputText("");
                    setStagedAttachment(null);
                    setReplyingTo(null);
                    try {
                      await sendDMMessageAction(convoId, finalContent, replyId);
                    } catch (err) {
                      console.error("Failed to send DM audio:", err);
                    }
                  }
                }
              }}
              onPress={() => {
                if (inputText.trim() || stagedAttachment) {
                  handleSend();
                } else if (!isRecording) {
                  NativeHaptics.selection();
                }
              }}
              hitSlop={6}
            >
              {inputText.trim() || stagedAttachment ? (
                <Send size={18} color="#000" />
              ) : (
                <Mic size={20} color={isRecording ? "#FFFFFF" : colors.accent} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* DM Message Options Modal (Delete, Copy, Edit, React) */}
      <Modal
        visible={dmOptionsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDmOptionsOpen(false)}
      >
        <Pressable style={styles.actionModalBackdrop} onPress={() => setDmOptionsOpen(false)}>
          <View style={styles.dmOptionsSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.actionModalTitle}>{conversation.name}</Text>
            <Pressable
              style={styles.actionMenuRow}
              onPress={() => {
                setDmOptionsOpen(false);
                setThemeStudioOpen(true);
              }}
            >
              <View style={[styles.menuIconWrap, { backgroundColor: `${themeAccent}18` }]}>
                <Palette size={17} color={themeAccent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionMenuText}>Theme</Text>
                <Text style={styles.actionMenuSub}>Customize this conversation appearance</Text>
              </View>
            </Pressable>
            <Pressable
              style={styles.actionMenuRow}
              onPress={async () => {
                setDmOptionsOpen(false);
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
              <View style={[styles.menuIconWrap, { backgroundColor: "rgba(56, 189, 248, 0.15)" }]}>
                <MessageSquare size={17} color="#38bdf8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionMenuText}>View Profile</Text>
                <Text style={styles.actionMenuSub}>Open this person’s profile</Text>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

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
              <Pressable
                style={styles.actionMenuRow}
                onPress={() => {
                  if (selectedMessage) {
                    setReplyingTo(selectedMessage);
                  }
                  setMessageActionOpen(false);
                }}
              >
                <CornerUpLeft size={17} color={themeAccent} />
                <Text style={[styles.actionMenuText, { color: themeAccent }]}>Reply to Message</Text>
              </Pressable>

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
                <View style={[styles.menuIconWrap, { backgroundColor: "rgba(212, 160, 23, 0.15)" }]}>
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
                <View style={[styles.menuIconWrap, { backgroundColor: "rgba(56, 189, 248, 0.15)" }]}>
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
                    <View style={[styles.menuIconWrap, { backgroundColor: "rgba(168, 85, 247, 0.15)" }]}>
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
                    <View style={[styles.menuIconWrap, { backgroundColor: "rgba(255, 77, 79, 0.18)" }]}>
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

      {/* Unified Expression Bottom Sheet (GIFs, Stickers, Memes, Emojis) */}
      <ExpressionSheet
        visible={expressionSheetOpen}
        initialTab={expressionTab}
        onClose={() => setExpressionSheetOpen(false)}
        onSelectEmoji={(emoji) => {
          setInputText((prev) => prev + emoji);
        }}
        onSelectGif={handleSelectGif}
        onSelectSticker={handleSelectSticker}
        onSelectMeme={handleSelectMeme}
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

      {/* Theme & Wallpaper Customization Studio Modal */}
      <ThemeCustomizerModal
        visible={themeStudioOpen}
        onClose={() => setThemeStudioOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  ambientGlowAmber: {
    position: "absolute",
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: "rgba(212, 160, 23, 0.055)",
    top: 60,
    left: -120,
  },
  ambientGlowTeal: {
    position: "absolute",
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: "rgba(45, 212, 191, 0.035)",
    bottom: 80,
    right: -100,
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
    borderRadius: 24,
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
  headerCapsuleWrap: {
    marginHorizontal: 12,
    marginTop: 8,
  },
  headerCapsule: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
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
    minWidth: 0,
    flexShrink: 1,
    height: 52,
    paddingHorizontal: 8,
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.075)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
  },
  headerName: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    flexShrink: 1,
  },
  headerSub: {
    color: colors.accent,
    fontSize: 12,
    fontFamily: "monospace",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
    flexShrink: 0,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    padding: 16,
    paddingBottom: 28,
  },
  messageBubbleWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 9,
    marginBottom: 12,
  },
  myMessageWrap: {
    justifyContent: "flex-end",
  },
  theirMessageWrap: {
    justifyContent: "flex-start",
  },
  bubbleGlassWrap: {
    minWidth: 0,
    maxWidth: "100%",
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  stickerOnlyBubble: {
    backgroundColor: "transparent",
    borderWidth: 0,
    padding: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  myBubbleGlassWrap: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderBottomRightRadius: 5,
    borderBottomLeftRadius: 22,
    maxWidth: "78%",
  },
  theirBubbleGlassWrap: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderBottomRightRadius: 22,
    borderBottomLeftRadius: 5,
    maxWidth: "82%",
  },
  bubbleInner: {
    minWidth: 0,
    maxWidth: "100%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    overflow: "hidden",
    borderWidth: 0,
  },
  myBubbleInner: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 20,
    borderColor: "rgba(232, 163, 61, 0.2)",
    backgroundColor: "transparent",
  },
  theirBubbleInner: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 4,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "transparent",
  },
  bubbleText: {
    fontSize: 14.5,
    lineHeight: 20.5,
  },
  myBubbleText: {
    color: "#FFFFFF",
    fontWeight: "500",
  },
  theirBubbleText: {
    color: colors.textPrimary,
  },
  swipeRowWrapper: {
    position: "relative",
    width: "100%",
  },
  swipeTimestampContainer: {
    position: "absolute",
    right: 8,
    top: "50%",
    transform: [{ translateY: -9 }],
    justifyContent: "center",
    alignItems: "flex-end",
  },
  swipeTimestampText: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: "monospace",
    fontWeight: "600",
  },
  doubleTapHeartWrapper: {
    position: "absolute",
    alignSelf: "center",
    top: "50%",
    transform: [{ translateY: -20 }],
    zIndex: 99,
  },
  dmReplyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  dmReplyAuthor: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  dmReplySnippet: {
    color: colors.textMuted,
    fontSize: 11,
    flex: 1,
  },
  messageHighlighted: {
    backgroundColor: "rgba(232, 163, 61, 0.12)",
    borderColor: "rgba(232, 163, 61, 0.7)",
    borderWidth: 1,
    borderRadius: 14,
    padding: 4,
  },
  bubbleMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    marginTop: 3,
  },
  replyingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(232, 163, 61, 0.12)",
    marginHorizontal: 12,
    marginBottom: 6,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "rgba(232, 163, 61, 0.3)",
  },
  replyingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  replyingAuthor: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  replyingSnippet: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  bubbleTime: {
    fontSize: 10,
    fontFamily: "monospace",
  },
  myBubbleTime: {
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: "600",
  },
  theirBubbleTime: {
    color: "rgba(255, 255, 255, 0.45)",
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
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 3,
  },
  reactionBadgeActive: {
    backgroundColor: "rgba(212, 160, 23, 0.25)",
    borderColor: colors.accent,
  },
  reactionEmoji: {
    fontSize: 13,
  },
  reactionCount: {
    fontSize: 10,
    fontFamily: "monospace",
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.7)",
  },
  reactionCountActive: {
    color: colors.accent,
  },
  reactionAddBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
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
    backgroundColor: "rgba(212, 160, 23, 0.15)",
    marginHorizontal: 12,
    marginBottom: 6,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(212, 160, 23, 0.3)",
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
    minHeight: 48,
    maxHeight: 120,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
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
    color: "#FFFFFF",
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(23, 25, 36, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  detachedActionButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  detachedActionButtonRecording: {
    backgroundColor: "#E53E3E",
    borderColor: "#FF6B6B",
    shadowColor: "#E53E3E",
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  recordingPillInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 8,
  },
  recordingPulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF4444",
  },
  recordingTimerText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    minWidth: 42,
  },
  waveformContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    height: 24,
  },
  waveformBar: {
    width: 3,
    borderRadius: 1.5,
    backgroundColor: colors.accent,
  },
  cancelRecordButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(255, 68, 68, 0.15)",
  },
  cancelRecordText: {
    color: "#FF5555",
    fontSize: 12,
    fontWeight: "600",
  },
  actionModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.32)",
    justifyContent: "flex-end",
  },
  actionModalSheet: {
    backgroundColor: "rgba(17, 19, 30, 0.62)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    padding: 16,
    paddingBottom: 36,
    gap: 12,
  },
  dmOptionsSheet: {
    backgroundColor: "rgba(17, 19, 30, 0.48)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
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
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
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
    backgroundColor: "rgba(212, 160, 23, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(212, 160, 23, 0.35)",
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
    backgroundColor: "#11131E",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
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
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: radius.md,
    padding: 12,
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 80,
    maxHeight: 160,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
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
  typingIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 4,
    marginBottom: 2,
    gap: 8,
  },
  typingDotWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  typingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  typingIndicatorText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
});
