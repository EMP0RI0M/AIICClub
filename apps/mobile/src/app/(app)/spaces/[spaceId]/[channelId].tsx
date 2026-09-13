import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthStore } from "../../../../stores/auth-store";
import { useWorkspaceStore } from "../../../../stores/workspace-store";
import { useChatStore } from "../../../../stores/chat-store";
import { api, searchUsers, publishAnnouncement, fetchUserProfile, fetchOrgMembers, fetchChannelMessages } from "../../../../lib/api";
import { NativeHaptics } from "../../../../lib/haptics";
import { notificationService } from "../../../../lib/notifications";
import { AttachmentCard, parseMessageAttachments } from "../../../../components/chat/AttachmentCard";
import { encodeAttachmentContent } from "../../../../lib/attachments";
import { soundService } from "../../../../lib/sound-service";
import { RichMarkdown, ReasoningTrace } from "../../../../components/chat/RichMarkdown";
import { formatAvatarUrl } from "../../../../lib/avatar";
import { Avatar } from "../../../../components/ui/Avatar";
import { GlassCard } from "../../../../components/ui/GlassCard";
import { Badge } from "../../../../components/ui/Badge";
import { VoiceChannelView } from "../../../../components/chat/VoiceChannelView";
import { IncidentChannelView } from "../../../../components/chat/IncidentChannelView";
import {
  SpaceSettingsModal,
  type SpaceSettingsSection,
} from "@/components/space/SpaceSettingsModal";
import { CanvasChannelView } from "../../../../components/chat/CanvasChannelView";
import { DocsChannelView } from "@/components/chat/DocsChannelView";
import { BoardChannelView } from "@/components/chat/BoardChannelView";
import { GitHubChannelView } from "@/components/chat/GitHubChannelView";
import { NotebookChannelView } from "@/components/chat/NotebookChannelView";
import { SpaceDrawerModal } from "@/components/navigation/SpaceDrawerModal";
import { CreateSpaceModal } from "@/components/space/CreateSpaceModal";
import { CreateChannelModal } from "@/components/space/CreateChannelModal";
import { MobileArchiveView } from "@/components/archive/MobileArchiveView";
import { MobileNoticeBoardView } from "@/components/notifications/MobileNoticeBoardView";
import { MobileProfileStatusView } from "@/components/profile/MobileProfileStatusView";
import { UserProfileModal, type UserProfileData } from "@/components/profile/UserProfileModal";
import { MobileThreadModal } from "@/components/chat/MobileThreadModal";
import { MobileAdminView } from "@/components/admin/MobileAdminView";
import {
  MobileAttachmentSheet,
  MobileGifModal,
  MobileEmojiModal,
} from "@/components/chat/MobileMediaPickers";
import { ExpressionSheet, type ExpressionTab } from "@/components/chat/ExpressionSheet";
import { WallpaperBackground } from "@/components/theme/WallpaperBackground";
import { ThemeCustomizerModal } from "@/components/theme/ThemeCustomizerModal";
import { LiquidUserDock } from "@/components/workspace/LiquidUserDock";
import { GlassBackButton } from "@/components/ui/GlassBackButton";
import { RoundBackButton } from "@/components/ui/RoundBackButton";
import { RoundIconButton } from "@/components/ui/RoundIconButton";
import { SpaceMembersSheet, type SpaceMemberItem } from "@/components/workspace/SpaceMembersSheet";
import { useThemeStore } from "@/stores/theme-store";
import { useVoiceRecorder } from "../../../../lib/voice-recorder";
import { colors, radius, useAppTheme } from "../../../../theme/tokens";
import {
  MessageSquare,
  MessagesSquare,
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
  Palette,
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
  Paperclip,
  Camera,
  Trash2,
  CornerUpLeft,
  Layers,
  Terminal,
  Activity,
  Compass,
  Headphones,
  ChevronDown,
  Users,
  RotateCw,
  MoreHorizontal,
  Copy,
  RefreshCw,
  Pin,
  AtSign,
} from "lucide-react-native";
import * as Clipboard from "expo-clipboard";

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
  replyTo?: {
    id: string;
    authorName: string;
    text: string;
    authorId?: string;
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
  threadReplyCount?: number;
  thread?: any;
};

