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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../../../stores/auth-store";
import { useWorkspaceStore } from "../../../../stores/workspace-store";
import { useChatStore } from "../../../../stores/chat-store";
import { api } from "../../../../lib/api";
import { AttachmentCard, parseMessageAttachments } from "../../../../components/chat/AttachmentCard";

/* =========================================================
   TYPES
   ========================================================= */

export type Server = {
  id: string;
  name: string;
  iconUrl?: string | null;
  unreadCount?: number;
};

export type Channel = {
  id: string;
  serverId: string;
  name: string;
  type: "text" | "voice" | "project" | "board" | "docs" | "github" | "incident" | "stage";
  category?: string;
  unreadCount?: number;
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
   ICON
   ========================================================= */

function Icon({
  name,
  size = 20,
  color = "#A7A9B7",
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const symbols: Record<string, string> = {
    spaces: "▰",
    dm: "💬",
    projects: "📂",
    events: "📅",
    profile: "👤",
    search: "⌕",
    add: "+",
    calendar: "▣",
    notice: "!",
    archive: "▤",
    admin: "⚙",
    hash: "#",
    voice: "🔊",
    project: "▣",
    bell: "🔔",
    chevron: "›",
    plus: "+",
    send: "➤",
    back: "‹",
  };

  return (
    <Text
      style={{
        color,
        fontSize: size,
        fontWeight: "700",
      }}
    >
      {symbols[name] ?? "•"}
    </Text>
  );
}

/* =========================================================
   LEFT SIDEBAR (PRIMARY APP NAVIGATION)
   ========================================================= */

function LeftSidebar({
  currentSection,
  onSelectSection,
  isAdmin,
  currentUser,
}: {
  currentSection: string;
  onSelectSection: (section: "spaces" | "dms" | "projects" | "events" | "profile" | "archive" | "admin" | "notices") => void;
  isAdmin: boolean;
  currentUser: any;
}) {
  return (
    <View style={styles.sidebar}>
      {/* Brand / Logo */}
      <View style={styles.sidebarHeader}>
        <View style={styles.brandDot} />
        <Text style={styles.brandText}>AIIC</Text>
      </View>

      <View style={styles.sidebarDivider} />

      {/* Primary Section Links */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sidebarNavList}>
        <Pressable
          onPress={() => onSelectSection("spaces")}
          style={[
            styles.navItem,
            currentSection === "spaces" && styles.navItemActive,
          ]}
        >
          <Icon name="spaces" color={currentSection === "spaces" ? COLORS.accent : COLORS.muted} />
          <Text style={[styles.navItemLabel, currentSection === "spaces" && styles.navItemLabelActive]}>
            Spaces
          </Text>
        </Pressable>

        <Pressable
          onPress={() => onSelectSection("dms")}
          style={[
            styles.navItem,
            currentSection === "dms" && styles.navItemActive,
          ]}
        >
          <Icon name="dm" color={currentSection === "dms" ? COLORS.accent : COLORS.muted} />
          <Text style={[styles.navItemLabel, currentSection === "dms" && styles.navItemLabelActive]}>
            DMs
          </Text>
        </Pressable>

        <Pressable
          onPress={() => onSelectSection("projects")}
          style={[
            styles.navItem,
            currentSection === "projects" && styles.navItemActive,
          ]}
        >
          <Icon name="projects" color={currentSection === "projects" ? COLORS.accent : COLORS.muted} />
          <Text style={[styles.navItemLabel, currentSection === "projects" && styles.navItemLabelActive]}>
            Projects
          </Text>
        </Pressable>

        <Pressable
          onPress={() => onSelectSection("events")}
          style={[
            styles.navItem,
            currentSection === "events" && styles.navItemActive,
          ]}
        >
          <Icon name="events" color={currentSection === "events" ? COLORS.accent : COLORS.muted} />
          <Text style={[styles.navItemLabel, currentSection === "events" && styles.navItemLabelActive]}>
            Events
          </Text>
        </Pressable>

        <Pressable
          onPress={() => onSelectSection("profile")}
          style={[
            styles.navItem,
            currentSection === "profile" && styles.navItemActive,
          ]}
        >
          <Icon name="profile" color={currentSection === "profile" ? COLORS.accent : COLORS.muted} />
          <Text style={[styles.navItemLabel, currentSection === "profile" && styles.navItemLabelActive]}>
            Profile
          </Text>
        </Pressable>

        <View style={styles.sidebarDivider} />

        <Pressable
          onPress={() => onSelectSection("archive")}
          style={[
            styles.navItem,
            currentSection === "archive" && styles.navItemActive,
          ]}
        >
          <Icon name="archive" color={currentSection === "archive" ? COLORS.accent : COLORS.muted} />
          <Text style={[styles.navItemLabel, currentSection === "archive" && styles.navItemLabelActive]}>
            Archives
          </Text>
        </Pressable>

        {isAdmin && (
          <Pressable
            onPress={() => onSelectSection("admin")}
            style={[
              styles.navItem,
              currentSection === "admin" && styles.navItemActive,
            ]}
          >
            <Icon name="admin" color={currentSection === "admin" ? COLORS.accent : COLORS.muted} />
            <Text style={[styles.navItemLabel, currentSection === "admin" && styles.navItemLabelActive]}>
              Admin
            </Text>
          </Pressable>
        )}
      </ScrollView>

      {/* User Profile Pill at Bottom */}
      <Pressable
        onPress={() => onSelectSection("profile")}
        style={styles.userProfileFooter}
      >
        {currentUser?.avatar ? (
          <Image source={{ uri: currentUser.avatar }} style={styles.userAvatar} />
        ) : (
          <View style={styles.userAvatarFallback}>
            <Text style={styles.userAvatarInitial}>
              {(currentUser?.displayName || "U").charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.userMeta}>
          <Text style={styles.userDisplayName} numberOfLines={1}>
            {currentUser?.displayName || "Member"}
          </Text>
          <Text style={styles.userRoleText} numberOfLines={1}>
            {currentUser?.role || "Member"}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

/* =========================================================
   SPACE / CHANNEL SELECTOR (STANDALONE SCREEN)
   ========================================================= */

function SpaceSelectorScreen({
  servers,
  selectedServer,
  channels,
  notice,
  onSelectChannel,
  onNotice,
  onSelectServer,
}: {
  servers: Server[];
  selectedServer,
  channels: Channel[];
  notice?: any;
  onSelectChannel: (channelId: string) => void;
  onNotice: () => void;
  onSelectServer: (serverId: string) => void;
}) {
  const categories = useMemo(() => {
    const result: Record<string, Channel[]> = {};

    channels.forEach((channel) => {
      const category =
        channel.category ||
        (channel.type === "voice"
          ? "Voice Channels"
          : channel.type === "project"
            ? "Projects"
            : "Text Channels");

      if (!result[category]) {
        result[category] = [];
      }

      result[category].push(channel);
    });

    return result;
  }, [channels]);

  return (
    <View style={styles.selectorContainer}>
      {/* Header */}
      <View style={styles.selectorHeader}>
        <Text style={styles.serverName}>{selectedServer?.name || "AIIC Space"}</Text>
      </View>

      {/* Notice Banner */}
      {notice && (
        <Pressable onPress={onNotice} style={styles.noticeBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.noticeTitle}>{notice.title || "Notice"}</Text>
            {!!(notice.message || notice.content) && (
              <Text style={styles.noticeMessage} numberOfLines={1}>
                {notice.message || notice.content}
              </Text>
            )}
          </View>
          <Icon name="chevron" size={20} color={COLORS.muted} />
        </Pressable>
      )}

      {/* Categorized Channel List */}
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
                  pressed && styles.channelRowPressed,
                ]}
              >
                <Icon
                  name={
                    channel.type === "voice"
                      ? "voice"
                      : channel.type === "project"
                        ? "project"
                        : "hash"
                  }
                  size={18}
                  color={COLORS.muted}
                />
                <Text style={styles.channelName} numberOfLines={1}>
                  {channel.name}
                </Text>
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
   DEDICATED CHANNEL SCREEN (OCCUPIES FULL MAIN AREA)
   ========================================================= */

function ChannelScreen({
  channel,
  messages,
  onBack,
  onSend,
}: {
  channel: Channel;
  messages: Message[];
  onBack: () => void;
  onSend: (content: string) => Promise<void>;
}) {
  return (
    <View style={styles.channelScreen}>
      {/* Channel Header with Back Button */}
      <View style={styles.channelHeader}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
          <Icon name="back" size={26} color={COLORS.white} />
        </Pressable>

        <Icon
          name={
            channel.type === "voice"
              ? "voice"
              : channel.type === "project"
                ? "project"
                : "hash"
          }
          size={18}
          color={COLORS.muted}
        />

        <Text style={styles.channelHeaderName} numberOfLines={1}>
          {channel.name}
        </Text>
      </View>

      {/* Messages Feed */}
      <NativeMessageList messages={messages} />

      {/* Composer */}
      <MessageComposer channelName={channel.name} onSend={onSend} />
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

function NativeMessageList({ messages }: { messages: Message[] }) {
  return (
    <FlatList
      data={messages}
      keyExtractor={(item) => item.id}
      style={styles.messages}
      contentContainerStyle={styles.messageContent}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => {
        const { cleanText, attachments } = parseMessageAttachments(item.content || "");
        return (
          <View style={styles.messageRow}>
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
                    { color: item.user?.roleColor || COLORS.white },
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

              {!!item.reactions?.length && (
                <View style={styles.reactions}>
                  {item.reactions.map((reaction) => (
                    <View key={reaction.emoji} style={styles.reaction}>
                      <Text style={{ color: COLORS.white }}>
                        {reaction.emoji} {reaction.count}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        );
      }}
    />
  );
}

function MessageComposer({
  channelName,
  onSend,
}: {
  channelName: string;
  onSend: (content: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    const value = text.trim();
    if (!value || sending) return;

    setSending(true);
    try {
      await onSend(value);
      setText("");
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.composer}>
      <Pressable style={styles.composerPlus}>
        <Icon name="plus" size={22} color={COLORS.white} />
      </Pressable>

      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={`Message #${channelName}`}
        placeholderTextColor={COLORS.muted}
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
          <ActivityIndicator color={COLORS.white} size="small" />
        ) : (
          <Icon name="send" size={18} color={COLORS.white} />
        )}
      </Pressable>
    </View>
  );
}

/* =========================================================
   SUB PAGES
   ========================================================= */

function NoticePage({ notices }: { notices: any[] }) {
  return (
    <View style={styles.page}>
      <Text style={styles.pageTitle}>Notices</Text>
      <FlatList
        data={notices}
        keyExtractor={(item, index) => String(item.id || index)}
        renderItem={({ item }) => (
          <View style={styles.noticeCard}>
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
      <Text style={styles.pageTitle}>Archives</Text>
      <FlatList
        data={archive}
        keyExtractor={(item, index) => String(item.id || item.archiveId || index)}
        renderItem={({ item }) => (
          <View style={styles.archiveRow}>
            <Icon name="archive" color={COLORS.muted} />
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
      <Text style={styles.pageTitle}>Admin Panel</Text>
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
   MAIN APP SHELL (CLEAN NAVIGATION ARCHITECTURE)
   ========================================================= */

export default function AppShellScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const {
    spaces,
    sections,
    activeSpaceId,
    loadSpaces,
    loadChannelsForSpace,
    setActiveSpace,
  } = useWorkspaceStore();

  const {
    messages,
    loadChannelMessages,
    sendChannelMessageAction,
    subscribeToChannel,
    unsubscribeFromChannel,
  } = useChatStore();

  // Primary Section: spaces | dms | projects | events | profile | archive | admin | notices
  const [currentSection, setCurrentSection] = useState<
    "spaces" | "dms" | "projects" | "events" | "profile" | "archive" | "admin" | "notices"
  >("spaces");

  // Selected Space & Channel state (null channel means viewing channel selector)
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  const [notices, setNotices] = useState<any[]>([]);
  const [archive, setArchive] = useState<any[]>([]);
  const [adminData, setAdminData] = useState<any>(null);

  const isAdmin =
    user?.role === "admin" ||
    user?.role === "administrator" ||
    user?.role === "super_admin" ||
    user?.role === "president" ||
    user?.role === "president_admin";

  useEffect(() => {
    loadSpaces();
  }, []);

  const servers: Server[] = useMemo(() => {
    return spaces.map((s) => ({
      id: s.id,
      name: s.name,
      iconUrl: s.icon ?? null,
      unreadCount: s.unread ? 1 : 0,
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

  useEffect(() => {
    api<{ announcements: any[] }>("/announcements")
      .then((res) => {
        setNotices(res?.announcements || []);
      })
      .catch(console.error);
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
            1. PRIMARY LEFT SIDEBAR (REPLACES BOTTOM BAR)
            ================================================= */}
        <LeftSidebar
          currentSection={currentSection}
          onSelectSection={(section) => {
            setCurrentSection(section);
            if (section === "spaces") {
              setSelectedChannelId(null); // Reset channel so user views SpaceSelector
            }
          }}
          isAdmin={isAdmin}
          currentUser={user}
        />

        {/* =================================================
            2. MAIN CONTENT AREA
            ================================================= */}
        <View style={styles.mainContent}>
          {/* SPACES FLOW */}
          {currentSection === "spaces" && (
            selectedChannel ? (
              /* DEDICATED CHANNEL SCREEN */
              <ChannelScreen
                channel={selectedChannel}
                messages={channelMessages}
                onBack={() => setSelectedChannelId(null)}
                onSend={sendMessage}
              />
            ) : (
              /* STANDALONE SPACE & CHANNEL SELECTOR */
              <SpaceSelectorScreen
                servers={servers}
                selectedServer={selectedServer}
                channels={channels}
                notice={notice}
                onSelectChannel={(chId) => setSelectedChannelId(chId)}
                onNotice={() => setCurrentSection("notices")}
                onSelectServer={(sId) => {
                  setSelectedServerId(sId);
                  setActiveSpace(sId);
                  setSelectedChannelId(null);
                }}
              />
            )
          )}

          {/* DEDICATED DMs */}
          {currentSection === "dms" && (
            <View style={styles.page}>
              <Text style={styles.pageTitle}>Direct Messages</Text>
              <TextInput
                placeholder="Search direct messages or friends"
                placeholderTextColor={COLORS.muted}
                style={styles.dmSearch}
              />
              <Text style={styles.emptyText}>No recent direct conversations.</Text>
            </View>
          )}

          {/* DEDICATED PROJECTS */}
          {currentSection === "projects" && (
            <View style={styles.page}>
              <Text style={styles.pageTitle}>Projects & Labs</Text>
              <Text style={styles.emptyText}>Explore active AIIC build teams and repositories.</Text>
            </View>
          )}

          {/* DEDICATED EVENTS */}
          {currentSection === "events" && (
            <View style={styles.page}>
              <Text style={styles.pageTitle}>Events & Workshops</Text>
              <Text style={styles.emptyText}>Upcoming AIIC hackathons, talks, and meeting schedule.</Text>
            </View>
          )}

          {/* DEDICATED PROFILE */}
          {currentSection === "profile" && (
            <View style={styles.page}>
              <Text style={styles.pageTitle}>Profile</Text>
              <View style={styles.profileCard}>
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.profileAvatar} />
                ) : (
                  <View style={styles.profileAvatarFallback}>
                    <Text style={styles.profileAvatarLetter}>
                      {(user?.displayName || "U").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={styles.profileName}>{user?.displayName || "AIIC Member"}</Text>
                <Text style={styles.profileEmail}>{user?.email}</Text>
                <Text style={styles.profileRoleBadge}>{user?.role || "Member"}</Text>
              </View>
            </View>
          )}

          {/* NOTICES */}
          {currentSection === "notices" && (
            <NoticePage notices={notices} />
          )}

          {/* ARCHIVE */}
          {currentSection === "archive" && (
            <ArchivePage archive={archive} />
          )}

          {/* ADMIN (Only accessible if isAdmin is true) */}
          {currentSection === "admin" && isAdmin && (
            <AdminPage data={adminData} />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

/* =========================================================
   COLORS & STYLES
   ========================================================= */

const COLORS = {
  bg: "#08090D",
  sidebar: "#101116",
  panel: "#16171D",
  panel2: "#1D1E26",
  selected: "#282933",
  white: "#F5F5F7",
  muted: "#8F91A2",
  dim: "#5A5C6B",
  border: "rgba(255, 255, 255, 0.08)",
  accent: "#E8A33D",
  danger: "#E5484D",
  success: "#3CCB72",
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  root: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: COLORS.bg,
  },

  /* PRIMARY LEFT SIDEBAR */
  sidebar: {
    width: 78,
    backgroundColor: COLORS.sidebar,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 8,
  },

  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
  },

  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
  },

  brandText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 2,
  },

  sidebarDivider: {
    width: 44,
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 10,
  },

  sidebarNavList: {
    alignItems: "center",
    gap: 8,
  },

  navItem: {
    width: 58,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },

  navItemActive: {
    backgroundColor: COLORS.selected,
  },

  navItemLabel: {
    color: COLORS.muted,
    fontSize: 9.5,
    fontWeight: "700",
    marginTop: 2,
  },

  navItemLabelActive: {
    color: COLORS.white,
  },

  userProfileFooter: {
    marginTop: "auto",
    alignItems: "center",
    paddingTop: 8,
  },

  userAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },

  userAvatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.panel2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  userAvatarInitial: {
    color: COLORS.white,
    fontWeight: "800",
    fontSize: 15,
  },

  userMeta: {
    alignItems: "center",
    marginTop: 4,
  },

  userDisplayName: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "700",
    maxWidth: 68,
  },

  userRoleText: {
    color: COLORS.accent,
    fontSize: 8.5,
    fontWeight: "600",
    textTransform: "uppercase",
  },

  /* MAIN CONTENT AREA */
  mainContent: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  /* STANDALONE SPACE SELECTOR */
  selectorContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  selectorHeader: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  serverName: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },

  noticeBar: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: COLORS.panel2,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  noticeTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "700",
  },

  noticeMessage: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 2,
  },

  channelScroll: {
    flex: 1,
    marginTop: 12,
  },

  categoryBlock: {
    marginBottom: 16,
  },

  categoryTitle: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    paddingHorizontal: 6,
    marginBottom: 6,
  },

  channelRow: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 10,
    borderRadius: 12,
    backgroundColor: COLORS.panel,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
  },

  channelRowPressed: {
    backgroundColor: COLORS.selected,
  },

  channelName: {
    flex: 1,
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "600",
  },

  channelUnread: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },

  unreadText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "800",
  },

  /* DEDICATED CHANNEL SCREEN */
  channelScreen: {
    flex: 1,
  },

  channelHeader: {
    height: 54,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
    backgroundColor: COLORS.panel2,
  },

  channelHeaderName: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: "800",
  },

  /* MESSAGES & COMPOSER */
  messages: {
    flex: 1,
  },

  messageContent: {
    padding: 14,
    paddingBottom: 20,
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
    backgroundColor: COLORS.panel2,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarLetter: {
    color: COLORS.white,
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
    color: COLORS.dim,
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
    backgroundColor: COLORS.panel2,
  },

  fileCard: {
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: COLORS.panel2,
  },

  fileName: {
    color: COLORS.white,
    fontWeight: "600",
  },

  reactions: {
    flexDirection: "row",
    gap: 6,
    marginTop: 7,
  },

  reaction: {
    backgroundColor: COLORS.panel2,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },

  composer: {
    minHeight: 54,
    margin: 10,
    borderRadius: 16,
    backgroundColor: COLORS.panel2,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    color: COLORS.white,
    fontSize: 15,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },

  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },

  sendDisabled: {
    opacity: 0.35,
  },

  /* SUB PAGES */
  page: {
    flex: 1,
    padding: 20,
  },

  pageTitle: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 16,
  },

  emptyText: {
    color: COLORS.muted,
    fontSize: 14,
    marginTop: 10,
  },

  dmSearch: {
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.panel2,
    color: COLORS.white,
    paddingHorizontal: 14,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  profileCard: {
    padding: 20,
    borderRadius: 18,
    backgroundColor: COLORS.panel,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
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
    backgroundColor: COLORS.panel2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  profileAvatarLetter: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: "800",
  },

  profileName: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "800",
  },

  profileEmail: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 4,
  },

  profileRoleBadge: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(232, 163, 61, 0.15)",
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },

  noticeCard: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: COLORS.panel,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  noticeCardTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "800",
  },

  noticeCardText: {
    color: COLORS.muted,
    marginTop: 6,
    lineHeight: 20,
  },

  archiveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: COLORS.panel,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  archiveTitle: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 15,
  },

  archiveDescription: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 3,
  },

  adminGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  adminStat: {
    width: "47%",
    minHeight: 105,
    padding: 14,
    borderRadius: 16,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  adminStatTitle: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "600",
  },

  adminStatValue: {
    color: COLORS.white,
    fontSize: 26,
    fontWeight: "800",
    marginTop: 12,
  },
});
