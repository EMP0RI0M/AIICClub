import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  Modal,
} from "react-native";
import {
  X,
  Sparkles,
  Hash,
  Volume2,
  FolderKanban,
  Kanban,
  FileText,
  Github,
  AlertTriangle,
  Layers,
  Radio,
  Bell,
  Settings,
  Plus,
} from "lucide-react-native";
import { colors } from "@/theme/tokens";

export interface ServerItem {
  id: string;
  name: string;
  iconUrl?: string | null;
  unreadCount?: number;
}

export interface ChannelItem {
  id: string;
  name: string;
  type: string;
  category?: string;
  unread?: boolean;
}

export function SpaceDrawerModal({
  visible,
  onClose,
  servers,
  selectedServerId,
  onSelectServer,
  channels,
  selectedChannelId,
  onSelectChannel,
  onOpenSpaceSettings,
}: {
  visible: boolean;
  onClose: () => void;
  servers: ServerItem[];
  selectedServerId: string | null;
  onSelectServer: (serverId: string) => void;
  channels: ChannelItem[];
  selectedChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  onOpenSpaceSettings: () => void;
}) {
  const currentServer =
    servers.find((s) => s.id === selectedServerId) || servers[0] || null;

  // Group channels by category
  const categories: Record<string, ChannelItem[]> = {};
  channels.forEach((channel) => {
    const cat =
      channel.category ||
      (channel.type === "voice"
        ? "Voice Channels"
        : channel.type === "project" || channel.type === "board" || channel.type === "github" || channel.type === "canvas"
        ? "Engineering & Modules"
        : channel.type === "incident"
        ? "Incident Response"
        : channel.type === "docs"
        ? "Knowledge & Docs"
        : "Channels");
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(channel);
  });

  const renderGlyph = (type: string) => {
    switch (type) {
      case "voice": return <Volume2 size={16} color={colors.accentTeal} />;
      case "board": return <Kanban size={16} color={colors.accentWarm} />;
      case "docs": return <FileText size={16} color={colors.info} />;
      case "github": return <Github size={16} color={colors.accentTeal} />;
      case "incident": return <AlertTriangle size={16} color={colors.danger} />;
      case "canvas": return <Layers size={16} color={colors.accent} />;
      case "stage": return <Radio size={16} color={colors.live} />;
      case "announcement": return <Bell size={16} color={colors.accent} />;
      default: return <Hash size={16} color={colors.textMuted} />;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.drawerSheet}>
          {/* Left mini rail for Spaces */}
          <View style={styles.spacesRail}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingVertical: 14 }}
            >
              {servers.map((s) => {
                const isActive = s.id === selectedServerId;
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => onSelectServer(s.id)}
                    style={[
                      styles.spaceOrb,
                      isActive && styles.spaceOrbActive,
                    ]}
                  >
                    {s.iconUrl ? (
                      <Image source={{ uri: s.iconUrl }} style={styles.spaceImg} />
                    ) : (
                      <Text style={styles.spaceOrbLetter}>
                        {s.name.charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Right channel navigation list */}
          <View style={styles.channelListContainer}>
            {/* Space Header */}
            <View style={styles.drawerHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.spaceName} numberOfLines={1}>
                  {currentServer?.name || "AIIC Space"}
                </Text>
                <Text style={styles.spaceSubtitle}>Select Channel</Text>
              </View>

              <Pressable
                onPress={() => {
                  onClose();
                  onOpenSpaceSettings();
                }}
                style={styles.settingsBtn}
              >
                <Settings size={17} color={colors.accent} />
              </Pressable>

              <Pressable onPress={onClose} style={styles.closeBtn}>
                <X size={18} color={colors.textMuted} />
              </Pressable>
            </View>

            {/* Categorized channels */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
            >
              {Object.entries(categories).map(([category, items]) => (
                <View key={category} style={styles.categoryBlock}>
                  <Text style={styles.categoryTitle}>{category.toUpperCase()}</Text>
                  {items.map((ch) => {
                    const isSelected = ch.id === selectedChannelId;
                    return (
                      <Pressable
                        key={ch.id}
                        onPress={() => {
                          onSelectChannel(ch.id);
                          onClose();
                        }}
                        style={[
                          styles.channelRow,
                          isSelected && styles.channelRowSelected,
                        ]}
                      >
                        {renderGlyph(ch.type)}
                        <Text
                          style={[
                            styles.channelName,
                            isSelected && styles.channelNameSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {ch.name}
                        </Text>
                        <View style={styles.typeBadge}>
                          <Text style={styles.typeBadgeText}>{(ch.type || "text").toUpperCase()}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  drawerSheet: {
    width: "88%",
    maxWidth: 340,
    height: "100%",
    backgroundColor: "#0D0E15",
    flexDirection: "row",
    borderRightWidth: 1,
    borderRightColor: "rgba(255, 255, 255, 0.08)",
  },
  spacesRail: {
    width: 60,
    backgroundColor: "#08090E",
    borderRightWidth: 1,
    borderRightColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
  },
  spaceOrb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  spaceOrbActive: {
    borderColor: colors.accent,
    borderRadius: 14,
    backgroundColor: "rgba(232, 163, 61, 0.2)",
  },
  spaceImg: {
    width: "100%",
    height: "100%",
  },
  spaceOrbLetter: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
  channelListContainer: {
    flex: 1,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    gap: 8,
  },
  spaceName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
  spaceSubtitle: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: "monospace",
    marginTop: 2,
  },
  settingsBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(232, 163, 61, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryBlock: {
    marginBottom: 16,
  },
  categoryTitle: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    fontFamily: "monospace",
    letterSpacing: 0.8,
    marginBottom: 6,
    paddingHorizontal: 6,
  },
  channelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "transparent",
  },
  channelRowSelected: {
    backgroundColor: "rgba(232, 163, 61, 0.14)",
  },
  channelName: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  channelNameSelected: {
    color: colors.accent,
    fontWeight: "700",
  },
  typeBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    color: colors.textMuted,
    fontSize: 9,
    fontFamily: "monospace",
    fontWeight: "700",
  },
});
