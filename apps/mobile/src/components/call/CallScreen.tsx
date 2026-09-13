import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  BackHandler,
  useWindowDimensions,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius } from "../../theme/tokens";
import { Avatar } from "../ui/Avatar";
import { NativeHaptics } from "../../lib/haptics";
import { formatAvatarUrl } from "../../lib/avatar";
import {
  callService,
  CallState,
  AudioRoute,
  CallParticipant,
} from "../../lib/call-service";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Phone,
  PhoneOff,
  ShieldCheck,
  Wifi,
  AlertCircle,
} from "lucide-react-native";

export interface CallScreenProps {
  participant: CallParticipant;
  callId: string;
  direction: "incoming" | "outgoing";
  onEnd: () => void;
  currentUser?: { id: string; name: string; avatarUrl?: string | null } | null;
  isVideo?: boolean;
  autoAccept?: boolean;
}

export const CallScreen: React.FC<CallScreenProps> = ({
  participant,
  callId,
  direction,
  onEnd,
  currentUser,
  isVideo = false,
  autoAccept = false,
}) => {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [callState, setCallState] = useState<CallState>(
    autoAccept ? "connecting" : direction === "incoming" ? "ringing" : "calling"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [audioRoute, setAudioRoute] = useState<AudioRoute>("speaker");
  const [callDuration, setCallDuration] = useState(0);
  const [quality, setQuality] = useState<"excellent" | "good" | "weak" | "reconnecting">("excellent");

  // Animations
  const haloAnim = useRef(new Animated.Value(1)).current;
  const haloOpacity = useRef(new Animated.Value(0.25)).current;
  const screenFade = useRef(new Animated.Value(0)).current;
  const screenTranslate = useRef(new Animated.Value(20)).current;

  // Screen Mount Animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(screenFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(screenTranslate, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Subtle breathing halo animation behind avatar
  useEffect(() => {
    const isLive = callState === "connected" || callState === "calling" || callState === "ringing";
    if (isLive && !isMuted) {
      const breathing = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(haloAnim, {
              toValue: 1.22,
              duration: 1800,
              useNativeDriver: true,
            }),
            Animated.timing(haloOpacity, {
              toValue: 0.45,
              duration: 1800,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(haloAnim, {
              toValue: 1.0,
              duration: 1800,
              useNativeDriver: true,
            }),
            Animated.timing(haloOpacity, {
              toValue: 0.20,
              duration: 1800,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      breathing.start();
      return () => breathing.stop();
    } else {
      Animated.timing(haloOpacity, {
        toValue: 0.1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [callState, isMuted]);

  // Call timer - starts ONLY when connected and calculates real elapsed time
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (callState === "connected") {
      const updateElapsed = () => {
        const connectedAt = callService.getConnectedAt();
        if (connectedAt) {
          setCallDuration(Math.max(0, Math.floor((Date.now() - connectedAt) / 1000)));
        }
      };
      updateElapsed();
      timer = setInterval(updateElapsed, 1000);
    } else {
      setCallDuration(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [callState]);

  // Call Service Initialization & Event Listeners
  useEffect(() => {
    const unsubState = callService.onStateChange((nextState, err) => {
      setCallState(nextState);
      if (err) setErrorMessage(err);
      if (nextState === "ended" || nextState === "no_answer" || nextState === "failed") {
        setTimeout(() => {
          onEnd();
        }, 1200);
      }
    });

    const unsubQuality = callService.onQualityChange((nextQuality) => {
      setQuality(nextQuality);
    });

    // Start Call Session
    callService.startCall({
      callId,
      direction,
      participant,
      currentUser,
      isVideo,
      autoAccept,
    });

    // Hardware Back Button Interception
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      handleEndCall();
      return true;
    });

    return () => {
      unsubState();
      unsubQuality();
      backHandler.remove();
      if (callService.getState() === "ended" || callService.getState() === "failed" || callService.getState() === "no_answer") {
        callService.cleanup();
      }
    };
  }, [callId]);

  // Call Duration Formatter
  const formattedDuration = useMemo(() => {
    const mins = Math.floor(callDuration / 60);
    const secs = callDuration % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, [callDuration]);

  // Status Label Resolver
  const statusLabel = useMemo(() => {
    if (errorMessage) return errorMessage;
    switch (callState) {
      case "calling":
        return "Calling…";
      case "ringing":
        return direction === "incoming" ? "Incoming call…" : "Ringing…";
      case "connecting":
        return "Connecting…";
      case "connected":
        return isMuted ? "Muted · HD Audio" : "Connected";
      case "reconnecting":
        return "Reconnecting…";
      case "no_answer":
        return "No answer";
      case "ended":
        return "Call ended";
      case "failed":
        return "Call couldn't be connected";
      default:
        return "Calling…";
    }
  }, [callState, isMuted, errorMessage, direction]);

  const handleToggleMute = () => {
    NativeHaptics.selection();
    const nextMute = callService.toggleMute();
    setIsMuted(nextMute);
  };

  const handleToggleAudioRoute = async () => {
    NativeHaptics.selection();
    const nextRoute: AudioRoute = audioRoute === "speaker" ? "earpiece" : "speaker";
    setAudioRoute(nextRoute);
    await callService.setAudioRoute(nextRoute);
  };

  const handleAcceptCall = async () => {
    NativeHaptics.success();
    await callService.acceptCall();
  };

  const handleDeclineCall = async () => {
    NativeHaptics.heavy();
    await callService.declineCall();
    onEnd();
  };

  const handleEndCall = async () => {
    NativeHaptics.heavy();
    await callService.endCall();
    onEnd();
  };

  const resolvedAvatarUrl = formatAvatarUrl(participant.avatarUrl);
  const avatarSize = Math.min(140, width * 0.35);

  return (
    <View style={styles.container}>
      {/* Dark Obsidian Iridescent Background */}
      <LinearGradient
        colors={["#0D0E16", "#08090E", "#05060A"]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Subtle Ambient Top Glow */}
      <LinearGradient
        colors={["rgba(232, 163, 61, 0.08)", "rgba(45, 212, 191, 0.03)", "transparent"]}
        style={styles.ambientGlow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <Animated.View
        style={[
          styles.contentWrapper,
          {
            paddingTop: insets.top + (Platform.OS === "ios" ? 12 : 20),
            paddingBottom: insets.bottom + 24,
            opacity: screenFade,
            transform: [{ translateY: screenTranslate }],
          },
        ]}
      >
        {/* Top Header Information */}
        <View style={styles.topHeader}>
          <View style={styles.securityBadge}>
            <ShieldCheck size={13} color={colors.live} />
            <Text style={styles.securityText}>END-TO-END ENCRYPTED</Text>
          </View>

          {callState === "connected" && (
            <View style={styles.timerBadge}>
              <View style={styles.livePulseDot} />
              <Text style={styles.timerText}>{formattedDuration}</Text>
            </View>
          )}
        </View>

        {/* Center Remote Participant Area */}
        <View style={styles.centerArea}>
          {/* Avatar Ring & Subtle Halo */}
          <View style={[styles.avatarArea, { width: avatarSize + 40, height: avatarSize + 40 }]}>
            <Animated.View
              style={[
                styles.avatarHalo,
                {
                  width: avatarSize + 36,
                  height: avatarSize + 36,
                  borderRadius: (avatarSize + 36) / 2,
                  opacity: haloOpacity,
                  transform: [{ scale: haloAnim }],
                },
              ]}
            />

            <View
              style={[
                styles.avatarRing,
                {
                  width: avatarSize + 8,
                  height: avatarSize + 8,
                  borderRadius: (avatarSize + 8) / 2,
                },
              ]}
            >
              <Avatar
                name={participant.name}
                url={resolvedAvatarUrl}
                size={avatarSize}
              />
            </View>
          </View>

          {/* Remote Name & Username */}
          <Text style={styles.remoteName} numberOfLines={1}>
            {participant.name}
          </Text>

          {participant.username && (
            <Text style={styles.remoteUsername} numberOfLines={1}>
              @{participant.username.replace(/^@/, "")}
            </Text>
          )}

          {/* Call Status Indicator */}
          <View style={styles.statusRow}>
            {callState === "failed" ? (
              <AlertCircle size={14} color={colors.danger} />
            ) : callState === "reconnecting" ? (
              <Wifi size={14} color={colors.warning} />
            ) : null}
            <Text
              style={[
                styles.statusText,
                callState === "connected" && styles.statusConnected,
                callState === "failed" && styles.statusFailed,
                callState === "reconnecting" && styles.statusReconnecting,
              ]}
            >
              {statusLabel}
            </Text>
          </View>
        </View>

        {/* Bottom Glass Call Controls */}
        <View style={styles.bottomControls}>
          {direction === "incoming" && callState === "ringing" ? (
            /* Incoming Call Action Bar: [ Decline ] [ Accept ] */
            <View style={styles.incomingControlsRow}>
              <View style={styles.btnColumn}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.declineBtn]}
                  onPress={handleDeclineCall}
                  activeOpacity={0.8}
                >
                  <PhoneOff size={28} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.btnLabel}>Decline</Text>
              </View>

              <View style={styles.btnColumn}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.acceptBtn]}
                  onPress={handleAcceptCall}
                  activeOpacity={0.8}
                >
                  <Phone size={28} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.btnLabel}>Accept</Text>
              </View>
            </View>
          ) : (
            /* Active Call Controls Bar: [ Speaker ] [ Mute ] [ End Call ] */
            <BlurView intensity={35} tint="dark" style={styles.glassControlBar}>
              <LinearGradient
                colors={["rgba(255, 255, 255, 0.08)", "rgba(255, 255, 255, 0.02)"]}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />

              {/* Speaker / Earpiece Toggle */}
              <View style={styles.btnColumn}>
                <TouchableOpacity
                  style={[
                    styles.circleControlBtn,
                    audioRoute === "speaker" && styles.circleControlBtnActive,
                  ]}
                  onPress={handleToggleAudioRoute}
                  activeOpacity={0.7}
                  accessibilityLabel="Audio output switch"
                >
                  {audioRoute === "speaker" ? (
                    <Volume2 size={24} color={colors.textPrimary} />
                  ) : (
                    <VolumeX size={24} color={colors.textMuted} />
                  )}
                </TouchableOpacity>
                <Text style={styles.controlLabel}>
                  {audioRoute === "speaker" ? "Speaker" : "Earpiece"}
                </Text>
              </View>

              {/* Mic Mute / Unmute Toggle */}
              <View style={styles.btnColumn}>
                <TouchableOpacity
                  style={[
                    styles.circleControlBtn,
                    isMuted && styles.circleControlBtnMuted,
                  ]}
                  onPress={handleToggleMute}
                  activeOpacity={0.7}
                  accessibilityLabel={isMuted ? "Unmute microphone" : "Mute microphone"}
                >
                  {isMuted ? (
                    <MicOff size={24} color={colors.danger} />
                  ) : (
                    <Mic size={24} color={colors.textPrimary} />
                  )}
                </TouchableOpacity>
                <Text style={[styles.controlLabel, isMuted && { color: colors.danger }]}>
                  {isMuted ? "Muted" : "Mute"}
                </Text>
              </View>

              {/* End Call Button */}
              <View style={styles.btnColumn}>
                <TouchableOpacity
                  style={[styles.circleControlBtn, styles.endCallBtn]}
                  onPress={handleEndCall}
                  activeOpacity={0.8}
                  accessibilityLabel="End Call"
                >
                  <PhoneOff size={26} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={[styles.controlLabel, { color: colors.danger }]}>End</Text>
              </View>
            </BlurView>
          )}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#08090E",
  },
  ambientGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  contentWrapper: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  topHeader: {
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  securityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(34, 224, 214, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(34, 224, 214, 0.20)",
  },
  securityText: {
    fontSize: 10,
    fontFamily: "JetBrainsMono_700Bold",
    color: colors.live,
    letterSpacing: 0.8,
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.live,
  },
  timerText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontFamily: "JetBrainsMono_700Bold",
    letterSpacing: 0.5,
  },
  centerArea: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 20,
  },
  avatarArea: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: 24,
  },
  avatarHalo: {
    position: "absolute",
    backgroundColor: "rgba(232, 163, 61, 0.35)",
  },
  avatarRing: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(232, 163, 61, 0.40)",
    backgroundColor: "rgba(20, 16, 12, 0.85)",
    shadowColor: "#E8A33D",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
  remoteName: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  remoteUsername: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  statusText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: "600",
  },
  statusConnected: {
    color: colors.live,
  },
  statusFailed: {
    color: colors.danger,
  },
  statusReconnecting: {
    color: colors.warning,
  },
  bottomControls: {
    width: "100%",
    alignItems: "center",
  },
  incomingControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    width: "100%",
    paddingHorizontal: 20,
  },
  glassControlBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    width: "100%",
    backgroundColor: "rgba(18, 20, 28, 0.70)",
    borderRadius: 36,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    paddingVertical: 14,
    paddingHorizontal: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  btnColumn: {
    alignItems: "center",
    gap: 6,
  },
  actionBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  acceptBtn: {
    backgroundColor: "#34C759",
  },
  declineBtn: {
    backgroundColor: "#FF3B30",
  },
  circleControlBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  circleControlBtnActive: {
    backgroundColor: "rgba(255, 255, 255, 0.20)",
    borderColor: "rgba(255, 255, 255, 0.35)",
  },
  circleControlBtnMuted: {
    backgroundColor: "rgba(239, 68, 68, 0.18)",
    borderColor: "rgba(239, 68, 68, 0.35)",
  },
  endCallBtn: {
    backgroundColor: "#FF3B30",
    borderColor: "rgba(255, 59, 48, 0.5)",
  },
  controlLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  btnLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
  },
});
