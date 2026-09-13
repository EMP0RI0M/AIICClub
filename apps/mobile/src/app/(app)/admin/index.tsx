import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, useAppTheme } from "../../../theme/tokens";
import { GlassCard } from "../../../components/ui/GlassCard";
import { Badge } from "../../../components/ui/Badge";
import { GlassBackButton } from "../../../components/ui/GlassBackButton";
import { WallpaperBackground } from "../../../components/theme/WallpaperBackground";
import { api } from "../../../lib/api";
import {
  ShieldAlert,
  Users,
  Layers,
  Activity,
  Award,
  Lock,
  ChevronRight,
  UserCheck,
  ShieldCheck,
} from "lucide-react-native";

export default function AdminScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    async function loadAdminOverview() {
      setLoading(true);
      try {
        const res = await api<any>("/admin/overview");
        if (res?.stats) {
          setStats(res.stats);
        } else if (res?.error) {
          setUnauthorized(true);
        }
      } catch (err: any) {
        setUnauthorized(true);
      } finally {
        setLoading(false);
      }
    }
    loadAdminOverview();
  }, []);

  if (loading) {
    return (
      <WallpaperBackground>
        <SafeAreaView edges={["top"]} style={styles.container}>
          <View style={styles.centerContainer}>
            <ActivityIndicator size="small" color={theme.colors.accent} />
            <Text style={styles.loadingText}>Verifying administrative permissions...</Text>
          </View>
        </SafeAreaView>
      </WallpaperBackground>
    );
  }

  if (unauthorized) {
    return (
      <WallpaperBackground>
        <SafeAreaView edges={["top"]} style={styles.container}>
          {/* Floating Liquid Glass Header Capsule */}
          <View style={styles.headerCapsuleWrap}>
            <View style={styles.headerCapsule}>
              <GlassBackButton size={44} iconSize={19} style={{ borderRadius: 22 }} />
              <BlurView intensity={32} tint="dark" style={styles.headerCenter}>
                <LinearGradient
                  colors={["rgba(255, 255, 255, 0.08)", "rgba(255, 255, 255, 0.02)"]}
                  style={StyleSheet.absoluteFillObject}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <View style={styles.headerIconOrb}>
                  <ShieldAlert size={17} color={colors.danger} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.title} numberOfLines={1}>Admin Governance</Text>
                  <Text style={[styles.headerSub, { color: colors.danger }]} numberOfLines={1}>ACCESS RESTRICTED</Text>
                </View>
              </BlurView>
            </View>
          </View>

          <View style={styles.centerContainer}>
            <View style={styles.lockIconWrap}>
              <Lock size={32} color={colors.danger} />
            </View>
            <Text style={styles.unauthTitle}>Access Restricted</Text>
            <Text style={styles.unauthDesc}>
              Administrative governance is restricted to authorized Executive Board members & Admins.
            </Text>
          </View>
        </SafeAreaView>
      </WallpaperBackground>
    );
  }

  return (
    <WallpaperBackground>
      <SafeAreaView edges={["top"]} style={styles.container}>
        {/* Floating Liquid Glass Header Capsule */}
        <View style={styles.headerCapsuleWrap}>
          <View style={styles.headerCapsule}>
            <GlassBackButton size={44} iconSize={19} style={{ borderRadius: 22 }} />
            <BlurView intensity={32} tint="dark" style={styles.headerCenter}>
              <LinearGradient
                colors={["rgba(255, 255, 255, 0.08)", "rgba(255, 255, 255, 0.02)"]}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <View style={[styles.headerIconOrb, { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accentBorder }]}>
                <ShieldAlert size={17} color={theme.colors.accent} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.title} numberOfLines={1}>Admin Governance</Text>
                <Text style={[styles.headerSub, { color: theme.colors.accent }]} numberOfLines={1}>EXECUTIVE CONSOLE</Text>
              </View>
            </BlurView>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Governance Badge Card */}
          <GlassCard elevated style={styles.bannerCard}>
            <Text style={[styles.bannerSubtitle, { color: theme.colors.accent }]}>AIIC EXECUTIVE CONSOLE</Text>
            <Text style={styles.bannerTitle}>Organization Overview</Text>
            <Text style={styles.bannerDesc}>
              Real-time audit telemetry, permission assignments, and member roster management.
            </Text>
          </GlassCard>

          {/* Stats Grid */}
          <Text style={styles.sectionHeader}>CORE METRICS</Text>
          <View style={styles.statsGrid}>
            <GlassCard style={styles.statCard}>
              <Users size={20} color={colors.accentTeal} />
              <Text style={styles.statNumber}>{stats?.totalUsers ?? 0}</Text>
              <Text style={styles.statLabel}>Total Members</Text>
            </GlassCard>

            <GlassCard style={styles.statCard}>
              <Layers size={20} color={theme.colors.accent} />
              <Text style={styles.statNumber}>{stats?.totalSpaces ?? 0}</Text>
              <Text style={styles.statLabel}>Active Spaces</Text>
            </GlassCard>

            <GlassCard style={styles.statCard}>
              <Activity size={20} color={colors.accentWarm} />
              <Text style={styles.statNumber}>{stats?.activeTeams ?? 0}</Text>
              <Text style={styles.statLabel}>Squad Teams</Text>
            </GlassCard>

            <GlassCard style={styles.statCard}>
              <UserCheck size={20} color={colors.statusOnline} />
              <Text style={styles.statNumber}>{stats?.pendingApprovals ?? 0}</Text>
              <Text style={styles.statLabel}>Pending Approvals</Text>
            </GlassCard>
          </View>

          {/* Role Distribution */}
          {stats?.roleCounts && (
            <>
              <Text style={styles.sectionHeader}>ROLES & ASSIGNMENTS</Text>
              <GlassCard style={styles.rolesCard}>
                {Object.entries(stats.roleCounts).map(([role, count]) => (
                  <View key={role} style={styles.roleRow}>
                    <Text style={styles.roleName}>{role.replace(/_/g, " ").toUpperCase()}</Text>
                    <Badge label={`${count}`} variant="teal" />
                  </View>
                ))}
              </GlassCard>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </WallpaperBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  headerCapsuleWrap: {
    marginHorizontal: 14,
    marginTop: 8,
    marginBottom: 6,
  },
  headerCapsule: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  headerCenter: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 10,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  headerIconOrb: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.10)",
  },
  title: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  headerSub: {
    fontSize: 9,
    fontWeight: "800",
    fontFamily: "monospace",
    letterSpacing: 0.6,
    marginTop: 1,
  },
  content: {
    padding: 14,
    paddingBottom: 40,
  },
  bannerCard: {
    padding: 18,
    marginBottom: 20,
  },
  bannerSubtitle: {
    fontSize: 11,
    fontWeight: "800",
    fontFamily: "monospace",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  bannerTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  bannerDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  sectionHeader: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "monospace",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    width: "48%",
    padding: 14,
    gap: 6,
  },
  statNumber: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    fontFamily: "monospace",
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  rolesCard: {
    padding: 14,
  },
  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.04)",
  },
  roleName: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "600",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  lockIconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  unauthTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  unauthDesc: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
});
