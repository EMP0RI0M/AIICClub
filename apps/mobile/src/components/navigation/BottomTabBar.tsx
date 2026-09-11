import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import {
  MessageSquare,
  Archive,
  Bell,
  User,
  Shield,
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
    <View style={styles.floatingContainer}>
      <BlurView intensity={35} tint="dark" style={styles.tabBarCapsule}>
        <LinearGradient
          colors={["rgba(255,255,255,0.09)", "rgba(255,255,255,0.02)"]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />

        <TabButton
          label="Chat"
          icon={<MessageSquare size={19} color={currentSection === "space" || currentSection === "chat" || currentSection === "dm" ? colors.accent : "rgba(255,255,255,0.5)"} />}
          active={currentSection === "space" || currentSection === "chat" || currentSection === "dm"}
          badge={unreadCount > 0 ? String(unreadCount) : undefined}
          onPress={() => onSelectSection("chat")}
        />

        <TabButton
          label="Archive"
          icon={<Archive size={19} color={currentSection === "archive" ? colors.accent : "rgba(255,255,255,0.5)"} />}
          active={currentSection === "archive"}
          onPress={() => onSelectSection("archive")}
        />

        <TabButton
          label="Notices"
          icon={<Bell size={19} color={currentSection === "notices" ? colors.accent : "rgba(255,255,255,0.5)"} />}
          active={currentSection === "notices"}
          onPress={() => onSelectSection("notices")}
        />

        {isAdmin && (
          <TabButton
            label="Admin"
            icon={<Shield size={19} color={currentSection === "admin" ? colors.accent : "rgba(255,255,255,0.5)"} />}
            active={currentSection === "admin"}
            onPress={() => onSelectSection("admin")}
          />
        )}

        <TabButton
          label="Profile"
          icon={<User size={19} color={currentSection === "profile" ? colors.accent : "rgba(255,255,255,0.5)"} />}
          active={currentSection === "profile"}
          onPress={() => onSelectSection("profile")}
        />
      </BlurView>
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
    <Pressable onPress={onPress} style={[styles.tabBtn, active && styles.tabBtnActive]}>
      {active && (
        <View style={styles.activePillGlow} pointerEvents="none">
          <LinearGradient
            colors={["rgba(212, 160, 23, 0.22)", "rgba(212, 160, 23, 0.05)"]}
            style={StyleSheet.absoluteFillObject}
          />
        </View>
      )}
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
  floatingContainer: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 22 : 14,
    backgroundColor: "transparent",
  },
  tabBarCapsule: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    paddingVertical: 7,
    paddingHorizontal: 6,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  tabBtn: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingVertical: 6,
    borderRadius: 20,
    position: "relative",
    gap: 3,
  },
  tabBtnActive: {},
  activePillGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(212, 160, 23, 0.3)",
  },
  iconBox: {
    position: "relative",
  },
  tabLabel: {
    color: "rgba(255, 255, 255, 0.55)",
    fontSize: 10.5,
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
