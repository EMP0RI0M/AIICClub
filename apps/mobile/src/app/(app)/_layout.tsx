import React from "react";
import { Tabs } from "expo-router";
import { View, StyleSheet, Platform } from "react-native";
import { colors, radius } from "../../theme/tokens";
import {
  Layers,
  MessageSquare,
  FolderKanban,
  Calendar,
  User,
} from "lucide-react-native";

export default function AppTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="spaces/[spaceId]/[channelId]"
        options={{
          title: "Spaces",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Layers size={20} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="dms/index"
        options={{
          title: "DMs",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <MessageSquare size={20} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="projects/index"
        options={{
          title: "Projects",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <FolderKanban size={20} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="events/index"
        options={{
          title: "Events",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Calendar size={20} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <User size={20} color={color} />
            </View>
          ),
        }}
      />

      {/* Auxiliary routes hidden from tab bar */}
      <Tabs.Screen name="dms/[id]" options={{ href: null }} />
      <Tabs.Screen name="projects/[slug]" options={{ href: null }} />
      <Tabs.Screen name="events/[slug]" options={{ href: null }} />
      <Tabs.Screen name="archive/index" options={{ href: null }} />
      <Tabs.Screen name="archive/[id]" options={{ href: null }} />
      <Tabs.Screen name="people/index" options={{ href: null }} />
      <Tabs.Screen name="achievements/index" options={{ href: null }} />
      <Tabs.Screen name="notices/index" options={{ href: null }} />
      <Tabs.Screen name="notifications/index" options={{ href: null }} />
      <Tabs.Screen name="profile/settings" options={{ href: null }} />
      <Tabs.Screen name="voice/[id]" options={{ href: null }} />
      <Tabs.Screen name="boards/[id]" options={{ href: null }} />
      <Tabs.Screen name="docs/[id]" options={{ href: null }} />
      <Tabs.Screen name="incidents/[id]" options={{ href: null }} />
      <Tabs.Screen name="github/[id]" options={{ href: null }} />
      <Tabs.Screen name="join/[code]" options={{ href: null }} />
      <Tabs.Screen name="invite/[code]" options={{ href: null }} />
      <Tabs.Screen name="about" options={{ href: null }} />
      <Tabs.Screen name="changelog" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "rgba(10, 11, 17, 0.95)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    height: Platform.OS === "ios" ? 88 : 64,
    paddingBottom: Platform.OS === "ios" ? 28 : 10,
    paddingTop: 6,
    elevation: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  iconWrap: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  iconWrapActive: {
    backgroundColor: colors.accentSoft,
  },
});
