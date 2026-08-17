import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
} from "react-native";
import { colors, radius } from "../../theme/tokens";
import { GlassCard } from "./GlassCard";
import { Badge } from "./Badge";
import {
  AlertTriangle,
  ChevronLeft,
  ShieldAlert,
  Clock,
  CheckCircle,
  Plus,
  Send,
} from "lucide-react-native";

export type IncidentStatus = "active" | "monitoring" | "resolved";

export function IncidentChannelView({
  channelName,
  onBack,
}: {
  channelName: string;
  onBack: () => void;
}) {
  const [status, setStatus] = useState<IncidentStatus>("active");
  const [severity, setSeverity] = useState<"P0" | "P1" | "P2" | "P3">("P2");
  const [commander, setCommander] = useState<string>("Alex Rivera");
  const [newUpdateText, setNewUpdateText] = useState("");

  const [timeline, setTimeline] = useState<Array<{ time: string; author: string; message: string; status: string }>>([
    {
      time: "14:28 UTC",
      author: "Alex Rivera",
      message: "Traffic diverted to secondary edge cluster. P99 latency normalized to 38ms.",
      status: "mitigated",
    },
    {
      time: "14:15 UTC",
      author: "Sarah Chen",
      message: "Identified elevated socket reconnection rate on region US-East.",
      status: "investigating",
    },
    {
      time: "14:02 UTC",
      author: "System Monitor",
      message: "Elevated connection drop rate triggered automated incident.",
      status: "triggered",
    },
  ]);

  function addTimelineUpdate() {
    if (!newUpdateText.trim()) return;
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setTimeline([
      {
        time: `${now} UTC`,
        author: commander || "Commander",
        message: newUpdateText.trim(),
        status: status === "resolved" ? "resolved" : "investigating",
      },
      ...timeline,
    ]);
    setNewUpdateText("");
  }

  return (
    <View style={styles.container}>
      {/* Incident Header */}
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <View style={styles.titleRow}>
            <AlertTriangle size={17} color={colors.danger} />
            <Text style={styles.channelName} numberOfLines={1}>
              {channelName}
            </Text>
            <View style={[styles.statusBadge, { borderColor: status === "resolved" ? colors.success : colors.danger }]}>
              <Text style={[styles.statusBadgeText, { color: status === "resolved" ? colors.success : colors.danger }]}>
                {status.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.subText}>Active Incident Response & Live War Room</Text>
        </View>

        {status !== "resolved" && (
          <Pressable
            onPress={() => setStatus("resolved")}
            style={styles.resolveBtn}
          >
            <Text style={styles.resolveBtnText}>Resolve</Text>
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status / Severity / Commander Control Matrix */}
        <GlassCard elevated style={styles.matrixCard}>
          <View style={styles.matrixRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.matrixLabel}>SEVERITY</Text>
              <View style={styles.severityRow}>
                {(["P0", "P1", "P2", "P3"] as const).map((sev) => (
                  <Pressable
                    key={sev}
                    onPress={() => setSeverity(sev)}
                    style={[
                      styles.sevPill,
                      severity === sev && styles.sevPillActive,
                    ]}
                  >
                    <Text style={[styles.sevPillText, severity === sev && styles.sevPillTextActive]}>
                      {sev}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.matrixLabel}>COMMANDER</Text>
              <Pressable
                onPress={() => setCommander("Me (Claimed)")}
                style={styles.commanderPill}
              >
                <Text style={styles.commanderText} numberOfLines={1}>
                  {commander}
                </Text>
              </Pressable>
            </View>
          </View>
        </GlassCard>

        {/* Timeline Updates */}
        <Text style={styles.sectionHeader}>INCIDENT TIMELINE & WAR ROOM LOG</Text>

        <View style={styles.newUpdateBox}>
          <TextInput
            placeholder="Post timeline update or mitigation finding..."
            placeholderTextColor={colors.textMuted}
            value={newUpdateText}
            onChangeText={setNewUpdateText}
            style={styles.newUpdateInput}
          />
          <Pressable
            onPress={addTimelineUpdate}
            disabled={!newUpdateText.trim()}
            style={[styles.postBtn, !newUpdateText.trim() && { opacity: 0.4 }]}
          >
            <Send size={15} color={colors.accentContrast} />
          </Pressable>
        </View>

        <View style={styles.timelineList}>
          {timeline.map((entry, idx) => (
            <GlassCard key={idx} style={styles.timelineCard}>
              <View style={styles.timelineHeader}>
                <Badge
                  label={entry.time}
                  variant={entry.status === "mitigated" ? "teal" : "warning"}
                />
                <Text style={styles.timelineAuthor}>@{entry.author}</Text>
              </View>
              <Text style={styles.timelineMsg}>{entry.message}</Text>
            </GlassCard>
          ))}
        </View>
      </ScrollView>
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
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.12)",
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(28, 30, 42, 0.88)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  channelName: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: "800",
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  subText: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  resolveBtn: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    borderWidth: 1,
    borderColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  resolveBtnText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: "800",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  matrixCard: {
    padding: 14,
    backgroundColor: "rgba(22, 24, 33, 0.85)",
    borderRadius: 16,
    marginBottom: 16,
  },
  matrixRow: {
    flexDirection: "row",
    gap: 12,
  },
  matrixLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  severityRow: {
    flexDirection: "row",
    gap: 4,
  },
  sevPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  sevPillActive: {
    backgroundColor: colors.danger,
  },
  sevPillText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
  },
  sevPillTextActive: {
    color: "#FFF",
  },
  commanderPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "rgba(232, 163, 61, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(232, 163, 61, 0.25)",
  },
  commanderText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
  },
  sectionHeader: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  newUpdateBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(28, 30, 42, 0.88)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 14,
    gap: 8,
  },
  newUpdateInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
  },
  postBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineList: {
    gap: 8,
  },
  timelineCard: {
    padding: 12,
    backgroundColor: "rgba(22, 24, 33, 0.85)",
    borderRadius: 14,
  },
  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  timelineAuthor: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "600",
  },
  timelineMsg: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
});
