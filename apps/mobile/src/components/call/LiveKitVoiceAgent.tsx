import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  Animated,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import {
  AudioSession,
  useIOSAudioManagement,
  useLocalParticipant,
  LiveKitRoom,
  useRoomContext,
  BarVisualizer,
} from "@livekit/react-native";
import { useAgent, useSessionMessages, TrackReference } from "@livekit/components-react";
import { colors } from "../../theme/tokens";
import { NativeHaptics } from "../../lib/haptics";
import {
  Bot,
  Mic,
  MicOff,
  PhoneOff,
  Sparkles,
  Volume2,
  VolumeX,
  Radio,
} from "lucide-react-native";
import { Avatar } from "../ui/Avatar";
import { Audio } from "expo-av";

export interface LiveKitVoiceAgentProps {
  url: string;
  token: string;
  agentName?: string;
  agentAvatar?: string | null;
  agentDescription?: string;
  onDisconnect: () => void;
}

export const LiveKitVoiceAgent: React.FC<LiveKitVoiceAgentProps> = ({
  url,
  token,
  agentName = "AIIC Assistant",
  agentAvatar,
  agentDescription = "Real-time Conversational Voice Intelligence",
  onDisconnect,
}) => {
  useEffect(() => {
    let start = async () => {
      try {
        await AudioSession.startAudioSession();
      } catch (err) {
        console.warn("[LiveKitVoiceAgent] AudioSession start error:", err);
      }
    };

    start();
    return () => {
      try {
        AudioSession.stopAudioSession();
      } catch (err) {
        console.warn("[LiveKitVoiceAgent] AudioSession stop error:", err);
      }
    };
  }, []);

  return (
    <LiveKitRoom
      serverUrl={url}
      token={token}
      connect={true}
      audio={true}
      video={false}
    >
      <LiveKitVoiceAgentInner
        agentName={agentName}
        agentAvatar={agentAvatar}
        agentDescription={agentDescription}
        onDisconnect={onDisconnect}
      />
    </LiveKitRoom>
  );
};

interface LiveKitVoiceAgentInnerProps {
  agentName: string;
  agentAvatar?: string | null;
  agentDescription: string;
  onDisconnect: () => void;
}

