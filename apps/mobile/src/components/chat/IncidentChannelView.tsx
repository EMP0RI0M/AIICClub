import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
} from "react-native";
import { colors, radius } from "../../theme/tokens";
import { GlassCard } from "../ui/GlassCard";
import { Badge } from "../ui/Badge";
import {
  AlertTriangle,
  ChevronLeft,
  ShieldAlert,
  Clock,
  CheckCircle,
  Plus,
  Send,
} from "lucide-react-native";

import { api, saveIncidentState } from "../../lib/api";
import { useAuthStore } from "../../stores/auth-store";

export type IncidentStatus = "active" | "monitoring" | "resolved";

export function IncidentChannelView({
  channelId,
  channelName,
  initialIncident,
  onBack,
}: {
  channelId?: string;
  channelName: string;
  initialIncident?: {
    status?: IncidentStatus;
    severity?: "P0" | "P1" | "P2" | "P3";
    commander?: { name: string; id: string };
    timeline?: Array<{ time: string; author: string; message: string; status: string }>;
  };
  onBack: () => void;
}) {
  const currentUser = useAuthStore((s) => s.user);
  const [status, setStatus] = useState<IncidentStatus>(initialIncident?.status || "active");
  const [severity, setSeverity] = useState<"P0" | "P1" | "P2" | "P3">(initialIncident?.severity || "P2");
  const [commander, setCommander] = useState<string>(
    initialIncident?.commander?.name || currentUser?.displayName || currentUser?.username || "Incident Commander"
  );
  const [newUpdateText, setNewUpdateText] = useState("");
  const [timeline, setTimeline] = useState<Array<{ time: string; author: string; message: string; status: string }>>(
    initialIncident?.timeline || []
  );

  useEffect(() => {
    if (!channelId) return;
    api<{ incident: any }>(`/channels/${channelId}/incident`).then(({ incident }) => {
      if (!incident) return;
      setStatus(incident.status || "active");
      setSeverity(incident.severity || "P2");
      if (incident.commander?.name) {
        setCommander(incident.commander.name);
      }
      if (Array.isArray(incident.timeline)) {
        setTimeline(
          incident.timeline.map((entry: any) => {
            const rawText = entry.text || entry.message || "";
            let author = entry.author;
            let message = rawText;
            if (!author && rawText.includes(": ")) {
              const parts = rawText.split(": ");
              author = parts[0];
              message = parts.slice(1).join(": ");
            }
            return {
              time: entry.time || entry.at || "",
              author: author || "System",
              message: message,
              status: entry.status || "investigating",
            };
          })
        );
      }
    }).catch((err) => console.warn("[IncidentChannelView] Load failed:", err?.message));
  }, [channelId]);

  const persistIncident = (
    nextStatus: IncidentStatus,
    nextSev: "P0" | "P1" | "P2" | "P3",
    nextCmd: string,
    nextTimeline: typeof timeline
  ) => {
    if (!channelId) return;
    saveIncidentState(channelId, {
      status: nextStatus,
      severity: nextSev,
      commander: { name: nextCmd, id: currentUser?.id },
      services: ["Edge Gateway", "Auth Cluster"],
      timeline: nextTimeline.map((t) => ({
        at: t.time,
        time: t.time,
        author: t.author,
        message: t.message,
        text: `${t.author}: ${t.message}`,
        status: t.status,
      })),
    }).catch(console.warn);
  };

  function addTimelineUpdate() {
    if (!newUpdateText.trim()) return;
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const nextTimeline = [
      {
        time: `${now} UTC`,
        author: currentUser?.displayName || currentUser?.username || commander || "Commander",
        message: newUpdateText.trim(),
        status: status === "resolved" ? "resolved" : "investigating",
      },
      ...timeline,
    ];
    setTimeline(nextTimeline);
    setNewUpdateText("");
    persistIncident(status, severity, commander, nextTimeline);
  }

  function handleClaimCommand() {
    const myName = currentUser?.displayName || currentUser?.username || "Me";
    setCommander(myName);
    persistIncident(status, severity, myName, timeline);
  }

  function handleStatusChange(nextStatus: IncidentStatus) {
    setStatus(nextStatus);
    persistIncident(nextStatus, severity, commander, timeline);
  }

  function handleSeverityChange(nextSev: "P0" | "P1" | "P2" | "P3") {
    setSeverity(nextSev);
    persistIncident(status, nextSev, commander, timeline);
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

        {status !== "resolved" ? (
          <Pressable
            onPress={() => handleStatusChange("resolved")}
            style={styles.resolveBtn}
          >
            <Text style={styles.resolveBtnText}>Close</Text>
          </Pressable>
        ) : <Pressable onPress={() => handleStatusChange("active")} style={styles.resolveBtn}><Text style={styles.resolveBtnText}>Reopen</Text></Pressable>}
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
                    onPress={() => handleSeverityChange(sev)}
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
                onPress={handleClaimCommand}
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
