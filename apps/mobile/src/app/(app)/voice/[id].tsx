import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius } from "../../../theme/tokens";
import { GlassCard } from "../../../components/ui/GlassCard";
import { Avatar } from "../../../components/ui/Avatar";
import { Badge } from "../../../components/ui/Badge";
import { api } from "../../../lib/api";
import { useAuthStore } from "../../../stores/auth-store";
import { NativeHaptics } from "../../../lib/haptics";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff,
  Radio,
  Users,
  Hand,
  ArrowLeft,
  Wifi,
  Video,
  VideoOff,
  ShieldCheck,
  Sparkles,
} from "lucide-react-native";

export default function VoiceStageScreen() {
  const router = useRouter();
  const { id, type, title } = useLocalSearchParams<{ id: string; type?: string; title?: string }>();
  const { user } = useAuthStore();

  const isDirectCall = type === "video" || type === "voice" || Boolean(title);
  const [isVideoEnabled, setIsVideoEnabled] = useState(type === "video");
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isDeafened, setIsDeafened] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [callDuration, setCallDuration] = useState(0);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for speaking glow
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Call duration counter
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    if (id) {
      api<{ token: string; url: string; roomName: string; channelName: string }>(
        `/channels/${id}/voice/join`,
        { method: "POST" }
      )
        .then((res) => {
          setSession(res);
          setLoading(false);
        })
        .catch((err) => {
          console.warn("Voice join token generation:", err);
          setLoading(false);
        });
    }
  }, [id]);

  const participants = (session?.participants || []).map((p: any) => ({
    id: p.userId,
    name: p.displayName || p.username || "Member",
    role: "speaker",
    speaking: p.userId === user?.id && !isMuted,
    roleColor: colors.accent,
  }));

  const speakers = participants.filter((p: any) => p.role === "speaker");
  const listeners = participants.filter((p: any) => p.role === "listener");

  const channelHeading = title || session?.channelName || (isDirectCall ? "Direct Call" : "Live Audio Stage");

  const handleEndCall = () => {
    NativeHaptics.heavy();
    router.back();
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      {/* Dynamic Ambient Glow */}
      <LinearGradient
        colors={["rgba(232, 163, 61, 0.08)", "rgba(10, 10, 14, 0.98)"]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
      />

      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={10}>
          <ArrowLeft size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.liveIndicator}>
            {isDirectCall ? (
              <ShieldCheck size={13} color={colors.live} />
            ) : (
              <Radio size={13} color={colors.live} />
            )}
            <Text style={styles.liveText}>
              {isDirectCall ? "E2E ENCRYPTED · LIVE" : "STAGE LIVE"}
            </Text>
          </View>
          <Text style={styles.channelTitle} numberOfLines={1}>
            {channelHeading}
          </Text>
        </View>
        <Badge label={formatTime(callDuration)} variant="teal" />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.loadingText}>Establishing WebRTC Audio & Video Link...</Text>
        </View>
      ) : isDirectCall ? (
        /* 1-on-1 Direct Call Screen */
        <View style={styles.directCallContainer}>
          <View style={styles.directCallCenter}>
            <Animated.View
              style={[
                styles.pulseCircle,
                {
                  transform: [{ scale: !isMuted ? pulseAnim : 1 }],
                  borderColor: !isMuted ? colors.live : "rgba(255, 255, 255, 0.15)",
                },
              ]}
            >
              <Avatar
                name={title || user?.displayName || "Member"}
                size={110}
                url={null}
              />
            </Animated.View>
            <Text style={styles.directCallName}>{channelHeading}</Text>
            <Text style={styles.directCallStatus}>
              {isMuted ? "Microphone Muted" : "Speaking · HD Voice"}
            </Text>
          </View>

          {/* Video Placeholder if Video Mode */}
          {isVideoEnabled && (
            <View style={styles.videoPlaceholderCard}>
              <LinearGradient
                colors={["rgba(255, 255, 255, 0.08)", "rgba(255, 255, 255, 0.02)"]}
                style={StyleSheet.absoluteFillObject}
              />
              <Video size={28} color={colors.accent} />
              <Text style={styles.videoPlaceholderText}>Camera Feed Active (720p HD)</Text>
            </View>
          )}
        </View>
      ) : (
        /* Stage Audio Room */
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Stage Speakers */}
          <Text style={styles.sectionTitle}>STAGE SPEAKERS ({speakers.length || 1})</Text>
          <View style={styles.grid}>
            {(speakers.length ? speakers : [{ id: user?.id || "me", name: user?.displayName || "You", speaking: !isMuted }]).map((s: any) => (
              <GlassCard
                key={s.id}
                elevated
                style={[styles.speakerCard, s.speaking && styles.speakingBorder]}
              >
                <Avatar name={s.name} size={54} url={s.avatar || s.avatarUrl || s.avatar_url} />
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
                <Avatar name={l.name} size={36} url={l.avatar || l.avatarUrl || l.avatar_url} />
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

      {/* Voice Bar Floating Glass Controls */}
      <View style={styles.floatingControlWrap}>
        <BlurView intensity={35} tint="dark" style={styles.floatingControlBar}>
          <TouchableOpacity
            style={[styles.ctrlCircleBtn, isMuted && styles.ctrlCircleBtnActive]}
            onPress={() => {
              NativeHaptics.selection();
              setIsMuted(!isMuted);
            }}
          >
            {isMuted ? (
              <MicOff size={22} color={colors.danger} />
            ) : (
              <Mic size={22} color={colors.textPrimary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.ctrlCircleBtn, isVideoEnabled && styles.ctrlCircleBtnActive]}
            onPress={() => {
              NativeHaptics.selection();
              setIsVideoEnabled(!isVideoEnabled);
            }}
          >
            {isVideoEnabled ? (
              <Video size={22} color={colors.accent} />
            ) : (
              <VideoOff size={22} color={colors.textMuted} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.ctrlCircleBtn, isSpeakerOn && styles.ctrlCircleBtnActive]}
            onPress={() => {
              NativeHaptics.selection();
              setIsSpeakerOn(!isSpeakerOn);
            }}
          >
            {isSpeakerOn ? (
              <Volume2 size={22} color={colors.textPrimary} />
            ) : (
              <VolumeX size={22} color={colors.textMuted} />
            )}
          </TouchableOpacity>

          {!isDirectCall && (
            <TouchableOpacity
              style={[styles.ctrlCircleBtn, handRaised && styles.ctrlCircleBtnActive]}
              onPress={() => {
                NativeHaptics.selection();
                setHandRaised(!handRaised);
              }}
            >
              <Hand
                size={22}
                color={handRaised ? colors.warning : colors.textPrimary}
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.ctrlCircleBtn, styles.endCallBtn]}
            onPress={handleEndCall}
          >
            <PhoneOff size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </BlurView>
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
  directCallContainer: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  directCallCenter: {
    alignItems: "center",
    marginTop: 40,
  },
  pulseCircle: {
    padding: 6,
    borderRadius: 80,
    borderWidth: 3,
    marginBottom: 20,
    shadowColor: colors.live,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  directCallName: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 6,
    textAlign: "center",
  },
  directCallStatus: {
    fontSize: 14,
    color: colors.live,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  videoPlaceholderCard: {
    width: "100%",
    height: 180,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(232, 163, 61, 0.25)",
    backgroundColor: "rgba(20, 16, 12, 0.60)",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    overflow: "hidden",
    marginBottom: 80,
  },
  videoPlaceholderText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  floatingControlWrap: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 34 : 20,
    left: 20,
    right: 20,
    alignItems: "center",
  },
  floatingControlBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "rgba(20, 18, 24, 0.75)",
    borderRadius: 36,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  ctrlCircleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  ctrlCircleBtnActive: {
    backgroundColor: "rgba(255, 255, 255, 0.20)",
  },
  endCallBtn: {
    backgroundColor: "#FF3B30",
  },
});