const LiveKitVoiceAgentInner: React.FC<LiveKitVoiceAgentInnerProps> = ({
  agentName,
  agentAvatar,
  agentDescription,
  onDisconnect,
}) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const room = useRoomContext();
  useIOSAudioManagement(room, true);

  const { isMicrophoneEnabled, localParticipant, microphoneTrack } = useLocalParticipant();
  const { state: agentState, microphoneTrack: agentMicTrack } = useAgent();
  const { messages } = useSessionMessages();

  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);

  // Local participant track ref for visualizer
  const [localTrackRef, setLocalTrackRef] = useState<TrackReference | undefined>(undefined);

  useEffect(() => {
    if (microphoneTrack && localParticipant) {
      setLocalTrackRef({
        participant: localParticipant,
        publication: microphoneTrack,
        source: microphoneTrack.source,
      });
    } else {
      setLocalTrackRef(undefined);
    }
  }, [microphoneTrack, localParticipant]);

  // Breathing animation when agent is speaking
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (agentState === "speaking") {
      const breathing = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseAnim, { toValue: 1.25, duration: 800, useNativeDriver: true }),
            Animated.timing(pulseOpacity, { toValue: 0.65, duration: 800, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(pulseAnim, { toValue: 1.0, duration: 800, useNativeDriver: true }),
            Animated.timing(pulseOpacity, { toValue: 0.25, duration: 800, useNativeDriver: true }),
          ]),
        ])
      );
      breathing.start();
      return () => breathing.stop();
    } else {
      Animated.timing(pulseOpacity, { toValue: 0.15, duration: 300, useNativeDriver: true }).start();
    }
  }, [agentState]);

  // Duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDuration = useMemo(() => {
    const mins = Math.floor(callDuration / 60);
    const secs = callDuration % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, [callDuration]);

  // Handle Speaker Toggle
  const handleToggleSpeaker = async () => {
    NativeHaptics.selection();
    const nextSpeaker = !isSpeakerOn;
    setIsSpeakerOn(nextSpeaker);
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        playThroughEarpieceAndroid: !nextSpeaker,
      });
    } catch (err) {
      console.warn("[LiveKitVoiceAgent] setAudioMode error:", err);
    }
  };

  const handleDisconnect = () => {
    NativeHaptics.heavy();
    try {
      room.disconnect();
    } catch {}
    onDisconnect();
  };

  // Agent State Tag & Colors
  const agentStatusText = useMemo(() => {
    switch (agentState) {
      case "listening":
        return "Listening…";
      case "thinking":
        return "Thinking…";
      case "speaking":
        return "Speaking…";
      default:
        return "Connected & Ready";
    }
  }, [agentState]);

  const latestMessage = messages && messages.length > 0 ? messages[messages.length - 1] : null;

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={["#080A12", "#05060A", "#000000"]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Ambient Top & Center Glow */}
      <LinearGradient
        colors={["rgba(56, 189, 248, 0.12)", "rgba(45, 212, 191, 0.05)", "transparent"]}
        style={styles.ambientGlow}
      />

      <View
        style={[
          styles.contentWrapper,
          {
            paddingTop: insets.top + (Platform.OS === "ios" ? 12 : 20),
            paddingBottom: insets.bottom + 20,
          },
        ]}
      >
        {/* Top Header Information */}
        <View style={styles.topHeader}>
          <View style={styles.badge}>
            <Bot size={14} color="#38BDF8" />
            <Text style={styles.badgeText}>REALTIME VOICE AGENT</Text>
          </View>

          <View style={styles.timerBadge}>
            <View style={styles.livePulseDot} />
            <Text style={styles.timerText}>{formattedDuration}</Text>
          </View>
        </View>

        {/* Center Stage: Interactive Voice Pulse Orb */}
        <View style={styles.centerStage}>
          {/* Breathing Aura Halo */}
          <Animated.View
            style={[
              styles.avatarHalo,
              {
                transform: [{ scale: pulseAnim }],
                opacity: pulseOpacity,
              },
            ]}
          />

          <View style={styles.avatarWrap}>
            <Avatar name={agentName} url={agentAvatar} size={112} />
          </View>

          <Text style={styles.agentTitle}>{agentName}</Text>
          <Text style={styles.agentSubtitle}>{agentDescription}</Text>

          {/* Realtime Live State Badge */}
          <View
            style={[
              styles.statusPill,
              agentState === "speaking" && styles.statusPillSpeaking,
              agentState === "listening" && styles.statusPillListening,
            ]}
          >
            <Sparkles
              size={13}
              color={
                agentState === "speaking"
                  ? "#2DD4BF"
                  : agentState === "listening"
                  ? "#38BDF8"
                  : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.statusPillText,
                agentState === "speaking" && { color: "#2DD4BF" },
                agentState === "listening" && { color: "#38BDF8" },
              ]}
            >
              {agentStatusText}
            </Text>
          </View>

          {/* Visualizer Waveform */}
          <View style={styles.visualizerCard}>
            {agentMicTrack ? (
              <BarVisualizer
                state={agentState}
                barCount={7}
                options={{
                  minHeight: 0.15,
                  barWidth: 5,
                  barColor: "#38BDF8",
                  barBorderRadius: 4,
                }}
                trackRef={agentMicTrack}
                style={styles.barVisualizer}
              />
            ) : (
              <View style={styles.visualizerPlaceholder}>
                <Radio size={16} color={colors.textMuted} />
                <Text style={styles.placeholderText}>Voice Bridge Synchronized</Text>
              </View>
            )}
          </View>

          {/* Live Transcript Snippet */}
          {latestMessage && (
            <BlurView intensity={30} tint="dark" style={styles.transcriptCard}>
              <Text style={styles.transcriptLabel}>
                {latestMessage.from === localParticipant ? "You" : agentName}
              </Text>
              <Text style={styles.transcriptMessage} numberOfLines={2}>
                {latestMessage.message}
              </Text>
            </BlurView>
          )}
        </View>

        {/* Bottom Floating Glass Control Bar */}
        <View style={styles.bottomControlsWrap}>
          <BlurView intensity={35} tint="dark" style={styles.glassBar}>
            <LinearGradient
              colors={["rgba(255, 255, 255, 0.08)", "rgba(255, 255, 255, 0.02)"]}
              style={StyleSheet.absoluteFillObject}
            />

            {/* Speaker Toggle */}
            <View style={styles.btnColumn}>
              <TouchableOpacity
                style={[styles.circleBtn, isSpeakerOn && styles.circleBtnActive]}
                onPress={handleToggleSpeaker}
                activeOpacity={0.7}
              >
                {isSpeakerOn ? (
                  <Volume2 size={22} color="#38BDF8" />
                ) : (
                  <VolumeX size={22} color={colors.textSecondary} />
                )}
              </TouchableOpacity>
              <Text style={styles.btnLabel}>{isSpeakerOn ? "Speaker" : "Earpiece"}</Text>
            </View>

            {/* Microphone Toggle */}
            <View style={styles.btnColumn}>
              <TouchableOpacity
                style={[
                  styles.circleBtn,
                  !isMicrophoneEnabled && styles.circleBtnMuted,
                ]}
                onPress={() => localParticipant?.setMicrophoneEnabled(!isMicrophoneEnabled)}
                activeOpacity={0.7}
              >
                {isMicrophoneEnabled ? (
                  <Mic size={22} color={colors.textPrimary} />
                ) : (
                  <MicOff size={22} color={colors.danger} />
                )}
              </TouchableOpacity>
              <Text style={[styles.btnLabel, !isMicrophoneEnabled && { color: colors.danger }]}>
                {isMicrophoneEnabled ? "Mic On" : "Muted"}
              </Text>
            </View>

            {/* End Conversation */}
            <View style={styles.btnColumn}>
              <TouchableOpacity
                style={[styles.circleBtn, styles.endBtn]}
                onPress={handleDisconnect}
                activeOpacity={0.8}
              >
                <PhoneOff size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={[styles.btnLabel, { color: colors.danger }]}>End</Text>
            </View>
          </BlurView>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#080A12",
  },
  ambientGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 380,
  },
  contentWrapper: {
    flex: 1,
    justifyContent: "space-between",
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#38BDF8",
    letterSpacing: 0.6,
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#38BDF8",
  },
  timerText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
    fontVariant: ["tabular-nums"],
  },
  centerStage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    position: "relative",
  },
  avatarHalo: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "#38BDF8",
  },
  avatarWrap: {
    padding: 6,
    borderRadius: 70,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1.5,
    borderColor: "rgba(56, 189, 248, 0.4)",
    shadowColor: "#38BDF8",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 16,
  },
  agentTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  agentSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 16,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 20,
  },
  statusPillSpeaking: {
    backgroundColor: "rgba(45, 212, 191, 0.12)",
    borderColor: "rgba(45, 212, 191, 0.3)",
  },
  statusPillListening: {
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    borderColor: "rgba(56, 189, 248, 0.3)",
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  visualizerCard: {
    width: "100%",
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    paddingHorizontal: 16,
  },
  barVisualizer: {
    width: "100%",
    height: "100%",
  },
  visualizerPlaceholder: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  placeholderText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "500",
  },
  transcriptCard: {
    marginTop: 16,
    width: "100%",
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(15, 18, 28, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
  },
  transcriptLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#38BDF8",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  transcriptMessage: {
    fontSize: 13,
    color: "#FFFFFF",
    lineHeight: 18,
  },
  bottomControlsWrap: {
    paddingHorizontal: 20,
    alignItems: "center",
  },
  glassBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    backgroundColor: "rgba(10, 12, 18, 0.85)",
    width: "100%",
    overflow: "hidden",
  },
  btnColumn: {
    alignItems: "center",
    gap: 6,
  },
  circleBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  circleBtnActive: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    borderColor: "rgba(56, 189, 248, 0.4)",
  },
  circleBtnMuted: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "rgba(239, 68, 68, 0.4)",
  },
  endBtn: {
    backgroundColor: "#EF4444",
    borderColor: "#DC2626",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  btnLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.textSecondary,
  },
});
