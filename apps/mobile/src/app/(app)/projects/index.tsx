import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius } from "../../../theme/tokens";
import { GlassCard } from "../../../components/ui/GlassCard";
import { Badge } from "../../../components/ui/Badge";
import { AIICProject } from "../../../lib/types";
import { getSupabaseClient } from "../../../lib/supabase";
import { FolderKanban, Search, ArrowRight } from "lucide-react-native";

export default function ProjectsListScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("All");
  const [projects, setProjects] = useState<AIICProject[]>([]);
  const [loading, setLoading] = useState(true);

  const categories = ["All", "AI", "Robotics", "Security", "Hardware"];

  useEffect(() => {
    async function loadProjects() {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          setProjects(
            data.map((p: any) => ({
              id: p.id,
              title: p.title,
              slug: p.slug,
              summary: p.summary || p.short_description || "",
              description: p.description,
              status: p.status || "Active",
              category: p.category || "AI",
              coverImage: p.cover_image,
              gallery: p.gallery || [],
              technologies: p.technologies || [],
              repositoryUrl: p.repository_url || p.github_url,
              demoUrl: p.demo_url,
              documentationUrl: p.documentation_url,
              team: p.team || [],
              startDate: p.start_date,
              endDate: p.end_date,
              featured: p.featured || false,
              createdAt: p.created_at,
              updatedAt: p.updated_at,
            }))
          );
        }
      } catch (err) {
        console.warn("Failed to load projects:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, []);

  const filtered = projects.filter((p: AIICProject) => {
    const matchQuery =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.summary.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "All" || p.category === filterCat;
    return matchQuery && matchCat;
  });

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>AIIC Projects</Text>
          <Text style={styles.subtitle}>
            Research initiatives, prototypes, and open source repositories.
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <Search size={16} color={colors.textMuted} />
        <TextInput
          placeholder="Search research & projects..."
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {categories.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.filterChip, filterCat === c && styles.filterChipActive]}
            onPress={() => setFilterCat(c)}
          >
            <Text
              style={[
                styles.filterChipText,
                filterCat === c && styles.filterChipTextActive,
              ]}
            >
              {c}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push(`/(app)/projects/${item.slug}`)}
            >
              <GlassCard elevated style={styles.card}>
                <View style={styles.cardHeader}>
                  <Badge
                    label={item.category}
                    variant={item.category === "AI" ? "teal" : "primary"}
                  />
                  <Badge label={item.status} variant="muted" />
                </View>

                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSummary} numberOfLines={2}>
                  {item.summary}
                </Text>

                {/* Technologies */}
                <View style={styles.techWrap}>
                  {item.technologies.slice(0, 4).map((tech: string) => (
                    <View key={tech} style={styles.techPill}>
                      <Text style={styles.techText}>{tech}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.teamText}>
                    Team: {item.team.join(", ")}
                  </Text>
                  <ArrowRight size={16} color={colors.accent} />
                </View>
              </GlassCard>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No matching projects found.</Text>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceInput,
    borderRadius: radius.md,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: colors.accent,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    marginBottom: 6,
  },
  cardSummary: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  techWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  techPill: {
    backgroundColor: colors.surfaceInput,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  techText: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: "monospace",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: 10,
  },
  teamText: {
    color: colors.textMuted,
    fontSize: 11,
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
