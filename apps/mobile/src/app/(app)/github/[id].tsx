import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius } from "../../../theme/tokens";
import { GlassCard } from "../../../components/ui/GlassCard";
import { Badge } from "../../../components/ui/Badge";
import { fetchChannelGitHub } from "../../../lib/api";
import {
  ArrowLeft,
  GitPullRequest,
  GitMerge,
  GitCommit,
  ExternalLink,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react-native";

export default function GitHubChannelScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchChannelGitHub(id)
        .then((res) => {
          setData(res);
          setLoading(false);
        })
        .catch((err) => {
          console.warn("Failed to load GitHub data:", err);
          setLoading(false);
        });
    }
  }, [id]);

  const pullRequests = data?.pullRequests || [];
  const repo = data?.repository;

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>GitHub Feed</Text>
          <Text style={styles.headerSubtitle}>
            {repo?.full_name || "Repository Activity & Pull Requests"}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={pullRequests}
          keyExtractor={(item) => String(item.id || item.number)}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            repo ? (
              <GlassCard elevated style={styles.repoCard}>
                <View style={styles.repoTop}>
                  <GitPullRequest size={20} color={colors.accentTeal} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.repoName}>{repo.full_name}</Text>
                    <Text style={styles.repoBranch}>
                      Default Branch: {repo.default_branch || "main"}
                    </Text>
                  </View>
                </View>
              </GlassCard>
            ) : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => item.url && Linking.openURL(item.url)}
            >
              <GlassCard elevated style={styles.prCard}>
                <View style={styles.prHeader}>
                  <View style={styles.prTitleRow}>
                    <GitPullRequest
                      size={16}
                      color={
                        item.status === "merged"
                          ? colors.accent
                          : item.status === "closed"
                          ? colors.danger
                          : colors.accentTeal
                      }
                    />
                    <Text style={styles.prNumber}>#{item.number}</Text>
                    <Badge
                      label={item.status}
                      variant={
                        item.status === "merged"
                          ? "primary"
                          : item.status === "closed"
                          ? "muted"
                          : "teal"
                      }
                    />
                  </View>
                  <Text style={styles.prTime}>
                    {new Date(item.updatedAt).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                </View>

                <Text style={styles.prTitle}>{item.title}</Text>

                <View style={styles.prFooter}>
                  <Text style={styles.prAuthor}>by @{item.author}</Text>
                  {item.url && <ExternalLink size={14} color={colors.textMuted} />}
                </View>
              </GlassCard>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No Open Pull Requests</Text>
              <Text style={styles.emptySubtitle}>
                {repo
                  ? "All branches are merged and up-to-date."
                  : "Connect a repository in Channel Settings."}
              </Text>
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
    backgroundColor: colors.bgDeep,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
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
  repoCard: {
    padding: 14,
    marginBottom: 8,
  },
  repoTop: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  repoName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  repoBranch: {
    color: colors.textMuted,
    fontSize: 12,
  },
  prCard: {
    padding: 14,
  },
  prHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  prTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  prNumber: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  prTime: {
    color: colors.textMuted,
    fontSize: 11,
  },
  prTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    marginBottom: 8,
  },
  prFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: 8,
  },
  prAuthor: {
    color: colors.textMuted,
    fontSize: 12,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
  },
});
