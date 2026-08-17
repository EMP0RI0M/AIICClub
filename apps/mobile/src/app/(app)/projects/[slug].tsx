import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius } from "../../../theme/tokens";
import { GlassCard } from "../../../components/ui/GlassCard";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { getSupabaseClient } from "../../../lib/supabase";
import { ArrowLeft, Github, Globe, Terminal, Users, Calendar } from "lucide-react-native";

export default function ProjectDetailScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProject() {
      if (!slug) return;
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .eq("slug", slug)
          .single();

        if (!error && data) {
          setProject({
            title: data.title,
            category: data.category || "Research",
            status: data.status || "Active",
            summary: data.summary || data.short_description || "",
            description: data.description || "",
            technologies: data.technologies || [],
            team: data.team || [],
            repositoryUrl: data.repository_url || data.github_url,
            demoUrl: data.demo_url,
            startDate: data.start_date,
          });
        }
      } catch (err) {
        console.warn("Failed to load project details:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProject();
  }, [slug]);

  if (loading) {
    return (
      <SafeAreaView edges={["top"]} style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!project) {
    return (
      <SafeAreaView edges={["top"]} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color={colors.textSecondary} />
            <Text style={styles.backText}>All Projects</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>Project not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.textSecondary} />
          <Text style={styles.backText}>All Projects</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.badgesRow}>
          <Badge label={project.category} variant="teal" size="md" />
          <Badge label={project.status} variant="primary" size="md" />
        </View>

        <Text style={styles.title}>{project.title}</Text>
        {project.summary ? <Text style={styles.summary}>{project.summary}</Text> : null}

        {/* Action Links */}
        <View style={styles.actionButtons}>
          {project.repositoryUrl && (
            <Button
              title="GitHub Repo"
              variant="secondary"
              icon={<Github size={16} color={colors.textPrimary} />}
              onPress={() => Linking.openURL(project.repositoryUrl)}
              style={{ flex: 1 }}
            />
          )}
          {project.demoUrl && (
            <Button
              title="Live Demo"
              icon={<Globe size={16} color={colors.accentContrast} />}
              onPress={() => Linking.openURL(project.demoUrl)}
              style={{ flex: 1 }}
            />
          )}
        </View>

        {/* Overview Card */}
        {project.description ? (
          <GlassCard elevated style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Overview & Details</Text>
            <Text style={styles.descriptionText}>{project.description}</Text>
          </GlassCard>
        ) : null}

        {/* Technologies Card */}
        {project.technologies && project.technologies.length > 0 && (
          <GlassCard elevated style={styles.sectionCard}>
            <View style={styles.cardHeaderRow}>
              <Terminal size={18} color={colors.accent} />
              <Text style={styles.sectionTitle}>Technology Stack</Text>
            </View>
            <View style={styles.techWrap}>
              {project.technologies.map((t: string) => (
                <View key={t} style={styles.techBadge}>
                  <Text style={styles.techText}>{t}</Text>
                </View>
              ))}
            </View>
          </GlassCard>
        )}

        {/* Team Card */}
        {project.team && project.team.length > 0 && (
          <GlassCard elevated style={styles.sectionCard}>
            <View style={styles.cardHeaderRow}>
              <Users size={18} color={colors.accentTeal} />
              <Text style={styles.sectionTitle}>Project Team</Text>
            </View>
            {project.team.map((m: string, i: number) => (
              <Text key={i} style={styles.memberText}>
                • {m}
              </Text>
            ))}
          </GlassCard>
        )}
      </ScrollView>
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
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  badgesRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30,
    marginBottom: 8,
  },
  summary: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  sectionCard: {
    padding: 16,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  descriptionText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  techWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  techBadge: {
    backgroundColor: colors.surfaceInput,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  techText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "monospace",
  },
  memberText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 4,
  },
});
