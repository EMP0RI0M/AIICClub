import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import {
  MessageSquare,
  Archive,
  Bell,
  User,
  Shield,
  Home,
  Layers,
} from "lucide-react-native";
import { colors } from "@/theme/tokens";

export type BottomNavSection =
  | "chat"
  | "archive"
  | "notices"
  | "profile"
  | "admin";

export function BottomTabBar({
  currentSection,
  onSelectSection,
  isAdmin,
  unreadCount = 0,
}: {
  currentSection: string;
  onSelectSection: (section: BottomNavSection) => void;
  isAdmin?: boolean;
  unreadCount?: number;
}) {
  return (
    <View style={styles.tabBarContainer}>
      <TabButton
        label="Chat"
        icon={<MessageSquare size={20} color={currentSection === "space" || currentSection === "chat" || currentSection === "dm" ? colors.accent : colors.textMuted} />}
        active={currentSection === "space" || currentSection === "chat" || currentSection === "dm"}
        badge={unreadCount > 0 ? String(unreadCount) : undefined}
        onPress={() => onSelectSection("chat")}
      />

      <TabButton
        label="Archive"
        icon={<Archive size={20} color={currentSection === "archive" ? colors.accent : colors.textMuted} />}
        active={currentSection === "archive"}
        onPress={() => onSelectSection("archive")}
      />

      <TabButton
        label="Notices"
        icon={<Bell size={20} color={currentSection === "notices" ? colors.accent : colors.textMuted} />}
        active={currentSection === "notices"}
        onPress={() => onSelectSection("notices")}
      />

      {isAdmin && (
        <TabButton
          label="Admin"
          icon={<Shield size={20} color={currentSection === "admin" ? colors.accent : colors.textMuted} />}
          active={currentSection === "admin"}
          onPress={() => onSelectSection("admin")}
        />
      )}

      <TabButton
        label="Profile"
        icon={<User size={20} color={currentSection === "profile" ? colors.accent : colors.textMuted} />}
        active={currentSection === "profile"}
        onPress={() => onSelectSection("profile")}
      />
    </View>
  );
}

function TabButton({
  label,
  icon,
  active,
  badge,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  badge?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.tabBtn}>
      <View style={styles.iconBox}>
        {icon}
        {badge && (
          <View style={styles.badgeOrb}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#0A0B10",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    paddingVertical: 8,
    paddingBottom: 12,
  },
  tabBtn: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    gap: 3,
  },
  iconBox: {
    position: "relative",
  },
  tabLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  tabLabelActive: {
    color: colors.accent,
    fontWeight: "700",
  },
  badgeOrb: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: colors.accent,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
  },
  badgeText: {
    color: colors.accentContrast,
    fontSize: 9,
    fontWeight: "800",
  },
});
