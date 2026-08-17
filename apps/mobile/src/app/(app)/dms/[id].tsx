import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
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
import { ArrowLeft, Send, Phone, Video, MoreVertical, Smile, Paperclip } from "lucide-react-native";
import { AttachmentCard, parseMessageAttachments } from "../../../components/chat/AttachmentCard";
import { UserProfileModal, type UserProfileData } from "../../../components/profile/UserProfileModal";

export default function DMDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { dms } = useWorkspaceStore();
  const { user } = useAuthStore();
  const {
    dmMessages,
    loadDMMessagesAction,
    sendDMMessageAction,
    subscribeToDM,
    unsubscribeFromDM,
    isLoadingMessages,
  } = useChatStore();

  const [inputText, setInputText] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfileData | null>(null);
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
    if (!inputText.trim()) return;
    const textToSend = inputText.trim();
    setInputText("");
    try {
      await sendDMMessageAction(convoId, textToSend);
    } catch (err) {
      console.error("Failed to send DM:", err);
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
          onPress={() => {
            setSelectedUser({
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
              const isMe = item.author.id === (user?.id || "u-anon");
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
                        setSelectedUser({
                          id: item.author.id,
                          displayName: item.author.name,
                          username: item.author.name.toLowerCase().replace(/\s+/g, ""),
                          avatarUrl: item.author.avatar,
                          status: "online",
                        });
                      }}
                    >
                      <Avatar name={item.author.name} size={28} url={item.author.avatar} />
                    </TouchableOpacity>
                  )}
                  <View
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

        {/* Web Parity Floating Capsule Composer */}
        <View style={styles.composerWrapper}>
          <View style={styles.composerCapsule}>
            <TouchableOpacity style={styles.composerToolBtn}>
              <Paperclip size={17} color={colors.textMuted} />
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder={`Message ${conversation.name}...`}
              placeholderTextColor="rgba(101, 106, 126, 0.7)"
              value={inputText}
              onChangeText={setInputText}
              multiline
            />

            <TouchableOpacity
              style={[styles.sendBtn, inputText.trim() && styles.sendBtnActive]}
              onPress={handleSend}
              disabled={!inputText.trim()}
            >
              <Send
                size={16}
                color={inputText.trim() ? colors.accentContrast : colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

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
  composerWrapper: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "transparent",
  },
  composerCapsule: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(19, 20, 28, 0.9)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
  },
  composerToolBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13.5,
    maxHeight: 90,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnActive: {
    backgroundColor: colors.accent,
  },
});
