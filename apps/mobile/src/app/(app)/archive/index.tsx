import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius } from "../../../theme/tokens";
import { GlassCard } from "../../../components/ui/GlassCard";
import { Badge } from "../../../components/ui/Badge";
import { fetchArchiveRecords } from "../../../lib/api";
import {
  ArrowLeft,
  Search,
  Archive,
  FolderGit2,
  Video as VideoIcon,
  Cpu,
  FileText,
  GitBranch,
  Play,
} from "lucide-react-native";

export default function ArchiveScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const types = [
    { id: "all", label: "All Records" },
    { id: "repository", label: "Repositories" },
    { id: "video", label: "Sessions & Talks" },
    { id: "document", label: "Documents" },
    { id: "build", label: "Live Builds" },
  ];

  useEffect(() => {
    fetchArchiveRecords()
      .then((res) => {
        setRecords(res?.records || []);
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Failed to load archive records:", err);
        setLoading(false);
      });
  }, []);

  const filtered = records.filter((a) => {
    const q = search.toLowerCase();
    const matchesQuery =
      (a.title || "").toLowerCase().includes(q) ||
      (a.description || "").toLowerCase().includes(q) ||
      (a.archiveId || "").toLowerCase().includes(q) ||
      (a.repository?.full_name || "").toLowerCase().includes(q);

    if (!matchesQuery) return false;

    if (selectedType === "all") return true;
    if (selectedType === "repository") return a.type === "repository" || Boolean(a.repository);
    if (selectedType === "video") return a.type === "video" || Boolean(a.video);
    if (selectedType === "document") return a.type === "document" || a.type === "policy" || a.type === "report" || Boolean(a.document);
    if (selectedType === "build") return a.type === "build" || Boolean(a.build);

    return true;
  });

  function renderSpecializedCard(item: any) {
    const isRepo = item.type === "repository" || Boolean(item.repository);
    const isVideo = item.type === "video" || Boolean(item.video);
    const isBuild = item.type === "build" || Boolean(item.build);

    return (
      <GlassCard elevated style={styles.card}>
        <View style={styles.cardTop}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {isRepo ? (
              <FolderGit2 size={15} color={colors.accentTeal} />
            ) : isVideo ? (
              <VideoIcon size={15} color={colors.danger} />
            ) : isBuild ? (
              <Cpu size={15} color={colors.accent} />
            ) : (
              <FileText size={15} color={colors.info} />
            )}
            <Badge
              label={(item.type || (isRepo ? "Repository" : isVideo ? "Video" : "Document")).toUpperCase()}
              variant={isRepo ? "teal" : isVideo ? "danger" : isBuild ? "warning" : "muted"}
            />
          </View>
          <Badge label={item.session || String(item.year || "2026–27")} variant="muted" />
        </View>

        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardDesc}>{item.description}</Text>

        {isRepo && item.repository && (
          <View style={styles.metaRow}>
            <GitBranch size={12} color={colors.accentTeal} />
            <Text style={styles.metaText}>{item.repository.full_name || item.repository.url}</Text>
          </View>
        )}

        {isVideo && (item.video || item.youtubeUrl) && (
          <View style={styles.metaRow}>
            <Play size={12} color={colors.danger} />
            <Text style={styles.metaText}>
              {item.video?.speaker || "AIIC Speaker"} · {item.video?.duration || "Session Recording"}
            </Text>
          </View>
        )}

        {isBuild && item.build && (
          <View style={styles.metaRow}>
            <Cpu size={12} color={colors.accent} />
            <Text style={styles.metaText}>Version {item.build.version || "v1.0.0"} · {item.build.environment || "Production"}</Text>
          </View>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.sessionText}>
            {item.repository?.full_name || item.session || "AIIC Archive"}
          </Text>
          <Text style={styles.idText}>{item.archiveId || item.id}</Text>
        </View>
      </GlassCard>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.title}>Historical Archive</Text>
      </View>

      <View style={styles.searchBar}>
        <Search size={16} color={colors.textMuted} />
        <TextInput
          placeholder="Search historical records, repos, and sessions..."
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
        {types.map((t) => (
          <TouchableOpacity
            key={t.id}
            onPress={() => setSelectedType(t.id)}
            style={[styles.filterPill, selectedType === t.id && styles.filterPillActive]}
          >
            <Text style={[styles.filterPillText, selectedType === t.id && styles.filterPillTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id || item.archiveId}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => renderSpecializedCard(item)}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No matching archive records found.</Text>
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
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceInput,
    borderRadius: radius.md,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
  },
  list: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    padding: 16,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
  },
  cardDesc: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: 8,
  },
  sessionText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  idText: {
    color: colors.accent,
    fontSize: 11,
    fontFamily: "monospace",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  tabScroll: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 12,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  filterPillActive: {
    backgroundColor: "rgba(232, 163, 61, 0.15)",
    borderColor: colors.accent,
  },
  filterPillText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  filterPillTextActive: {
    color: colors.accent,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 8,
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: "monospace",
  },
});
