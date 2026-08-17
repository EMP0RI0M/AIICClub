import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../../../stores/auth-store";
import { useWorkspaceStore } from "../../../../stores/workspace-store";
import { useChatStore } from "../../../../stores/chat-store";
import { api, searchUsers, publishAnnouncement } from "../../../../lib/api";
import { AttachmentCard, parseMessageAttachments } from "../../../../components/chat/AttachmentCard";
import { Avatar } from "../../../../components/ui/Avatar";
import { GlassCard } from "../../../../components/ui/GlassCard";
import { Badge } from "../../../../components/ui/Badge";
import { VoiceChannelView } from "../../../../components/chat/VoiceChannelView";
import { IncidentChannelView } from "../../../../components/chat/IncidentChannelView";
import { CanvasChannelView } from "../../../../components/chat/CanvasChannelView";
import { colors, radius } from "../../../../theme/tokens";
import {
  MessageSquare,
  Search,
  Plus,
  Calendar,
  Bell,
  Archive,
  Settings,
  Hash,
  Volume2,
  FolderKanban,
  Kanban,
  FileText,
  Github,
  AlertTriangle,
  Radio,
  ChevronRight,
  Send,
  ChevronLeft,
  Check,
  X,
  Shield,
  Code,
  User,
  UserPlus,
  ExternalLink,
  Mic,
  MicOff,
  PhoneOff,
  Sparkles,
  Smile,
  CornerUpLeft,
  Layers,
  Terminal,
  Activity,
} from "lucide-react-native";

/* =========================================================
   TYPES & 9 DISTINCT SPACE TYPES
   ========================================================= */

export type SpaceCategoryType =
  | "flagship"       // Flagship AI & Robotics Lab
  | "squad"          // High-velocity build squads
  | "research_lab"   // Frontier research & papers
  | "open_source"    // GitHub connected repositories
  | "cohort"         // Student academic / batch groups
  | "hackathon"      // Timed competition rooms
  | "governance"     // President & Staff leadership
  | "general"        // Main community space
  | "archive_space"; // Historic records & showcases

export type Server = {
  id: string;
  name: string;
  iconUrl?: string | null;
  unreadCount?: number;
  type?: SpaceCategoryType;
  description?: string;
};

export type Channel = {
  id: string;
  serverId: string;
  name: string;
  type: "text" | "voice" | "project" | "board" | "docs" | "github" | "incident" | "stage" | "canvas" | "announcement" | "forum";
  category?: string;
  unreadCount?: number;
  topic?: string;
};

export type Message = {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    displayName: string;
    avatarUrl?: string | null;
    roleColor?: string;
  };
  attachment?: {
    url?: string;
    name?: string;
    mimeType?: string;
    type?: string;
  };
  reactions?: Array<{
    emoji: string;
    count: number;
    reacted: boolean;
  }>;
};

/* =========================================================
   LEVEL 1: NARROW LEFT SPACE / SERVER RAIL
   ========================================================= */

