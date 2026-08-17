import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Users, Sparkles, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react-native";
import { colors } from "@/theme/tokens";
import { useAuthStore } from "@/stores/auth-store";
import { api } from "@/lib/api";

interface InviteDetails {
  id: string;
  code: string;
  serverId: string;
  serverName: string;
  serverIcon?: string | null;
  serverDescription?: string | null;
  memberCount: number;
  inviterName: string;
  expiresAt?: string | null;
  maxUses?: number | null;
  uses?: number;
  isMember?: boolean;
}

export default function JoinInviteScreen() {
  const { code: rawCode } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const code = (rawCode || "").replace(/\/+$/, "").trim();

  const { user, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [inviteData, setInviteData] = useState<InviteDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorReason, setErrorReason] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setError("No invite code provided.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setErrorReason(null);

    api<{ invite: InviteDetails }>(`/invites/${encodeURIComponent(code)}`)
      .then((data) => {
        if (data?.invite) {
          setInviteData(data.invite);
        } else {
          setError("Invite not found or invalid.");
        }
        setLoading(false);
      })
      .catch((err: any) => {
        console.error("[MOBILE_INVITE_RESOLVE_ERROR]", { code, err });
        setError(err.message || "Invalid invite link");
        setErrorReason(err.reason || "unknown");
        setLoading(false);
      });
  }, [code]);

  const handleJoin = async () => {
    if (!code) return;

    if (!isAuthenticated) {
      router.push(`/(auth)/login` as any);
      return;
    }

    // If already a member, open space directly
    if (inviteData?.isMember && inviteData.serverId) {
      router.replace(`/(app)/spaces/${inviteData.serverId}/general` as any);
      return;
    }

    setJoining(true);
    setError(null);

    try {
      const res = await api<{
        message: string;
        alreadyMember?: boolean;
        server: { id: string; name: string; iconUrl: string | null };
      }>(`/invites/${encodeURIComponent(code)}/join`, {
        method: "POST",
      });

      const targetId = res?.server?.id || inviteData?.serverId;
      if (targetId) {
        router.replace(`/(app)/spaces/${targetId}/general` as any);
      } else {
        router.replace(`/(app)/spaces/default/general` as any);
      }
    } catch (err: any) {
      console.error("[MOBILE_INVITE_JOIN_ERROR]", { code, err });
      setError(err?.message || "Failed to join space. Please try again.");
      setJoining(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.container}>
        {/* Glow ambient circle */}
        <View style={styles.ambientGlow} />

        <View style={styles.card}>
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={styles.loadingText}>Resolving Space Invite...</Text>
            </View>
          ) : error || !inviteData ? (
            <View style={styles.centerBox}>
              <View style={styles.errorIconCircle}>
                <AlertCircle size={32} color={colors.danger} />
              </View>
              <Text style={styles.errorTitle}>
                {errorReason === "expired"
                  ? "Invite Link Expired"
                  : errorReason === "maxed"
                  ? "Usage Limit Reached"
                  : "Invalid Invite Link"}
              </Text>
              <Text style={styles.errorSubtitle}>
                {error || "This invite link may have expired or been revoked by the space administrator."}
              </Text>
              <Pressable
                onPress={() => router.replace(`/(app)/spaces/default/general` as any)}
                style={styles.backBtn}
              >
                <Text style={styles.backBtnText}>Go to AIIC Spaces</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.contentBox}>
              {/* Inviter Badge */}
              <View style={styles.inviterBadge}>
                <Sparkles size={12} color={colors.accent} />
                <Text style={styles.inviterText}>
                  Invited by {inviteData.inviterName || "a Club Member"}
                </Text>
              </View>

              {/* Space Icon */}
              <View style={styles.spaceIconBox}>
                {inviteData.serverIcon ? (
                  <Image source={{ uri: inviteData.serverIcon }} style={styles.spaceIcon} />
                ) : (
                  <Text style={styles.spaceLetter}>
                    {inviteData.serverName.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>

              {/* Space Title & Meta */}
              <Text style={styles.spaceTitle}>{inviteData.serverName}</Text>
              {inviteData.serverDescription ? (
                <Text style={styles.spaceDesc} numberOfLines={2}>
                  {inviteData.serverDescription}
                </Text>
              ) : null}

              {/* Member count & verification badge */}
              <View style={styles.metaRow}>
                <View style={styles.metaPill}>
                  <Users size={12} color={colors.textMuted} />
                  <Text style={styles.metaText}>{inviteData.memberCount || 1} members</Text>
                </View>
                <View style={[styles.metaPill, styles.verifiedPill]}>
                  <ShieldCheck size={12} color={colors.accentTeal} />
                  <Text style={styles.verifiedText}>Verified Space</Text>
                </View>
              </View>

              {/* Join or Open Button */}
              <Pressable
                onPress={handleJoin}
                disabled={joining}
                style={[styles.joinBtn, joining && styles.btnDisabled]}
              >
                {joining ? (
                  <ActivityIndicator size="small" color={colors.accentContrast} />
                ) : (
                  <>
                    <Text style={styles.joinBtnText}>
                      {inviteData.isMember ? "Open Space" : "Accept Invite & Join"}
                    </Text>
                    <ArrowRight size={16} color={colors.accentContrast} />
                  </>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#090C12",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  ambientGlow: {
    position: "absolute",
    top: "20%",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(232, 163, 61, 0.08)",
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "rgba(18, 23, 34, 0.88)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 32,
    elevation: 8,
  },
  centerBox: {
    alignItems: "center",
    paddingVertical: 20,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
    fontFamily: "monospace",
    marginTop: 16,
  },
  errorIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  errorTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  errorSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 10,
  },
  backBtn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  backBtnText: {
    color: colors.accentContrast,
    fontSize: 13,
    fontWeight: "700",
  },
  contentBox: {
    alignItems: "center",
  },
  inviterBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  inviterText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  spaceIconBox: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    overflow: "hidden",
  },
  spaceIcon: {
    width: "100%",
    height: "100%",
  },
  spaceLetter: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "800",
  },
  spaceTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 12,
    textAlign: "center",
  },
  spaceDesc: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: "monospace",
  },
  verifiedPill: {
    backgroundColor: "rgba(45, 212, 191, 0.1)",
    borderColor: "rgba(45, 212, 191, 0.25)",
  },
  verifiedText: {
    color: colors.accentTeal,
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  joinBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 24,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  joinBtnText: {
    color: colors.accentContrast,
    fontSize: 14,
    fontWeight: "700",
  },
});
