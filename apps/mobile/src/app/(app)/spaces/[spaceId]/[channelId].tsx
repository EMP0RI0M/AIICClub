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
  size = 22,
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
    voice: "◖",
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
   LEFT RAIL
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
      {/* DM IS ALWAYS ABOVE SPACES */}
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
          color={
            currentSection === "dm"
              ? COLORS.white
              : COLORS.muted
          }
        />
      </Pressable>

      <View style={styles.railDivider} />

      {/* SPACE LIST */}
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

      {/* 3 UTILITY ITEMS */}
      <View style={styles.utilityArea}>
        <Pressable
          onPress={onNotice}
          style={[
            styles.utilityButton,
            currentSection === "notices" &&
              styles.utilityActive,
          ]}
        >
          <Icon name="notice" />
        </Pressable>

        <Pressable
          onPress={onArchive}
          style={[
            styles.utilityButton,
            currentSection === "archive" &&
              styles.utilityActive,
          ]}
        >
          <Icon name="archive" />
        </Pressable>

        {isAdmin && (
          <Pressable
            onPress={onAdmin}
            style={[
              styles.utilityButton,
              currentSection === "admin" &&
                styles.utilityActive,
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
   SPACE HEADER
   ========================================================= */

function SpaceHeader({
  server,
  onSearch,
  onAdd,
  onEvents,
}: {
  server: Server;
  onSearch: () => void;
  onAdd: () => void;
  onEvents: () => void;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.serverTitleRow}>
        <Text style={styles.serverName}>
          {server.name}
        </Text>

        <Icon name="chevron" size={22} color={COLORS.muted} />
      </View>

      <View style={styles.headerActions}>
        <Pressable
          onPress={onSearch}
          style={styles.searchButton}
        >
          <Icon name="search" size={24} color={COLORS.white} />
          <Text style={styles.searchText}>Search</Text>
        </Pressable>

        <Pressable
          onPress={onAdd}
          style={styles.squareButton}
        >
          <Icon name="add" color={COLORS.white} />
        </Pressable>

        <Pressable
          onPress={onEvents}
          style={styles.squareButton}
        >
          <Icon name="calendar" color={COLORS.white} />
        </Pressable>
      </View>
    </View>
  );
}

/* =========================================================
   NOTICE BAR
   ========================================================= */

function NoticeBar({
  notice,
  onPress,
}: {
  notice?: any;
  onPress: () => void;
}) {
  if (!notice) return null;

  return (
    <Pressable
      onPress={onPress}
      style={styles.noticeBar}
    >
      <View>
        <Text style={styles.noticeTitle}>
          {notice.title || "Notice"}
        </Text>

        {!!(notice.message || notice.content) && (
          <Text
            style={styles.noticeMessage}
            numberOfLines={1}
          >
            {notice.message || notice.content}
          </Text>
        )}
      </View>

      <Icon
        name="chevron"
        size={24}
        color={COLORS.muted}
      />
    </Pressable>
  );
}

/* =========================================================
   CHANNEL LIST
   ========================================================= */

function ChannelList({
  channels,
  selectedChannelId,
  onSelectChannel,
}: {
  channels: Channel[];
  selectedChannelId: string | null;
  onSelectChannel: (id: string) => void;
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
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={styles.channelsContainer}
    >
      {Object.entries(categories).map(
        ([category, items]) => (
          <View key={category}>
            <Text style={styles.categoryTitle}>
              {category.toUpperCase()}
            </Text>

            {items.map((channel) => {
              const selected = channel.id === selectedChannelId;

              return (
                <Pressable
                  key={channel.id}
                  onPress={() =>
                    onSelectChannel(channel.id)
                  }
                  style={[
                    styles.channelRow,
                    selected && styles.selectedChannel,
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
                    size={22}
                    color={
                      selected
                        ? COLORS.white
                        : COLORS.muted
                    }
                  />

                  <Text
                    style={[
                      styles.channelName,
                      selected &&
                        styles.selectedChannelText,
                    ]}
                    numberOfLines={1}
                  >
                    {channel.name}
                  </Text>

                  {!!channel.unreadCount && (
                    <View style={styles.channelUnread}>
                      <Text style={styles.unreadText}>
                        {channel.unreadCount}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        ),
      )}
    </ScrollView>
  );
}

/* =========================================================
   MESSAGE VIEW
   ========================================================= */

function isImageUrl(url: string, mimeType?: string) {
  if (mimeType?.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|bmp|avif)(\?.*)?$/i.test(url);
}

function NativeMessageList({
  messages,
}: {
  messages: Message[];
}) {
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
              <Image
                source={{ uri: item.user.avatarUrl }}
                style={styles.messageAvatar}
              />
            ) : (
              <View style={styles.messageAvatarFallback}>
                <Text style={styles.avatarLetter}>
                  {(item.user?.displayName || "U")
                    .charAt(0)
                    .toUpperCase()}
                </Text>
              </View>
            )}

            <View style={styles.messageBody}>
              <View style={styles.messageHeader}>
                <Text
                  style={[
                    styles.displayName,
                    {
                      color:
                        item.user?.roleColor ||
                        COLORS.white,
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
                <Text style={styles.messageText}>
                  {cleanText}
                </Text>
              ) : null}

              {/* Rich Attachments */}
              {attachments.map((att, idx) => (
                <AttachmentCard key={idx} attachment={att} />
              ))}

              {/* DIRECT IMAGE URL */}
              {item.attachment?.url &&
                isImageUrl(
                  item.attachment.url,
                  item.attachment.mimeType,
                ) && (
                  <Image
                    source={{
                      uri: item.attachment.url,
                    }}
                    style={styles.attachmentImage}
                    resizeMode="cover"
                  />
                )}

              {/* FILE */}
              {item.attachment?.url &&
                !isImageUrl(
                  item.attachment.url,
                  item.attachment.mimeType,
                ) && (
                  <View style={styles.fileCard}>
                    <Text style={styles.fileName}>
                      {item.attachment.name ||
                        "Attachment"}
                    </Text>
                  </View>
                )}

              {!!item.reactions?.length && (
                <View style={styles.reactions}>
                  {item.reactions.map((reaction) => (
                    <View
                      key={reaction.emoji}
                      style={styles.reaction}
                    >
                      <Text style={{ color: COLORS.white }}>
                        {reaction.emoji}{" "}
                        {reaction.count}
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

/* =========================================================
   MESSAGE COMPOSER
   ========================================================= */

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
        <Icon
          name="plus"
          size={25}
          color={COLORS.white}
        />
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
          (!text.trim() || sending) &&
            styles.sendDisabled,
        ]}
      >
        {sending ? (
          <ActivityIndicator
            color={COLORS.white}
            size="small"
          />
        ) : (
          <Icon
            name="send"
            size={20}
            color={COLORS.white}
          />
        )}
      </Pressable>
    </View>
  );
}

/* =========================================================
   SPACE CONTENT
   ========================================================= */

function SpaceContent({
  server,
  channels,
  selectedChannelId,
  messages,
  notice,
  onSelectChannel,
  onNotice,
  onSend,
  onSearch,
  onAdd,
  onEvents,
}: {
  server: Server;
  channels: Channel[];
  selectedChannelId: string | null;
  messages: Message[];
  notice?: any;
  onSelectChannel: (id: string) => void;
  onNotice: () => void;
  onSend: (content: string) => Promise<void>;
  onSearch: () => void;
  onAdd: () => void;
  onEvents: () => void;
}) {
  const selectedChannel = channels.find(
    (c) => c.id === selectedChannelId,
  );

  return (
    <View style={styles.spaceContent}>
      <SpaceHeader
        server={server}
        onSearch={onSearch}
        onAdd={onAdd}
        onEvents={onEvents}
      />

      <NoticeBar
        notice={notice}
        onPress={onNotice}
      />

      <View style={styles.workspace}>
        {/* CHANNEL DRAWER */}
        <View style={styles.channelDrawer}>
          <ChannelList
            channels={channels}
            selectedChannelId={selectedChannelId}
            onSelectChannel={onSelectChannel}
          />
        </View>

        {/* ACTUAL CONTENT */}
        <View style={styles.channelContent}>
          {selectedChannel ? (
            <>
              <View style={styles.channelHeader}>
                <Icon
                  name={
                    selectedChannel.type === "voice"
                      ? "voice"
                      : selectedChannel.type === "project"
                        ? "project"
                        : "hash"
                  }
                  color={COLORS.white}
                />

                <Text style={styles.channelHeaderName}>
                  {selectedChannel.name}
                </Text>
              </View>

              <NativeMessageList
                messages={messages}
              />

              <MessageComposer
                channelName={selectedChannel.name}
                onSend={onSend}
              />
            </>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>
                Select a channel
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

/* =========================================================
   NOTICES
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
            <Text style={styles.noticeCardTitle}>
              {item.title}
            </Text>
            <Text style={styles.noticeCardText}>
              {item.message || item.content || item.description || ""}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

/* =========================================================
   ARCHIVE
   ========================================================= */

function ArchivePage({ archive }: { archive: any[] }) {
  return (
    <View style={styles.page}>
      <Text style={styles.pageTitle}>Archive</Text>

      <FlatList
        data={archive}
        keyExtractor={(item, index) => String(item.id || item.archiveId || index)}
        renderItem={({ item }) => (
          <View style={styles.archiveRow}>
            <Icon
              name="archive"
              color={COLORS.muted}
            />

            <View style={{ flex: 1 }}>
              <Text style={styles.archiveTitle}>
                {item.title || item.name || "Archive record"}
              </Text>

              {!!(item.description || item.summary) && (
                <Text
                  style={styles.archiveDescription}
                  numberOfLines={2}
                >
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

/* =========================================================
   ADMIN
   ========================================================= */

function AdminPage({ data }: { data: any }) {
  return (
    <ScrollView style={styles.page}>
      <Text style={styles.pageTitle}>
        Admin Panel
      </Text>

      <View style={styles.adminGrid}>
        <AdminStat
          title="Total Members"
          value={data?.stats?.totalUsers ?? data?.totalMembers}
        />

        <AdminStat
          title="Active Spaces"
          value={data?.stats?.activeSpaces ?? data?.activeSpaces}
        />

        <AdminStat
          title="Pending Approvals"
          value={data?.stats?.pendingApprovals ?? data?.pendingApprovals}
        />

        <AdminStat
          title="Squad Teams"
          value={data?.stats?.activeTeams ?? data?.squadTeams}
        />
      </View>
    </ScrollView>
  );
}

function AdminStat({
  title,
  value,
}: {
  title: string;
  value: any;
}) {
  return (
    <View style={styles.adminStat}>
      <Text style={styles.adminStatTitle}>
        {title}
      </Text>

      <Text style={styles.adminStatValue}>
        {value ?? "—"}
      </Text>
    </View>
  );
}

/* =========================================================
   MAIN SHELL
   ========================================================= */

export default function SpaceChannelScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const {
    spaces,
    sections,
    activeSpaceId,
    activeChannelId,
    loadSpaces,
    loadChannelsForSpace,
    setActiveSpace,
    setActiveChannel,
  } = useWorkspaceStore();

  const {
    messages,
    loadChannelMessages,
    sendChannelMessageAction,
    subscribeToChannel,
    unsubscribeFromChannel,
  } = useChatStore();

  const [currentSection, setCurrentSection] =
    useState<"dm" | "space" | "notices" | "archive" | "admin">("space");

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

  /* -------------------------------------------------------
     LOAD SPACES
     ------------------------------------------------------- */
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

  /* -------------------------------------------------------
     LOAD CHANNELS
     ------------------------------------------------------- */
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
    if (channels.length > 0) {
      const firstText = channels.find((c) => c.type === "text") || channels[0];
      setSelectedChannelId(activeChannelId || firstText.id);
    }
  }, [channels, activeChannelId]);

  /* -------------------------------------------------------
     LOAD MESSAGES
     ------------------------------------------------------- */
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

  /* -------------------------------------------------------
     NOTICES
     ------------------------------------------------------- */
  useEffect(() => {
    if (currentSection === "notices" || currentSection === "space") {
      api<{ announcements: any[] }>("/announcements")
        .then((res) => {
          setNotices(res?.announcements || []);
        })
        .catch(console.error);
    }
  }, [currentSection]);

  /* -------------------------------------------------------
     ARCHIVE
     ------------------------------------------------------- */
  useEffect(() => {
    if (currentSection === "archive") {
      api<{ records: any[] }>("/archive/records")
        .then((res) => {
          setArchive(res?.records || []);
        })
        .catch(console.error);
    }
  }, [currentSection]);

  /* -------------------------------------------------------
     ADMIN
     ------------------------------------------------------- */
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

  /* -------------------------------------------------------
     SEND MESSAGE
     ------------------------------------------------------- */
  async function sendMessage(content: string) {
    if (!selectedChannelId) return;
    await sendChannelMessageAction(selectedChannelId, content);
  }

  const selectedServer =
    servers.find((server) => server.id === selectedServerId) || servers[0] || null;

  const notice = notices[0];

  /* -------------------------------------------------------
     RENDER
     ------------------------------------------------------- */
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.root}>
        {/* =================================================
            LEFT DISCORD-STYLE RAIL
            ================================================= */}
        <SpaceRail
          servers={servers}
          selectedServerId={selectedServerId}
          onSelectServer={(id) => {
            setSelectedServerId(id);
            setActiveSpace(id);
            setCurrentSection("space");
          }}
          onDM={() => {
            router.push("/(app)/dms/index" as any);
          }}
          currentSection={currentSection}
          isAdmin={isAdmin}
          onNotice={() => {
            setCurrentSection("notices");
          }}
          onArchive={() => {
            setCurrentSection("archive");
          }}
          onAdmin={() => {
            if (isAdmin) {
              setCurrentSection("admin");
            }
          }}
        />

        {/* =================================================
            MAIN CONTENT
            ================================================= */}
        <View style={styles.main}>
          {currentSection === "space" && selectedServer && (
            <SpaceContent
              server={selectedServer}
              channels={channels}
              selectedChannelId={selectedChannelId}
              messages={channelMessages}
              notice={notice}
              onSelectChannel={(chId) => {
                setSelectedChannelId(chId);
                setActiveChannel(chId);
              }}
              onNotice={() => setCurrentSection("notices")}
              onSend={sendMessage}
              onSearch={() => router.push("/(app)/projects/index" as any)}
              onAdd={() => router.push("/(app)/projects/index" as any)}
              onEvents={() => router.push("/(app)/events/index" as any)}
            />
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
   COLORS
   ========================================================= */

const COLORS = {
  bg: "#0B0B0F",
  rail: "#111116",
  panel: "#1A1A20",
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

/* =========================================================
   STYLES
   ========================================================= */

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

  /* RAIL */

  rail: {
    width: 82,
    backgroundColor: COLORS.rail,
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 8,
  },

  dmButton: {
    width: 58,
    height: 58,
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
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  activeSpace: {
    backgroundColor: COLORS.selected,
  },

  spaceImage: {
    width: 54,
    height: 54,
    borderRadius: 17,
  },

  spaceFallback: {
    width: 54,
    height: 54,
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
    width: 54,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  utilityActive: {
    backgroundColor: COLORS.selected,
  },

  /* MAIN */

  main: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  spaceContent: {
    flex: 1,
  },

  /* HEADER */

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

  /* NOTICE */

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

  /* WORKSPACE */

  workspace: {
    flex: 1,
    flexDirection: "row",
    marginTop: 10,
  },

  channelDrawer: {
    width: 175,
    backgroundColor: "#15151A",
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },

  channelsContainer: {
    flex: 1,
  },

  categoryTitle: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.7,
    paddingHorizontal: 12,
    paddingTop: 18,
    paddingBottom: 6,
  },

  channelRow: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 7,
    borderRadius: 8,
    marginHorizontal: 5,
  },

  selectedChannel: {
    backgroundColor: COLORS.selected,
  },

  channelName: {
    flex: 1,
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: "600",
  },

  selectedChannelText: {
    color: COLORS.white,
  },

  channelUnread: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.danger,
    alignItems: "center",
    justifyContent: "center",
  },

  channelContent: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  channelHeader: {
    height: 50,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 7,
  },

  channelHeaderName: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "800",
  },

  /* MESSAGES */

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

  /* COMPOSER */

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

  /* PAGES */

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

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "700",
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

  /* NOTICES */

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

  /* ARCHIVE */

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

  /* ADMIN */

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
