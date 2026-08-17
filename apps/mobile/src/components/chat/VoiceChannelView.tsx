import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { colors, radius } from "../../theme/tokens";
import { GlassCard } from "../ui/GlassCard";
import { Badge } from "../ui/Badge";
import { Avatar } from "../ui/Avatar";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff,
  Radio,
  Users,
  Hand,
  ChevronLeft,
  Wifi,
  Sparkles,
} from "lucide-react-native";

export interface VoiceParticipant {
  id: string;
  name: string;
  avatar?: string | null;
  speaking?: boolean;
  muted?: boolean;
  deafened?: boolean;
  sharing?: boolean;
  role?: "speaker" | "listener";
  raisedHand?: boolean;
}

export function VoiceChannelView({
  channelName,
  isStage = false,
  onBack,
}: {
  channelName: string;
  isStage?: boolean;
  onBack: () => void;
}) {
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [connected, setConnected] = useState(true);

  // Mock initial participants for live room visualization
  const [participants] = useState<VoiceParticipant[]>([
    {
      id: "p1",
      name: "Alex Rivera",
      speaking: true,
      role: "speaker",
      muted: false,
    },
    {
      id: "p2",
      name: "Marcus Brody",
      speaking: false,
      role: "speaker",
      muted: true,
    },
    {
      id: "p3",
      name: "Sarah Chen",
      speaking: false,
      role: isStage ? "listener" : "speaker",
      raisedHand: true,
    },
  ]);

  const speakers = isStage ? participants.filter((p) => p.role === "speaker") : participants;
  const listeners = isStage ? participants.filter((p) => p.role === "listener") : [];

  return (
    <View style={styles.container}>
      {/* Voice Header */}
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <View style={styles.titleRow}>
            {isStage ? (
              <Radio size={16} color={colors.live} />
            ) : (
              <Volume2 size={16} color={colors.accentTeal} />
            )}
            <Text style={styles.channelName} numberOfLines={1}>
              {channelName}
            </Text>
            {isStage && (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
          </View>
          <Text style={styles.statusText}>
            {speakers.length} speaking · {listeners.length} listening · WebRTC Connected
          </Text>
        </View>

        <View style={styles.connectionIndicator}>
          <Wifi size={14} color={colors.success} />
        </View>
      </View>

      {/* Main Grid */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isStage && (
          <Text style={styles.sectionHeader}>ON STAGE — {speakers.length}</Text>
        )}

        <View style={styles.grid}>
          {speakers.map((p) => (
            <GlassCard
              key={p.id}
              elevated
              style={[
                styles.participantTile,
                p.speaking && styles.speakingTile,
              ]}
            >
              <Avatar name={p.name} size={54} />
              <Text style={styles.participantName} numberOfLines={1}>
                {p.name}
              </Text>
              <View style={styles.statusBadge}>
                {p.muted ? (
                  <MicOff size={13} color={colors.danger} />
                ) : (
                  <Mic size={13} color={p.speaking ? colors.statusOnline : colors.textMuted} />
                )}
                <Text style={styles.statusBadgeText}>
                  {p.speaking ? "Speaking" : p.muted ? "Muted" : "Active"}
                </Text>
              </View>
            </GlassCard>
          ))}
        </View>

        {isStage && (
          <>
            <Text style={[styles.sectionHeader, { marginTop: 24 }]}>
              AUDIENCE — {listeners.length}
            </Text>
            <View style={styles.audienceGrid}>
              {listeners.map((p) => (
                <View key={p.id} style={styles.audienceItem}>
                  <Avatar name={p.name} size={40} />
                  {p.raisedHand && (
                    <View style={styles.handRaisedPill}>
                      <Hand size={11} color={colors.accent} />
                    </View>
                  )}
                  <Text style={styles.audienceName} numberOfLines={1}>
                    {p.name}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Bottom Voice Control Dock */}
      <View style={styles.controlDock}>
        {isStage ? (
          <Pressable
            onPress={() => setHandRaised((h) => !h)}
            style={[
              styles.dockBtn,
              handRaised && { backgroundColor: colors.accentSoft, borderColor: colors.accent },
            ]}
          >
            <Hand size={18} color={handRaised ? colors.accent : colors.textPrimary} />
            <Text style={[styles.dockBtnText, handRaised && { color: colors.accent }]}>
              {handRaised ? "Hand Raised" : "Raise Hand"}
            </Text>
          </Pressable>
        ) : (
          <>
            <Pressable
              onPress={() => setIsMuted((m) => !m)}
              style={[
                styles.iconControlBtn,
                isMuted && { backgroundColor: "rgba(239, 68, 68, 0.15)" },
              ]}
            >
              {isMuted ? (
                <MicOff size={20} color={colors.danger} />
              ) : (
                <Mic size={20} color={colors.textPrimary} />
              )}
            </Pressable>

            <Pressable
              onPress={() => setIsDeafened((d) => !d)}
              style={[
                styles.iconControlBtn,
                isDeafened && { backgroundColor: "rgba(239, 68, 68, 0.15)" },
              ]}
            >
              {isDeafened ? (
                <VolumeX size={20} color={colors.danger} />
              ) : (
                <Volume2 size={20} color={colors.textPrimary} />
              )}
            </Pressable>
          </>
        )}

        <Pressable
          onPress={onBack}
          style={styles.disconnectBtn}
        >
          <PhoneOff size={18} color="#FFF" />
          <Text style={styles.disconnectText}>Disconnect</Text>
        </Pressable>
      </View>
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
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(34, 224, 214, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(34, 224, 214, 0.3)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.live,
  },
  liveText: {
    color: colors.live,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  statusText: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  connectionIndicator: {
    padding: 6,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  participantTile: {
    width: "48%",
    padding: 16,
    alignItems: "center",
    backgroundColor: "rgba(22, 24, 33, 0.85)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  speakingTile: {
    borderColor: colors.statusOnline,
    borderWidth: 1.5,
  },
  participantName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 8,
  },
  statusBadgeText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  audienceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  audienceItem: {
    alignItems: "center",
    width: 60,
    position: "relative",
  },
  handRaisedPill: {
    position: "absolute",
    top: -4,
    right: 6,
    backgroundColor: "rgba(28, 30, 42, 0.95)",
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 8,
    padding: 2,
  },
  audienceName: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 4,
    textAlign: "center",
  },
  controlDock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "rgba(28, 30, 42, 0.95)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.12)",
  },
  iconControlBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  dockBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  dockBtnText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  disconnectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.danger,
  },
  disconnectText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
