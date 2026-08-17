import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Linking,
  Modal,
} from "react-native";
import {
  Github,
  GitPullRequest,
  ExternalLink,
  RefreshCw,
  FolderGit2,
  CheckCircle2,
  ChevronLeft,
  MessageSquare,
} from "lucide-react-native";
import { colors } from "@/theme/tokens";
import { api } from "@/lib/api";

export interface GitHubChannelData {
  integration: any | null;
  repository: {
    id: string;
    github_repo_id: number;
    full_name: string;
    repo_name: string;
    owner_login: string;
    is_private: boolean;
    default_branch: string;
  } | null;
  pullRequests: Array<{
    id: string;
    number: number;
    title: string;
    author: { name: string; avatarUrl?: string };
    status: "open" | "draft" | "review" | "merged" | "closed";
    branch: string;
    url: string;
    commentsCount: number;
    updatedAt: string;
  }>;
  authorizedRepositories: Array<{
    id: string;
    github_repo_id: number;
    full_name: string;
    repo_name: string;
    owner_login: string;
    is_private: boolean;
    default_branch: string;
  }>;
}

export function GitHubChannelView({
  channelId,
  channelName,
  onBack,
  onOpenChat,
}: {
  channelId?: string;
  channelName?: string;
  onBack?: () => void;
  onOpenChat?: () => void;
}) {
  const [data, setData] = useState<GitHubChannelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "open" | "merged" | "closed">("all");
  const [bindModalOpen, setBindModalOpen] = useState(false);
  const [binding, setBinding] = useState(false);

  const loadData = async (isManual = false) => {
    if (!channelId) return;
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await api<GitHubChannelData>(`/channels/${channelId}/github`);
      if (res) setData(res);
    } catch (err: any) {
      console.warn("[GitHubChannelView] Load failed:", err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [channelId]);

  const handleBindRepo = async (repoId: string) => {
    if (!channelId) return;
    setBinding(true);
    try {
      await api(`/channels/${channelId}/github`, {
        method: "POST",
        body: JSON.stringify({ repositoryId: repoId }),
      });
      setBindModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.warn("[GitHubChannelView] Bind failed:", err?.message);
    } finally {
      setBinding(false);
    }
  };

  const pulls = (data?.pullRequests || []).filter((p) => {
    if (activeFilter === "all") return true;
    return p.status === activeFilter;
  });

  return (
    <View style={styles.container}>
      {/* Header with Back and Chat toggle */}
      <View style={styles.header}>
        {onBack && (
          <Pressable onPress={onBack} style={styles.backBtn} hitSlop={10}>
            <ChevronLeft size={22} color={colors.textPrimary} />
          </Pressable>
        )}
        <Github size={18} color={colors.accentTeal} />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            #{channelName || "github"}
          </Text>
          <Text style={styles.headerSub}>GITHUB WORKSPACE HUB</Text>
        </View>

        <Pressable onPress={() => loadData(true)} style={styles.actionBtn}>
          <RefreshCw size={15} color={refreshing ? colors.accent : colors.textMuted} />
        </Pressable>

        {onOpenChat && (
          <Pressable onPress={onOpenChat} style={styles.chatToggleBtn}>
            <MessageSquare size={15} color={colors.accent} />
            <Text style={styles.chatToggleText}>Chat</Text>
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Connecting to GitHub repository...</Text>
        </View>
      ) : !data?.repository ? (
        /* Empty State: Repository not connected */
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconWrap}>
            <FolderGit2 size={36} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>GitHub Repository Not Connected</Text>
          <Text style={styles.emptyDesc}>
            Bind an authorized repository to this channel to stream commits, pull requests, and CI/CD status updates.
          </Text>

          {data?.authorizedRepositories && data.authorizedRepositories.length > 0 ? (
            <Pressable
              onPress={() => setBindModalOpen(true)}
              style={styles.connectBtn}
            >
              <Github size={16} color={colors.accentContrast} />
              <Text style={styles.connectBtnText}>Connect Repository ({data.authorizedRepositories.length} Available)</Text>
            </Pressable>
          ) : (
            <View style={styles.unauthBadge}>
              <Text style={styles.unauthText}>
                No GitHub organizations installed yet in Space Settings.
              </Text>
            </View>
          )}
        </View>
      ) : (
        /* Connected Repository Hub View */
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Active Repo Card */}
          <View style={styles.repoCard}>
            <View style={styles.repoCardLeft}>
              <FolderGit2 size={20} color={colors.accentTeal} />
              <View style={{ flex: 1 }}>
                <Text style={styles.repoName}>{data.repository.full_name}</Text>
                <Text style={styles.repoMeta}>
                  Default branch: {data.repository.default_branch || "main"} {data.repository.is_private ? "· Private" : "· Public"}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() =>
                Linking.openURL(`https://github.com/${data.repository!.full_name}`).catch(() => {})
              }
              style={styles.openGithubBtn}
            >
              <ExternalLink size={14} color={colors.accent} />
            </Pressable>
          </View>

          {/* Filter Pills */}
          <View style={styles.filterRow}>
            {(["all", "open", "merged", "closed"] as const).map((filter) => (
              <Pressable
                key={filter}
                onPress={() => setActiveFilter(filter)}
                style={[
                  styles.filterPill,
                  activeFilter === filter && styles.filterPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    activeFilter === filter && styles.filterTextActive,
                  ]}
                >
                  {filter.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* PR List */}
          {pulls.length === 0 ? (
            <View style={styles.emptyPullsBox}>
              <GitPullRequest size={24} color={colors.textMuted} />
              <Text style={styles.emptyPullsText}>No pull requests in this view</Text>
            </View>
          ) : (
            pulls.map((pr) => (
              <Pressable
                key={pr.id || pr.number}
                onPress={() => Linking.openURL(pr.url).catch(() => {})}
                style={styles.prCard}
              >
                <View style={styles.prHeader}>
                  <GitPullRequest
                    size={16}
                    color={
                      pr.status === "merged"
                        ? colors.accent
                        : pr.status === "open"
                        ? colors.statusOnline
                        : colors.textMuted
                    }
                  />
                  <Text style={styles.prNumber}>#{pr.number}</Text>
                  <Text style={styles.prAuthor}>by {pr.author?.name || "contributor"}</Text>
                </View>
                <Text style={styles.prTitle}>{pr.title}</Text>
                <View style={styles.prFooter}>
                  <Text style={styles.prBranch}>branch: {pr.branch}</Text>
                  <ExternalLink size={12} color={colors.textMuted} />
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}

      {/* Repository Selection Modal */}
      <Modal
        visible={bindModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setBindModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Connect Repository to Channel</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {(data?.authorizedRepositories || []).map((repo) => (
                <Pressable
                  key={repo.id}
                  onPress={() => handleBindRepo(repo.id)}
                  disabled={binding}
                  style={styles.repoSelectItem}
                >
                  <FolderGit2 size={16} color={colors.accentTeal} />
                  <Text style={styles.repoSelectName}>{repo.full_name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              onPress={() => setBindModalOpen(false)}
              style={styles.modalCloseBtn}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
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
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    gap: 10,
  },
  backBtn: {
    marginRight: 2,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  headerSub: {
    color: colors.accentTeal,
    fontSize: 9,
    fontWeight: "800",
    fontFamily: "monospace",
    letterSpacing: 0.8,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  chatToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(232, 163, 61, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(232, 163, 61, 0.25)",
  },
  chatToggleText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  emptyIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyDesc: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 320,
  },
  connectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  connectBtnText: {
    color: colors.accentContrast,
    fontSize: 13,
    fontWeight: "700",
  },
  unauthBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  unauthText: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    gap: 12,
  },
  repoCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 14,
    padding: 12,
  },
  repoCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  repoName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  repoMeta: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
    fontFamily: "monospace",
  },
  openGithubBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(232, 163, 61, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  filterPillActive: {
    backgroundColor: "rgba(232, 163, 61, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(232, 163, 61, 0.3)",
  },
  filterText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  filterTextActive: {
    color: colors.accent,
  },
  emptyPullsBox: {
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyPullsText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  prCard: {
    backgroundColor: "rgba(255, 255, 255, 0.025)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  prHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  prNumber: {
    color: colors.accentTeal,
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  prAuthor: {
    color: colors.textMuted,
    fontSize: 11,
  },
  prTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  prFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  prBranch: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: "monospace",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#10121A",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    gap: 14,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  repoSelectItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  repoSelectName: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "500",
  },
  modalCloseBtn: {
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  modalCloseText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
});