/* =========================================================
   LEVEL 1: FLOATING CURVED GLASS NAVIGATION RAIL
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
  onCreateSpace,
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
  onCreateSpace?: () => void;
}) {
  const theme = useAppTheme();

  return (
    <View style={styles.railWrapper}>
      <View style={styles.rail}>
        <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFillObject} />
        <LinearGradient
          colors={["rgba(255, 255, 255, 0.08)", "rgba(255, 255, 255, 0.02)", "rgba(10, 12, 18, 0.70)"]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />

        {/* Atmospheric ambient fog under the glass rail */}
        <View
          style={[
            styles.railAmbientFog,
            { backgroundColor: theme.colors.accentSoft },
          ]}
          pointerEvents="none"
        />

        {/* ─── GROUP 1: DIRECT MESSAGES ─── */}
        <View style={styles.railGroupTop}>
          <View style={styles.railItemWrapper}>
            {currentSection === "dm" && (
              <View style={[styles.railIndicatorPillActive, { backgroundColor: theme.colors.accent }]} />
            )}
            <Pressable
              onPress={onDM}
              style={[
                styles.dmButton,
                currentSection === "dm" && [
                  styles.activeDM,
                  {
                    backgroundColor: theme.colors.accentSoft,
                    borderColor: theme.colors.accentBorder,
                  },
                ],
              ]}
              hitSlop={4}
            >
              <MessageSquare
                size={24}
                color={currentSection === "dm" ? theme.colors.accent : colors.textMuted}
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.railDivider} />

        {/* ─── GROUP 2: SPACES LIST & CREATE SPACE ─── */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.spaceList}
        >
          {servers.map((server) => {
            const active = selectedServerId === server.id && currentSection === "space";
            const hasUnread = Boolean(server.unreadCount && server.unreadCount > 0);

            return (
              <View key={server.id} style={styles.railItemWrapper}>
                {/* Left Active/Unread Pill */}
                {active ? (
                  <View style={[styles.railIndicatorPillActive, { backgroundColor: theme.colors.accent }]} />
                ) : hasUnread ? (
                  <View style={styles.railIndicatorPillUnread} />
                ) : null}

                <Pressable
                  onPress={() => onSelectServer(server.id)}
                  style={[
                    styles.spaceButton,
                    active && [
                      styles.activeSpace,
                      {
                        backgroundColor: theme.colors.accentSoft,
                        borderColor: theme.colors.accentBorder,
                      },
                    ],
                  ]}
                  hitSlop={4}
                >
                  {server.iconUrl ? (
                    <Image
                      source={{ uri: server.iconUrl }}
                      style={styles.spaceImage}
                    />
                  ) : (
                    <View style={[styles.spaceFallback, active && { borderColor: theme.colors.accentBorder, backgroundColor: theme.colors.accentSoft }]}>
                      <Text style={[styles.spaceLetter, active && { color: theme.colors.accent }]}>
                        {server.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}

                  {hasUnread && (
                    <View style={[styles.unreadBadge, { backgroundColor: theme.colors.accent }]}>
                      <Text style={[styles.unreadText, { color: theme.colors.accentText }]}>
                        {(server.unreadCount || 0) > 99
                          ? "99+"
                          : server.unreadCount}
                      </Text>
                    </View>
                  )}
                </Pressable>
              </View>
            );
          })}

          {/* Add Space / Create Button */}
          <View style={styles.railItemWrapper}>
            <Pressable
              onPress={onCreateSpace}
              style={[
                styles.addSpaceBtn,
                { borderColor: theme.colors.accentBorder, backgroundColor: theme.colors.accentSoft },
              ]}
              hitSlop={4}
            >
              <Plus size={24} color={theme.colors.accent} />
            </Pressable>
          </View>
        </ScrollView>

        <View style={styles.railDivider} />

        {/* ─── GROUP 3: NOTICES, ARCHIVE, SETTINGS & PROFILE ─── */}
        <View style={styles.utilityArea}>
          <View style={styles.railItemWrapper}>
            {currentSection === "notices" && (
              <View style={[styles.railIndicatorPillActive, { backgroundColor: theme.colors.accent }]} />
            )}
            <Pressable
              onPress={onNotice}
              style={[
                styles.utilityButton,
                currentSection === "notices" && [
                  styles.utilityActive,
                  {
                    backgroundColor: theme.colors.accentSoft,
                    borderColor: theme.colors.accentBorder,
                  },
                ],
              ]}
              hitSlop={4}
            >
              <Bell size={22} color={currentSection === "notices" ? theme.colors.accent : colors.textMuted} />
            </Pressable>
          </View>

          <View style={styles.railItemWrapper}>
            {currentSection === "archive" && (
              <View style={[styles.railIndicatorPillActive, { backgroundColor: theme.colors.accent }]} />
            )}
            <Pressable
              onPress={onArchive}
              style={[
                styles.utilityButton,
                currentSection === "archive" && [
                  styles.utilityActive,
                  {
                    backgroundColor: theme.colors.accentSoft,
                    borderColor: theme.colors.accentBorder,
                  },
                ],
              ]}
              hitSlop={4}
            >
              <Archive size={22} color={currentSection === "archive" ? theme.colors.accent : colors.textMuted} />
            </Pressable>
          </View>

          {isAdmin && (
            <View style={styles.railItemWrapper}>
              {currentSection === "admin" && (
                <View style={[styles.railIndicatorPillActive, { backgroundColor: theme.colors.accent }]} />
              )}
              <Pressable
                onPress={onAdmin}
                style={[
                  styles.utilityButton,
                  currentSection === "admin" && [
                    styles.utilityActive,
                    {
                      backgroundColor: theme.colors.accentSoft,
                      borderColor: theme.colors.accentBorder,
                    },
                  ],
                ]}
                hitSlop={4}
              >
                <Settings size={22} color={currentSection === "admin" ? theme.colors.accent : colors.textMuted} />
              </Pressable>
            </View>
          )}

          {/* ─── GROUP 4: AUTHENTICATED USER AVATAR & PRESENCE DOCK ─── */}
          <View style={[styles.railItemWrapper, { marginTop: 4 }]}>
            {currentSection === "profile" && (
              <View style={[styles.railIndicatorPillActive, { backgroundColor: theme.colors.accent }]} />
            )}
            <Pressable
              onPress={onOpenProfile}
              style={[
                styles.userDockAvatarBtn,
                currentSection === "profile" && [
                  styles.userDockActive,
                  {
                    borderColor: theme.colors.accent,
                    backgroundColor: theme.colors.accentSoft,
                  },
                ],
              ]}
              hitSlop={4}
            >
              {formatAvatarUrl(currentUser?.avatar) ? (
                <Image source={{ uri: formatAvatarUrl(currentUser?.avatar)! }} style={styles.dockAvatarImg} />
              ) : (
                <View style={[styles.dockAvatarFallback, { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accentBorder }]}>
                  <Text style={[styles.dockAvatarLetter, { color: theme.colors.accent }]}>
                    {(currentUser?.displayName || currentUser?.username || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>
              )}
              <View
                style={[
                  styles.presenceDot,
                  {
                    backgroundColor:
                      currentUser?.status === "online"
                        ? colors.statusOnline
                        : currentUser?.status === "idle"
                        ? colors.statusIdle
                        : currentUser?.status === "dnd"
                        ? colors.statusDnd
                        : colors.statusOffline,
                  },
                ]}
              />
            </Pressable>
          </View>
        </View>
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
  selectedChannelId,
  notice,
  canCreateNotice,
  onCreateNotice,
  onSelectChannel,
  onNotice,
  onSearch,
  onAdd,
  onEvents,
  onOpenSettings,
  onOpenDrawer,
  currentUser,
  onOpenProfile,
}: {
  server: Server;
  channels: Channel[];
  selectedChannelId?: string | null;
  notice?: any;
  canCreateNotice: boolean;
  onCreateNotice: () => void;
  onSelectChannel: (channelId: string) => void;
  onNotice: () => void;
  onSearch: () => void;
  onAdd: () => void;
  onEvents: () => void;
  onOpenSettings?: () => void;
  onOpenDrawer?: () => void;
  currentUser?: any;
  onOpenProfile?: () => void;
}) {
  const theme = useAppTheme();
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [memberCount, setMemberCount] = useState<number>(16);
  const [showMembers, setShowMembers] = useState(false);
  const [spaceMembers, setSpaceMembers] = useState<SpaceMemberItem[]>([]);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [initialCategoryForCreate, setInitialCategoryForCreate] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (server?.id) {
      fetchOrgMembers(server.id)
        .then((res) => {
          if (res?.members && res.members.length > 0) {
            setMemberCount(res.members.length);
            const mapped: SpaceMemberItem[] = res.members.map((m: any) => ({
              id: m.id || m.userId,
              name: m.displayName || m.name || m.user?.displayName || "Member",
              avatar: m.avatar || m.avatarUrl || m.user?.avatar,
              role: m.role || m.roleName,
              roleColor: m.roleColor,
              presence: m.status || (m.online ? "online" : "offline"),
              statusText: m.statusText,
            }));
            setSpaceMembers(mapped);
          }
        })
        .catch(() => {});
    }
  }, [server?.id]);

  const toggleCategory = (cat: string) => {
    NativeHaptics.light();
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

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

  function renderChannelIcon(type: Channel["type"], isSelected: boolean) {
    const activeColor = theme.colors.accent;
    const inactiveColor = theme.colors.textMuted;
    switch (type) {
      case "voice": return <Volume2 size={16} color={isSelected ? activeColor : inactiveColor} />;
      case "project": return <FolderKanban size={16} color={isSelected ? activeColor : inactiveColor} />;
      case "board": return <Kanban size={16} color={isSelected ? activeColor : inactiveColor} />;
      case "docs": return <FileText size={16} color={isSelected ? activeColor : inactiveColor} />;
      case "github": return <Github size={16} color={isSelected ? activeColor : inactiveColor} />;
      case "incident": return <AlertTriangle size={16} color={isSelected ? activeColor : theme.colors.danger} />;
      case "canvas": return <Layers size={16} color={isSelected ? activeColor : inactiveColor} />;
      case "stage": return <Radio size={16} color={isSelected ? activeColor : theme.colors.live} />;
      case "announcement": return <Bell size={16} color={isSelected ? activeColor : inactiveColor} />;
      default: return <Hash size={16} color={isSelected ? activeColor : inactiveColor} />;
    }
  }

  const spaceType = (server as any).spaceType || "community";
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
      {/* Rich Discord-Style Space Identity Header & Actions in Unified Glass Capsule */}
      <View style={styles.spaceHeaderCardWrap}>
        <BlurView intensity={35} tint="dark" style={styles.spaceHeaderGlassCard}>
          <LinearGradient
            colors={["rgba(58, 68, 88, 0.46)", "rgba(28, 36, 52, 0.58)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.spaceHeaderGlassGradient}
          >
            <View style={styles.header}>
              <Pressable onPress={onOpenSettings} style={styles.serverTitleRow}>
                <View style={{ flex: 1 }}>
                  <View style={[styles.spaceBadgeCapsule, { borderColor: theme.colors.accentBorder, backgroundColor: theme.colors.accentSoft }]}>
                    <Sparkles size={11} color={theme.colors.accent} />
                    <Text style={[styles.spaceBadgeText, { color: theme.colors.accent }]}>{spaceBadgeLabel}</Text>
                  </View>
                  <Text style={styles.serverName}>{server.name}</Text>
                  <View style={styles.serverMetaRow}>
                    <View style={[styles.communityDot, { backgroundColor: theme.colors.accent }]} />
                    <Text style={styles.serverMemberCount}>
                      {memberCount} {memberCount === 1 ? "Member" : "Members"} • Community
                    </Text>
                  </View>
                </View>
              </Pressable>

              <View style={styles.headerActions}>
                <Pressable
                  onPress={() => {
                    NativeHaptics.selection();
                    setInitialCategoryForCreate(undefined);
                    setShowCreateChannel(true);
                  }}
                  style={[styles.squareButton, { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accentBorder, borderWidth: 1 }]}
                  hitSlop={6}
                >
                  <Plus size={16} color={theme.colors.accent} />
                </Pressable>

                <Pressable onPress={() => setShowMembers(true)} style={styles.squareButton} hitSlop={6}>
                  <Users size={16} color={theme.colors.accent} />
                </Pressable>

                <Pressable onPress={onSearch} style={styles.squareButton} hitSlop={6}>
                  <Search size={16} color={colors.textPrimary} />
                </Pressable>

                {onOpenSettings && (
                  <Pressable onPress={onOpenSettings} style={styles.squareButton} hitSlop={6}>
                    <Settings size={16} color={colors.textSecondary} />
                  </Pressable>
                )}
              </View>
            </View>

            {/* Compact Notice Strip (Accessible, non-dominating) */}
            {notice ? (
              <Pressable onPress={onNotice} style={[styles.noticeBar, { borderColor: theme.colors.accentBorder, backgroundColor: theme.colors.accentSoft }]}>
                <Bell size={14} color={theme.colors.accent} />
                <Text style={styles.noticeTitle} numberOfLines={1}>
                  {notice.title || "Announcement"}
                </Text>
                <ChevronRight size={14} color={colors.textMuted} style={styles.noticeChevron} />
              </Pressable>
            ) : null}
          </LinearGradient>
        </BlurView>
      </View>

      {/* Full-width Categorized Channel List with Collapsible Categories */}
      <ScrollView showsVerticalScrollIndicator={false} style={styles.channelScroll} contentContainerStyle={{ paddingBottom: 80 }}>
        {Object.entries(categories).map(([category, items]) => {
          const isCollapsed = Boolean(collapsedCategories[category]);
          const categoryUnreads = items.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

          return (
            <View key={category} style={styles.categoryBlock}>
              <View style={styles.categoryHeaderContainer}>
                <Pressable
                  onPress={() => toggleCategory(category)}
                  style={styles.categoryHeaderRow}
                  hitSlop={8}
                >
                  <ChevronDown
                    size={12}
                    color={colors.textMuted}
                    style={[styles.categoryChevron, isCollapsed && { transform: [{ rotate: "-90deg" }] }]}
                  />
                  <Text style={styles.categoryTitle}>{category.toUpperCase()}</Text>
                  <Text style={styles.categoryCount}>{items.length}</Text>
                  {categoryUnreads > 0 && isCollapsed && (
                    <View style={[styles.categoryUnreadDot, { backgroundColor: theme.colors.accent }]} />
                  )}
                </Pressable>

                <Pressable
                  onPress={() => {
                    NativeHaptics.selection();
                    setInitialCategoryForCreate(category);
                    setShowCreateChannel(true);
                  }}
                  hitSlop={8}
                >
                  <Plus size={14} color={colors.textMuted} />
                </Pressable>
              </View>

              {!isCollapsed &&
                items.map((channel) => {
                  const hasUnreads = Boolean(channel.unreadCount && channel.unreadCount > 0);
                  const isSelected = channel.id === selectedChannelId;

                  return (
                    <Pressable
                      key={channel.id}
                      onPress={() => onSelectChannel(channel.id)}
                      style={({ pressed }) => [
                        styles.channelRow,
                        isSelected && [
                          styles.channelRowSelected,
                          {
                            backgroundColor: theme.colors.accentSoft,
                            borderColor: theme.colors.accentBorder,
                          },
                        ],
                        pressed && styles.channelRowPressed,
                      ]}
                    >
                      {hasUnreads && <View style={styles.channelUnreadBar} />}
                      {renderChannelIcon(channel.type, isSelected)}
                      <Text
                        style={[
                          styles.channelName,
                          isSelected && [styles.channelNameSelected, { color: theme.colors.accent }],
                          hasUnreads && styles.channelNameUnread,
                          !isSelected && channel.type === "voice" && { color: colors.accentTeal },
                          !isSelected && channel.type === "incident" && { color: colors.danger },
                          !isSelected && channel.type === "github" && { color: colors.accentTeal },
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

                      {hasUnreads && (
                        <View style={[styles.channelUnread, { backgroundColor: theme.colors.accent }]}>
                          <Text style={[styles.unreadText, { color: theme.colors.accentText }]}>{channel.unreadCount}</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
            </View>
          );
        })}
      </ScrollView>

      {/* LIQUID GLASS USER PROFILE DOCK & STATUS CONTROLS */}
      <LiquidUserDock onOpenSettings={onOpenProfile || onOpenSettings || (() => {})} />

      {/* SPACE MEMBERS SHEET */}
      <SpaceMembersSheet
        visible={showMembers}
        onClose={() => setShowMembers(false)}
        spaceName={server.name}
        members={spaceMembers}
        onSelectMember={(m) => {
          setShowMembers(false);
          if (onOpenProfile) onOpenProfile();
        }}
      />

      {/* CREATE CHANNEL MODAL */}
      <CreateChannelModal
        visible={showCreateChannel}
        onClose={() => setShowCreateChannel(false)}
        spaceId={server.id}
        existingCategories={Object.keys(categories)}
        initialCategory={initialCategoryForCreate}
        onCreated={(newCh) => {
          if (newCh?.id) {
            useWorkspaceStore.getState().loadChannelsForSpace(server.id);
            onSelectChannel(newCh.id);
          }
        }}
      />
    </View>
  );
}

/* =========================================================
   TYPE-SPECIFIC CHANNEL ROUTER
   Routes channel.type to dedicated screen without flattening
   ========================================================= */

function ChannelRouter({
  channel,
  availableChannels,
  onSelectChannel,
  messages,
  onBack,
  onSend,
  onToggleReaction,
  onOpenProfile,
  onDeleteMessage,
  currentUserId,
  isAdmin,
}: {
  channel: Channel;
  availableChannels: Channel[];
  onSelectChannel: (channelId: string) => void;
  messages: Message[];
  onBack: () => void;
  onSend: (content: string, replyToId?: string) => Promise<void>;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onOpenProfile?: (user: UserProfileData) => void;
  onDeleteMessage?: (messageId: string) => void;
  currentUserId?: string;
  isAdmin?: boolean;
}) {
  if (channel.type === "voice") {
    return (
      <VoiceChannelView
        channelId={channel.id}
        channelName={channel.name}
        isStage={false}
        onBack={onBack}
      />
    );
  }

  if (channel.type === "stage") {
    return (
      <VoiceChannelView
        channelId={channel.id}
        channelName={channel.name}
        isStage={true}
        onBack={onBack}
      />
    );
  }

  return (
    <TextChannelScreen
      channel={channel}
      availableChannels={availableChannels}
      onSelectChannel={onSelectChannel}
      messages={messages}
      onBack={onBack}
      onSend={onSend}
      onToggleReaction={onToggleReaction}
      onOpenProfile={onOpenProfile}
      onDeleteMessage={onDeleteMessage}
      currentUserId={currentUserId}
      isAdmin={isAdmin}
    />
  );
}

/* =========================================================
   STANDARD TEXT CHANNEL SCREEN
   ========================================================= */

function TextChannelScreen({
  channel,
  availableChannels,
  onSelectChannel,
  messages,
  onBack,
  onSend,
  onToggleReaction,
  onOpenProfile,
  onDeleteMessage,
  currentUserId,
  isAdmin,
}: {
  channel: Channel;
  availableChannels: Channel[];
  onSelectChannel: (channelId: string) => void;
  messages: Message[];
  onBack: () => void;
  onSend: (content: string, replyToId?: string) => Promise<void>;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onOpenProfile?: (user: UserProfileData) => void;
  onDeleteMessage?: (messageId: string) => void;
  currentUserId?: string;
  isAdmin?: boolean;
}) {
  const theme = useAppTheme();
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [activeThreadMessage, setActiveThreadMessage] = useState<Message | null>(null);
  const channelType = (channel.type as string) || "";
  const isSpecialized =
    channelType === "github" ||
    channelType === "board" ||
    channelType === "project" ||
    channelType === "docs" ||
    channelType === "incident" ||
    channelType === "canvas" ||
    channelType === "notebook" ||
    channel.name.toLowerCase().includes("notebook") ||
    channel.name.toLowerCase().includes("jupyter");

  const [activeTab, setActiveTab] = useState<"tool" | "chat">(
    isSpecialized ? "tool" : "chat"
  );

  useEffect(() => {
    setActiveTab(isSpecialized ? "tool" : "chat");
  }, [channel.id, isSpecialized]);
  const [showChannelMembers, setShowChannelMembers] = useState(false);
  const [channelMembers, setChannelMembers] = useState<SpaceMemberItem[]>([]);
  const [channelOptionsOpen, setChannelOptionsOpen] = useState(false);
  const [channelPickerOpen, setChannelPickerOpen] = useState(false);
  const [channelThemeOpen, setChannelThemeOpen] = useState(false);
  const [channelTool, setChannelTool] = useState<"pins" | "search" | "mentions" | "insight" | null>(null);
  const [channelSearch, setChannelSearch] = useState("");
  const [channelSearchResults, setChannelSearchResults] = useState<any[]>([]);
  const [channelPins, setChannelPins] = useState<any[]>([]);
  const [channelInsight, setChannelInsight] = useState("");
  const [channelToolLoading, setChannelToolLoading] = useState(false);
  const [channelNotifications, setChannelNotifications] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    const onShow = (e: any) => {
      const height = e?.endCoordinates?.height || 0;
      if (Platform.OS === "android") {
        setKeyboardOffset(height);
      }
    };
    const onHide = () => {
      if (Platform.OS === "android") {
        setKeyboardOffset(0);
      }
    };

    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      onShow
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      onHide
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const openChannelTool = async (tool: "pins" | "search" | "mentions" | "insight") => {
    setChannelOptionsOpen(false);
    setChannelTool(tool);
    if (tool === "pins") {
      setChannelToolLoading(true);
      try {
        const result = await api<{ pins: any[] }>(`/channels/${channel.id}/pins`);
        setChannelPins(result.pins || []);
      } catch (error) {
        notificationService.show({ title: "Pinned messages", body: error instanceof Error ? error.message : "Unable to load pinned messages.", type: "warning" });
      } finally {
        setChannelToolLoading(false);
      }
    }
    if (tool === "insight") {
      setChannelToolLoading(true);
      try {
        const history = await fetchChannelMessages(channel.id, 100);
        const previous = (history.messages || []).slice().reverse();
        const usable = previous
          .map((message: any) => String(message.content || "").replace(/\s+/g, " ").trim())
          .filter(Boolean);
        if (!usable.length) {
          setChannelInsight("There are no messages to summarize yet.");
        } else {
          const recent = usable.slice(-8);
          const topics = Array.from(new Set(
            recent.join(" ").toLowerCase().match(/\b[a-z][a-z0-9-]{4,}\b/g) || []
          )).slice(0, 6);
          setChannelInsight(
            `This channel has ${usable.length} messages. The latest discussion focuses on ${topics.length ? topics.join(", ") : "the recent conversation"}. Recent context: ${recent.slice(-3).join(" • ")}`
          );
        }
      } catch (error) {
        setChannelInsight(error instanceof Error ? error.message : "Unable to analyze this channel right now.");
      } finally {
        setChannelToolLoading(false);
      }
    }
  };

  const runChannelSearch = async () => {
    const query = channelSearch.trim();
    if (query.length < 2) return;
    setChannelToolLoading(true);
    try {
      const result = await api<{ results: any[] }>(`/channels/${channel.id}/messages/search?q=${encodeURIComponent(query)}`);
      setChannelSearchResults(result.results || []);
    } catch (error) {
      notificationService.show({ title: "Channel search", body: error instanceof Error ? error.message : "Unable to search this channel.", type: "warning" });
    } finally {
      setChannelToolLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgMembers(channel.serverId)
      .then((res) => {
        const members = (res?.members || []).map((member: any) => ({
          id: member.id,
          name: member.displayName || member.username || "Member",
          avatar: member.avatar || member.avatarUrl || null,
          role: member.role || "Member",
          roleColor: member.roleColor,
          presence: member.presence || member.status || "offline",
          statusText: member.statusText,
        }));
        setChannelMembers(members);
      })
      .catch(() => setChannelMembers([]));
  }, [channel.serverId]);

  return (
    <View style={styles.channelScreen}>
      {/* Ambient Color Glows for Liquid Glass Refraction */}
      <View style={styles.ambientGlowAmber} pointerEvents="none" />
      <View style={styles.ambientGlowTeal} pointerEvents="none" />
      <View style={styles.ambientGlowPurple} pointerEvents="none" />

      {/* Floating liquid-glass channel header */}
      <View style={[styles.headerCapsuleWrap, styles.channelHeaderWrap]}>
        <View style={[styles.headerCapsule, styles.channelHeaderCapsule]}>
          {/* Back */}
          <GlassBackButton
            onPress={onBack}
            size={48}
            iconSize={23}
            style={{ borderRadius: 24 }}
          />

          {/* Channel pill */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Channel ${channel.name}`}
            onPress={() => setChannelPickerOpen(true)}
            style={({ pressed }) => [
              styles.channelHeaderPill,
              pressed && styles.channelHeaderPillPressed,
            ]}
          >
            <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFillObject} />
            <View style={styles.channelPillHighlight} />
            <Hash size={24} color={colors.accentTeal} />
            <Text style={styles.channelHeaderName} numberOfLines={1}>
              {channel.name}
            </Text>
            <ChevronDown size={20} color="#F0EEF5" />
          </Pressable>

          {/* Specialized channel tab switcher intentionally hidden. */}
          {false && isSpecialized && (
            <View style={styles.channelViewToggleWrap}>
              <Pressable
                onPress={() => setActiveTab("tool")}
                style={[
                  styles.channelViewToggleBtn,
                  activeTab === "tool" && styles.channelViewToggleBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.channelViewToggleText,
                    activeTab === "tool" && styles.channelViewToggleTextActive,
                  ]}
                >
                  {channel.type === "github"
                    ? "HUB"
                    : channel.type === "board" || channel.type === "project"
                    ? "BOARD"
                    : channel.type === "docs"
                    ? "DOCS"
                    : channel.type === "incident"
                    ? "INCIDENT"
                    : "CANVAS"}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setActiveTab("chat")}
                style={[
                  styles.channelViewToggleBtn,
                  activeTab === "chat" && styles.channelViewToggleBtnActive,
                ]}
              >
                <MessageSquare size={13} color={activeTab === "chat" ? colors.accent : colors.textMuted} />
                <Text
                  style={[
                    styles.channelViewToggleText,
                    activeTab === "chat" && styles.channelViewToggleTextActive,
                  ]}
                >
                  CHAT
                </Text>
              </Pressable>
            </View>
          )}

          {/* Right actions */}
          <View style={styles.channelCapsuleActions}>
            {/* Refresh */}
            <RoundIconButton
              onPress={() => {
                NativeHaptics.light();
                setShowChannelMembers(true);
              }}
              size={46}
              hitSlop={6}
            >
              <Users size={18} color={colors.textSecondary} />
            </RoundIconButton>

            {/* More options */}
            <RoundIconButton
              onPress={() => {
                NativeHaptics.light();
                setChannelOptionsOpen(true);
              }}
              size={46}
              hitSlop={6}
            >
              <MoreHorizontal size={18} color={colors.textSecondary} />
            </RoundIconButton>
          </View>
        </View>
      </View>

      <SpaceMembersSheet
        visible={showChannelMembers}
        onClose={() => setShowChannelMembers(false)}
        spaceName="Space Members"
        members={channelMembers}
      />

      <Modal visible={channelPickerOpen} transparent animationType="fade" onRequestClose={() => setChannelPickerOpen(false)}>
        <Pressable style={styles.channelOptionsBackdrop} onPress={() => setChannelPickerOpen(false)}>
          <Pressable
            style={[styles.channelPickerSheet, { backgroundColor: `${theme.colors.surface}E8`, borderColor: theme.colors.accentBorder }]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.channelOptionsHandle} />
            <Text style={styles.channelOptionsTitle}>Channels</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {availableChannels.map((item) => (
                <Pressable
                  key={item.id}
                  style={[styles.channelPickerRow, item.id === channel.id && { backgroundColor: theme.colors.accentSoft }]}
                  onPress={() => {
                    setChannelPickerOpen(false);
                    if (item.id !== channel.id) onSelectChannel(item.id);
                  }}
                >
                  <Hash size={19} color={item.id === channel.id ? theme.colors.accent : colors.textMuted} />
                  <Text style={[styles.channelPickerText, item.id === channel.id && { color: theme.colors.accent }]} numberOfLines={1}>{item.name}</Text>
                  {item.id === channel.id && <Text style={[styles.channelPickerCurrent, { color: theme.colors.accent }]}>Current</Text>}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={channelOptionsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setChannelOptionsOpen(false)}
      >
        <Pressable style={styles.channelOptionsBackdrop} onPress={() => setChannelOptionsOpen(false)}>
          <Pressable
            style={[styles.channelOptionsSheet, { backgroundColor: `${theme.colors.surface}A6`, borderColor: theme.colors.accentBorder }]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.channelOptionsHandle} />
            <Text style={styles.channelOptionsTitle}>#{channel.name}</Text>
            {[
              { label: "Notifications", icon: Bell, onPress: () => {
                setChannelNotifications((enabled) => {
                  const next = !enabled;
                  notificationService.show({ title: "Channel notifications", body: next ? `Notifications enabled for #${channel.name}.` : `Notifications muted for #${channel.name}.`, type: "success" });
                  return next;
                });
                setChannelOptionsOpen(false);
              } },
              { label: "Pinned Messages", icon: Pin, onPress: () => openChannelTool("pins") },
              { label: "Search Channel", icon: Search, onPress: () => openChannelTool("search") },
              { label: "Mentions", icon: AtSign, onPress: () => openChannelTool("mentions") },
              { label: "AI Insight", icon: Sparkles, onPress: () => openChannelTool("insight") },
            ].map(({ label, icon: Icon, onPress }) => (
              <Pressable
                key={label}
                style={[styles.channelOptionRow, { backgroundColor: theme.colors.accentSoft }]}
                onPress={onPress}
              >
                <Icon size={19} color={theme.colors.accent} />
                <Text style={styles.channelOptionText}>{label}{label === "Notifications" && (channelNotifications ? " · On" : " · Off")}</Text>
                <ChevronRight size={17} color={colors.textMuted} />
              </Pressable>
            ))}
            <Pressable
              style={[styles.channelOptionRow, { backgroundColor: theme.colors.accentSoft }]}
              onPress={() => {
                setChannelOptionsOpen(false);
                setChannelThemeOpen(true);
              }}
            >
              <Palette size={19} color={theme.colors.accent} />
              <Text style={styles.channelOptionText}>Theme</Text>
              <ChevronRight size={17} color={colors.textMuted} />
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <ThemeCustomizerModal
        visible={channelThemeOpen}
        onClose={() => setChannelThemeOpen(false)}
      />

      <Modal visible={channelTool !== null} transparent animationType="fade" onRequestClose={() => setChannelTool(null)}>
        <Pressable style={styles.channelOptionsBackdrop} onPress={() => setChannelTool(null)}>
          <Pressable
            style={[styles.channelToolSheet, { backgroundColor: `${theme.colors.surface}E8`, borderColor: theme.colors.accentBorder }]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.channelOptionsHandle} />
            <View style={styles.channelToolHeader}>
              <Text style={styles.channelOptionsTitle}>
                {channelTool === "pins" ? "Pinned Messages" : channelTool === "search" ? "Search Channel" : channelTool === "mentions" ? "Mentions" : "AI Insight"}
              </Text>
              <Pressable onPress={() => setChannelTool(null)}><Text style={[styles.channelToolClose, { color: theme.colors.accent }]}>Done</Text></Pressable>
            </View>

            {channelTool === "search" && (
              <View>
                <View style={[styles.channelSearchRow, { borderColor: theme.colors.accentBorder }]}>
                  <Search size={18} color={theme.colors.accent} />
                  <TextInput value={channelSearch} onChangeText={setChannelSearch} onSubmitEditing={runChannelSearch} placeholder="Search messages" placeholderTextColor={colors.textMuted} style={styles.channelSearchInput} returnKeyType="search" />
                  <Pressable onPress={runChannelSearch}><Text style={[styles.channelToolAction, { color: theme.colors.accent }]}>Search</Text></Pressable>
                </View>
                <ScrollView style={styles.channelToolList} keyboardShouldPersistTaps="handled">
                  {channelToolLoading ? <ActivityIndicator color={theme.colors.accent} /> : channelSearchResults.length ? channelSearchResults.map((item) => <View key={item.id} style={[styles.channelToolItem, { borderColor: theme.colors.accentBorder }]}><Text style={styles.channelToolMeta}>{item.author?.displayName || item.author?.username || "Member"}</Text><Text style={styles.channelToolBody}>{item.content}</Text></View>) : <Text style={styles.channelToolEmpty}>Search for at least two characters to find messages.</Text>}
                </ScrollView>
              </View>
            )}
            {channelTool === "pins" && <ScrollView style={styles.channelToolList}>{channelToolLoading ? <ActivityIndicator color={theme.colors.accent} /> : channelPins.length ? channelPins.map((item) => <View key={item.id} style={[styles.channelToolItem, { borderColor: theme.colors.accentBorder }]}><Text style={styles.channelToolMeta}>{item.message?.author?.displayName || "Member"}</Text><Text style={styles.channelToolBody}>{item.message?.content || "Pinned message"}</Text></View>) : <Text style={styles.channelToolEmpty}>No messages are pinned in this channel.</Text>}</ScrollView>}
            {channelTool === "mentions" && <ScrollView style={styles.channelToolList}>{messages.filter((item) => /(^|\s)@[\w-]+/.test(item.content)).map((item) => <View key={item.id} style={[styles.channelToolItem, { borderColor: theme.colors.accentBorder }]}><Text style={styles.channelToolMeta}>{item.user.displayName}</Text><Text style={styles.channelToolBody}>{item.content}</Text></View>)}{!messages.some((item) => /(^|\s)@[\w-]+/.test(item.content)) && <Text style={styles.channelToolEmpty}>No mentions were found in the loaded messages.</Text>}</ScrollView>}
            {channelTool === "insight" && <ScrollView style={styles.channelToolList}>{channelToolLoading ? <ActivityIndicator color={theme.colors.accent} /> : <Text style={styles.channelInsightText}>{channelInsight}</Text>}</ScrollView>}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Render Specialized Tool View or Chat Stream */}
      {isSpecialized && activeTab === "tool" ? (
        channel.type === "github" ? (
          <GitHubChannelView
            channelId={channel.id}
            channelName={channel.name}
            onOpenChat={() => setActiveTab("chat")}
          />
        ) : channel.type === "board" || channel.type === "project" ? (
          <BoardChannelView
            channelId={channel.id}
            channelName={channel.name}
            onBack={() => setActiveTab("chat")}
          />
        ) : channel.type === "docs" ? (
          <DocsChannelView
            channelId={channel.id}
            channelName={channel.name}
            onBack={() => setActiveTab("chat")}
          />
        ) : channel.type === "incident" ? (
          <IncidentChannelView
            channelId={channel.id}
            channelName={channel.name}
            onBack={() => setActiveTab("chat")}
          />
        ) : channelType === "notebook" || channel.name.toLowerCase().includes("notebook") || channel.name.toLowerCase().includes("jupyter") ? (
          <NotebookChannelView
            channelId={channel.id}
            channelName={channel.name}
            onBack={() => setActiveTab("chat")}
          />
        ) : (
          <CanvasChannelView
            channelId={channel.id}
            channelName={channel.name}
            onBack={() => setActiveTab("chat")}
          />
        )
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
          style={[
            { flex: 1 },
            Platform.OS === "android" && {
              paddingBottom: keyboardOffset > 0 ? keyboardOffset + 14 : 0,
            },
          ]}
        >
          {/* Message Feed with interactive reactions, replies and delete */}
          <NativeMessageList
            messages={messages}
            onToggleReaction={onToggleReaction}
            onReply={(msg) => setReplyingTo(msg)}
            onOpenProfile={onOpenProfile}
            onOpenThread={(msg) => setActiveThreadMessage(msg)}
            onDeleteMessage={onDeleteMessage}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
          />

          {/* WhatsApp-Style Floating Message Composer */}
          <MessageComposer
            channelName={channel.name}
            onSend={onSend}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
          />

          {/* Dedicated Isolated Thread Modal Sheet */}
          <MobileThreadModal
            visible={Boolean(activeThreadMessage)}
            parentMessage={activeThreadMessage as any}
            channelId={channel.id}
            currentUserId={currentUserId}
            onClose={() => setActiveThreadMessage(null)}
            onToggleReaction={onToggleReaction}
          />
        </KeyboardAvoidingView>
      )}
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
        hour12: false,
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

function NativeMessageList({
  messages,
  onToggleReaction,
  onReply,
  onOpenProfile,
  onOpenThread,
  onDeleteMessage,
  currentUserId,
  isAdmin,
}: {
  messages: Message[];
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onReply?: (message: Message) => void;
  onOpenProfile?: (user: UserProfileData) => void;
  onOpenThread?: (message: Message) => void;
  onDeleteMessage?: (messageId: string) => void;
  currentUserId?: string;
  isAdmin?: boolean;
}) {
  const theme = useAppTheme();
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [heartPoppingId, setHeartPoppingId] = useState<string | null>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const lastTapTime = useRef<{ [msgId: string]: number }>({});
  const flatListRef = useRef<FlatList<Message>>(null);

  const handleMessagePress = (item: Message) => {
    const now = Date.now();
    const lastTime = lastTapTime.current[item.id] || 0;
    if (now - lastTime < 320) {
      // Double-tap reaction triggered!
      lastTapTime.current[item.id] = 0;
      NativeHaptics.success();
      setHeartPoppingId(item.id);
      onToggleReaction?.(item.id, "❤️");
      setTimeout(() => {
        setHeartPoppingId((curr) => (curr === item.id ? null : curr));
      }, 700);
    } else {
      lastTapTime.current[item.id] = now;
    }
  };

  const handleJumpToMessage = (targetId: string) => {
    const targetIndex = messages.findIndex((m) => m.id === targetId);
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

  const quickEmojis = ["👍", "🔥", "🚀", "❤️", "👀", "🎉", "🧠", "💯"];

  return (
    <>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        style={styles.messages}
        contentContainerStyle={styles.messageContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        scrollEventThrottle={16}
        onScroll={(event) => {
          const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
          const distanceFromLatest = contentSize.height - (contentOffset.y + layoutMeasurement.height);
          setShowJumpToLatest(distanceFromLatest > 180);
        }}
        onScrollToIndexFailed={(info) => {
          flatListRef.current?.scrollToOffset({
            offset: info.averageItemLength * info.index,
            animated: true,
          });
        }}
        renderItem={({ item, index }) => {
          const { cleanText, attachments } = parseMessageAttachments(item.content || "");
          const stickerOnly = attachments.length === 1 && attachments[0].kind === "sticker" && !cleanText;
          const isBot = Boolean(
            item.user?.displayName?.toLowerCase().includes("bot") ||
            item.user?.displayName?.toLowerCase().includes("ai") ||
            item.user?.displayName?.toLowerCase().includes("corvus") ||
            item.user?.id === "00000000-0000-0000-0000-000000000001"
          );
          const isOwnMessage =
            !isBot &&
            Boolean(
              (currentUserId && item.user?.id === currentUserId) ||
              item.user?.id === "me"
            );
          const userAvatarUrl = formatAvatarUrl(item.user?.avatarUrl);

          const prevItem = index > 0 ? messages[index - 1] : null;
          const isConsecutive = Boolean(
            prevItem &&
            prevItem.user?.id === item.user?.id &&
            !item.replyTo &&
            !item.attachment &&
            Math.abs(new Date(item.createdAt).getTime() - new Date(prevItem.createdAt).getTime()) < 300000
          );

          const isHighlighted = item.id === highlightedMessageId;

          // Resolve reply author name cleanly
          let replyAuthorName = "Member";
          if (item.replyTo) {
            if (item.replyTo.authorId && item.replyTo.authorId === currentUserId) {
              replyAuthorName = "You";
            } else if (item.replyTo.authorName) {
              replyAuthorName = item.replyTo.authorName;
            } else {
              const orig = messages.find((m) => m.id === item.replyTo?.id);
              if (orig) {
                replyAuthorName = orig.user?.id === currentUserId ? "You" : orig.user?.displayName || "Member";
              }
            }
          }

          return (
            <SwipeableMessageRow
              timestamp={item.createdAt}
              onSwipeReply={() => onReply?.(item)}
            >
              <View
                style={[
                  styles.messageItemContainer,
                  isConsecutive && styles.messageItemConsecutive,
                  isHighlighted && styles.messageItemHighlighted,
                ]}
              >
                {/* Quoted reply header if message is a reply to another message */}
                {item.replyTo && (
                  <Pressable
                    onPress={() => item.replyTo?.id && handleJumpToMessage(item.replyTo.id)}
                    style={[styles.messageReplyHeader, { borderLeftColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft }]}
                    hitSlop={4}
                  >
                    <CornerUpLeft size={12} color={theme.colors.accent} />
                    <Text style={[styles.messageReplyAuthor, { color: theme.colors.accent }]}>{replyAuthorName}:</Text>
                    <Text style={styles.messageReplySnippet} numberOfLines={1}>
                      {parseMessageAttachments(item.replyTo.text || "").cleanText || "Attachment"}
                    </Text>
                  </Pressable>
                )}

                <View
                  style={[
                    styles.messageRowWrapper,
                    isOwnMessage && styles.messageRowWrapperOwn,
                  ]}
                >
                  {!isOwnMessage && !isConsecutive && (
                    <Pressable
                      onPress={() => {
                        fetchUserProfile(item.user.id).then((res) => onOpenProfile?.(res.user)).catch(() => onOpenProfile?.({
                          id: item.user.id,
                          displayName: item.user.displayName,
                          username: item.user.displayName.toLowerCase().replace(/\s+/g, ""),
                          avatarUrl: item.user.avatarUrl,
                          status: "online",
                        }));
                      }}
                      hitSlop={6}
                      style={styles.avatarGlowContainer}
                    >
                      {userAvatarUrl ? (
                        <Image source={{ uri: userAvatarUrl }} style={styles.messageAvatar} />
                      ) : (
                        <View style={styles.messageAvatarFallback}>
                          <Text style={styles.avatarLetter}>
                            {(item.user?.displayName || "U").charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  )}

                  {/* Empty avatar spacer for consecutive non-own messages */}
                  {!isOwnMessage && isConsecutive && (
                    <View style={styles.avatarConsecutiveSpacer} />
                  )}

                  <View style={[styles.messageContentColumn, isOwnMessage && styles.messageContentColumnOwn]}>
                    {/* Floating Author Metadata Line (omitted for consecutive messages) */}
                    {!isConsecutive && (
                      <View style={[styles.messageHeader, isOwnMessage && { justifyContent: "flex-end" }]}>
                        <Text
                          style={[
                            styles.displayName,
                            {
                              color:
                                isBot
                                  ? "#818CF8"
                                  : isOwnMessage
                                  ? "rgba(243, 197, 107, 0.9)"
                                  : item.user?.roleColor || colors.textPrimary,
                            },
                          ]}
                        >
                          {isOwnMessage ? "You" : item.user?.displayName || "Member"}
                        </Text>

                        {isBot && (
                          <View style={styles.botBadge}>
                            <Sparkles size={9} color="#818CF8" style={{ marginRight: 3 }} />
                            <Text style={styles.botBadgeText}>AI</Text>
                          </View>
                        )}

                      </View>
                    )}

                    {/* Clean Fluid Message Body */}
                    <Pressable
                      delayLongPress={150}
                      onPress={() => handleMessagePress(item)}
                      onLongPress={() => {
                        NativeHaptics.medium();
                        setSelectedMessage(item);
                        setActionMenuOpen(true);
                      }}
                      style={({ pressed }) => [
                        styles.visionGlassBubble,
                        stickerOnly && styles.stickerOnlyBubble,
                        isOwnMessage
                          ? styles.visionGlassBubbleOwn
                          : isBot
                          ? styles.visionGlassBubbleBot
                          : styles.visionGlassBubbleOther,
                        pressed && styles.visionGlassBubblePressed,
                      ]}
                    >
                      {/* Instagram-style floating double-tap heart burst */}
                      <DoubleTapHeartOverlay visible={heartPoppingId === item.id} />

                      {/* Rich Markdown & LaTeX Message Body */}
                      {cleanText ? (
                        <RichMarkdown
                          content={cleanText}
                          textColor={isOwnMessage ? "#FFFFFF" : colors.textPrimary}
                          fontSize={14}
                        />
                      ) : null}

                      {/* AI Compact Action Bar */}
                      {isBot && cleanText ? (
                        <View style={styles.aiActionBar}>
                          <Pressable
                            onPress={async () => {
                              await Clipboard.setStringAsync(cleanText);
                              NativeHaptics.success();
                            }}
                            style={styles.aiActionBtn}
                            hitSlop={6}
                          >
                            <Copy size={11} color={colors.textMuted} />
                            <Text style={styles.aiActionText}>Copy</Text>
                          </Pressable>
                        </View>
                      ) : null}

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

                      {/* Dedicated Thread Indicator Badge if message has a thread */}
                      {Boolean((item.threadReplyCount && item.threadReplyCount > 0) || (item.thread && item.thread.messageCount > 0)) && (
                        <Pressable
                          onPress={() => onOpenThread?.(item)}
                          style={styles.threadIndicatorBadge}
                          hitSlop={6}
                        >
                          <MessagesSquare size={13} color={colors.accent} />
                          <Text style={styles.threadIndicatorText}>
                            {item.threadReplyCount || item.thread?.messageCount}{" "}
                            {(item.threadReplyCount || item.thread?.messageCount) === 1 ? "thread reply" : "thread replies"} • View Thread
                          </Text>
                        </Pressable>
                      )}
                    </Pressable>
                  </View>
                </View>

                {/* Reaction Pills & Add Reaction Button */}
                {item.reactions && item.reactions.length > 0 && (
                  <View style={[styles.reactions, isOwnMessage && { justifyContent: "flex-end" }]}>
                    {item.reactions.map((reaction) => (
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
                )}
              </View>
            </SwipeableMessageRow>
          );
        }}
      />

      {showJumpToLatest && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Jump to latest messages"
          onPress={() => {
            flatListRef.current?.scrollToEnd({ animated: true });
            NativeHaptics.light();
          }}
          style={[styles.jumpToLatestButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.accentBorder }]}
        >
          <ChevronDown size={20} color={theme.colors.accent} />
        </Pressable>
      )}

      {/* Message Action & Reaction Modal */}
      <Modal visible={actionMenuOpen} transparent animationType="fade" onRequestClose={() => setActionMenuOpen(false)}>
        <Pressable style={styles.actionModalBackdrop} onPress={() => setActionMenuOpen(false)}>
          <BlurView intensity={Platform.OS === "ios" ? 45 : 30} tint="dark" style={StyleSheet.absoluteFill} />
        </Pressable>

        <View style={styles.actionModalSheetWrapper} pointerEvents="box-none">
          <View style={styles.actionModalSheet}>
            <BlurView intensity={Platform.OS === "ios" ? 50 : 35} tint="dark" style={StyleSheet.absoluteFill} />
            <LinearGradient
              colors={["rgba(255, 255, 255, 0.08)", "rgba(255, 255, 255, 0.01)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
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

            <View style={{ gap: 8 }}>
              <Pressable
                style={styles.actionMenuRow}
                onPress={() => {
                  if (selectedMessage) {
                    onOpenThread?.(selectedMessage);
                  }
                  setActionMenuOpen(false);
                }}
              >
                <MessagesSquare size={16} color={colors.accent} />
                <Text style={styles.actionMenuText}>
                  {selectedMessage && (selectedMessage.threadReplyCount || selectedMessage.thread?.messageCount || 0) > 0
                    ? `Open Thread (${
                        selectedMessage.threadReplyCount || selectedMessage.thread?.messageCount
                      } replies)`
                    : "Start Thread"}
                </Text>
              </Pressable>

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

              <Pressable
                style={styles.actionMenuRow}
                onPress={async () => {
                  if (selectedMessage) {
                    const textToCopy = parseMessageAttachments(selectedMessage.content || "").cleanText;
                    await Clipboard.setStringAsync(textToCopy);
                    NativeHaptics.success();
                  }
                  setActionMenuOpen(false);
                }}
              >
                <Copy size={16} color={colors.textMuted} />
                <Text style={styles.actionMenuText}>Copy Message</Text>
              </Pressable>

              {/* Delete Message Button (Author or Admin Only) */}
              {selectedMessage &&
                (selectedMessage.user.id === currentUserId ||
                  selectedMessage.user.id === "me" ||
                  isAdmin) && (
                  <Pressable
                    style={[styles.actionMenuRow, styles.actionDeleteRow]}
                    onPress={() => {
                      const msgId = selectedMessage.id;
                      setActionMenuOpen(false);
                      Alert.alert(
                        "Delete Message",
                        "Are you sure you want to delete this message permanently?",
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Delete",
                            style: "destructive",
                            onPress: () => onDeleteMessage?.(msgId),
                          },
                        ]
                      );
                    }}
                  >
                    <Trash2 size={16} color={colors.danger} />
                    <Text style={[styles.actionMenuText, { color: colors.danger }]}>Delete Message</Text>
                  </Pressable>
                )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

/* =========================================================
   WHATSAPP-STYLE MESSAGE COMPOSER
   ========================================================= */

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
  const theme = useAppTheme();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [attachSheetOpen, setAttachSheetOpen] = useState(false);
  const [expressionSheetOpen, setExpressionSheetOpen] = useState(false);
  const [expressionTab, setExpressionTab] = useState<ExpressionTab>("emoji");
  const [stagedAttachment, setStagedAttachment] = useState<{
    url: string;
    name: string;
    type?: string;
    kind?: "image" | "video" | "file" | "gif" | "audio";
    size?: number | string;
    duration?: string;
  } | null>(null);

  const {
    isRecording,
    durationSec,
    formattedDuration,
    metering,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useVoiceRecorder();

  const hasContent = text.trim().length > 0 || stagedAttachment !== null;

  async function send() {
    const rawText = text.trim();
    if ((!rawText && !stagedAttachment) || sending) return;

    setSending(true);
    try {
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
      await onSend(finalContent, replyingTo?.id);
      setText("");
      setStagedAttachment(null);
      onCancelReply?.();
    } finally {
      setSending(false);
    }
  }

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
      await onSend(attPayload);
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
      await onSend(attPayload);
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
      await onSend(attPayload);
    } catch (err) {
      console.error("Failed to send meme:", err);
    }
  };

  const handlePressInAction = () => {
    if (!hasContent) {
      startRecording();
    }
  };

  const handlePressOutAction = async () => {
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
        const finalContent = text.trim() ? `${text.trim()}\n${attPayload}` : attPayload;
        await onSend(finalContent, replyingTo?.id);
        setText("");
        setStagedAttachment(null);
        onCancelReply?.();
      }
    }
  };

  return (
    <View style={styles.composerWrapper}>
      {replyingTo && (
        <View style={[styles.replyBanner, { borderColor: theme.colors.accentBorder, backgroundColor: theme.colors.accentSoft }]}>
          <CornerUpLeft size={13} color={theme.colors.accent} />
          <Text style={styles.replyBannerText} numberOfLines={1}>
            Replying to <Text style={{ fontWeight: "700", color: colors.textPrimary }}>{replyingTo.user.displayName}</Text>: {replyingTo.content}
          </Text>
          <Pressable onPress={onCancelReply} hitSlop={8}>
            <X size={14} color={colors.textMuted} />
          </Pressable>
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
          <Pressable onPress={() => setStagedAttachment(null)} hitSlop={8}>
            <X size={14} color={colors.textMuted} />
          </Pressable>
        </View>
      )}

      {/* Floating Liquid Glass Composer Bar (Matching DM Screen) */}
      <View style={styles.composerRow}>
        <BlurView
          intensity={35}
          tint="dark"
          style={[styles.composerPill, { borderColor: theme.colors.accentBorder }]}
        >
          <LinearGradient
            colors={["rgba(255, 255, 255, 0.08)", "rgba(255, 255, 255, 0.02)"]}
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
              <Pressable
                onPress={cancelRecording}
                style={styles.cancelRecordButton}
                hitSlop={8}
              >
                <Trash2 size={16} color="#FF5555" />
                <Text style={styles.cancelRecordText}>Cancel</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Emoji button inside left of pill */}
              <Pressable
                onPress={() => {
                  NativeHaptics.light();
                  setExpressionTab("emoji");
                  setExpressionSheetOpen(true);
                }}
                style={styles.pillIconBtn}
                hitSlop={8}
              >
                <Smile size={21} color={theme.colors.textMuted} />
              </Pressable>

              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={`Message #${channelName}...`}
                placeholderTextColor={theme.colors.textMuted}
                style={[styles.composerInput, { color: theme.colors.textPrimary }]}
                multiline
              />

              {/* Attachment Paperclip button inside right of pill */}
              <Pressable
                onPress={() => {
                  NativeHaptics.light();
                  setAttachSheetOpen(true);
                }}
                style={styles.pillIconBtn}
                hitSlop={8}
              >
                <Paperclip size={20} color={theme.colors.textMuted} />
              </Pressable>

              <Pressable
                onPress={() => {
                  NativeHaptics.light();
                  setAttachSheetOpen(true);
                }}
                style={styles.pillIconBtn}
                hitSlop={8}
              >
                <Camera size={20} color={theme.colors.textMuted} />
              </Pressable>

              {/* GIF / Expression badge button inside right of pill */}
              <Pressable
                onPress={() => {
                  NativeHaptics.light();
                  setExpressionTab("gifs");
                  setExpressionSheetOpen(true);
                }}
                style={styles.gifBadgeBtn}
                hitSlop={8}
              >
                <View style={styles.gifBadge}>
                  <Text style={styles.gifBadgeText}>GIF</Text>
                </View>
              </Pressable>
            </>
          )}
        </BlurView>

        {/* Detached Action Button */}
        <Pressable
          onPressIn={handlePressInAction}
          onPressOut={handlePressOutAction}
          onPress={() => {
            if (hasContent) {
              send();
            } else if (!isRecording) {
              NativeHaptics.selection();
              notificationService.show({
                title: "Voice Note",
                body: "Hold mic to record audio message.",
                type: "info",
              });
            }
          }}
          disabled={sending}
          style={[
            styles.detachedActionButton,
            { backgroundColor: `${theme.colors.surface}CC`, borderColor: theme.colors.accentBorder },
            hasContent && [styles.detachedActionButtonActive, { backgroundColor: theme.colors.accent }],
            isRecording && styles.detachedActionButtonRecording,
          ]}
          hitSlop={6}
        >
          {sending ? (
            <ActivityIndicator color={theme.colors.accentText} size="small" />
          ) : hasContent ? (
            <Send size={18} color={theme.colors.accentText} />
          ) : (
            <Mic size={20} color={isRecording ? "#FFFFFF" : theme.colors.accent} />
          )}
        </Pressable>
      </View>

      {/* Pickers & Modals */}
      <MobileAttachmentSheet
        visible={attachSheetOpen}
        onClose={() => setAttachSheetOpen(false)}
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

      {/* Unified Expression Bottom Sheet (GIFs, Stickers, Memes, Emojis) */}
      <ExpressionSheet
        visible={expressionSheetOpen}
        initialTab={expressionTab}
        onClose={() => setExpressionSheetOpen(false)}
        onSelectEmoji={(emoji) => {
          setText((prev) => prev + emoji);
        }}
        onSelectGif={handleSelectGif}
        onSelectSticker={handleSelectSticker}
        onSelectMeme={handleSelectMeme}
      />
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
  const theme = useAppTheme();
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
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <BlurView intensity={Platform.OS === "ios" ? 25 : 15} tint="dark" style={StyleSheet.absoluteFill} />
        </Pressable>

        <View style={styles.searchModalCard}>
          <BlurView intensity={Platform.OS === "ios" ? 35 : 20} tint="dark" style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={["rgba(255, 255, 255, 0.08)", "rgba(255, 255, 255, 0.01)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.searchModalHeader}>
            <Search size={16} color={theme.colors.accent} />
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
                    <Avatar name={u.displayName || u.username} size={28} url={u.avatarUrl || (u as any).avatar_url || (u as any).avatar} />
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
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <BlurView intensity={Platform.OS === "ios" ? 25 : 15} tint="dark" style={StyleSheet.absoluteFill} />
        </Pressable>

        <View style={styles.noticeModalCard}>
          <BlurView intensity={Platform.OS === "ios" ? 35 : 20} tint="dark" style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={["rgba(255, 255, 255, 0.08)", "rgba(255, 255, 255, 0.01)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
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
  const { spaceId, channelId } = useLocalSearchParams<{ spaceId?: string; channelId?: string }>();
  const { user } = useAuthStore();

  const {
    spaces,
    sections,
    activeSpaceId,
    loadSpaces,
    loadChannelsForSpace,
    setActiveSpace,
    setActiveChannel,
    dms,
    loadDMs,
  } = useWorkspaceStore();

  const {
    messages,
    loadChannelMessages,
    sendChannelMessageAction,
    deleteChannelMessageAction,
    toggleReaction,
    subscribeToChannel,
    unsubscribeFromChannel,
  } = useChatStore();

  // Navigation section: space | dm | notices | archive | admin | profile
  const [currentSection, setCurrentSection] = useState<
    "space" | "dm" | "notices" | "archive" | "admin" | "profile"
  >("space");
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Selected Space & Channel state (selectedChannelId is null when in selector)
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  // Auto-bind route params
  useEffect(() => {
    if (spaceId && spaceId !== "default" && spaceId !== "[spaceId]") {
      setSelectedServerId(spaceId);
      setActiveSpace(spaceId);
    }
    if (channelId && channelId !== "default" && channelId !== "[channelId]") {
      setSelectedChannelId(channelId);
    }
  }, [spaceId, channelId]);

  const [notices, setNotices] = useState<any[]>([]);
  const [archive, setArchive] = useState<any[]>([]);
  const [adminData, setAdminData] = useState<any>(null);

  // Modals
  const [searchOpen, setSearchOpen] = useState(false);
  const [createNoticeOpen, setCreateNoticeOpen] = useState(false);
  const [createSpaceModalOpen, setCreateSpaceModalOpen] = useState(false);
  const [spaceSettingsOpen, setSpaceSettingsOpen] = useState(false);
  const [themeStudioOpen, setThemeStudioOpen] = useState(false);
  const [selectedMemberProfile, setSelectedMemberProfile] = useState<UserProfileData | null>(null);
  const { accentColor: themeAccent } = useThemeStore();
  const theme = useAppTheme();

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
  }, [loadSpaces]);

  // Auth restoration can finish after the shell mounts. Reload DMs once the
  // real user id is available so the participant mapping does not fall back
  // to an empty/anonymous list.
  useEffect(() => {
    if (user?.id) loadDMs(user.id);
  }, [user?.id, loadDMs]);

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
    setActiveChannel(selectedChannelId);
    soundService.setActiveScreen("channel", selectedChannelId);
    loadChannelMessages(selectedChannelId);
    subscribeToChannel(selectedChannelId);

    return () => {
      soundService.setActiveScreen("none", null);
      unsubscribeFromChannel();
    };
  }, [selectedChannelId, setActiveChannel]);

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
      replyTo: m.replyTo,
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
      threadReplyCount: m.threadReplyCount ?? m.thread?.messageCount ?? 0,
      thread: m.thread,
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
    <WallpaperBackground>
      <SafeAreaView style={styles.safe} edges={selectedChannel ? ["top"] : ["top", "bottom"]}>
        <View style={styles.root}>

        {/* =================================================
            LEVEL 1: DISCORD LEFT SPACE / SERVER RAIL
            ================================================= */}
        {!(currentSection === "space" && selectedServer && selectedChannel) && (
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
              setCurrentSection("admin");
              setSelectedChannelId(null);
            }}
            currentUser={user}
            onOpenProfile={() => {
              setCurrentSection("profile");
              setSelectedChannelId(null);
            }}
            onCreateSpace={() => setCreateSpaceModalOpen(true)}
          />
        )}

        {/* =================================================
            LEVEL 2: MAIN CONTENT & CHAT STREAM
            ================================================= */}
        <View style={styles.mainContentFull}>
          {currentSection === "space" && selectedServer && (
            selectedChannel ? (
              /* DEDICATED TYPE-SPECIFIC CHANNEL ROUTER */
              <ChannelRouter
                channel={selectedChannel}
                availableChannels={channels}
                onSelectChannel={(channelId) => setSelectedChannelId(channelId)}
                messages={channelMessages}
                onBack={() => setSelectedChannelId(null)}
                onSend={sendMessage}
                onToggleReaction={(msgId, emoji) => {
                  if (selectedChannelId) {
                    toggleReaction(selectedChannelId, msgId, emoji);
                  }
                }}
                onOpenProfile={(prof) => setSelectedMemberProfile(prof)}
                onDeleteMessage={(msgId) => {
                  if (selectedChannelId) {
                    deleteChannelMessageAction(selectedChannelId, msgId);
                  }
                }}
                currentUserId={user?.id}
                isAdmin={isAdmin}
              />
            ) : (
              /* SELECTED SPACE VIEW (CHANNEL SELECTOR VIEW ONLY) */
              <SelectedSpaceView
                server={selectedServer}
                channels={channels}
                selectedChannelId={selectedChannelId}
                notice={notice}
                canCreateNotice={canCreateNotice}
                onCreateNotice={() => setCreateNoticeOpen(true)}
                onSelectChannel={(chId) => setSelectedChannelId(chId)}
                onNotice={() => setCurrentSection("notices")}
                onSearch={() => setSearchOpen(true)}
                onAdd={() => router.push("/(app)/projects/index" as any)}
                onEvents={() => router.push("/(app)/events/index" as any)}
                onOpenSettings={() => setSpaceSettingsOpen(true)}
              />
            )
          )}

          {/* DEDICATED FUNCTIONAL DMs (FULL CURVED GLASS DESIGN) */}
          {currentSection === "dm" && (
            <View style={styles.page}>
              {/* Floating Direct Messages header: separate glass modules */}
              <View style={[styles.headerCapsuleWrap, styles.dmListHeaderWrap]}>
                <View style={styles.headerCapsule}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Direct Messages"
                    style={styles.dmHeaderPill}
                  >
                    <BlurView intensity={34} tint="dark" style={StyleSheet.absoluteFillObject} />
                    <View style={styles.channelPillHighlight} />
                    <MessageSquare size={20} color={theme.colors.accent} />
                    <Text style={styles.dmHeaderTitle} numberOfLines={1}>Direct Messages</Text>
                    <ChevronDown size={20} color="#F0EEF5" />
                  </Pressable>

                  <View style={styles.dmHeaderActions}>
                    <RoundIconButton
                      onPress={() => router.push("/(app)/dms" as any)}
                      size={48}
                      hitSlop={6}
                    >
                      <UserPlus size={21} color={theme.colors.accent} />
                    </RoundIconButton>
                  </View>
                </View>
              </View>

              <FlatList
                data={dms}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 32, paddingTop: 10 }}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.dmRow}
                    onPress={() => router.push(`/(app)/dms/${item.id}` as any)}
                  >
                    <Avatar name={item.name} presence={item.presence} size={42} url={(item as any).avatar || (item as any).avatarUrl} />
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
                        {item.snippet || "Tap to start conversation..."}
                      </Text>
                    </View>
                  </Pressable>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <MessageSquare size={40} color={colors.textMuted} />
                    <Text style={styles.emptyTitle}>No Direct Messages</Text>
                    <Text style={styles.emptySubtitle}>
                      Connect with peers, squad mates, and faculty mentors.
                    </Text>
                  </View>
                }
              />
            </View>
          )}

          {/* FULL WEB-PARITY NOTICES / ANNOUNCEMENTS */}
          {currentSection === "notices" && (
            <MobileNoticeBoardView />
          )}

          {/* FULL WEB-PARITY ARCHIVE */}
          {currentSection === "archive" && (
            <MobileArchiveView />
          )}

          {/* ADMIN (Only accessible if isAdmin is true) */}
          {currentSection === "admin" && isAdmin && (
            <MobileAdminView initialData={adminData} />
          )}

          {/* DETAILED MEMBER PROFILE & STATUS VIEW (SINGLE CLEAR IDENTITY) */}
          {currentSection === "profile" && (
            <MobileProfileStatusView />
          )}
        </View>
      </View>

      {/* Slide-out Drawer for Spaces & Channels */}
      <SpaceDrawerModal
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        servers={servers}
        selectedServerId={selectedServerId}
        onSelectServer={(srvId) => {
          setSelectedServerId(srvId);
          setActiveSpace(srvId);
          setSelectedChannelId(null);
          setCurrentSection("space");
        }}
        channels={channels}
        selectedChannelId={selectedChannelId}
        onSelectChannel={(chId) => {
          setSelectedChannelId(chId);
          setCurrentSection("space");
        }}
        onOpenSpaceSettings={() => setSpaceSettingsOpen(true)}
        onCreateSpace={() => setCreateSpaceModalOpen(true)}
      />

      {/* Space Creation Modal */}
      <CreateSpaceModal
        visible={createSpaceModalOpen}
        onClose={() => setCreateSpaceModalOpen(false)}
        onCreated={(newServer) => {
          if (newServer?.id) {
            setSelectedServerId(newServer.id);
            setActiveSpace(newServer.id);
            setSelectedChannelId(null);
            setCurrentSection("space");
          }
        }}
      />

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

      {/* Space-Level Settings & Governance System (All 8 Web Sections) */}
      {selectedServer && (
        <SpaceSettingsModal
          visible={spaceSettingsOpen}
          onClose={() => setSpaceSettingsOpen(false)}
          spaceId={selectedServer.id}
          spaceName={selectedServer.name}
          spaceDescription={selectedServer.description}
          userRole={userRole}
          onRenameSpace={(newName) => {
            loadSpaces();
          }}
          onDeleteSpace={() => {
            setSpaceSettingsOpen(false);
            loadSpaces();
          }}
        />
      )}

      {/* Detailed Member Profile Modal */}
      <UserProfileModal
        visible={!!selectedMemberProfile}
        onClose={() => setSelectedMemberProfile(null)}
        user={selectedMemberProfile}
        onMessage={() => {
          setSelectedMemberProfile(null);
          setCurrentSection("dm");
        }}
        onCall={() => {
          setSelectedMemberProfile(null);
          if (selectedChannelId) {
            router.push(`/(app)/voice/${selectedChannelId}`);
          }
        }}
      />

      {/* Theme & Wallpaper Customization Studio Modal */}
      <ThemeCustomizerModal
        visible={themeStudioOpen}
        onClose={() => setThemeStudioOpen(false)}
      />
    </SafeAreaView>
  </WallpaperBackground>
  );
}

/* =========================================================
   GLASSMORPHISM & THEME STYLES (MATCHING DISCORD REFERENCE)
   ========================================================= */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "transparent",
  },

  mobileRoot: {
    flex: 1,
    flexDirection: "column",
    backgroundColor: "transparent",
  },

  mainContentFull: {
    flex: 1,
    backgroundColor: "transparent",
  },

  menuDrawerBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  menuDrawerIcon: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },

  root: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "transparent",
  },

  /* LEVEL 1: FLOATING CURVED GLASS NAVIGATION RAIL */
  railWrapper: {
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 6,
    height: "100%",
    justifyContent: "center",
  },

  rail: {
    width: 68,
    height: "100%",
    backgroundColor: "rgba(27, 34, 48, 0.58)",
    borderWidth: 1,
    borderRadius: 36,
    borderColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    paddingTop: 14,
    paddingBottom: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
  },

  railAmbientFog: {
    position: "absolute",
    top: 40,
    left: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.24,
  },

  railGroupTop: {
    width: "100%",
    alignItems: "center",
  },

  dmButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.075)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.10)",
  },

  activeDM: {
    backgroundColor: "rgba(242, 170, 59, 0.16)",
    borderColor: "rgba(242, 170, 59, 0.40)",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  railDivider: {
    width: 32,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginVertical: 10,
  },

  railItemWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 3,
  },

  railIndicatorPillActive: {
    position: "absolute",
    left: 2,
    width: 4,
    height: 36,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: "#FFFFFF",
  },

  railIndicatorPillUnread: {
    position: "absolute",
    left: 2,
    width: 4,
    height: 10,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
  },

  addSpaceBtn: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },

  spaceList: {
    alignItems: "center",
    paddingBottom: 6,
    gap: 9,
  },

  spaceButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(255, 255, 255, 0.065)",
  },

  activeSpace: {
    backgroundColor: "rgba(232, 163, 61, 0.16)",
    borderColor: "rgba(232, 163, 61, 0.40)",
    borderRadius: 22,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  spaceImage: {
    width: 48,
    height: 48,
    borderRadius: 17,
  },

  spaceFallback: {
    width: 48,
    height: 48,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.10)",
  },

  spaceLetter: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
  },

  unreadBadge: {
    position: "absolute",
    right: -3,
    bottom: -3,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#0D1016",
  },

  unreadText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: "800",
  },

  utilityArea: {
    marginTop: "auto",
    gap: 9,
    alignItems: "center",
    width: "100%",
  },

  utilityButton: {
    width: 52,
    height: 48,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.065)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },

  utilityActive: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderColor: "rgba(255, 255, 255, 0.18)",
  },

  userDockAvatarBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginTop: 4,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.12)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },

  userDockActive: {
    borderWidth: 2,
    borderColor: colors.accent,
  },

  dockAvatarImg: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },

  dockAvatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.10)",
  },

  dockAvatarLetter: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },

  presenceDot: {
    position: "absolute",
    right: 1,
    bottom: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.statusOnline,
    borderWidth: 2.5,
    borderColor: "#0D1016",
  },

  /* LEVEL 2: MAIN CONTENT AREA */
  mainContent: {
    flex: 1,
    backgroundColor: "transparent",
  },

  /* SELECTED SPACE VIEW (CHANNEL SELECTOR) */
  selectorView: {
    flex: 1,
    backgroundColor: "transparent",
  },

  spaceHeaderCardWrap: {
    marginHorizontal: 10,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.10)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },

  spaceHeaderGlassCard: {
    borderRadius: 20,
    overflow: "hidden",
  },

  spaceHeaderGlassGradient: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
  },

  header: {
    backgroundColor: "transparent",
  },

  serverTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },

  spaceBadgeCapsule: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(232, 163, 61, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(232, 163, 61, 0.25)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
    alignSelf: "flex-start",
    marginBottom: 3,
  },

  spaceBadgeText: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  serverName: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.2,
  },

  serverDescription: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },

  headerActions: {
    flexDirection: "row",
    gap: 6,
  },

  searchButton: {
    flex: 1,
    height: 36,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.10)",
  },

  searchText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "600",
  },

  squareButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.10)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },

  /* Thin Translucent Amber Glass Announcement Banner Pill */
  noticeBar: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: "rgba(232, 163, 61, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(232, 163, 61, 0.22)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  emptyNoticeBar: {
    marginHorizontal: 14,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
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
    flex: 1,
    minWidth: 0,
    marginHorizontal: 8,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },

  noticeChevron: {
    flexShrink: 0,
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

  serverMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },

  communityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.statusOnline,
  },

  serverMemberCount: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: "monospace",
  },

  categoryBlock: {
    marginBottom: 12,
  },

  categoryHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingTop: 10,
    paddingBottom: 4,
  },

  categoryHeaderRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  categoryAddBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },

  categoryChevron: {
    marginRight: 20,
  },

  categoryTitle: {
    flex: 1,
    color: "rgba(255, 255, 255, 0.50)",
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.8,
  },

  categoryCount: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: "monospace",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },

  categoryUnreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginLeft: 4,
  },

  /* Curved Obsidian Glass Floating Channel Rows */
  channelRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 10,
    borderRadius: 16,
    backgroundColor: "rgba(18, 22, 30, 0.65)",
    marginBottom: 5,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    position: "relative",
  },

  channelRowSelected: {
    backgroundColor: "rgba(242, 170, 59, 0.12)",
    borderColor: "rgba(242, 170, 59, 0.35)",
  },

  channelUnreadBar: {
    position: "absolute",
    left: -2,
    top: 12,
    bottom: 12,
    width: 3,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: "#FFFFFF",
  },

  incidentChannelRow: {
    backgroundColor: "rgba(228, 91, 97, 0.08)",
    borderColor: "rgba(228, 91, 97, 0.25)",
  },

  githubChannelRow: {
    backgroundColor: "rgba(50, 214, 197, 0.08)",
    borderColor: "rgba(50, 214, 197, 0.25)",
  },

  channelRowPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderColor: "rgba(255, 255, 255, 0.12)",
  },

  channelName: {
    flex: 1,
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: 13.5,
    fontWeight: "500",
  },

  channelNameSelected: {
    color: colors.accent,
    fontWeight: "700",
  },

  channelNameUnread: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  voiceBadge: {
    backgroundColor: "rgba(50, 214, 197, 0.12)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(50, 214, 197, 0.25)",
  },

  /* Discord Persistent User Profile Dock */
  discordUserDock: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(10, 12, 18, 0.75)",
    overflow: "hidden",
  },

  discordDockUserInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  discordDockAvatarWrap: {
    position: "relative",
  },

  discordDockAvatarImg: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },

  discordDockAvatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(232, 163, 61, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(232, 163, 61, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },

  discordDockAvatarLetter: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "800",
  },

  discordDockPresenceDot: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.statusOnline,
    borderWidth: 2,
    borderColor: "#0A0C12",
  },

  discordDockNames: {
    flex: 1,
  },

  discordDockDisplayName: {
    color: colors.textPrimary,
    fontSize: 12.5,
    fontWeight: "700",
  },

  discordDockStatusText: {
    color: colors.statusOnline,
    fontSize: 10,
    fontWeight: "500",
  },

  discordDockControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  discordDockIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    alignItems: "center",
    justifyContent: "center",
  },

  discordDockIconBtnActive: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },

  voiceBadgeText: {
    color: colors.accentTeal,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  channelUnread: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },

  /* DEDICATED CHANNEL SCREEN */
  channelScreen: {
    flex: 1,
    backgroundColor: "transparent",
  },

  ambientGlowAmber: {
    position: "absolute",
    width: 480,
    height: 480,
    borderRadius: 240,
    backgroundColor: "rgba(232, 163, 61, 0.035)",
    top: -80,
    left: -100,
  },

  ambientGlowTeal: {
    position: "absolute",
    width: 440,
    height: 440,
    borderRadius: 220,
    backgroundColor: "rgba(45, 212, 191, 0.025)",
    top: "35%",
    right: -120,
  },

  ambientGlowPurple: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: "rgba(129, 140, 248, 0.025)",
    bottom: -80,
    left: -80,
  },

  headerCapsuleWrap: {
    marginHorizontal: 16,
    marginTop: 8,
  },

  headerCapsule: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    minWidth: 0,
  },

  channelHeaderWrap: {
    marginTop: 4,
  },

  channelHeaderCapsule: {
    minHeight: 52,
  },

  channelHeaderPill: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    marginHorizontal: 4,
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 26,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.085)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 7,
  },

  channelHeaderPillPressed: {
    transform: [{ scale: 0.985 }],
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  channelPillHighlight: {
    position: "absolute",
    top: 1,
    left: 1,
    right: 1,
    height: "48%",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: "rgba(255,255,255,0.045)",
  },

  channelHeaderName: {
    color: "#F5F3F8",
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: -0.7,
    zIndex: 2,
    flex: 1,
    flexShrink: 1,
    marginLeft: 10,
    marginRight: 10,
  },

  dmHeaderPill: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    height: 58,
    paddingHorizontal: 15,
    borderRadius: 29,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.085)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 7,
  },

  dmHeaderTitle: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    marginLeft: 10,
    marginRight: 10,
    color: "#F5F3F8",
    fontSize: 19,
    fontWeight: "500",
    letterSpacing: -0.5,
  },

  dmHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },

  dmListHeaderWrap: {
    marginLeft: 2,
    marginRight: 2,
  },

  headerBackBtn: {
    padding: 6,
    borderRadius: 10,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },

  headerIconOrb: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(232, 163, 61, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(232, 163, 61, 0.25)",
  },

  headerTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },

  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    marginLeft: 4,
  },

  headerAvatarBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(232, 163, 61, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(232, 163, 61, 0.3)",
    alignItems: "center",
    justifyContent: "center",
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

  channelCapsuleActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },

  channelOptionsBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.38)",
  },

  channelOptionsSheet: {
    margin: 12,
    padding: 16,
    borderRadius: 24,
    gap: 8,
    overflow: "hidden",
    backgroundColor: "rgba(18, 24, 34, 0.62)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
  },

  channelPickerSheet: {
    margin: 12,
    padding: 16,
    maxHeight: "72%",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
  },

  channelPickerRow: {
    minHeight: 48,
    paddingHorizontal: 10,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  channelPickerText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },

  channelPickerCurrent: {
    fontSize: 12,
    fontWeight: "700",
  },

  channelOptionsTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },

  channelOptionsHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    backgroundColor: "rgba(255, 255, 255, 0.24)",
    marginBottom: 4,
  },

  channelOptionRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.045)",
  },

  channelOptionText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },

  channelToolSheet: {
    margin: 12,
    padding: 16,
    minHeight: 220,
    maxHeight: "72%",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
  },

  channelToolHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  channelToolClose: {
    fontSize: 14,
    fontWeight: "700",
  },

  channelSearchRow: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
  },

  channelSearchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    paddingVertical: 8,
  },

  channelToolAction: {
    fontSize: 13,
    fontWeight: "700",
  },

  channelToolList: {
    marginTop: 12,
  },

  channelToolItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },

  channelToolMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 3,
  },

  channelToolBody: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },

  channelToolEmpty: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 18,
  },

  channelInsightText: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 23,
  },

  headerActionDivider: {
    width: 1,
    height: 22,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    marginHorizontal: 2,
  },

  actionDeleteRow: {
    backgroundColor: "rgba(255, 77, 79, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 77, 79, 0.20)",
  },

  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },

  channelHeaderTopic: {
    color: colors.textMuted,
    fontSize: 11,
  },

  /* MESSAGES & COMPOSER */
  messages: {
    flex: 1,
  },

  jumpToLatestButton: {
    position: "absolute",
    left: "50%",
    marginLeft: -22,
    bottom: 92,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 6,
  },

  messageContent: {
    padding: 14,
    paddingBottom: 24,
  },

  messageRowWrapper: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
    gap: 8,
    width: "100%",
  },

  messageRowWrapperOwn: {
    justifyContent: "flex-end",
  },

  avatarGlowContainer: {
    marginTop: 2,
  },

  messageContentColumn: {
    flexShrink: 1,
    maxWidth: "85%",
    alignItems: "flex-start",
  },

  messageContentColumnOwn: {
    alignItems: "flex-end",
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

  swipeReplyContainer: {
    position: "absolute",
    left: 8,
    top: "50%",
    transform: [{ translateY: -14 }],
    justifyContent: "center",
    alignItems: "center",
  },

  swipeReplyBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(232, 163, 61, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(232, 163, 61, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },

  doubleTapHeartWrapper: {
    position: "absolute",
    alignSelf: "center",
    top: "50%",
    transform: [{ translateY: -20 }],
    zIndex: 99,
  },

  messageItemContainer: {
    marginBottom: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "transparent",
  },

  messageItemConsecutive: {
    marginBottom: 2,
  },

  messageItemHighlighted: {
    backgroundColor: "rgba(232, 163, 61, 0.12)",
    borderColor: "rgba(232, 163, 61, 0.7)",
    paddingHorizontal: 4,
    paddingVertical: 2,
  },

  avatarConsecutiveSpacer: {
    width: 32,
  },

  botBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(129, 140, 248, 0.12)",
    borderColor: "rgba(129, 140, 248, 0.25)",
    borderWidth: 0.5,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },

  botBadgeText: {
    color: "#818CF8",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  visionGlassBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 2,
    borderRadius: 16,
    maxWidth: "100%",
  },

  stickerOnlyBubble: {
    backgroundColor: "transparent",
    borderWidth: 0,
    padding: 0,
    shadowOpacity: 0,
    elevation: 0,
  },

  visionGlassBubbleOther: {
    backgroundColor: "rgba(16, 19, 27, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderBottomLeftRadius: 4,
  },

  visionGlassBubbleOwn: {
    backgroundColor: "rgba(22, 20, 16, 0.80)",
    borderWidth: 1,
    borderColor: "rgba(232, 163, 61, 0.35)",
    borderBottomRightRadius: 4,
  },

  visionGlassBubbleBot: {
    backgroundColor: "rgba(16, 18, 26, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderLeftWidth: 3,
    borderLeftColor: "#818CF8",
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },

  visionGlassBubblePressed: {
    opacity: 0.92,
  },

  aiActionBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: 0.5,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },

  aiActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },

  aiActionText: {
    fontSize: 10.5,
    color: colors.textMuted,
    fontWeight: "600",
  },

  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
  },

  messageAvatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(232, 163, 61, 0.10)",
    borderWidth: 0.5,
    borderColor: "rgba(232, 163, 61, 0.22)",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarLetter: {
    color: colors.accent,
    fontSize: 14,
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
    fontSize: 13.5,
    fontWeight: "800",
  },

  timestamp: {
    color: colors.textFaint,
    fontSize: 10,
  },

  messageText: {
    color: "#E1E2E8",
    fontSize: 13.5,
    lineHeight: 20,
    marginTop: 2,
  },

  attachmentImage: {
    width: "100%",
    maxWidth: 280,
    height: 180,
    borderRadius: 12,
    marginTop: 8,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },

  fileCard: {
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },

  fileName: {
    color: colors.textPrimary,
    fontWeight: "600",
  },

  reactions: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
  },

  reaction: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },

  composer: {
    minHeight: 48,
    margin: 8,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.07)",
  },

  composerWrapper: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    paddingBottom: Platform.OS === "ios" ? 12 : 10,
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

  /* SUB PAGES */
  page: {
    flex: 1,
    padding: 14,
    backgroundColor: "transparent",
  },

  pageHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  pageTitle: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: "800",
  },

  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 14,
    flexShrink: 0,
  },

  createBtnText: {
    fontSize: 12,
    fontWeight: "800",
  },

  dmRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
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
    fontSize: 13.5,
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
    padding: 14,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.07)",
  },

  noticeCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
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
    fontSize: 15,
    fontWeight: "800",
  },

  noticeCardText: {
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 18,
    fontSize: 12.5,
  },

  archiveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.025)",
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.055)",
  },

  archiveTitle: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 13.5,
  },

  archiveDescription: {
    color: colors.textMuted,
    fontSize: 11.5,
    marginTop: 2,
  },

  adminGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },

  adminStat: {
    width: "48%",
    minHeight: 90,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.07)",
  },

  adminStatTitle: {
    color: colors.textMuted,
    fontSize: 11.5,
    fontWeight: "600",
  },

  adminStatValue: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 8,
  },

  /* PROFILE CARD */
  profileCard: {
    padding: 18,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.07)",
    alignItems: "center",
    marginTop: 10,
  },

  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    marginBottom: 10,
  },

  profileAvatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },

  profileAvatarLetter: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "800",
  },

  profileName: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "800",
  },

  profileEmail: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },

  roleTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(232, 163, 61, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(232, 163, 61, 0.22)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 8,
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
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
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
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    padding: 16,
  },

  searchModalCard: {
    backgroundColor: "rgba(18, 22, 30, 0.90)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(39, 45, 56, 0.85)",
    maxHeight: "80%",
    overflow: "hidden",
  },

  searchModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(39, 45, 56, 0.60)",
    gap: 10,
  },

  searchModalInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
  },

  searchResultsScroll: {
    padding: 14,
  },

  searchSection: {
    marginBottom: 16,
  },

  searchSectionTitle: {
    color: colors.textMuted,
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 8,
  },

  searchResultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: "rgba(21, 25, 34, 0.50)",
    marginBottom: 4,
  },

  searchResultName: {
    color: colors.textPrimary,
    fontSize: 13.5,
    fontWeight: "600",
  },

  searchResultSub: {
    color: colors.textMuted,
    fontSize: 11,
  },

  emptySearchText: {
    color: colors.textMuted,
    fontSize: 12.5,
    textAlign: "center",
    paddingVertical: 24,
  },

  noticeModalCard: {
    backgroundColor: "rgba(18, 22, 30, 0.92)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(39, 45, 56, 0.85)",
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
    fontSize: 16,
    fontWeight: "800",
  },

  noticeModalInput: {
    backgroundColor: "rgba(21, 25, 34, 0.65)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(39, 45, 56, 0.80)",
    color: colors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13.5,
  },

  publishBtn: {
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },

  publishBtnText: {
    color: colors.accentContrast,
    fontSize: 13.5,
    fontWeight: "800",
  },

  /* REACTIONS & THREADS STYLES */
  reactionActive: {
    backgroundColor: "rgba(232, 163, 61, 0.18)",
    borderColor: colors.accent,
    borderWidth: 1,
  },

  threadIndicatorBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(212, 160, 23, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(212, 160, 23, 0.25)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 6,
    gap: 6,
  },

  threadIndicatorText: {
    fontFamily: "JetBrainsMono_700Bold",
    fontSize: 11,
    color: colors.accent,
  },

  addReactionBtn: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },

  actionModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },

  actionModalSheetWrapper: {
    flex: 1,
    justifyContent: "flex-end",
  },

  actionModalSheet: {
    backgroundColor: "rgba(14, 16, 24, 0.85)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    padding: 18,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    overflow: "hidden",
  },

  actionModalTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 12,
  },

  emojiPickerRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 8,
  },

  emojiPickerItem: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },

  emojiText: {
    fontSize: 22,
  },

  actionDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginVertical: 14,
  },

  actionMenuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },

  actionMenuText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },

  stagedAttachmentBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(212, 160, 23, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(212, 160, 23, 0.25)",
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
    fontFamily: "JetBrainsMono_700Bold",
  },

  replyBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(232, 163, 61, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(232, 163, 61, 0.2)",
  },

  replyBannerText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 11,
  },

  messageReplyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 46,
    marginBottom: 4,
  },

  messageReplyAuthor: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "monospace",
  },

  messageReplySnippet: {
    color: colors.textMuted,
    fontSize: 11,
    flex: 1,
  },

  profileAvatarWrap: {
    position: "relative",
    marginBottom: 8,
  },

  profileStatusDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.statusOnline,
    borderWidth: 2,
    borderColor: "#12141D",
  },

  profileUsername: {
    color: colors.textMuted,
    fontSize: 13,
    fontFamily: "monospace",
    marginTop: 2,
    marginBottom: 8,
  },

  profileSectionBox: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.025)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    gap: 6,
    marginTop: 10,
  },

  profileSectionLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    fontFamily: "monospace",
    letterSpacing: 0.8,
  },

  profileAffilPill: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },

  profileAffilText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },

  profileSkillChip: {
    backgroundColor: "rgba(45, 212, 191, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(45, 212, 191, 0.25)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  profileSkillText: {
    color: colors.accentTeal,
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "monospace",
  },

  profileInterestChip: {
    backgroundColor: "rgba(232, 163, 61, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(232, 163, 61, 0.25)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  profileInterestText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "monospace",
  },

  channelViewToggleWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },

  channelViewToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  channelViewToggleBtnActive: {
    backgroundColor: "rgba(232, 163, 61, 0.18)",
  },

  channelViewToggleText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    fontFamily: "monospace",
    letterSpacing: 0.5,
  },

  channelViewToggleTextActive: {
    color: colors.accent,
  },
});
