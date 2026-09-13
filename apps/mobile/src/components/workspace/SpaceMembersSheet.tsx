import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { X, Users, Shield, MessageSquare } from "lucide-react-native";
import { colors } from "../../theme/tokens";

export interface SpaceMemberItem {
  id: string;
  name: string;
  avatar?: string | null;
  role?: string;
  roleColor?: string;
  presence?: "online" | "idle" | "dnd" | "invisible" | "offline";
  statusText?: string;
}

const PRESENCE_DOT: Record<string, string> = {
  online: "#22C55E",
  idle: "#F59E0B",
  dnd: "#EF4444",
  offline: "rgba(245, 247, 250, 0.3)",
};

function formatAvatarUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `https://aiic-bbs.vercel.app${url}`;
  return url;
}

export function SpaceMembersSheet({
  visible,
  onClose,
  spaceName,
  members,
  onSelectMember,
}: {
  visible: boolean;
  onClose: () => void;
  spaceName: string;
  members: SpaceMemberItem[];
  onSelectMember?: (member: SpaceMemberItem) => void;
}) {
  const onlineMembers = members.filter(
    (m) => m.presence && m.presence !== "offline" && m.presence !== "invisible"
  );
  const offlineMembers = members.filter(
    (m) => !m.presence || m.presence === "offline" || m.presence === "invisible"
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        
        <View style={styles.sheet}>
          <BlurView
            intensity={Platform.OS === "ios" ? 50 : 35}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={["rgba(255, 255, 255, 0.12)", "rgba(10, 12, 18, 0.96)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Sheet Handle */}
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <Users size={18} color={colors.accent} style={{ marginRight: 8 }} />
              <Text style={styles.headerTitle}>{spaceName} Members</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <X size={18} color="rgba(245, 247, 250, 0.6)" />
            </Pressable>
          </View>

          {/* Members List */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Online Members */}
            {onlineMembers.length > 0 && (
              <View style={styles.groupSection}>
                <Text style={styles.groupHeader}>
                  ONLINE — {onlineMembers.length}
                </Text>
                {onlineMembers.map((m) => (
                  <MemberRow
                    key={m.id}
                    member={m}
                    onPress={() => {
                      Haptics.selectionAsync();
                      onSelectMember?.(m);
                    }}
                  />
                ))}
              </View>
            )}

            {/* Offline Members */}
            {offlineMembers.length > 0 && (
              <View style={styles.groupSection}>
                <Text style={styles.groupHeader}>
                  OFFLINE — {offlineMembers.length}
                </Text>
                {offlineMembers.map((m) => (
                  <MemberRow
                    key={m.id}
                    member={m}
                    dimmed
                    onPress={() => {
                      Haptics.selectionAsync();
                      onSelectMember?.(m);
                    }}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function MemberRow({
  member,
  dimmed,
  onPress,
}: {
  member: SpaceMemberItem;
  dimmed?: boolean;
  onPress: () => void;
}) {
  const presence = member.presence ?? "offline";
  const dotColor = PRESENCE_DOT[presence] || PRESENCE_DOT.offline;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.memberRow,
        dimmed && styles.memberRowDimmed,
        pressed && styles.memberRowPressed,
      ]}
    >
      <View style={styles.avatarWrap}>
        {formatAvatarUrl(member.avatar) ? (
          <Image
            source={{ uri: formatAvatarUrl(member.avatar)! }}
            style={styles.avatarImg}
          />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarLetter}>
              {member.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={[styles.presenceDot, { backgroundColor: dotColor }]} />
      </View>

      <View style={styles.memberInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.memberName} numberOfLines={1}>
            {member.name}
          </Text>
          {Boolean(member.role) && (
            <View
              style={[
                styles.roleBadge,
                Boolean(member.roleColor) && {
                  borderColor: `${member.roleColor}55`,
                  backgroundColor: `${member.roleColor}15`,
                },
              ]}
            >
              <Shield size={10} color={member.roleColor || colors.accent} style={{ marginRight: 3 }} />
              <Text
                style={[
                  styles.roleBadgeText,
                  Boolean(member.roleColor) && { color: member.roleColor },
                ]}
              >
                {member.role}
              </Text>
            </View>
          )}
        </View>

        {Boolean(member.statusText) && (
          <Text style={styles.memberStatusText} numberOfLines={1}>
            {member.statusText}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  sheet: {
    height: "75%",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 24,
  },
  handleWrap: {
    alignItems: "center",
    paddingVertical: 10,
  },
  handle: {
    width: 40,
    height: 4.5,
    borderRadius: 2.25,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  groupSection: {
    marginBottom: 20,
  },
  groupHeader: {
    color: "rgba(245, 247, 250, 0.45)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 6,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    marginBottom: 6,
  },
  memberRowDimmed: {
    opacity: 0.55,
  },
  memberRowPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  avatarWrap: {
    position: "relative",
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  avatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(232, 163, 61, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(232, 163, 61, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "800",
  },
  presenceDot: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#0F1118",
  },
  memberInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  memberName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(232, 163, 61, 0.3)",
    backgroundColor: "rgba(232, 163, 61, 0.1)",
  },
  roleBadgeText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  memberStatusText: {
    color: "rgba(245, 247, 250, 0.5)",
    fontSize: 11.5,
    marginTop: 2,
  },
});
