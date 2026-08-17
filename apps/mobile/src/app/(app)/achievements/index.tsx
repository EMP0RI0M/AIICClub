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
import { AIICAchievement } from "../../../lib/types";
import { getSupabaseClient } from "../../../lib/supabase";
import { ArrowLeft, Trophy } from "lucide-react-native";

export default function AchievementsScreen() {
  const router = useRouter();
  const [achievements, setAchievements] = useState<AIICAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAchievements() {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("achievements")
          .select("*")
          .order("date", { ascending: false });

        if (!error && data && data.length > 0) {
          setAchievements(
            data.map((a: any) => ({
              id: a.id,
              title: a.title,
              description: a.description,
              recipient: a.recipient,
              category: a.category || "Competition",
              date: a.date,
              organization: a.organization || "AIIC Institutional Review",
              rankResult: a.rank_result,
              proofLink: a.proof_link,
              image: a.image,
              featured: a.featured || false,
              createdAt: a.created_at,
            }))
          );
        }
      } catch (err) {
        console.warn("Failed to load achievements:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAchievements();
  }, []);

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.title}>Achievements & Honors</Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={achievements}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <GlassCard elevated style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.iconWrap}>
                  <Trophy size={20} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Badge label={item.category} variant="teal" />
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.recipient}>Recipient: {item.recipient}</Text>
                </View>
              </View>

              <Text style={styles.cardDesc}>{item.description}</Text>

              <View style={styles.footer}>
                <Text style={styles.orgText}>{item.organization}</Text>
                <Text style={styles.dateText}>{item.date}</Text>
              </View>
            </GlassCard>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No registered achievements yet.</Text>
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
  cardTop: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 8,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    marginVertical: 4,
  },
  recipient: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "600",
  },
  cardDesc: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: 8,
  },
  orgText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  dateText: {
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