function SpaceRail({
  servers,
  selectedServerId,
  onSelectServer,
  onDM,
  currentSection,
  isAdmin,
  onNotice,
  onArchive,
  onAdmin,
  currentUser,
  onOpenProfile,
}: {
  servers: Server[];
  selectedServerId: string | null;
  onSelectServer: (id: string) => void;
  onDM: () => void;
  currentSection: string;
  isAdmin: boolean;
  onNotice: () => void;
  onArchive: () => void;
  onAdmin: () => void;
  currentUser: any;
  onOpenProfile: () => void;
}) {
  return (
    <View style={styles.rail}>
      {/* DM button above spaces */}
      <Pressable
        onPress={onDM}
        style={[
          styles.dmButton,
          currentSection === "dm" && styles.activeDM,
        ]}
      >
        <MessageSquare
          size={20}
          color={currentSection === "dm" ? "#101116" : colors.accent}
        />
      </Pressable>

      <View style={styles.railDivider} />

      {/* SPACE LIST (CIRCULAR / ROUNDED SERVER ICONS) */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.spaceList}
      >
        {servers.map((server) => {
          const active = selectedServerId === server.id && currentSection === "space";

          return (
            <Pressable
              key={server.id}
              onPress={() => onSelectServer(server.id)}
              style={[
                styles.spaceButton,
                active && styles.activeSpace,
              ]}
            >
              {server.iconUrl ? (
                <Image
                  source={{ uri: server.iconUrl }}
                  style={styles.spaceImage}
                />
              ) : (
                <View style={styles.spaceFallback}>
                  <Text style={styles.spaceLetter}>
                    {server.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}

              {!!server.unreadCount && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>
                    {server.unreadCount > 99
                      ? "99+"
                      : server.unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* UTILITY ITEMS AT BOTTOM */}
      <View style={styles.utilityArea}>
        <Pressable
          onPress={onNotice}
          style={[
            styles.utilityButton,
            currentSection === "notices" && styles.utilityActive,
          ]}
        >
          <Bell size={18} color={currentSection === "notices" ? colors.accent : colors.textMuted} />
        </Pressable>

        <Pressable
          onPress={onArchive}
          style={[
            styles.utilityButton,
            currentSection === "archive" && styles.utilityActive,
          ]}
        >
          <Archive size={18} color={currentSection === "archive" ? colors.accent : colors.textMuted} />
        </Pressable>

        {isAdmin && (
          <Pressable
            onPress={onAdmin}
            style={[
              styles.utilityButton,
              currentSection === "admin" && styles.utilityActive,
            ]}
          >
            <Settings size={18} color={currentSection === "admin" ? colors.accent : colors.textMuted} />
          </Pressable>
        )}

        {/* AUTHENTICATED USER AVATAR & PRESENCE DOCK */}
        <Pressable
          onPress={onOpenProfile}
          style={[
            styles.userDockAvatarBtn,
            currentSection === "profile" && styles.userDockActive,
          ]}
        >
          {currentUser?.avatar ? (
            <Image source={{ uri: currentUser.avatar }} style={styles.dockAvatarImg} />
          ) : (
            <View style={styles.dockAvatarFallback}>
              <Text style={styles.dockAvatarLetter}>
                {(currentUser?.displayName || currentUser?.username || "U")
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.presenceDot} />
        </Pressable>
      </View>
    </View>
  );
}

/* =========================================================
   LEVEL 2: SELECTED SPACE NAVIGATION (CHANNEL SELECTOR VIEW)
   Branches according to Space.type (9 distinct space archetypes)
   ========================================================= */

function SelectedSpaceView({
  server,
  channels,
  notice,
  canCreateNotice,
  onCreateNotice,
  onSelectChannel,
  onNotice,
  onSearch,
  onAdd,
  onEvents,
}: {
  server: Server;
  channels: Channel[];
  notice?: any;
  canCreateNotice: boolean;
  onCreateNotice: () => void;
  onSelectChannel: (channelId: string) => void;
  onNotice: () => void;
  onSearch: () => void;
  onAdd: () => void;
  onEvents: () => void;
}) {
  const categories = useMemo(() => {
    const result: Record<string, Channel[]> = {};

    channels.forEach((channel) => {
      const category =
        channel.category ||
        (channel.type === "voice"
          ? "Voice Channels"
          : channel.type === "project" || channel.type === "board" || channel.type === "github" || channel.type === "canvas"
            ? "Project & Engineering"
            : channel.type === "incident"
              ? "Incident Response"
              : channel.type === "docs"
                ? "Knowledge & Docs"
                : "Channels");

      if (!result[category]) {
        result[category] = [];
      }

      result[category].push(channel);
    });

    return result;
  }, [channels]);

  function renderChannelIcon(type: Channel["type"]) {
    switch (type) {
      case "voice": return <Volume2 size={16} color={colors.accentTeal} />;
      case "project": return <FolderKanban size={16} color={colors.accent} />;
      case "board": return <Kanban size={16} color={colors.accentWarm} />;
      case "docs": return <FileText size={16} color={colors.info} />;
      case "github": return <Github size={16} color={colors.accentTeal} />;
      case "incident": return <AlertTriangle size={16} color={colors.danger} />;
      case "canvas": return <Layers size={16} color={colors.accent} />;
      case "stage": return <Radio size={16} color={colors.live} />;
      case "announcement": return <Bell size={16} color={colors.accent} />;
      default: return <Hash size={16} color={colors.textMuted} />;
    }
  }

  // Identify specialized badge for Space Type
  const spaceType = server.type || "general";
  const spaceBadgeLabel =
    spaceType === "flagship"
      ? "FLAGSHIP RESEARCH"
      : spaceType === "squad"
        ? "BUILD SQUAD"
        : spaceType === "open_source"
          ? "OPEN SOURCE CORE"
          : spaceType === "governance"
            ? "PRESIDENCY & GOVERNANCE"
            : spaceType === "hackathon"
              ? "HACKATHON ROOM"
              : "COMMUNITY SPACE";

  return (
    <View style={styles.selectorView}>
      {/* Space Header */}
      <View style={styles.header}>
        <View style={styles.serverTitleRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.spaceBadgeCapsule}>
              <Sparkles size={11} color={colors.accent} />
              <Text style={styles.spaceBadgeText}>{spaceBadgeLabel}</Text>
            </View>
            <Text style={styles.serverName}>{server.name}</Text>
            {server.description ? (
              <Text style={styles.serverDescription} numberOfLines={1}>
                {server.description}
              </Text>
            ) : null}
          </View>
          <ChevronRight size={20} color={colors.textMuted} />
        </View>

        <View style={styles.headerActions}>
          <Pressable onPress={onSearch} style={styles.searchButton}>
            <Search size={15} color={colors.textPrimary} />
            <Text style={styles.searchText}>Search</Text>
          </Pressable>

          <Pressable onPress={onAdd} style={styles.squareButton}>
            <Plus size={18} color={colors.textPrimary} />
          </Pressable>

          <Pressable onPress={onEvents} style={styles.squareButton}>
            <Calendar size={18} color={colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      {/* Notice / Announcement Bar */}
      {notice ? (
        <Pressable onPress={onNotice} style={styles.noticeBar}>
          <View style={{ flex: 1 }}>
            <View style={styles.noticeBadgeRow}>
              <Text style={styles.noticeBadgeText}>NOTICE</Text>
              {canCreateNotice && (
                <Pressable onPress={onCreateNotice} hitSlop={8}>
                  <Text style={styles.noticeCreateLink}>+ Publish</Text>
                </Pressable>
              )}
            </View>
            <Text style={styles.noticeTitle}>{notice.title || "Announcement"}</Text>
            {!!(notice.message || notice.content) && (
              <Text style={styles.noticeMessage} numberOfLines={1}>
                {notice.message || notice.content}
              </Text>
            )}
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </Pressable>
      ) : canCreateNotice ? (
        <Pressable onPress={onCreateNotice} style={styles.emptyNoticeBar}>
          <Bell size={15} color={colors.accent} />
          <Text style={styles.emptyNoticeText}>Publish a space notice / announcement</Text>
        </Pressable>
      ) : null}

      {/* Full-width Categorized Channel List */}
      <ScrollView showsVerticalScrollIndicator={false} style={styles.channelScroll}>
        {Object.entries(categories).map(([category, items]) => (
          <View key={category} style={styles.categoryBlock}>
            <Text style={styles.categoryTitle}>{category.toUpperCase()}</Text>

            {items.map((channel) => (
              <Pressable
                key={channel.id}
                onPress={() => onSelectChannel(channel.id)}
                style={({ pressed }) => [
                  styles.channelRow,
                  channel.type === "incident" && styles.incidentChannelRow,
                  channel.type === "github" && styles.githubChannelRow,
                  pressed && styles.channelRowPressed,
                ]}
              >
                {renderChannelIcon(channel.type)}

                <Text
                  style={[
                    styles.channelName,
                    channel.type === "incident" && { color: colors.danger },
                    channel.type === "github" && { color: colors.accentTeal },
                  ]}
                  numberOfLines={1}
                >
                  {channel.name}
                </Text>

                {channel.type === "voice" && (
                  <View style={styles.voiceBadge}>
                    <Text style={styles.voiceBadgeText}>LIVE</Text>
                  </View>
                )}

                {!!channel.unreadCount && (
                  <View style={styles.channelUnread}>
                    <Text style={styles.unreadText}>{channel.unreadCount}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

/* =========================================================
   TYPE-SPECIFIC CHANNEL ROUTER
   Routes channel.type to dedicated screen without flattening
   ========================================================= */

function ChannelRouter({
  channel,
  messages,
  onBack,
  onSend,
  onToggleReaction,
}: {
  channel: Channel;
  messages: Message[];
  onBack: () => void;
  onSend: (content: string, replyToId?: string) => Promise<void>;
  onToggleReaction?: (messageId: string, emoji: string) => void;
}) {
  switch (channel.type) {
    case "voice":
      return (
        <VoiceChannelView
          channelName={channel.name}
          isStage={false}
          onBack={onBack}
        />
      );

    case "stage":
      return (
        <VoiceChannelView
          channelName={channel.name}
          isStage={true}
          onBack={onBack}
        />
      );

    case "incident":
      return (
        <IncidentChannelView
          channelName={channel.name}
          onBack={onBack}
        />
      );

    case "canvas":
      return (
        <CanvasChannelView
          channelName={channel.name}
          onBack={onBack}
        />
      );

    case "text":
    case "announcement":
    case "forum":
    case "project":
    case "board":
    case "docs":
    case "github":
    default:
      return (
        <TextChannelScreen
          channel={channel}
          messages={messages}
          onBack={onBack}
          onSend={onSend}
          onToggleReaction={onToggleReaction}
        />
      );
  }
}

/* =========================================================
   STANDARD TEXT CHANNEL SCREEN
   ========================================================= */

function TextChannelScreen({
  channel,
  messages,
  onBack,
  onSend,
  onToggleReaction,
}: {
  channel: Channel;
  messages: Message[];
  onBack: () => void;
  onSend: (content: string, replyToId?: string) => Promise<void>;
  onToggleReaction?: (messageId: string, emoji: string) => void;
}) {
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  return (
    <View style={styles.channelScreen}>
      {/* Header with Back Button */}
      <View style={styles.channelHeader}>
        <Pressable onPress={onBack} hitSlop={14} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>

        {channel.type === "github" ? (
          <Github size={18} color={colors.accentTeal} />
        ) : channel.type === "board" ? (
          <Kanban size={18} color={colors.accentWarm} />
        ) : channel.type === "docs" ? (
          <FileText size={18} color={colors.info} />
        ) : (
          <Hash size={18} color={colors.textMuted} />
        )}

        <View style={{ flex: 1, marginLeft: 6 }}>
          <Text style={styles.channelHeaderName} numberOfLines={1}>
            {channel.name}
          </Text>
          {channel.topic ? (
            <Text style={styles.channelHeaderTopic} numberOfLines={1}>
              {channel.topic}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Message Feed with interactive reactions and replies */}
      <NativeMessageList
        messages={messages}
        onToggleReaction={onToggleReaction}
        onReply={(msg) => setReplyingTo(msg)}
      />

      {/* Message Composer with Reply Banner */}
      <MessageComposer
        channelName={channel.name}
        onSend={onSend}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
      />
    </View>
  );
}

/* =========================================================
   MESSAGE FEED & COMPOSER
   ========================================================= */

function isImageUrl(url: string, mimeType?: string) {
  if (mimeType?.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|bmp|avif)(\?.*)?$/i.test(url);
}

function NativeMessageList({
  messages,
  onToggleReaction,
  onReply,
}: {
  messages: Message[];
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onReply?: (message: Message) => void;
}) {
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  const quickEmojis = ["👍", "🔥", "🚀", "❤️", "👀", "🎉", "🧠", "💯"];

  return (
    <>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        style={styles.messages}
        contentContainerStyle={styles.messageContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const { cleanText, attachments } = parseMessageAttachments(item.content || "");
          return (
            <Pressable
              onLongPress={() => {
                setSelectedMessage(item);
                setActionMenuOpen(true);
              }}
              style={({ pressed }) => [
                styles.messageRow,
                pressed && { backgroundColor: "rgba(255, 255, 255, 0.03)", borderRadius: 10 },
              ]}
            >
              {item.user?.avatarUrl ? (
                <Image source={{ uri: item.user.avatarUrl }} style={styles.messageAvatar} />
              ) : (
                <View style={styles.messageAvatarFallback}>
                  <Text style={styles.avatarLetter}>
                    {(item.user?.displayName || "U").charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}

              <View style={styles.messageBody}>
                <View style={styles.messageHeader}>
                  <Text
                    style={[
                      styles.displayName,
                      { color: item.user?.roleColor || colors.textPrimary },
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

                {cleanText ? <Text style={styles.messageText}>{cleanText}</Text> : null}

                {attachments.map((att, idx) => (
                  <AttachmentCard key={idx} attachment={att} />
                ))}

                {item.attachment?.url && isImageUrl(item.attachment.url, item.attachment.mimeType) && (
                  <Image source={{ uri: item.attachment.url }} style={styles.attachmentImage} resizeMode="cover" />
                )}

                {item.attachment?.url && !isImageUrl(item.attachment.url, item.attachment.mimeType) && (
                  <View style={styles.fileCard}>
                    <Text style={styles.fileName}>{item.attachment.name || "Attachment"}</Text>
                  </View>
                )}

                {/* Reaction Pills & Add Reaction Button */}
                <View style={styles.reactions}>
                  {item.reactions?.map((reaction) => (
                    <Pressable
                      key={reaction.emoji}
                      onPress={() => onToggleReaction?.(item.id, reaction.emoji)}
                      style={[
                        styles.reaction,
                        reaction.reacted && styles.reactionActive,
                      ]}
                    >
                      <Text style={{ color: colors.textPrimary, fontSize: 12 }}>
                        {reaction.emoji} {reaction.count}
                      </Text>
                    </Pressable>
                  ))}

                  <Pressable
                    onPress={() => {
                      setSelectedMessage(item);
                      setActionMenuOpen(true);
                    }}
                    style={styles.addReactionBtn}
                  >
                    <Smile size={13} color={colors.textMuted} />
                  </Pressable>
                </View>
              </View>
            </Pressable>
          );
        }}
      />

      {/* Message Action & Reaction Modal */}
      <Modal visible={actionMenuOpen} transparent animationType="fade" onRequestClose={() => setActionMenuOpen(false)}>
        <Pressable style={styles.actionModalBackdrop} onPress={() => setActionMenuOpen(false)}>
          <View style={styles.actionModalSheet}>
            <Text style={styles.actionModalTitle}>Add Reaction</Text>
            <View style={styles.emojiPickerRow}>
              {quickEmojis.map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => {
                    if (selectedMessage) {
                      onToggleReaction?.(selectedMessage.id, emoji);
                    }
                    setActionMenuOpen(false);
                  }}
                  style={styles.emojiPickerItem}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.actionDivider} />

            <Pressable
              style={styles.actionMenuRow}
              onPress={() => {
                if (selectedMessage) {
                  onReply?.(selectedMessage);
                }
                setActionMenuOpen(false);
              }}
            >
              <CornerUpLeft size={16} color={colors.accent} />
              <Text style={styles.actionMenuText}>Reply to Message</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function MessageComposer({
  channelName,
  onSend,
  replyingTo,
  onCancelReply,
}: {
  channelName: string;
  onSend: (content: string, replyToId?: string) => Promise<void>;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    const value = text.trim();
    if (!value || sending) return;

    setSending(true);
    try {
      await onSend(value, replyingTo?.id);
      setText("");
      onCancelReply?.();
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.composerWrapper}>
      {replyingTo && (
        <View style={styles.replyBanner}>
          <CornerUpLeft size={13} color={colors.accent} />
          <Text style={styles.replyBannerText} numberOfLines={1}>
            Replying to <Text style={{ fontWeight: "700", color: colors.textPrimary }}>{replyingTo.user.displayName}</Text>: {replyingTo.content}
          </Text>
          <Pressable onPress={onCancelReply} hitSlop={8}>
            <X size={14} color={colors.textMuted} />
          </Pressable>
        </View>
      )}

      <View style={styles.composer}>
        <Pressable style={styles.composerPlus}>
          <Plus size={18} color={colors.textPrimary} />
        </Pressable>

        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={`Message #${channelName}`}
          placeholderTextColor={colors.textMuted}
          style={styles.composerInput}
          multiline
        />

        <Pressable
          onPress={send}
          disabled={!text.trim() || sending}
          style={[
            styles.sendButton,
            (!text.trim() || sending) && styles.sendDisabled,
          ]}
        >
          {sending ? (
            <ActivityIndicator color={colors.accentContrast} size="small" />
          ) : (
            <Send size={15} color={colors.accentContrast} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

/* =========================================================
   SUB-SECTIONS: NOTICES, ARCHIVES, ADMIN & SEARCH MODAL
   ========================================================= */

function NoticePage({
  notices,
  canCreateNotice,
  onCreateNotice,
}: {
  notices: any[];
  canCreateNotice: boolean;
  onCreateNotice: () => void;
}) {
  return (
    <View style={styles.page}>
      <View style={styles.pageHeaderRow}>
        <Text style={styles.pageTitle}>Announcements & Notices</Text>
        {canCreateNotice && (
          <Pressable onPress={onCreateNotice} style={styles.createBtn}>
            <Text style={styles.createBtnText}>+ New Notice</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={notices}
        keyExtractor={(item, index) => String(item.id || index)}
        renderItem={({ item }) => (
          <View style={styles.noticeCard}>
            <View style={styles.noticeCardHeader}>
              <Text style={styles.noticeCardCategory}>
                {(item.category || "GENERAL").toUpperCase()}
              </Text>
              {item.isPinned && <Text style={styles.pinnedBadge}>PINNED</Text>}
            </View>
            <Text style={styles.noticeCardTitle}>{item.title}</Text>
            <Text style={styles.noticeCardText}>{item.message || item.content || item.description || ""}</Text>
          </View>
        )}
      />
    </View>
  );
}

function ArchivePage({ archive }: { archive: any[] }) {
  return (
    <View style={styles.page}>
      <Text style={styles.pageTitle}>Archives & Historical Records</Text>
      <FlatList
        data={archive}
        keyExtractor={(item, index) => String(item.id || item.archiveId || index)}
        renderItem={({ item }) => (
          <View style={styles.archiveRow}>
            <Archive size={18} color={colors.textMuted} />
            <View style={{ flex: 1 }}>
              <Text style={styles.archiveTitle}>{item.title || item.name || "Archive record"}</Text>
              {!!(item.description || item.summary) && (
                <Text style={styles.archiveDescription} numberOfLines={2}>
                  {item.description || item.summary}
                </Text>
              )}
            </View>
          </View>
        )}
      />
    </View>
  );
}

function AdminPage({ data }: { data: any }) {
  return (
    <ScrollView style={styles.page}>
      <Text style={styles.pageTitle}>Governance & Admin Panel</Text>
      <View style={styles.adminGrid}>
        <View style={styles.adminStat}>
          <Text style={styles.adminStatTitle}>Total Members</Text>
          <Text style={styles.adminStatValue}>{data?.stats?.totalUsers ?? data?.totalMembers ?? "—"}</Text>
        </View>
        <View style={styles.adminStat}>
          <Text style={styles.adminStatTitle}>Active Spaces</Text>
          <Text style={styles.adminStatValue}>{data?.stats?.activeSpaces ?? data?.activeSpaces ?? "—"}</Text>
        </View>
        <View style={styles.adminStat}>
          <Text style={styles.adminStatTitle}>Pending Approvals</Text>
          <Text style={styles.adminStatValue}>{data?.stats?.pendingApprovals ?? data?.pendingApprovals ?? "—"}</Text>
        </View>
        <View style={styles.adminStat}>
          <Text style={styles.adminStatTitle}>Squad Teams</Text>
          <Text style={styles.adminStatValue}>{data?.stats?.activeTeams ?? data?.squadTeams ?? "—"}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

/* =========================================================
   SEARCH MODAL WITH DEBOUNCE & REALTIME SUPABASE RESULTS
   ========================================================= */

function SearchModal({
  visible,
  onClose,
  channels,
  onSelectChannel,
}: {
  visible: boolean;
  onClose: () => void;
  channels: Channel[];
  onSelectChannel: (channelId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [userResults, setUserResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setUserResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchUsers(query.trim());
        setUserResults(res?.users || []);
      } catch {
        setUserResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const filteredChannels = useMemo(() => {
    if (!query.trim()) return [];
    return channels.filter((c) =>
      c.name.toLowerCase().includes(query.toLowerCase())
    );
  }, [channels, query]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.searchModalCard}>
          <View style={styles.searchModalHeader}>
            <Search size={16} color={colors.accent} />
            <TextInput
              autoFocus
              placeholder="Search channels, topics, members..."
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={setQuery}
              style={styles.searchModalInput}
            />
            <Pressable onPress={onClose} hitSlop={10}>
              <X size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={styles.searchResultsScroll}>
            {filteredChannels.length > 0 && (
              <View style={styles.searchSection}>
                <Text style={styles.searchSectionTitle}>CHANNELS</Text>
                {filteredChannels.map((ch) => (
                  <Pressable
                    key={ch.id}
                    onPress={() => {
                      onClose();
                      onSelectChannel(ch.id);
                    }}
                    style={styles.searchResultRow}
                  >
                    <Hash size={14} color={colors.textMuted} />
                    <Text style={styles.searchResultName}>{ch.name}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {userResults.length > 0 && (
              <View style={styles.searchSection}>
                <Text style={styles.searchSectionTitle}>MEMBERS</Text>
                {userResults.map((u) => (
                  <View key={u.id} style={styles.searchResultRow}>
                    <Avatar name={u.displayName || u.username} size={28} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.searchResultName}>{u.displayName || u.username}</Text>
                      <Text style={styles.searchResultSub}>@{u.username}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {query.trim() && filteredChannels.length === 0 && userResults.length === 0 && !isSearching && (
              <Text style={styles.emptySearchText}>No matching channels or members found.</Text>
            )}

            {isSearching && (
              <ActivityIndicator color={colors.accent} style={{ marginTop: 16 }} />
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/* =========================================================
   NOTICE CREATION MODAL (PERMISSION-GATED)
   ========================================================= */

function CreateNoticeModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("General");
  const [publishing, setPublishing] = useState(false);

  async function handlePublish() {
    if (!title.trim() || !content.trim() || publishing) return;
    setPublishing(true);
    try {
      await publishAnnouncement({
        title: title.trim(),
        content: content.trim(),
        category,
        priority: "important",
      });
      Alert.alert("Published", "Notice published successfully.");
      setTitle("");
      setContent("");
      onClose();
      onCreated();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to publish notice.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.noticeModalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Publish Space Notice</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <X size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          <TextInput
            placeholder="Notice Title (e.g. Server Maintenance, Hackathon Brief)"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            style={styles.noticeModalInput}
          />

          <TextInput
            placeholder="Notice Content / Details..."
            placeholderTextColor={colors.textMuted}
            value={content}
            onChangeText={setContent}
            multiline
            style={[styles.noticeModalInput, { height: 100, textAlignVertical: "top" }]}
          />

          <Pressable
            onPress={handlePublish}
            disabled={!title.trim() || !content.trim() || publishing}
            style={[
              styles.publishBtn,
              (!title.trim() || !content.trim() || publishing) && { opacity: 0.4 },
            ]}
          >
            {publishing ? (
              <ActivityIndicator color={colors.accentContrast} size="small" />
            ) : (
              <Text style={styles.publishBtnText}>Publish Notice</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* =========================================================
   MAIN APP SHELL (DISCORD MOBILE ARCHITECTURE & SERVICES)
   ========================================================= */

export default function AIICDiscordApp() {
  const router = useRouter();
  const { user } = useAuthStore();

  const {
    spaces,
    sections,
    activeSpaceId,
    loadSpaces,
    loadChannelsForSpace,
    setActiveSpace,
    dms,
    loadDMs,
  } = useWorkspaceStore();

  const {
    messages,
    loadChannelMessages,
    sendChannelMessageAction,
    toggleReaction,
    subscribeToChannel,
    unsubscribeFromChannel,
  } = useChatStore();

  // Navigation section: space | dm | notices | archive | admin | profile
  const [currentSection, setCurrentSection] = useState<
    "space" | "dm" | "notices" | "archive" | "admin" | "profile"
  >("space");

  // Selected Space & Channel state (selectedChannelId is null when in selector)
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  const [notices, setNotices] = useState<any[]>([]);
  const [archive, setArchive] = useState<any[]>([]);
  const [adminData, setAdminData] = useState<any>(null);

  // Modals
  const [searchOpen, setSearchOpen] = useState(false);
  const [createNoticeOpen, setCreateNoticeOpen] = useState(false);

  // Authority & Role calculation from Supabase profile data
  const userRole = (user?.role || "member").toLowerCase().trim();
  const isAdmin =
    userRole === "admin" ||
    userRole === "administrator" ||
    userRole === "super_admin" ||
    userRole === "president" ||
    userRole === "president_admin";

  const canCreateNotice = isAdmin || userRole === "staff" || userRole === "lead" || userRole === "vice_president";

  useEffect(() => {
    loadSpaces();
    loadDMs(user?.id);
  }, []);

  const servers: Server[] = useMemo(() => {
    return spaces.map((s) => ({
      id: s.id,
      name: s.name,
      iconUrl: s.icon ?? null,
      unreadCount: s.unread ? 1 : 0,
      description: (s as any).description,
    }));
  }, [spaces]);

  useEffect(() => {
    if (!selectedServerId && servers.length) {
      setSelectedServerId(activeSpaceId || servers[0].id);
    }
  }, [servers, activeSpaceId]);

  useEffect(() => {
    if (!selectedServerId) return;
    loadChannelsForSpace(selectedServerId);
  }, [selectedServerId]);

  const channels: Channel[] = useMemo(() => {
    if (!selectedServerId) return [];
    const spaceSections = sections[selectedServerId] || [];
    return spaceSections.flatMap((sec) =>
      sec.channels.map((ch) => ({
        id: ch.id,
        serverId: selectedServerId,
        name: ch.name,
        type: ch.type as any,
        category: sec.name,
        unreadCount: ch.unread ? 1 : 0,
      }))
    );
  }, [sections, selectedServerId]);

  useEffect(() => {
    if (!selectedChannelId) return;
    loadChannelMessages(selectedChannelId);
    subscribeToChannel(selectedChannelId);

    return () => {
      unsubscribeFromChannel();
    };
  }, [selectedChannelId]);

  const channelMessages: Message[] = useMemo(() => {
    if (!selectedChannelId) return [];
    const list = messages[selectedChannelId] || [];
    return list.map((m) => ({
      id: m.id,
      content: m.text,
      createdAt: m.at,
      user: {
        id: m.author?.id || "unknown",
        displayName: m.author?.name || "Member",
        avatarUrl: m.author?.avatar,
        roleColor: m.author?.roleColor,
      },
      attachment: m.attachments?.[0]
        ? {
            url: m.attachments[0].url,
            name: m.attachments[0].name,
            mimeType: m.attachments[0].kind === "image" ? "image/jpeg" : undefined,
            type: m.attachments[0].kind,
          }
        : undefined,
      reactions: m.reactions?.map((r) => ({
        emoji: r.emoji,
        count: r.count,
        reacted: !!r.reacted,
      })),
    }));
  }, [messages, selectedChannelId]);

  const loadNoticesData = () => {
    api<{ announcements: any[] }>("/announcements")
      .then((res) => {
        setNotices(res?.announcements || []);
      })
      .catch(console.error);
  };

  useEffect(() => {
    loadNoticesData();
  }, []);

  useEffect(() => {
    if (currentSection === "archive") {
      api<{ records: any[] }>("/archive/records")
        .then((res) => {
          setArchive(res?.records || []);
        })
        .catch(console.error);
    }
  }, [currentSection]);

  useEffect(() => {
    if (isAdmin && currentSection === "admin") {
      api<any>("/admin/overview")
        .then(setAdminData)
        .catch((err) => {
          if (!String(err).includes("403")) {
            console.error(err);
          }
        });
    }
  }, [currentSection, isAdmin]);

  async function sendMessage(content: string) {
    if (!selectedChannelId) return;
    await sendChannelMessageAction(selectedChannelId, content);
  }

  const selectedServer =
    servers.find((server) => server.id === selectedServerId) || servers[0] || null;

  const selectedChannel =
    channels.find((channel) => channel.id === selectedChannelId) || null;

  const notice = notices[0];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.root}>
        {/* =================================================
            LEVEL 1: NARROW LEFT SPACE / SERVER RAIL
            ================================================= */}
        <SpaceRail
          servers={servers}
          selectedServerId={selectedServerId}
          onSelectServer={(id) => {
            setSelectedServerId(id);
            setActiveSpace(id);
            setSelectedChannelId(null);
            setCurrentSection("space");
          }}
          onDM={() => {
            setCurrentSection("dm");
            setSelectedChannelId(null);
          }}
          currentSection={currentSection}
          isAdmin={isAdmin}
          onNotice={() => {
            setCurrentSection("notices");
            setSelectedChannelId(null);
          }}
          onArchive={() => {
            setCurrentSection("archive");
            setSelectedChannelId(null);
          }}
          onAdmin={() => {
            if (isAdmin) {
              setCurrentSection("admin");
              setSelectedChannelId(null);
            }
          }}
          currentUser={user}
          onOpenProfile={() => {
            setCurrentSection("profile");
            setSelectedChannelId(null);
          }}
        />

        {/* =================================================
            LEVEL 2: MAIN CONTENT VIEW (SPACE OR CHANNEL VIEW)
            ================================================= */}
        <View style={styles.mainContent}>
          {currentSection === "space" && selectedServer && (
            selectedChannel ? (
              /* DEDICATED TYPE-SPECIFIC CHANNEL ROUTER */
              <ChannelRouter
                channel={selectedChannel}
                messages={channelMessages}
                onBack={() => setSelectedChannelId(null)}
                onSend={sendMessage}
                onToggleReaction={(msgId, emoji) => {
                  if (selectedChannelId) {
                    toggleReaction(selectedChannelId, msgId, emoji);
                  }
                }}
              />
            ) : (
              /* SELECTED SPACE VIEW (CHANNEL SELECTOR VIEW ONLY) */
              <SelectedSpaceView
                server={selectedServer}
                channels={channels}
                notice={notice}
                canCreateNotice={canCreateNotice}
                onCreateNotice={() => setCreateNoticeOpen(true)}
                onSelectChannel={(chId) => setSelectedChannelId(chId)}
                onNotice={() => setCurrentSection("notices")}
                onSearch={() => setSearchOpen(true)}
                onAdd={() => router.push("/(app)/projects/index" as any)}
                onEvents={() => router.push("/(app)/events/index" as any)}
              />
            )
          )}

          {/* DEDICATED FUNCTIONAL DMs */}
          {currentSection === "dm" && (
            <View style={styles.page}>
              <View style={styles.pageHeaderRow}>
                <Text style={styles.pageTitle}>Direct Messages</Text>
                <Pressable
                  onPress={() => router.push("/(app)/dms/index" as any)}
                  style={styles.createBtn}
                >
                  <Text style={styles.createBtnText}>+ Add Friend</Text>
                </Pressable>
              </View>

              <FlatList
                data={dms}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 24 }}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.dmRow}
                    onPress={() => router.push(`/(app)/dms/${item.id}` as any)}
                  >
                    <Avatar name={item.name} presence={item.presence} size={42} />
                    <View style={styles.dmInfo}>
                      <View style={styles.dmTop}>
                        <Text style={styles.dmName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        {item.lastLabel ? (
                          <Text style={styles.dmTime}>{item.lastLabel}</Text>
                        ) : null}
                      </View>
                      <Text style={styles.dmSnippet} numberOfLines={1}>
                        {item.snippet || "Start a conversation"}
                      </Text>
                    </View>
                  </Pressable>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <MessageSquare size={36} color={colors.textMuted} />
                    <Text style={styles.emptyTitle}>No Direct Messages</Text>
                    <Text style={styles.emptySubtitle}>
                      Connect with peers, squad mates, and faculty mentors.
                    </Text>
                  </View>
                }
              />
            </View>
          )}

          {/* NOTICES */}
          {currentSection === "notices" && (
            <NoticePage
              notices={notices}
              canCreateNotice={canCreateNotice}
              onCreateNotice={() => setCreateNoticeOpen(true)}
            />
          )}

          {/* ARCHIVE */}
          {currentSection === "archive" && (
            <ArchivePage archive={archive} />
          )}

          {/* ADMIN (Only accessible if isAdmin is true) */}
          {currentSection === "admin" && isAdmin && (
            <AdminPage data={adminData} />
          )}

          {/* PROFILE & SETTINGS */}
          {currentSection === "profile" && (
            <ScrollView style={styles.page}>
              <Text style={styles.pageTitle}>Member Identity</Text>
              <View style={styles.profileCard}>
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.profileAvatar} />
                ) : (
                  <View style={styles.profileAvatarFallback}>
                    <Text style={styles.profileAvatarLetter}>
                      {(user?.displayName || user?.username || "U").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}

                <Text style={styles.profileName}>
                  {user?.displayName || user?.username || "Member"}
                </Text>
                <Text style={styles.profileEmail}>{user?.email}</Text>

                <View style={styles.roleTag}>
                  <Shield size={13} color={colors.accent} />
                  <Text style={styles.roleTagText}>{(user?.role || "MEMBER").toUpperCase()}</Text>
                </View>

                {user?.bio ? (
                  <Text style={styles.profileBio}>{user.bio}</Text>
                ) : null}

                <View style={styles.profileActionRow}>
                  <Pressable
                    onPress={() => router.push("/(app)/profile/settings" as any)}
                    style={styles.profileEditBtn}
                  >
                    <Text style={styles.profileEditBtnText}>Edit Settings</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </View>

      {/* Global Functional Search Modal */}
      <SearchModal
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        channels={channels}
        onSelectChannel={(chId) => setSelectedChannelId(chId)}
      />

      {/* Permission-Gated Notice Publishing Modal */}
      <CreateNoticeModal
        visible={createNoticeOpen}
        onClose={() => setCreateNoticeOpen(false)}
        onCreated={loadNoticesData}
      />
    </SafeAreaView>
  );
}

/* =========================================================
   GLASSMORPHISM & THEME STYLES (MATCHING DISCORD REFERENCE)
   ========================================================= */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },

  root: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: colors.background,
  },

  /* LEVEL 1: NARROW LEFT SPACE RAIL */
  rail: {
    width: 78,
    backgroundColor: "rgba(14, 16, 23, 0.96)",
    borderRightWidth: 1,
    borderRightColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 8,
  },

  dmButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(232, 163, 61, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(232, 163, 61, 0.25)",
  },

  activeDM: {
    backgroundColor: colors.accent,
  },

  railDivider: {
    width: 36,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginVertical: 10,
  },

  spaceList: {
    alignItems: "center",
    paddingBottom: 8,
    gap: 10,
  },

  spaceButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  activeSpace: {
    backgroundColor: "rgba(58, 60, 78, 0.75)",
  },

  spaceImage: {
    width: 48,
    height: 48,
    borderRadius: 16,
  },

  spaceFallback: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(36, 39, 54, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },

  spaceLetter: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },

  unreadBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },

  unreadText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: "800",
  },

  utilityArea: {
    marginTop: "auto",
    gap: 8,
    alignItems: "center",
  },

  utilityButton: {
    width: 48,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  utilityActive: {
    backgroundColor: "rgba(58, 60, 78, 0.75)",
  },

  userDockAvatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginTop: 4,
  },

  userDockActive: {
    borderWidth: 2,
    borderColor: colors.accent,
  },

  dockAvatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },

  dockAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(28, 30, 42, 0.88)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },

  dockAvatarLetter: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },

  presenceDot: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.statusOnline,
    borderWidth: 2,
    borderColor: colors.background,
  },

  /* LEVEL 2: MAIN CONTENT AREA */
  mainContent: {
    flex: 1,
    backgroundColor: colors.background,
  },

  /* SELECTED SPACE VIEW (CHANNEL SELECTOR) */
  selectorView: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.12)",
  },

  serverTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
  },

  spaceBadgeCapsule: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(232, 163, 61, 0.12)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 4,
  },

  spaceBadgeText: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
  },

  serverName: {
    color: colors.textPrimary,
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: -0.3,
  },

  serverDescription: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },

  headerActions: {
    flexDirection: "row",
    gap: 10,
  },

  searchButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: "rgba(28, 30, 42, 0.88)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },

  searchText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },

  squareButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "rgba(28, 30, 42, 0.88)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },

  noticeBar: {
    marginHorizontal: 14,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "rgba(232, 163, 61, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(232, 163, 61, 0.25)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  emptyNoticeBar: {
    marginHorizontal: 14,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(22, 24, 33, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderStyle: "dashed",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  emptyNoticeText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },

  noticeBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  noticeBadgeText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },

  noticeCreateLink: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "700",
  },

  noticeTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },

  noticeMessage: {
    color: colors.textMuted,
    marginTop: 2,
    fontSize: 12,
  },

  channelScroll: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
  },

  categoryBlock: {
    marginBottom: 16,
  },

  categoryTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.7,
    paddingHorizontal: 4,
    paddingTop: 14,
    paddingBottom: 6,
  },

  channelRow: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 10,
    borderRadius: 12,
    backgroundColor: "rgba(22, 24, 33, 0.85)",
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },

  incidentChannelRow: {
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderColor: "rgba(239, 68, 68, 0.25)",
  },

  githubChannelRow: {
    backgroundColor: "rgba(45, 212, 191, 0.08)",
    borderColor: "rgba(45, 212, 191, 0.25)",
  },

  channelRowPressed: {
    backgroundColor: "rgba(58, 60, 78, 0.75)",
  },

  channelName: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },

  voiceBadge: {
    backgroundColor: "rgba(45, 212, 191, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },

  voiceBadgeText: {
    color: colors.accentTeal,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  channelUnread: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },

  /* DEDICATED CHANNEL SCREEN */
  channelScreen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  channelHeader: {
    height: 54,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.12)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
  },

  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "rgba(28, 30, 42, 0.88)",
  },

  channelHeaderName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },

  channelHeaderTopic: {
    color: colors.textMuted,
    fontSize: 11,
  },

  /* MESSAGES & COMPOSER */
  messages: {
    flex: 1,
  },

  messageContent: {
    padding: 14,
    paddingBottom: 24,
  },

  messageRow: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 10,
  },

  messageAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },

  messageAvatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(28, 30, 42, 0.88)",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarLetter: {
    color: colors.textPrimary,
    fontWeight: "800",
  },

  messageBody: {
    flex: 1,
  },

  messageHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },

  displayName: {
    fontSize: 14,
    fontWeight: "800",
  },

  timestamp: {
    color: colors.textFaint,
    fontSize: 10,
  },

  messageText: {
    color: "#E1E2E8",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 2,
  },

  attachmentImage: {
    width: "100%",
    maxWidth: 280,
    height: 180,
    borderRadius: 12,
    marginTop: 8,
    backgroundColor: "rgba(28, 30, 42, 0.88)",
  },

  fileCard: {
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "rgba(28, 30, 42, 0.88)",
  },

  fileName: {
    color: colors.textPrimary,
    fontWeight: "600",
  },

  reactions: {
    flexDirection: "row",
    gap: 6,
    marginTop: 7,
  },

  reaction: {
    backgroundColor: "rgba(28, 30, 42, 0.88)",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },

  composer: {
    minHeight: 54,
    margin: 10,
    borderRadius: 16,
    backgroundColor: "rgba(28, 30, 42, 0.88)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },

  composerPlus: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },

  composerInput: {
    flex: 1,
    maxHeight: 100,
    color: colors.textPrimary,
    fontSize: 14,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },

  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },

  sendDisabled: {
    opacity: 0.35,
  },

  /* SUB PAGES */
  page: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.background,
  },

  pageHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  pageTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
  },

  createBtn: {
    backgroundColor: "rgba(232, 163, 61, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(232, 163, 61, 0.3)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },

  createBtnText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
  },

  dmRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(22, 24, 33, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    marginBottom: 8,
    gap: 12,
  },

  dmInfo: {
    flex: 1,
  },

  dmTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  dmName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },

  dmTime: {
    color: colors.textFaint,
    fontSize: 10,
  },

  dmSnippet: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 8,
  },

  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 8,
  },

  emptySubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "center",
    maxWidth: 240,
  },

  noticeCard: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: "rgba(22, 24, 33, 0.85)",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },

  noticeCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  noticeCardCategory: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },

  pinnedBadge: {
    color: colors.accentTeal,
    fontSize: 9,
    fontWeight: "800",
  },

  noticeCardTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },

  noticeCardText: {
    color: colors.textMuted,
    marginTop: 6,
    lineHeight: 20,
    fontSize: 13,
  },

  archiveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "rgba(22, 24, 33, 0.85)",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },

  archiveTitle: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 14,
  },

  archiveDescription: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 3,
  },

  adminGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },

  adminStat: {
    width: "48%",
    minHeight: 100,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(22, 24, 33, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },

  adminStatTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },

  adminStatValue: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "800",
    marginTop: 12,
  },

  /* PROFILE CARD */
  profileCard: {
    padding: 20,
    borderRadius: 18,
    backgroundColor: "rgba(22, 24, 33, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    marginTop: 10,
  },

  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 12,
  },

  profileAvatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(28, 30, 42, 0.88)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },

  profileAvatarLetter: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "800",
  },

  profileName: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },

  profileEmail: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },

  roleTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(232, 163, 61, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(232, 163, 61, 0.3)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 10,
  },

  roleTagText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "800",
  },

  profileBio: {
    color: "#D0D2DE",
    fontSize: 13,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 18,
  },

  profileActionRow: {
    width: "100%",
    marginTop: 18,
  },

  profileEditBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(28, 30, 42, 0.88)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  profileEditBtnText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },

  /* MODALS */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    padding: 16,
  },

  searchModalCard: {
    backgroundColor: "#111219",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    maxHeight: "80%",
    overflow: "hidden",
  },

  searchModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.12)",
    gap: 10,
  },

  searchModalInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
  },

  searchResultsScroll: {
    padding: 14,
  },

  searchSection: {
    marginBottom: 16,
  },

  searchSectionTitle: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 8,
  },

  searchResultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },

  searchResultName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },

  searchResultSub: {
    color: colors.textMuted,
    fontSize: 11,
  },

  emptySearchText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 20,
  },

  noticeModalCard: {
    backgroundColor: "#111219",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    padding: 18,
    gap: 12,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },

  modalTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "800",
  },

  noticeModalInput: {
    backgroundColor: "rgba(28, 30, 42, 0.88)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    color: colors.textPrimary,
    padding: 12,
    fontSize: 14,
  },

  publishBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },

  publishBtnText: {
    color: colors.accentContrast,
    fontSize: 14,
    fontWeight: "800",
  },
});
