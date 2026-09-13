import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  Modal,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
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
  onCreateSpace,
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
  onCreateSpace?: () => void;
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

  const renderGlyph = (type: string, isSelected: boolean) => {
    const iconColor = isSelected ? colors.accent : "rgba(255, 255, 255, 0.6)";
    switch (type) {
      case "voice": return <Volume2 size={16} color={isSelected ? colors.accent : colors.accentTeal} />;
      case "board": return <Kanban size={16} color={isSelected ? colors.accent : colors.accentWarm} />;
      case "docs": return <FileText size={16} color={isSelected ? colors.accent : colors.info} />;
      case "github": return <Github size={16} color={isSelected ? colors.accent : colors.accentTeal} />;
      case "incident": return <AlertTriangle size={16} color={isSelected ? colors.accent : colors.danger} />;
      case "canvas": return <Layers size={16} color={colors.accent} />;
      case "stage": return <Radio size={16} color={colors.live} />;
      case "announcement": return <Bell size={16} color={colors.accent} />;
      default: return <Hash size={16} color={iconColor} />;
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

        <View style={styles.drawerSheetWrap}>
          <BlurView intensity={40} tint="dark" style={styles.drawerSheet}>
            <LinearGradient
              colors={["rgba(255,255,255,0.08)", "rgba(255,255,255,0.02)"]}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />

            {/* Left mini rail for Spaces */}
            <View style={styles.spacesRail}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingVertical: 18, alignItems: "center" }}
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
                      {isActive && (
                        <View style={styles.activePillIndicator} />
                      )}
                      {s.iconUrl ? (
                        <Image source={{ uri: s.iconUrl }} style={styles.spaceImg} />
                      ) : (
                        <Text style={[styles.spaceOrbLetter, isActive && { color: colors.accent }]}>
                          {s.name.charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}

                {/* Add / Create Space Button */}
                {onCreateSpace && (
                  <Pressable
                    onPress={() => {
                      onClose();
                      onCreateSpace();
                    }}
                    style={[styles.spaceOrb, styles.addSpaceOrb]}
                    hitSlop={6}
                  >
                    <Plus size={18} color={colors.accent} />
                  </Pressable>
                )}
              </ScrollView>
            </View>

            {/* Right channel navigation list */}
            <View style={styles.channelListContainer}>
              {/* Space Header Capsule */}
              <View style={styles.drawerHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.spaceName} numberOfLines={1}>
                    {currentServer?.name || "AIIC Space"}
                  </Text>
                  <Text style={styles.spaceSubtitle}>AIIC COMMUNITY</Text>
                </View>

                <Pressable
                  onPress={() => {
                    onClose();
                    onOpenSpaceSettings();
                  }}
                  style={styles.settingsBtn}
                >
                  <Settings size={16} color={colors.accent} />
                </Pressable>

                <Pressable onPress={onClose} style={styles.closeBtn}>
                  <X size={16} color={colors.textMuted} />
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
                          {isSelected && (
                            <LinearGradient
                              colors={["rgba(212, 160, 23, 0.22)", "rgba(212, 160, 23, 0.06)"]}
                              style={StyleSheet.absoluteFillObject}
                            />
                          )}

                          {renderGlyph(ch.type, isSelected)}
                          <Text
                            style={[
                              styles.channelName,
                              isSelected && styles.channelNameSelected,
                            ]}
                            numberOfLines={1}
                          >
                            {ch.name}
                          </Text>
                          <View style={[styles.typeBadge, isSelected && styles.typeBadgeSelected]}>
                            <Text style={[styles.typeBadgeText, isSelected && { color: colors.accent }]}>
                              {(ch.type || "text").toUpperCase()}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </ScrollView>
            </View>
          </BlurView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  drawerSheetWrap: {
    width: "88%",
    maxWidth: 340,
    height: "100%",
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  drawerSheet: {
    flex: 1,
    flexDirection: "row",
    borderRightWidth: 1,
    borderRightColor: "rgba(255, 255, 255, 0.08)",
  },
  spacesRail: {
    width: 66,
    backgroundColor: "rgba(10, 12, 18, 0.40)",
    borderRightWidth: 1,
    borderRightColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
  },
  spaceOrb: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  spaceOrbActive: {
    borderColor: "rgba(232, 163, 61, 0.35)",
    borderRadius: 12,
    backgroundColor: "rgba(232, 163, 61, 0.12)",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  activePillIndicator: {
    position: "absolute",
    left: 0,
    top: 10,
    bottom: 10,
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  addSpaceOrb: {
    borderStyle: "dashed",
    borderColor: "rgba(232, 163, 61, 0.35)",
    backgroundColor: "rgba(232, 163, 61, 0.06)",
  },
  spaceImg: {
    width: "100%",
    height: "100%",
  },
  spaceOrbLetter: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
  channelListContainer: {
    flex: 1,
    backgroundColor: "rgba(8, 10, 16, 0.25)",
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 20 : 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
    gap: 8,
  },
  spaceName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
  spaceSubtitle: {
    color: colors.accent,
    fontSize: 9,
    fontFamily: "monospace",
    fontWeight: "700",
    letterSpacing: 0.6,
    marginTop: 2,
  },
  settingsBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "rgba(232, 163, 61, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(232, 163, 61, 0.20)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryBlock: {
    marginBottom: 14,
  },
  categoryTitle: {
    color: "rgba(255, 255, 255, 0.40)",
    fontSize: 10,
    fontWeight: "800",
    fontFamily: "monospace",
    letterSpacing: 0.8,
    marginBottom: 5,
    paddingHorizontal: 6,
  },
  channelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.025)",
    marginBottom: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  channelRowSelected: {
    backgroundColor: "rgba(232, 163, 61, 0.08)",
    borderColor: "rgba(232, 163, 61, 0.22)",
  },
  channelName: {
    flex: 1,
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: 13.5,
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
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  typeBadgeSelected: {
    backgroundColor: "rgba(232, 163, 61, 0.10)",
    borderColor: "rgba(232, 163, 61, 0.20)",
  },
  typeBadgeText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 9,
    fontFamily: "monospace",
    fontWeight: "700",
  },
});
