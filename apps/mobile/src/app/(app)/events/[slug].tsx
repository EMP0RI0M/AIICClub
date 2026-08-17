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
import { ArrowLeft, Calendar, MapPin, Users, Globe } from "lucide-react-native";

export default function EventDetailScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvent() {
      if (!slug) return;
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .eq("slug", slug)
          .single();

        if (!error && data) {
          setEvent({
            title: data.title,
            type: data.event_type || data.type || "Event",
            status: data.status || "Upcoming",
            description: data.description || "",
            startAt: data.start_at
              ? new Date(data.start_at).toLocaleString()
              : "TBA",
            endAt: data.end_at ? new Date(data.end_at).toLocaleString() : "",
            location: data.location || "Online",
            organizer: data.organizer || "AIIC Club",
            capacity: data.capacity,
            registrationUrl: data.registration_url,
          });
        }
      } catch (err) {
        console.warn("Failed to load event:", err);
      } finally {
        setLoading(false);
      }
    }
    loadEvent();
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

  if (!event) {
    return (
      <SafeAreaView edges={["top"]} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color={colors.textSecondary} />
            <Text style={styles.backText}>All Events</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>Event not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.textSecondary} />
          <Text style={styles.backText}>All Events</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.badgesRow}>
          <Badge label={event.type} variant="teal" size="md" />
          <Badge label={event.status} variant="success" size="md" />
        </View>

        <Text style={styles.title}>{event.title}</Text>

        <GlassCard elevated style={styles.metaCard}>
          <View style={styles.metaRow}>
            <Calendar size={18} color={colors.accent} />
            <View>
              <Text style={styles.metaLabel}>Date & Time</Text>
              <Text style={styles.metaVal}>{event.startAt}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <MapPin size={18} color={colors.accentTeal} />
            <View>
              <Text style={styles.metaLabel}>Location</Text>
              <Text style={styles.metaVal}>{event.location}</Text>
            </View>
          </View>

          {event.organizer ? (
            <View style={styles.metaRow}>
              <Users size={18} color={colors.warning} />
              <View>
                <Text style={styles.metaLabel}>Capacity & Organizer</Text>
                <Text style={styles.metaVal}>
                  {event.capacity ? `${event.capacity} seats · ` : ""}Organised by {event.organizer}
                </Text>
              </View>
            </View>
          ) : null}
        </GlassCard>

        {event.registrationUrl ? (
          <Button
            title="Register For Event"
            size="lg"
            icon={<Globe size={18} color={colors.accentContrast} />}
            onPress={() => Linking.openURL(event.registrationUrl)}
            style={{ marginBottom: 20 }}
          />
        ) : null}

        {event.description ? (
          <GlassCard elevated style={styles.descCard}>
            <Text style={styles.sectionTitle}>Event Details</Text>
            <Text style={styles.descText}>{event.description}</Text>
          </GlassCard>
        ) : null}
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
    marginBottom: 16,
  },
  metaCard: {
    padding: 16,
    gap: 14,
    marginBottom: 20,
  },
  metaRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  metaLabel: {
    color: colors.textMuted,
    fontSize: 11,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  metaVal: {
    color: colors.textPrimary,
    fontSize: 13,
    marginTop: 2,
  },
  descCard: {
    padding: 16,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  descText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
});
