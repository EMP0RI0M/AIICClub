import React from "react";
import { StyleSheet, View, Text, TouchableOpacity, StyleProp, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius } from "../../theme/tokens";
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  SwitchCamera,
  PhoneOff,
  Volume2,
  VolumeX,
} from "lucide-react-native";

export interface LiveKitRoomControlsProps {
  micEnabled: boolean;
  setMicEnabled: (enabled: boolean) => void;
  cameraEnabled: boolean;
  setCameraEnabled: (enabled: boolean) => void;
  switchCamera: () => void;
  isSpeakerOn: boolean;
  onToggleSpeaker: () => void;
  onDisconnectClick: () => void;
  isVideoCall?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const LiveKitRoomControls: React.FC<LiveKitRoomControlsProps> = ({
  micEnabled,
  setMicEnabled,
  cameraEnabled,
  setCameraEnabled,
  switchCamera,
  isSpeakerOn,
  onToggleSpeaker,
  onDisconnectClick,
  isVideoCall = true,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <BlurView intensity={35} tint="dark" style={styles.glassBar}>
        <LinearGradient
          colors={["rgba(255, 255, 255, 0.08)", "rgba(255, 255, 255, 0.02)"]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />

        {/* Camera Flip Button (Only in Video Call) */}
        {isVideoCall && (
          <View style={styles.btnColumn}>
            <TouchableOpacity
              style={styles.circleBtn}
              onPress={switchCamera}
              activeOpacity={0.7}
              accessibilityLabel="Switch Camera"
            >
              <SwitchCamera size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.btnLabel}>Flip</Text>
          </View>
        )}

        {/* Camera Toggle Button */}
        {isVideoCall && (
          <View style={styles.btnColumn}>
            <TouchableOpacity
              style={[
                styles.circleBtn,
                cameraEnabled && styles.circleBtnActive,
                !cameraEnabled && styles.circleBtnMuted,
              ]}
              onPress={() => setCameraEnabled(!cameraEnabled)}
              activeOpacity={0.7}
              accessibilityLabel={cameraEnabled ? "Turn off camera" : "Turn on camera"}
            >
              {cameraEnabled ? (
                <VideoIcon size={22} color="#10B981" />
              ) : (
                <VideoOff size={22} color={colors.danger} />
              )}
            </TouchableOpacity>
            <Text style={[styles.btnLabel, !cameraEnabled && { color: colors.danger }]}>
              {cameraEnabled ? "Camera" : "Cam Off"}
            </Text>
          </View>
        )}

        {/* Speaker / Earpiece Toggle */}
        <View style={styles.btnColumn}>
          <TouchableOpacity
            style={[styles.circleBtn, isSpeakerOn && styles.circleBtnActive]}
            onPress={onToggleSpeaker}
            activeOpacity={0.7}
            accessibilityLabel={isSpeakerOn ? "Speaker on" : "Speaker off"}
          >
            {isSpeakerOn ? (
              <Volume2 size={22} color={colors.accent || "#2DD4BF"} />
            ) : (
              <VolumeX size={22} color={colors.textSecondary} />
            )}
          </TouchableOpacity>
          <Text style={styles.btnLabel}>{isSpeakerOn ? "Speaker" : "Earpiece"}</Text>
        </View>

        {/* Microphone Toggle Button */}
        <View style={styles.btnColumn}>
          <TouchableOpacity
            style={[
              styles.circleBtn,
              !micEnabled && styles.circleBtnMuted,
            ]}
            onPress={() => setMicEnabled(!micEnabled)}
            activeOpacity={0.7}
            accessibilityLabel={micEnabled ? "Mute microphone" : "Unmute microphone"}
          >
            {micEnabled ? (
              <Mic size={22} color={colors.textPrimary} />
            ) : (
              <MicOff size={22} color={colors.danger} />
            )}
          </TouchableOpacity>
          <Text style={[styles.btnLabel, !micEnabled && { color: colors.danger }]}>
            {micEnabled ? "Mute" : "Muted"}
          </Text>
        </View>

        {/* End Call / Leave Room Button */}
        <View style={styles.btnColumn}>
          <TouchableOpacity
            style={[styles.circleBtn, styles.endCallBtn]}
            onPress={onDisconnectClick}
            activeOpacity={0.8}
            accessibilityLabel="End Call"
          >
            <PhoneOff size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={[styles.btnLabel, { color: colors.danger }]}>End</Text>
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: 16,
    alignItems: "center",
  },
  glassBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    backgroundColor: "rgba(10, 12, 18, 0.82)",
    width: "100%",
    overflow: "hidden",
  },
  btnColumn: {
    alignItems: "center",
    gap: 6,
  },
  circleBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  circleBtnActive: {
    backgroundColor: "rgba(45, 212, 191, 0.12)",
    borderColor: "rgba(45, 212, 191, 0.35)",
  },
  circleBtnMuted: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "rgba(239, 68, 68, 0.4)",
  },
  endCallBtn: {
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
