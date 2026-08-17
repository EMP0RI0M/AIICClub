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
import { Badge } from "../../../components/ui/Badge";
import { fetchAnnouncements } from "../../../lib/api";
import { ArrowLeft, Bell, AlertCircle } from "lucide-react-native";

export default function NoticesScreen() {
  const router = useRouter();
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements()
      .then((res) => {
        setNotices(res?.announcements || []);
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Failed to load announcements:", err);
        setLoading(false);
      });
  }, []);

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.title}>Official Notice Board</Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={notices}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <GlassCard
              elevated
              style={[styles.card, (item.is_pinned || item.isPinned) && styles.pinnedCard]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.badgeRow}>
                  <Badge
                    label={item.category || "General"}
                    variant={item.category === "Research" ? "teal" : "primary"}
                  />
                  {(item.is_pinned || item.isPinned) && (
                    <Badge label="PINNED NOTICE" variant="warning" />
                  )}
                </View>
                <Text style={styles.timeText}>
                  {item.published_at || item.publishedAt
                    ? new Date(item.published_at || item.publishedAt).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      })
                    : "Recent"}
                </Text>
              </View>

              <Text style={styles.noticeTitle}>{item.title}</Text>
              <Text style={styles.noticeContent}>{item.content}</Text>
            </GlassCard>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No published institutional notices.</Text>
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
    gap: 12,
  },
  card: {
    padding: 16,
  },
  pinnedCard: {
    borderColor: colors.accent,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
  },
  timeText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  noticeTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
    marginBottom: 6,
  },
  noticeContent: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
