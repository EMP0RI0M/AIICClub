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
    dm: "▰",
    search: "⌕",
    add: "♙",
    calendar: "▣",
    notice: "!",
    archive: "▤",
    admin: "⚙",
    hash: "#",
    voice: "🔊",
    project: "▣",
    bell: "♧",
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
        <Icon
          name="dm"
          size={24}
          color={currentSection === "dm" ? COLORS.white : COLORS.muted}
        />
      </Pressable>

      <View style={styles.railDivider} />

      {/* SPACE LIST (CIRCULAR SERVER ICONS) */}
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

      {/* 3 UTILITY ITEMS AT BOTTOM */}
      <View style={styles.utilityArea}>
        <Pressable
          onPress={onNotice}
          style={[
            styles.utilityButton,
            currentSection === "notices" && styles.utilityActive,
          ]}
        >
          <Icon name="notice" />
        </Pressable>

        <Pressable
          onPress={onArchive}
          style={[
            styles.utilityButton,
            currentSection === "archive" && styles.utilityActive,
          ]}
        >
          <Icon name="archive" />
        </Pressable>

        {isAdmin && (
          <Pressable
            onPress={onAdmin}
            style={[
              styles.utilityButton,
              currentSection === "admin" && styles.utilityActive,
            ]}
          >
            <Icon name="admin" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

/* =========================================================
   LEVEL 2: SELECTED SPACE NAVIGATION (CHANNEL SELECTOR VIEW)
   Occupies the full content area beside SpaceRail on mobile.
   Does NOT render MessageList or empty channel view beside it.
   ========================================================= */

function SelectedSpaceView({
  server,
  channels,
  notice,
  onSelectChannel,
  onNotice,
  onSearch,
  onAdd,
  onEvents,
}: {
  server: Server;
  channels: Channel[];
  notice?: any;
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
    <View style={styles.selectorView}>
      {/* Space Header */}
      <View style={styles.header}>
        <View style={styles.serverTitleRow}>
          <Text style={styles.serverName}>{server.name}</Text>
          <Icon name="chevron" size={20} color={COLORS.muted} />
        </View>

        <View style={styles.headerActions}>
          <Pressable onPress={onSearch} style={styles.searchButton}>
            <Icon name="search" size={20} color={COLORS.white} />
            <Text style={styles.searchText}>Search</Text>
          </Pressable>

          <Pressable onPress={onAdd} style={styles.squareButton}>
            <Icon name="add" color={COLORS.white} />
          </Pressable>

          <Pressable onPress={onEvents} style={styles.squareButton}>
            <Icon name="calendar" color={COLORS.white} />
          </Pressable>
        </View>
      </View>

      {/* Notice / Announcement Bar */}
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
   CHANNEL SCREEN (DEDICATED FULL-AREA MESSAGE VIEW)
   Opens only when user clicks a channel.
   Pressing Back returns cleanly to SelectedSpaceView.
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
      {/* Header with Back Button */}
      <View style={styles.channelHeader}>
        <Pressable onPress={onBack} hitSlop={14} style={styles.backBtn}>
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

      {/* Message Feed */}
      <NativeMessageList messages={messages} />

      {/* Message Composer */}
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
        <Icon name="plus" size={24} color={COLORS.white} />
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
   SUB-SECTIONS: NOTICES, ARCHIVES, ADMIN
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
   MAIN APP SHELL (DISCORD MOBILE ARCHITECTURE)
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
  } = useWorkspaceStore();

  const {
    messages,
    loadChannelMessages,
    sendChannelMessageAction,
    subscribeToChannel,
    unsubscribeFromChannel,
  } = useChatStore();

  // Navigation section: space | dm | notices | archive | admin
  const [currentSection, setCurrentSection] = useState<
    "space" | "dm" | "notices" | "archive" | "admin"
  >("space");

  // Selected Space & Channel state (selectedChannelId is null when in selector)
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
            LEVEL 1: NARROW LEFT SPACE / SERVER RAIL
            ================================================= */}
        <SpaceRail
          servers={servers}
          selectedServerId={selectedServerId}
          onSelectServer={(id) => {
            setSelectedServerId(id);
            setActiveSpace(id);
            setSelectedChannelId(null); // Reset to channel selector view
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
        />

        {/* =================================================
            LEVEL 2: MAIN CONTENT VIEW (SPACE OR CHANNEL VIEW)
            ================================================= */}
        <View style={styles.mainContent}>
          {currentSection === "space" && selectedServer && (
            selectedChannel ? (
              /* DEDICATED CHANNEL SCREEN (OCCUPIES FULL CONTENT AREA) */
              <ChannelScreen
                channel={selectedChannel}
                messages={channelMessages}
                onBack={() => setSelectedChannelId(null)}
                onSend={sendMessage}
              />
            ) : (
              /* SELECTED SPACE VIEW (CHANNEL SELECTOR VIEW ONLY) */
              <SelectedSpaceView
                server={selectedServer}
                channels={channels}
                notice={notice}
                onSelectChannel={(chId) => setSelectedChannelId(chId)}
                onNotice={() => setCurrentSection("notices")}
                onSearch={() => {}}
                onAdd={() => {}}
                onEvents={() => {}}
              />
            )
          )}

          {currentSection === "dm" && (
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

          {currentSection === "notices" && (
            <NoticePage notices={notices} />
          )}

          {currentSection === "archive" && (
            <ArchivePage archive={archive} />
          )}

          {currentSection === "admin" && isAdmin && (
            <AdminPage data={adminData} />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

/* =========================================================
   COLORS & STYLES (MATCHING DISCORD MOBILE REFERENCE)
   ========================================================= */

const COLORS = {
  bg: "#0B0B0F",
  rail: "#111116",
  panel: "#15151A",
  panel2: "#202027",
  selected: "#3A3A42",
  white: "#F5F5F7",
  muted: "#9698A8",
  dim: "#696B79",
  border: "#292A31",
  accent: "#F2B544",
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

  /* LEVEL 1: NARROW LEFT SPACE RAIL */
  rail: {
    width: 80,
    backgroundColor: COLORS.rail,
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 8,
  },

  dmButton: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#24242A",
  },

  activeDM: {
    backgroundColor: COLORS.accent,
  },

  railDivider: {
    width: 36,
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 10,
  },

  spaceList: {
    alignItems: "center",
    paddingBottom: 8,
    gap: 10,
  },

  spaceButton: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  activeSpace: {
    backgroundColor: COLORS.selected,
  },

  spaceImage: {
    width: 52,
    height: 52,
    borderRadius: 17,
  },

  spaceFallback: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#292A33",
  },

  spaceLetter: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: "800",
  },

  unreadBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
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

  utilityArea: {
    marginTop: "auto",
    gap: 8,
    alignItems: "center",
  },

  utilityButton: {
    width: 52,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  utilityActive: {
    backgroundColor: COLORS.selected,
  },

  /* LEVEL 2: MAIN CONTENT AREA */
  mainContent: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  /* SELECTED SPACE VIEW (CHANNEL SELECTOR) */
  selectorView: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  header: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  serverTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
  },

  serverName: {
    color: COLORS.white,
    fontSize: 21,
    fontWeight: "800",
  },

  headerActions: {
    flexDirection: "row",
    gap: 10,
  },

  searchButton: {
    flex: 1,
    height: 48,
    borderRadius: 15,
    backgroundColor: COLORS.panel2,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 8,
  },

  searchText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },

  squareButton: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: COLORS.panel2,
    alignItems: "center",
    justifyContent: "center",
  },

  noticeBar: {
    marginHorizontal: 14,
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 17,
    backgroundColor: COLORS.panel2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  noticeTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "700",
  },

  noticeMessage: {
    color: COLORS.muted,
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
    color: COLORS.muted,
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
    borderRadius: 10,
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

  /* DEDICATED CHANNEL SCREEN */
  channelScreen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  channelHeader: {
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
  },

  backBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
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
    paddingBottom: 24,
  },

  messageRow: {
    flexDirection: "row",
    marginBottom: 17,
    gap: 10,
  },

  messageAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },

  messageAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    color: "#D8D8DE",
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
    minHeight: 58,
    margin: 10,
    borderRadius: 17,
    backgroundColor: COLORS.panel2,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
  },

  composerPlus: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  composerInput: {
    flex: 1,
    maxHeight: 100,
    color: COLORS.white,
    fontSize: 15,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },

  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    backgroundColor: COLORS.bg,
  },

  pageTitle: {
    color: COLORS.white,
    fontSize: 25,
    fontWeight: "800",
    marginBottom: 18,
  },

  emptyText: {
    color: COLORS.muted,
    marginTop: 20,
  },

  dmSearch: {
    height: 50,
    borderRadius: 14,
    backgroundColor: COLORS.panel2,
    color: COLORS.white,
    paddingHorizontal: 15,
    fontSize: 14,
  },

  noticeCard: {
    padding: 16,
    borderRadius: 15,
    backgroundColor: COLORS.panel2,
    marginBottom: 10,
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
    padding: 15,
    borderRadius: 14,
    backgroundColor: COLORS.panel2,
    marginBottom: 8,
  },

  archiveTitle: {
    color: COLORS.white,
    fontWeight: "700",
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
    minHeight: 110,
    padding: 15,
    borderRadius: 16,
    backgroundColor: COLORS.panel2,
  },

  adminStatTitle: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "600",
  },

  adminStatValue: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: "800",
    marginTop: 15,
  },
});
