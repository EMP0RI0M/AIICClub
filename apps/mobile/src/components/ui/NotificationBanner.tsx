import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, Pressable, Animated, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { notificationService, InAppNotification } from "../../lib/notifications";
import { colors, radius } from "../../theme/tokens";
import { Bell, AlertTriangle, CheckCircle2, MessageSquare, X } from "lucide-react-native";

export function NotificationBanner() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [notification, setNotification] = useState<InAppNotification | null>(null);
  const [translateY] = useState(new Animated.Value(-120));

  useEffect(() => {
    const unsubscribe = notificationService.subscribe((notif) => {
      setNotification(notif);
      if (notif) {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 6,
        }).start();
      } else {
        Animated.timing(translateY, {
          toValue: -120,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    });

    return () => unsubscribe();
  }, []);

  if (!notification) return null;

  const handlePress = () => {
    if (notification.spaceId && notification.channelId) {
      router.push(`/spaces/${notification.spaceId}/${notification.channelId}` as any);
    } else if (notification.dmId) {
      router.push(`/dms/${notification.dmId}` as any);
    }
    notificationService.dismiss();
  };

  const getIcon = () => {
    switch (notification.type) {
      case "urgent":
        return <AlertTriangle size={16} color={colors.danger} />;
      case "success":
        return <CheckCircle2 size={16} color={colors.live} />;
      default:
        return <Bell size={16} color={colors.accent} />;
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + (Platform.OS === "ios" ? 4 : 12),
          transform: [{ translateY }],
        },
      ]}
    >
      <Pressable onPress={handlePress} style={styles.card}>
        <View style={styles.iconContainer}>{getIcon()}</View>
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {notification.body}
          </Text>
        </View>
        <Pressable onPress={() => notificationService.dismiss()} style={styles.closeBtn} hitSlop={8}>
          <X size={14} color={colors.textMuted} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(18, 18, 20, 0.95)",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontFamily: "JetBrainsMono_700Bold",
    fontSize: 12,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  body: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  closeBtn: {
    padding: 4,
  },
});
