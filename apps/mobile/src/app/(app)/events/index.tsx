import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius } from "../../../theme/tokens";
import { GlassCard } from "../../../components/ui/GlassCard";
import { Badge } from "../../../components/ui/Badge";
import { AIICEvent } from "../../../lib/types";
import { getSupabaseClient } from "../../../lib/supabase";
import { Calendar, MapPin, Users, ArrowRight } from "lucide-react-native";

export default function EventsListScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<"Upcoming" | "Past" | "All">("Upcoming");
  const [events, setEvents] = useState<AIICEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvents() {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .order("start_at", { ascending: false });

        if (!error && data && data.length > 0) {
          setEvents(
            data.map((e: any) => ({
              id: e.id,
              title: e.title,
              slug: e.slug,
              description: e.description,
              startAt: e.start_at,
              endAt: e.end_at,
              location: e.location || "Bal Bhawan School AI Lab",
              type: e.event_type || e.type || "Workshop",
              status: e.status || "Upcoming",
              coverImage: e.cover_image,
              organizer: e.organizer || "AIIC Core",
              registrationUrl: e.registration_url,
              capacity: e.capacity,
              createdAt: e.created_at,
              updatedAt: e.updated_at,
            }))
          );
        }
      } catch (err) {
        console.warn("Failed to load events:", err);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  const filtered = events.filter((e) => {
    if (filter === "All") return true;
    return e.status === filter;
  });

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AIIC Events & Keynotes</Text>
        <Text style={styles.subtitle}>
          Workshops, international hackathons, and technical symposiums.
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {(["Upcoming", "Past", "All"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, filter === t && styles.tabActive]}
            onPress={() => setFilter(t)}
          >
            <Text
              style={[styles.tabText, filter === t && styles.tabTextActive]}
            >
              {t}
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
              onPress={() => router.push(`/(app)/events/${item.slug}`)}
            >
              <GlassCard elevated style={styles.card}>
                <View style={styles.cardHeader}>
                  <Badge
                    label={item.type}
                    variant={item.type === "Hackathon" ? "teal" : "primary"}
                  />
                  <Badge
                    label={item.status}
                    variant={item.status === "Upcoming" ? "success" : "muted"}
                  />
                </View>

                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>
                  {item.description}
                </Text>

                <View style={styles.infoRow}>
                  <Calendar size={14} color={colors.accent} />
                  <Text style={styles.infoText}>
                    {new Date(item.startAt).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <MapPin size={14} color={colors.accentTeal} />
                  <Text style={styles.infoText}>{item.location}</Text>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.organizerText}>By: {item.organizer}</Text>
                  <ArrowRight size={16} color={colors.accent} />
                </View>
              </GlassCard>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No events found in this category.</Text>
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
  tabsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 12,
  },
  tab: {
    paddingVertical: 8,
    marginRight: 18,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  tabTextActive: {
    color: colors.textPrimary,
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
    marginBottom: 6,
  },
  cardDesc: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  infoText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: 10,
    marginTop: 8,
  },
  organizerText: {
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
