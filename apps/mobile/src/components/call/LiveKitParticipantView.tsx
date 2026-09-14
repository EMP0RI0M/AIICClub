import * as React from "react";
import { StyleSheet, View, Text, ViewStyle, StyleProp } from "react-native";
import {
  isTrackReference,
  TrackReferenceOrPlaceholder,
  useEnsureTrackRef,
  useIsMuted,
  useIsSpeaking,
  useParticipantInfo,
  VideoTrack,
} from "@livekit/react-native";
import { Avatar } from "../ui/Avatar";
import { colors } from "../../theme/tokens";
import { MicOff, VideoOff } from "lucide-react-native";

export interface ParticipantViewProps {
  trackRef: TrackReferenceOrPlaceholder;
  style?: StyleProp<ViewStyle>;
  zOrder?: number;
  mirror?: boolean;
  avatarUrl?: string | null;
  customName?: string;
}

export const ParticipantView: React.FC<ParticipantViewProps> = ({
  trackRef,
  style,
  zOrder,
  mirror,
  avatarUrl,
  customName,
}) => {
  const trackReference = useEnsureTrackRef(trackRef);
  const { identity, name } = useParticipantInfo({
    participant: trackReference.participant,
  });
  const isSpeaking = useIsSpeaking(trackRef.participant);
  const isVideoMuted = useIsMuted(trackRef);

  const displayName = customName || name || identity || "Participant";

  return (
    <View style={[styles.container, style]}>
      {isTrackReference(trackRef) && !isVideoMuted ? (
        <VideoTrack
          style={styles.videoTrack}
          trackRef={trackRef}
          zOrder={zOrder}
          mirror={mirror}
        />
      ) : (
        <View style={styles.placeholderContainer}>
          <View style={styles.avatarWrapper}>
            <Avatar name={displayName} url={avatarUrl} size={84} />
          </View>
          <View style={styles.mutedBadge}>
            <VideoOff size={14} color={colors.textMuted} />
            <Text style={styles.mutedText}>Camera Off</Text>
          </View>
        </View>
      )}

      {/* Identity Bottom Bar */}
      <View style={styles.identityBar}>
        <Text style={styles.identityName} numberOfLines={1}>
          {displayName}
        </Text>
      </View>

      {/* Active Speaker Border Indicator */}
      {isSpeaking && <View pointerEvents="none" style={styles.speakingIndicator} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0B0E17",
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  videoTrack: {
    width: "100%",
    height: "100%",
  },
  placeholderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(15, 18, 28, 0.95)",
    gap: 12,
  },
  avatarWrapper: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  mutedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  mutedText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "500",
  },
  identityBar: {
    position: "absolute",
    bottom: 8,
    left: 8,
    maxWidth: "80%",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
  },
  identityName: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  speakingIndicator: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderColor: colors.accent || "#2DD4BF",
    borderWidth: 2.5,
  },
});
