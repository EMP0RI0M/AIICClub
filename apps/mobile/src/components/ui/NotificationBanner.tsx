import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, Pressable, Animated, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
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
        return <AlertTriangle size={15} color={colors.danger} />;
      case "success":
        return <CheckCircle2 size={15} color={colors.live} />;
      default:
        return <Bell size={15} color={colors.accent} />;
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + (Platform.OS === "ios" ? 4 : 10),
          transform: [{ translateY }],
        },
      ]}
    >
      <Pressable onPress={handlePress} style={styles.card}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFillObject} />
        <LinearGradient
          colors={["rgba(232, 163, 61, 0.12)", "rgba(232, 163, 61, 0.02)"]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <LinearGradient
          colors={["rgba(255, 255, 255, 0.20)", "rgba(255, 255, 255, 0)"]}
          style={styles.topSpecular}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
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
    backgroundColor: "rgba(20, 16, 12, 0.50)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(232, 163, 61, 0.22)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
  },
  topSpecular: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(232, 163, 61, 0.10)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
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
