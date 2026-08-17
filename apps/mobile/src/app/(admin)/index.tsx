import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius } from "../../theme/tokens";
import { GlassCard } from "../../components/ui/GlassCard";
import { Badge } from "../../components/ui/Badge";
import { fetchAdminOverview } from "../../lib/api";
import {
  ArrowLeft,
  Shield,
  Users,
  Layers,
  GitBranch,
  FileCheck,
  Activity,
  AlertCircle,
} from "lucide-react-native";

export default function AdminDashboardScreen() {
  const router = useRouter();
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminOverview()
      .then((res) => {
        setOverview(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Unauthorized: Admin privileges required");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <SafeAreaView edges={["top"]} style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView edges={["top"]} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.title}>Admin Access</Text>
        </View>
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color={colors.danger} />
          <Text style={styles.errorTitle}>Access Denied</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stats = overview?.stats || {};
  const recentAudit = overview?.recentAudit || [];

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.title}>AIIC Governance & Admin</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <GlassCard elevated style={styles.statusCard}>
          <View style={styles.statusTop}>
            <Shield size={24} color={colors.accent} />
            <View>
              <Text style={styles.statusTitle}>Admin Authorization Active</Text>
              <Text style={styles.statusSub}>
                Logged in as {overview?.adminUser?.displayName || overview?.adminUser?.username}
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Real Metrics Grid */}
        <Text style={styles.sectionHeader}>PLATFORM METRICS</Text>
        <View style={styles.metricsGrid}>
          <GlassCard style={styles.metricCard}>
            <Text style={styles.metricVal}>{stats.totalUsers ?? 0}</Text>
            <Text style={styles.metricLabel}>Total Users</Text>
          </GlassCard>
          <GlassCard style={styles.metricCard}>
            <Text style={[styles.metricVal, { color: colors.warning }]}>
              {stats.pendingApprovals ?? 0}
            </Text>
            <Text style={styles.metricLabel}>Pending Approval</Text>
          </GlassCard>
          <GlassCard style={styles.metricCard}>
            <Text style={[styles.metricVal, { color: colors.accentTeal }]}>
              {stats.activeSpaces ?? 0}
            </Text>
            <Text style={styles.metricLabel}>Active Spaces</Text>
          </GlassCard>
          <GlassCard style={styles.metricCard}>
            <Text style={[styles.metricVal, { color: colors.accent }]}>
              {stats.activeTeams ?? 0}
            </Text>
            <Text style={styles.metricLabel}>Active Teams</Text>
          </GlassCard>
        </View>

        {/* Audit Log */}
        <Text style={styles.sectionHeader}>RECENT AUDIT TRAIL</Text>
        <View style={{ gap: 8 }}>
          {recentAudit.length === 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>No recent audit events.</Text>
          ) : (
            recentAudit.map((log: any) => (
              <GlassCard key={log.id} style={styles.auditCard}>
                <View style={styles.auditTop}>
                  <Badge label={log.action} variant="teal" />
                  <Text style={styles.auditTime}>
                    {new Date(log.created_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                </View>
                <Text style={styles.auditText}>
                  Actor: @{log.actor?.username || "system"} · {log.category}
                </Text>
              </GlassCard>
            ))
          )}
        </View>
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
    borderBottomColor: colors.border,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  errorTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  errorSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  statusCard: {
    padding: 16,
    marginBottom: 20,
    borderColor: colors.accent,
  },
  statusTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  statusSub: {
    color: colors.accent,
    fontSize: 12,
  },
  sectionHeader: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 8,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  metricCard: {
    width: "48%",
    padding: 14,
  },
  metricVal: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 2,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  auditCard: {
    padding: 12,
  },
  auditTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  auditTime: {
    color: colors.textMuted,
    fontSize: 11,
  },
  auditText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});
