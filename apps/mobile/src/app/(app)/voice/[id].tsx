import React, { useState, useEffect } from "react";
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
import { Avatar } from "../../../components/ui/Avatar";
import { Badge } from "../../../components/ui/Badge";
import { api, fetchUserProfile } from "../../../lib/api";
import { useAuthStore } from "../../../stores/auth-store";
import { useWorkspaceStore } from "../../../stores/workspace-store";
import { resolveUserAvatar } from "../../../lib/avatar";
import { CallScreen } from "../../../components/call/CallScreen";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff,
  Radio,
  Hand,
  ArrowLeft,
} from "lucide-react-native";

export default function VoiceStageScreen() {
  const router = useRouter();
  const { id, type, title, username, avatarUrl, direction, accepted } = useLocalSearchParams<{
    id: string;
    type?: string;
    title?: string;
    username?: string;
    avatarUrl?: string;
    direction?: "incoming" | "outgoing";
    accepted?: string;
  }>();

  const { user } = useAuthStore();
  const { dms } = useWorkspaceStore();

  // Determine if this is a 1-on-1 Direct Call or a Space Voice Channel
  const dmConvo = dms.find((d) => d.id === id);
  const isDirectCall =
    type === "video" ||
    type === "voice" ||
    Boolean(title) ||
    Boolean(dmConvo) ||
    direction === "incoming";

  const [remoteParticipant, setRemoteParticipant] = useState<{
    id: string;
    name: string;
    username?: string;
    avatarUrl?: string | null;
  } | null>(null);

  // For Space Voice / Stage Channels
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [loadingStage, setLoadingStage] = useState(!isDirectCall);

  // 1. Resolve Remote Participant for Direct Calls
  useEffect(() => {
    if (!isDirectCall) return;

    if (dmConvo) {
      setRemoteParticipant({
        id: (dmConvo as any).user_id || dmConvo.id,
        name: dmConvo.name,
        username: (dmConvo as any).username,
        avatarUrl: resolveUserAvatar(dmConvo),
      });
    } else if (title) {
      setRemoteParticipant({
        id: id || "remote_peer",
        name: title,
        username: username,
        avatarUrl: avatarUrl || null,
      });
    } else if (id) {
      // Fetch user profile from API as fallback
      fetchUserProfile(id)
        .then((res) => {
          if (res?.user) {
            setRemoteParticipant({
              id: res.user.id,
              name: res.user.displayName || res.user.username || "Member",
              username: res.user.username,
              avatarUrl: resolveUserAvatar(res.user),
            });
          }
        })
        .catch(() => {
          setRemoteParticipant({
            id: id || "remote_peer",
            name: title || "Direct Call",
            username: username,
            avatarUrl: avatarUrl || null,
          });
        });
    }
  }, [id, isDirectCall, dmConvo, title, username, avatarUrl]);

  // 2. Load Space Voice / Stage Session if not a direct call
  useEffect(() => {
    if (isDirectCall) return;

    if (id) {
      setLoadingStage(true);
      api<{ token: string; url: string; roomName: string; channelName: string }>(
        `/channels/${id}/voice/join`,
        { method: "POST" }
      )
        .then((res) => {
          setSession(res);
          setLoadingStage(false);
        })
        .catch((err) => {
          console.warn("Voice stage join error:", err);
          setLoadingStage(false);
        });
    }
  }, [id, isDirectCall]);

  // ─────────────────────────────────────────────────────────────
  // A. DIRECT 1-ON-1 WEBRTC CALL SCREEN
  // ─────────────────────────────────────────────────────────────
  if (isDirectCall) {
    const participant = remoteParticipant || {
      id: id || "peer",
      name: title || dmConvo?.name || "Direct Call",
      username: username || (dmConvo as any)?.username,
      avatarUrl: avatarUrl || resolveUserAvatar(dmConvo),
    };

    return (
      <CallScreen
        participant={participant}
        callId={id}
        direction={direction === "incoming" ? "incoming" : "outgoing"}
        autoAccept={accepted === "true"}
        isVideo={type === "video"}
        currentUser={
          user
            ? {
                id: user.id,
                name: user.displayName || user.username || "You",
                avatarUrl: resolveUserAvatar(user),
              }
            : null
        }
        onEnd={() => router.back()}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────
  // B. SPACE VOICE / LIVE STAGE ROOM
  // ─────────────────────────────────────────────────────────────
  const participants = (session?.participants || []).map((p: any) => ({
    id: p.userId,
    name: p.displayName || p.username || "Member",
    role: "speaker",
    speaking: p.userId === user?.id && !isMuted,
    avatarUrl: p.avatarUrl || null,
  }));

  const speakers = participants.filter((p: any) => p.role === "speaker");
  const listeners = participants.filter((p: any) => p.role === "listener");

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={10}>
          <ArrowLeft size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.liveIndicator}>
            <Radio size={14} color={colors.live} />
            <Text style={styles.liveText}>STAGE LIVE</Text>
          </View>
          <Text style={styles.channelTitle} numberOfLines={1}>
            {session?.channelName || "Live Audio Stage"}
          </Text>
        </View>
        <Badge label="Connected" variant="teal" />
      </View>

      {loadingStage ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.loadingText}>Connecting to Voice Channel...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Stage Speakers */}
          <Text style={styles.sectionTitle}>STAGE SPEAKERS ({speakers.length || 1})</Text>
          <View style={styles.grid}>
            {(speakers.length
              ? speakers
              : [{ id: user?.id || "me", name: user?.displayName || "You", speaking: !isMuted }]
            ).map((s: any) => (
              <GlassCard
                key={s.id}
                elevated
                style={[styles.speakerCard, s.speaking && styles.speakingBorder]}
              >
                <Avatar name={s.name} size={54} url={s.avatarUrl} />
                <Text style={styles.speakerName} numberOfLines={1}>
                  {s.name}
                </Text>
                <View style={styles.speakerBadge}>
                  {s.speaking ? (
                    <Text style={styles.speakingText}>Speaking...</Text>
                  ) : (
                    <Text style={styles.mutedText}>Stage Speaker</Text>
                  )}
                </View>
              </GlassCard>
            ))}
          </View>

          {/* Audience */}
          <Text style={styles.sectionTitle}>AUDIENCE ({listeners.length})</Text>
          <View style={styles.audienceList}>
            {listeners.map((l: any) => (
              <View key={l.id} style={styles.audienceRow}>
                <Avatar name={l.name} size={36} url={l.avatarUrl} />
                <Text style={styles.audienceName}>{l.name}</Text>
                {l.handRaised && (
                  <View style={styles.handBadge}>
                    <Hand size={14} color={colors.warning} />
                    <Text style={styles.handText}>Hand Raised</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Control Bar */}
      <View style={styles.controlBar}>
        <TouchableOpacity
          style={[styles.ctrlBtn, isMuted && styles.ctrlBtnActive]}
          onPress={() => setIsMuted(!isMuted)}
        >
          {isMuted ? (
            <MicOff size={20} color={colors.danger} />
          ) : (
            <Mic size={20} color={colors.textPrimary} />
          )}
          <Text style={styles.ctrlLabel}>{isMuted ? "Unmute" : "Mute"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.ctrlBtn, isDeafened && styles.ctrlBtnActive]}
          onPress={() => setIsDeafened(!isDeafened)}
        >
          {isDeafened ? (
            <VolumeX size={20} color={colors.danger} />
          ) : (
            <Volume2 size={20} color={colors.textPrimary} />
          )}
          <Text style={styles.ctrlLabel}>{isDeafened ? "Deafened" : "Deafen"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.ctrlBtn, handRaised && styles.ctrlBtnActive]}
          onPress={() => setHandRaised(!handRaised)}
        >
          <Hand
            size={20}
            color={handRaised ? colors.warning : colors.textPrimary}
          />
          <Text style={styles.ctrlLabel}>{handRaised ? "Lower Hand" : "Raise Hand"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.ctrlBtn, styles.disconnectBtn]}
          onPress={() => router.back()}
        >
          <PhoneOff size={20} color="#FFFFFF" />
          <Text style={[styles.ctrlLabel, { color: "#FFFFFF" }]}>Leave</Text>
        </TouchableOpacity>
      </View>
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bgDeep,
  },
  backBtn: {
    padding: 4,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  liveText: {
    color: colors.live,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  channelTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  speakerCard: {
    width: "48%",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 8,
  },
  speakingBorder: {
    borderColor: colors.accentTeal,
    borderWidth: 2,
  },
  speakerName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10,
  },
  speakerBadge: {
    marginTop: 4,
  },
  speakingText: {
    color: colors.live,
    fontSize: 11,
    fontWeight: "600",
  },
  mutedText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  audienceList: {
    gap: 8,
  },
  audienceRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    padding: 10,
    borderRadius: radius.md,
    gap: 12,
  },
  audienceName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  handBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.warningSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  handText: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: "700",
  },
  controlBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bgDeep,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    paddingBottom: 24,
  },
  ctrlBtn: {
    alignItems: "center",
    gap: 4,
  },
  ctrlBtnActive: {
    opacity: 0.8,
  },
  ctrlLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "600",
  },
  disconnectBtn: {
    backgroundColor: colors.danger,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
});
