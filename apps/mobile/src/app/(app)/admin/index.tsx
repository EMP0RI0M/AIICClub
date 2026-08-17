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
import { colors, radius } from "../../../theme/tokens";
import { GlassCard } from "../../../components/ui/GlassCard";
import { Badge } from "../../../components/ui/Badge";
import { api } from "../../../lib/api";
import {
  ArrowLeft,
  ShieldAlert,
  Users,
  Layers,
  Activity,
  Award,
  Lock,
  ChevronRight,
  UserCheck,
} from "lucide-react-native";

export default function AdminScreen() {
  const router = useRouter();
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
      <SafeAreaView edges={["top"]} style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.loadingText}>Verifying administrative permissions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (unauthorized) {
    return (
      <SafeAreaView edges={["top"]} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.title}>Admin Governance</Text>
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
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <ShieldAlert size={18} color={colors.accent} />
          <Text style={styles.title}>Admin Governance</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Governance Badge Card */}
        <GlassCard elevated style={styles.bannerCard}>
          <Text style={styles.bannerSubtitle}>AIIC EXECUTIVE CONSOLE</Text>
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
            <Layers size={20} color={colors.accent} />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  bannerCard: {
    padding: 18,
    marginBottom: 20,
  },
  bannerSubtitle: {
    color: colors.accent,
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
