import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius } from "../../../theme/tokens";
import { GlassCard } from "../../../components/ui/GlassCard";
import { Badge } from "../../../components/ui/Badge";
import { ArrowLeft, AlertTriangle, Clock, CheckCircle2, ShieldAlert } from "lucide-react-native";

export default function IncidentRoomScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const incident = {
    title: "Service Degraded: Realtime Broadcast Cluster",
    severity: "P2 - Elevated Latency",
    status: "Monitoring",
    commander: "Alex Rivera",
    startedAt: "Today at 14:02 UTC",
    timeline: [
      {
        time: "14:28 UTC",
        author: "Alex Rivera",
        message: "Traffic diverted to secondary edge cluster. P99 latency normalized to 38ms.",
        status: "mitigated",
      },
      {
        time: "14:15 UTC",
        author: "Sarah Chen",
        message: "Identified high socket reconnection rate on region US-East.",
        status: "investigating",
      },
      {
        time: "14:02 UTC",
        author: "System Monitor",
        message: "Elevated connection drop rate triggered P2 alert.",
        status: "triggered",
      },
    ],
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Incident Response Room</Text>
          <Text style={styles.headerSubtitle}>Live Ops & Mitigation Timeline</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <GlassCard elevated style={styles.bannerCard}>
          <View style={styles.bannerTop}>
            <ShieldAlert size={24} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Badge label={incident.severity} variant="warning" />
              <Text style={styles.incidentTitle}>{incident.title}</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Commander: {incident.commander}</Text>
            <Text style={styles.metaLabel}>Started: {incident.startedAt}</Text>
          </View>
        </GlassCard>

        <Text style={styles.sectionHeader}>INCIDENT TIMELINE</Text>

        <View style={styles.timelineList}>
          {incident.timeline.map((entry, idx) => (
            <GlassCard key={idx} style={styles.timelineCard}>
              <View style={styles.timelineHeader}>
                <Badge
                  label={entry.time}
                  variant={entry.status === "mitigated" ? "teal" : "primary"}
                />
                <Text style={styles.timelineAuthor}>@{entry.author}</Text>
              </View>
              <Text style={styles.timelineMsg}>{entry.message}</Text>
            </GlassCard>
          ))}
        </View>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  bannerCard: {
    padding: 16,
    marginBottom: 20,
    borderColor: colors.warning,
  },
  bannerTop: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 12,
  },
  incidentTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 6,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: 10,
  },
  metaLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  sectionHeader: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  timelineList: {
    gap: 10,
  },
  timelineCard: {
    padding: 14,
  },
  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  timelineAuthor: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "600",
  },
  timelineMsg: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
});
