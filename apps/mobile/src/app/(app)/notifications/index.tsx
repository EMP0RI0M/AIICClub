import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius } from "../../../theme/tokens";
import { GlassCard } from "../../../components/ui/GlassCard";
import { fetchAnnouncements } from "../../../lib/api";
import { ArrowLeft, Bell, MessageSquare, Award, Info } from "lucide-react-native";

export default function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNotifications() {
      setLoading(true);
      try {
        const res = await fetchAnnouncements();
        if (res?.announcements) {
          setItems(res.announcements);
        }
      } catch (err) {
        console.warn("Failed to load announcements:", err);
      } finally {
        setLoading(false);
      }
    }
    loadNotifications();
  }, []);

  const getIcon = (category?: string) => {
    switch (category?.toLowerCase()) {
      case "academic":
      case "achievement":
        return <Award size={18} color={colors.accent} />;
      case "event":
        return <Bell size={18} color={colors.accentTeal} />;
      case "general":
      default:
        return <Info size={18} color={colors.accentTealDim} />;
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications & Notices</Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id || item.title}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <GlassCard elevated style={styles.card}>
              <View style={styles.iconWrap}>{getIcon(item.category)}</View>
              <View style={styles.cardInfo}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  {item.createdAt && (
                    <Text style={styles.cardTime}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                  )}
                </View>
                <Text style={styles.cardBody}>{item.content}</Text>
              </View>
            </GlassCard>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Bell size={32} color={colors.textMuted} />
              <Text style={styles.emptyText}>No notifications yet.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    padding: 16,
    gap: 10,
  },
  card: {
    flexDirection: "row",
    padding: 14,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: {
    flex: 1,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  cardTime: {
    color: colors.textMuted,
    fontSize: 11,
  },
  cardBody: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
