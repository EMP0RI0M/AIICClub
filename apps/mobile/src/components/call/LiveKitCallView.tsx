import React, { useEffect, useState, useMemo } from "react";
import {
  StyleSheet,
  View,
  FlatList,
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
  useVisualStableUpdate,
  useTracks,
  TrackReferenceOrPlaceholder,
} from "@livekit/react-native";
import { Track } from "livekit-client";
import { colors } from "../../theme/tokens";
import { ParticipantView } from "./LiveKitParticipantView";
import { LiveKitRoomControls } from "./LiveKitRoomControls";
import { NativeHaptics } from "../../lib/haptics";
import { ShieldCheck, Wifi, Sparkles, User } from "lucide-react-native";
import { Avatar } from "../ui/Avatar";
import { Audio } from "expo-av";

export interface LiveKitCallViewProps {
  url: string;
  token: string;
  callId: string;
  participantName: string;
  participantAvatar?: string | null;
  currentUser?: { id: string; name: string; avatarUrl?: string | null } | null;
  isVideo?: boolean;
  onDisconnect: () => void;
}

export const LiveKitCallView: React.FC<LiveKitCallViewProps> = ({
  url,
  token,
  callId,
  participantName,
  participantAvatar,
  currentUser,
  isVideo = false,
  onDisconnect,
}) => {
  useEffect(() => {
    let start = async () => {
      try {
        await AudioSession.startAudioSession();
      } catch (err) {
        console.warn("[LiveKitCallView] AudioSession start error:", err);
      }
    };

    start();
    return () => {
      try {
        AudioSession.stopAudioSession();
      } catch (err) {
        console.warn("[LiveKitCallView] AudioSession stop error:", err);
      }
    };
  }, []);

  return (
    <LiveKitRoom
      serverUrl={url}
      token={token}
      connect={true}
      options={{
        adaptiveStream: { pixelDensity: "screen" },
      }}
      audio={true}
      video={isVideo}
    >
      <LiveKitRoomInner
        callId={callId}
        participantName={participantName}
        participantAvatar={participantAvatar}
        currentUser={currentUser}
        isVideo={isVideo}
        onDisconnect={onDisconnect}
      />
    </LiveKitRoom>
  );
};

interface LiveKitRoomInnerProps {
  callId: string;
  participantName: string;
  participantAvatar?: string | null;
  currentUser?: { id: string; name: string; avatarUrl?: string | null } | null;
  isVideo: boolean;
  onDisconnect: () => void;
}

