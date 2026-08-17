import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
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
import { ArrowLeft, Search, Archive } from "lucide-react-native";

export default function ArchiveScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    return (
      (a.title || "").toLowerCase().includes(q) ||
      (a.description || "").toLowerCase().includes(q) ||
      (a.archiveId || "").toLowerCase().includes(q)
    );
  });

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

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id || item.archiveId}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <GlassCard elevated style={styles.card}>
              <View style={styles.cardTop}>
                <Badge label={item.session || String(item.year || 2026)} variant="teal" />
                <Badge label={item.type || "Document"} variant="muted" />
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDesc}>{item.description}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.sessionText}>
                  {item.repository?.full_name || item.session || "AIIC Archive"}
                </Text>
                <Text style={styles.idText}>{item.archiveId || item.id}</Text>
              </View>
            </GlassCard>
          )}
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
});
