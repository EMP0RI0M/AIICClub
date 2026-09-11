import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StyleProp,
  ViewStyle,
  ImageBackground,
} from "react-native";
import {
  Home,
  Search,
  BarChart2,
  Bell,
  Settings,
} from "lucide-react-native";
import { LiquidGlassCard } from "../ui/liquid-glass";
import { NativeHaptics } from "../../lib/haptics";

export interface SidebarMenuProps {
  style?: StyleProp<ViewStyle>;
  activeItem?: string;
  onSelectItem?: (itemKey: string) => void;
  backgroundImageUrl?: string;
}

const MENU_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: Home },
  { key: "search", label: "Search", icon: Search },
  { key: "sales", label: "Sales Analytics", icon: BarChart2 },
  { key: "notifications", label: "Notification", icon: Bell },
  { key: "settings", label: "Account Settings", icon: Settings },
];

export const SidebarMenu: React.FC<SidebarMenuProps> = ({
  style,
  activeItem: controlledActive,
  onSelectItem,
  backgroundImageUrl = "https://images.unsplash.com/photo-1752440093057-1c188e7137e9?q=80&w=764&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
}) => {
  const [internalActive, setInternalActive] = useState("dashboard");
  const currentActive = controlledActive ?? internalActive;

  const handlePress = (key: string) => {
    NativeHaptics.light();
    setInternalActive(key);
    onSelectItem?.(key);
  };

  return (
    <View style={[styles.container, style]}>
      {backgroundImageUrl ? (
        <ImageBackground
          source={{ uri: backgroundImageUrl }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
      ) : null}

      <LiquidGlassCard
        glowIntensity="sm"
        shadowIntensity="sm"
        borderRadius="16px"
        blurIntensity="sm"
        style={styles.card}
      >
        <View style={styles.nav}>
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentActive === item.key;

            return (
              <Pressable
                key={item.key}
                onPress={() => handlePress(item.key)}
                style={({ pressed }) => [
                  styles.menuButton,
                  isActive && styles.menuButtonActive,
                  pressed && styles.menuButtonPressed,
                ]}
              >
                <Icon
                  size={20}
                  color={isActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.78)"}
                />
                <Text
                  style={[
                    styles.menuText,
                    isActive && styles.menuTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </LiquidGlassCard>
    </View>
  );
};

export default SidebarMenu;

const styles = StyleSheet.create({
  container: {
    padding: 24,
    width: "100%",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  card: {
    padding: 16,
    width: 280,
  },
  nav: {
    width: "100%",
    gap: 8,
    zIndex: 30,
  },
  menuButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "transparent",
  },
  menuButtonActive: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.22)",
  },
  menuButtonPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.10)",
    transform: [{ scale: 0.98 }],
  },
  menuText: {
    color: "rgba(255, 255, 255, 0.78)",
    fontSize: 14.5,
    fontWeight: "500",
  },
  menuTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
