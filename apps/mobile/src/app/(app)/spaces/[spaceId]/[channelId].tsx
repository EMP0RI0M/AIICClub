import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { colors, radius, typography } from "../../../../theme/tokens";
import { Avatar } from "../../../../components/ui/Avatar";
import { Badge } from "../../../../components/ui/Badge";
import { GlassCard } from "../../../../components/ui/GlassCard";
import { AttachmentCard, parseMessageAttachments } from "../../../../components/chat/AttachmentCard";
import { useWorkspaceStore } from "../../../../stores/workspace-store";
import { useChatStore } from "../../../../stores/chat-store";
import { useAuthStore } from "../../../../stores/auth-store";
import { api } from "../../../../lib/api";
import {
  Hash,
  Volume2,
  Radio,
  FileText,
  Kanban,
  GitPullRequest,
  AlertTriangle,
  Send,
  Menu,
  Plus,
  Users,
  Bell,
  Paperclip,
  Image as ImageIcon,
  Smile,
} from "lucide-react-native";

export default function SpaceChannelScreen() {
  const router = useRouter();
  const { spaceId: routeSpaceId, channelId: routeChannelId } = useLocalSearchParams<{
    spaceId: string;
    channelId: string;
  }>();

  const {
    spaces,
    sections,
    activeSpaceId,
    activeChannelId,
    loadSpaces,
    loadChannelsForSpace,
    setActiveSpace,
    setActiveChannel,
    isLoadingSpaces,
  } = useWorkspaceStore();

  const { user } = useAuthStore();
  const {
    messages,
    loadChannelMessages,
    sendChannelMessageAction,
    toggleReaction,
    subscribeToChannel,
    unsubscribeFromChannel,
    isLoadingMessages,
  } = useChatStore();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadSpaces();
  }, []);

  const currentSpaceId = (routeSpaceId as string) || activeSpaceId || spaces[0]?.id || "";
  const currentSections = sections[currentSpaceId] || [];

  const defaultChanId = currentSections[0]?.channels[0]?.id || "general";
  const currentChannelId = (routeChannelId as string) || activeChannelId || defaultChanId;

  const currentSpace = spaces.find((s) => s.id === currentSpaceId) || {
    id: currentSpaceId,
    name: "AIIC Space",
  };

  let currentChannel = currentSections
    .flatMap((s) => s.channels)
    .find((c) => c.id === currentChannelId);

  if (!currentChannel) {
    currentChannel = { id: currentChannelId, name: currentChannelId, type: "text" };
  }

  useEffect(() => {
    if (currentSpaceId) {
      setActiveSpace(currentSpaceId);
    }
  }, [currentSpaceId]);

  useEffect(() => {
    if (currentChannelId && currentChannelId !== "general") {
      setActiveChannel(currentChannelId);
      loadChannelMessages(currentChannelId);
      subscribeToChannel(currentChannelId);
    }
    return () => {
      unsubscribeFromChannel();
    };
  }, [currentChannelId]);

  const channelMessages = messages[currentChannelId] || [];

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    const textToSend = inputText.trim();
    setInputText("");
    try {
      await sendChannelMessageAction(currentChannelId, textToSend);
    } catch (err) {
      console.error("Failed to send channel message:", err);
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setIsUploading(true);

        const formData = new FormData();
        formData.append("file", {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || "application/octet-stream",
        } as any);

        const res = await api<{ attachment: any }>("/attachments", {
          method: "POST",
          body: formData,
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (res?.attachment) {
          const payload = `attachment:${JSON.stringify(res.attachment)}`;
          await sendChannelMessageAction(currentChannelId, payload);
        }
      }
    } catch (err: any) {
      Alert.alert("Upload Failed", err.message || "Could not upload document.");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setIsUploading(true);

        const formData = new FormData();
        const filename = asset.uri.split("/").pop() || `photo_${Date.now()}.jpg`;
        formData.append("file", {
          uri: asset.uri,
          name: filename,
          type: asset.mimeType || "image/jpeg",
        } as any);

        const res = await api<{ attachment: any }>("/attachments", {
          method: "POST",
          body: formData,
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (res?.attachment) {
          const payload = `attachment:${JSON.stringify(res.attachment)}`;
          await sendChannelMessageAction(currentChannelId, payload);
        }
      }
    } catch (err: any) {
      Alert.alert("Upload Failed", err.message || "Could not upload image.");
    } finally {
      setIsUploading(false);
    }
  };

  const getChannelIcon = (type: string, size = 18, color = colors.textMuted) => {
    switch (type) {
      case "voice":
        return <Volume2 size={size} color={color} />;
      case "stage":
        return <Radio size={size} color={colors.accentTeal} />;
      case "board":
        return <Kanban size={size} color={colors.accent} />;
      case "docs":
        return <FileText size={size} color={colors.textSecondary} />;
      case "github":
        return <GitPullRequest size={size} color={colors.accentTeal} />;
      case "incident":
        return <AlertTriangle size={size} color={colors.danger} />;
      default:
        return <Hash size={size} color={color} />;
    }
  };

  const renderChannelModuleHeader = () => {
    if (currentChannel?.type === "board") {
      return (
        <TouchableOpacity
          style={styles.moduleBanner}
          onPress={() => router.push(`/(app)/boards/${currentChannelId}`)}
        >
          <Kanban size={18} color={colors.accent} />
          <Text style={styles.moduleBannerText}>View Full Kanban Sprint Board →</Text>
        </TouchableOpacity>
      );
    }
    if (currentChannel?.type === "docs") {
      return (
        <TouchableOpacity
          style={styles.moduleBanner}
          onPress={() => router.push(`/(app)/docs/${currentChannelId}`)}
        >
          <FileText size={18} color={colors.accentTeal} />
          <Text style={styles.moduleBannerText}>Open Channel Documentation →</Text>
        </TouchableOpacity>
      );
    }
    if (currentChannel?.type === "voice" || currentChannel?.type === "stage") {
      return (
        <TouchableOpacity
          style={[styles.moduleBanner, { borderColor: colors.accentTeal }]}
          onPress={() => router.push(`/(app)/voice/${currentChannelId}`)}
        >
          <Radio size={18} color={colors.live} />
          <Text style={[styles.moduleBannerText, { color: colors.live }]}>Join Live Audio Room / Stage →</Text>
        </TouchableOpacity>
      );
    }
    return null;
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.drawerTrigger}
          onPress={() => setDrawerOpen(true)}
        >
          <Menu size={22} color={colors.textPrimary} />
          <View style={styles.headerChannelInfo}>
            {getChannelIcon(currentChannel.type, 16, colors.accent)}
            <Text style={styles.headerChannelTitle}>{currentChannel.name}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push("/(app)/notifications")}
          >
            <Bell size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push("/(app)/people")}
          >
            <Users size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {renderChannelModuleHeader()}

      {/* Message Feed */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        style={{ flex: 1 }}
      >
        {isLoadingMessages && channelMessages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        ) : (
          <FlatList
            data={channelMessages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            renderItem={({ item }) => {
              const { cleanText, attachments } = parseMessageAttachments(item.text);

              return (
                <View style={styles.messageItem}>
                  <Avatar name={item.author.name} size={36} />
                  <View style={styles.messageBody}>
                    <View style={styles.messageMeta}>
                      <Text
                        style={[
                          styles.authorName,
                          item.author.roleColor ? { color: item.author.roleColor } : null,
                        ]}
                      >
                        {item.author.name}
                      </Text>
                      <Text style={styles.messageTime}>
                        {new Date(item.at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>

                    {/* Cleaned text content */}
                    {cleanText ? (
                      <Text style={styles.messageContent}>{cleanText}</Text>
                    ) : null}

                    {/* Render Rich Attachments */}
                    {attachments.map((att, idx) => (
                      <AttachmentCard key={idx} attachment={att} />
                    ))}

                    {/* Reactions */}
                    {item.reactions && item.reactions.length > 0 && (
                      <View style={styles.reactionRow}>
                        {item.reactions.map((r, i) => (
                          <TouchableOpacity
                            key={i}
                            style={[
                              styles.reactionPill,
                              r.reacted && styles.reactionPillActive,
                            ]}
                            onPress={() =>
                              toggleReaction(currentChannelId, item.id, r.emoji)
                            }
                          >
                            <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                            <Text
                              style={[
                                styles.reactionCount,
                                r.reacted && { color: colors.accent },
                              ]}
                            >
                              {r.count}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  {getChannelIcon(currentChannel.type, 32, colors.accent)}
                </View>
                <Text style={styles.emptyTitle}>Welcome to #{currentChannel.name}</Text>
                <Text style={styles.emptySubtitle}>
                  This is the beginning of the #{currentChannel.name} channel.
                </Text>
              </View>
            }
          />
        )}

        {/* Message Composer with Glassmorphism and Attachment Uploaders */}
        <View style={styles.composerContainer}>
          <TouchableOpacity
            style={styles.composerActionBtn}
            onPress={handlePickDocument}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Paperclip size={18} color={colors.textSecondary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.composerActionBtn}
            onPress={handlePickImage}
            disabled={isUploading}
          >
            <ImageIcon size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TextInput
            style={styles.composerInput}
            placeholder={`Message #${currentChannel.name}`}
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              inputText.trim() ? styles.sendBtnActive : null,
            ]}
            onPress={handleSendMessage}
            disabled={!inputText.trim()}
          >
            <Send
              size={18}
              color={inputText.trim() ? colors.accentContrast : colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Spaces & Channels Drawer Modal */}
      <Modal
        visible={drawerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setDrawerOpen(false)}
      >
        <View style={styles.drawerOverlay}>
          <SafeAreaView style={styles.drawerContainer}>
            {/* Space Selector Rail */}
            <View style={styles.spaceRail}>
              {spaces.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[
                    styles.spaceRailItem,
                    s.id === currentSpaceId && styles.spaceRailItemActive,
                  ]}
                  onPress={() => {
                    setActiveSpace(s.id);
                    const firstChannel = (sections[s.id] || [])[0]?.channels[0];
                    if (firstChannel) {
                      router.push(`/(app)/spaces/${s.id}/${firstChannel.id}`);
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.spaceRailText,
                      s.id === currentSpaceId && { color: colors.accentContrast },
                    ]}
                  >
                    {s.name.charAt(0)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Channels Panel */}
            <View style={styles.channelPanel}>
              <View style={styles.spaceHeader}>
                <Text style={styles.spaceTitle}>{currentSpace.name}</Text>
                <TouchableOpacity onPress={() => setDrawerOpen(false)}>
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Done</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={currentSections}
                keyExtractor={(sec) => sec.id}
                renderItem={({ item: sec }) => (
                  <View style={styles.sectionBlock}>
                    <Text style={styles.sectionHeader}>{sec.name}</Text>
                    {sec.channels.map((chan) => (
                      <TouchableOpacity
                        key={chan.id}
                        style={[
                          styles.channelRow,
                          chan.id === currentChannelId && styles.channelRowActive,
                        ]}
                        onPress={() => {
                          setDrawerOpen(false);
                          router.push(`/(app)/spaces/${currentSpaceId}/${chan.id}`);
                        }}
                      >
                        {getChannelIcon(
                          chan.type,
                          18,
                          chan.id === currentChannelId ? colors.accent : colors.textMuted
                        )}
                        <Text
                          style={[
                            styles.channelRowText,
                            chan.id === currentChannelId && styles.channelRowTextActive,
                          ]}
                        >
                          {chan.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              />
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bgDeep,
  },
  drawerTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerChannelInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerChannelTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "700",
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  moduleBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderHighlight,
  },
  moduleBannerText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  messageList: {
    padding: 16,
    paddingBottom: 24,
  },
  messageItem: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  messageBody: {
    flex: 1,
  },
  messageMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  authorName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  messageTime: {
    color: colors.textMuted,
    fontSize: 11,
  },
  messageContent: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  reactionRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
  },
  reactionPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
    gap: 4,
  },
  reactionPillActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  reactionEmoji: {
    fontSize: 12,
  },
  reactionCount: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 6,
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
  },
  composerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  composerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  composerInput: {
    flex: 1,
    backgroundColor: colors.surfaceInput,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.textPrimary,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnActive: {
    backgroundColor: colors.accent,
  },
  drawerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  drawerContainer: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: colors.bgDeep,
    width: "85%",
  },
  spaceRail: {
    width: 60,
    backgroundColor: colors.background,
    alignItems: "center",
    paddingTop: 16,
    gap: 12,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  spaceRailItem: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  spaceRailItemActive: {
    backgroundColor: colors.accent,
  },
  spaceRailText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  channelPanel: {
    flex: 1,
    padding: 16,
  },
  spaceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  spaceTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionHeader: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  channelRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    gap: 8,
    marginBottom: 2,
  },
  channelRowActive: {
    backgroundColor: colors.activeRow,
  },
  channelRowText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
  channelRowTextActive: {
    color: colors.accent,
    fontWeight: "700",
  },
});
