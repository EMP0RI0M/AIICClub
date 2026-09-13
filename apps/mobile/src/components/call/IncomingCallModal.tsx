import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, useAppTheme } from "../../theme/tokens";
import { Avatar } from "../ui/Avatar";
import { Phone, PhoneOff, Video, Mic } from "lucide-react-native";
import { NativeHaptics } from "../../lib/haptics";
import { globalCallSignaling, IncomingCallPayload } from "../../lib/call-signaling";
import { declineDMCall } from "../../lib/api";

export function IncomingCallModal() {
  const theme = useAppTheme();
  const router = useRouter();
  const [incomingCall, setIncomingCall] = useState<IncomingCallPayload | null>(null);
  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    const unsub = globalCallSignaling.onIncomingCall((call) => {
      setIncomingCall(call);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (incomingCall) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [incomingCall]);

  if (!incomingCall) return null;

  const handleAccept = () => {
    NativeHaptics.success();
    const dmId = incomingCall.conversationId || incomingCall.callId || "";
    const isVideo = Boolean(incomingCall.video);
    const callerName = incomingCall.callerName;
    const avatarUrl = incomingCall.callerAvatar;

    globalCallSignaling.dismissActiveCall();

    router.push({
      pathname: `/(app)/voice/${dmId}`,
      params: {
        type: isVideo ? "video" : "voice",
        title: callerName,
        avatarUrl: avatarUrl || undefined,
        direction: "incoming",
        accepted: "true",
      },
    } as any);
  };

  const handleDecline = () => {
    NativeHaptics.heavy();
    const dmId = incomingCall.conversationId || incomingCall.callId;
    if (dmId) {
      void declineDMCall(dmId).catch(() => {});
    }
    globalCallSignaling.dismissActiveCall();
  };

  return (
    <Modal
      visible={Boolean(incomingCall)}
      transparent
      animationType="fade"
      onRequestClose={handleDecline}
    >
      <View style={styles.backdrop}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFillObject} />

        <View style={styles.cardContainer}>
          <BlurView intensity={50} tint="dark" style={styles.card}>
            <LinearGradient
              colors={["rgba(22, 28, 44, 0.95)", "rgba(8, 8, 12, 0.98)"]}
              style={StyleSheet.absoluteFillObject}
            />

            {/* Ambient Top Glow */}
            <View style={[styles.ambientGlow, { backgroundColor: theme.colors.accentSoft }]} />

            {/* Call Type Badge */}
            <View style={[styles.badge, { borderColor: theme.colors.accentBorder, backgroundColor: theme.colors.accentSoft }]}>
              <Text style={[styles.badgeText, { color: theme.colors.accent }]}>
                INCOMING {incomingCall.video ? "VIDEO" : "VOICE"} CALL
              </Text>
            </View>

            {/* Caller Avatar with Pulsing Emerald Halo */}
            <View style={styles.avatarWrapper}>
              <Animated.View
                style={[
                  styles.pulseRing,
                  {
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              />
              <View style={styles.avatarRing}>
                <Avatar
                  name={incomingCall.callerName}
                  url={incomingCall.callerAvatar}
                  size={84}
                />
              </View>
            </View>

            {/* Caller Name */}
            <Text style={styles.callerName} numberOfLines={1}>
              {incomingCall.callerName}
            </Text>
            <Text style={styles.callingText}>is calling you...</Text>

            {/* Action Buttons: Decline / Accept */}
            <View style={styles.actionsRow}>
              <View style={styles.btnCol}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.declineBtn]}
                  onPress={handleDecline}
                  activeOpacity={0.8}
                >
                  <PhoneOff size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.btnLabel}>Decline</Text>
              </View>

              <View style={styles.btnCol}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.acceptBtn]}
                  onPress={handleAccept}
                  activeOpacity={0.8}
                >
                  <Phone size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.btnLabel}>Accept</Text>
              </View>
            </View>
          </BlurView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  cardContainer: {
    width: "100%",
    maxWidth: 360,
  },
  card: {
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    padding: 28,
    alignItems: "center",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.6,
    shadowRadius: 32,
    elevation: 16,
  },
  ambientGlow: {
    position: "absolute",
    top: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(232, 163, 61, 0.20)",
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(232, 163, 61, 0.35)",
    marginBottom: 20,
  },
  badgeText: {
    fontSize: 10.5,
    fontFamily: "JetBrainsMono_700Bold",
    color: colors.accent,
    letterSpacing: 0.8,
  },
  avatarWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  pulseRing: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(52, 199, 89, 0.25)",
  },
  avatarRing: {
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "rgba(52, 199, 89, 0.50)",
    padding: 2,
    backgroundColor: "#0A0B11",
  },
  callerName: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 4,
  },
  callingText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 28,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    width: "100%",
    paddingHorizontal: 16,
  },
  btnCol: {
    alignItems: "center",
    gap: 6,
  },
  actionBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  acceptBtn: {
    backgroundColor: "#34C759",
    borderColor: "rgba(52, 199, 89, 0.6)",
    borderWidth: 1,
  },
  declineBtn: {
    backgroundColor: "#FF3B30",
    borderColor: "rgba(255, 59, 48, 0.6)",
    borderWidth: 1,
  },
  btnLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textPrimary,
  },
});