const LiveKitRoomInner: React.FC<LiveKitRoomInnerProps> = ({
  callId,
  participantName,
  participantAvatar,
  currentUser,
  isVideo,
  onDisconnect,
}) => {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const room = useRoomContext();
  useIOSAudioManagement(room);

  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [isCameraFrontFacing, setCameraFrontFacing] = useState(true);

  const {
    isCameraEnabled,
    isMicrophoneEnabled,
    localParticipant,
  } = useLocalParticipant();

  // Tracks query (camera & screenshare)
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  const stableTracks = useVisualStableUpdate(tracks, 4);

  // Call Duration Timer
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

  // Handle Switch Camera
  const handleSwitchCamera = async () => {
    NativeHaptics.selection();
    try {
      if (room && typeof (room as any).switchActiveDevice === "function") {
        setCameraFrontFacing(!isCameraFrontFacing);
        // Toggle camera facing if method available
        const facing = !isCameraFrontFacing ? "front" : "environment";
        await (room as any).switchActiveDevice("videoinput", facing);
      }
    } catch (err) {
      console.warn("[LiveKitCallView] switchCamera error:", err);
    }
  };

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
      console.warn("[LiveKitCallView] setAudioMode error:", err);
    }
  };

  // Handle Toggle Mic
  const handleToggleMic = async (enabled: boolean) => {
    NativeHaptics.selection();
    try {
      if (localParticipant) {
        await localParticipant.setMicrophoneEnabled(enabled);
      }
    } catch (err) {
      console.warn("[LiveKitCallView] setMicrophoneEnabled error:", err);
    }
  };

  // Handle Toggle Camera
  const handleToggleCamera = async (enabled: boolean) => {
    NativeHaptics.selection();
    try {
      if (localParticipant) {
        await localParticipant.setCameraEnabled(enabled);
      }
    } catch (err) {
      console.warn("[LiveKitCallView] setCameraEnabled error:", err);
    }
  };

  // Handle Disconnect
  const handleDisconnect = () => {
    NativeHaptics.heavy();
    try {
      room.disconnect();
    } catch {}
    onDisconnect();
  };

  // Remote vs Local track distribution
  const remoteTracks = stableTracks.filter(
    (t) => t.participant.identity !== localParticipant?.identity
  );
  const localTrack = stableTracks.find(
    (t) => t.participant.identity === localParticipant?.identity
  );

  const primaryTrack = remoteTracks.length > 0 ? remoteTracks[0] : localTrack;

  return (
    <View style={styles.roomContainer}>
      {/* Background Deep Gradient */}
      <LinearGradient
        colors={["#08090E", "#040507", "#000000"]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Ambient Top Glow */}
      <LinearGradient
        colors={
          isVideo
            ? ["rgba(45, 212, 191, 0.12)", "rgba(56, 189, 248, 0.04)", "transparent"]
            : ["rgba(232, 163, 61, 0.08)", "rgba(45, 212, 191, 0.03)", "transparent"]
        }
        style={styles.ambientGlow}
      />

      {/* Main Content Area */}
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
          <View style={styles.securityBadge}>
            <ShieldCheck size={13} color={colors.live || "#10B981"} />
            <Text style={styles.securityText}>
              {isVideo ? "LIVEKIT HD VIDEO CALL" : "LIVEKIT HD VOICE"}
            </Text>
          </View>

          <View style={styles.timerBadge}>
            <View style={styles.livePulseDot} />
            <Text style={styles.timerText}>{formattedDuration}</Text>
          </View>
        </View>

        {/* Center Stage: Video Stage or Audio Focus Avatar */}
        {isVideo && primaryTrack ? (
          <View style={styles.videoStageContainer}>
            {/* Primary / Remote Stream */}
            <ParticipantView
              trackRef={primaryTrack}
              style={styles.primaryParticipantView}
              avatarUrl={participantAvatar}
              customName={participantName}
            />

            {/* Local PiP Video if remote track is also visible */}
            {localTrack && remoteTracks.length > 0 && (
              <View style={styles.pipContainer}>
                <ParticipantView
                  trackRef={localTrack}
                  style={styles.pipParticipantView}
                  avatarUrl={currentUser?.avatarUrl}
                  customName="You"
                  mirror={isCameraFrontFacing}
                />
              </View>
            )}
          </View>
        ) : (
          /* HD Voice Calling Center Layout */
          <View style={styles.voiceCenterContainer}>
            <View style={styles.voiceAvatarWrapper}>
              <Avatar
                name={participantName}
                url={participantAvatar}
                size={110}
              />
            </View>

            <Text style={styles.voicePeerName} numberOfLines={1}>
              {participantName}
            </Text>

            <View style={styles.voiceStatusPill}>
              <Sparkles size={13} color={colors.accent || "#2DD4BF"} />
              <Text style={styles.voiceStatusText}>
                {isMicrophoneEnabled ? "Connected · HD Audio" : "Microphone Muted"}
              </Text>
            </View>
          </View>
        )}

        {/* Bottom Floating Glass Controls */}
        <LiveKitRoomControls
          micEnabled={isMicrophoneEnabled}
          setMicEnabled={handleToggleMic}
          cameraEnabled={isCameraEnabled}
          setCameraEnabled={handleToggleCamera}
          switchCamera={handleSwitchCamera}
          isSpeakerOn={isSpeakerOn}
          onToggleSpeaker={handleToggleSpeaker}
          onDisconnectClick={handleDisconnect}
          isVideoCall={isVideo}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  roomContainer: {
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
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  securityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.25)",
  },
  securityText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#10B981",
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
    backgroundColor: colors.live || "#10B981",
  },
  timerText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
    fontVariant: ["tabular-nums"],
  },
  videoStageContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginVertical: 14,
    position: "relative",
    borderRadius: 24,
    overflow: "hidden",
  },
  primaryParticipantView: {
    flex: 1,
    width: "100%",
    borderRadius: 24,
  },
  pipContainer: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 100,
    height: 140,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  pipParticipantView: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  voiceCenterContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  voiceAvatarWrapper: {
    padding: 6,
    borderRadius: 70,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    shadowColor: colors.accent || "#2DD4BF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  voicePeerName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  voiceStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  voiceStatusText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "500",
  },
});
