import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, typography } from "../theme/tokens";
import { GlassCard } from "../components/ui/GlassCard";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { useAuthStore } from "../stores/auth-store";
import {
  Sparkles,
  Radio,
  Layers,
  Users,
  Terminal,
  Shield,
  ArrowRight,
  Zap,
} from "lucide-react-native";

export default function LandingScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top Brand Bar */}
        <View style={styles.navBar}>
          <View style={styles.brandRow}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoText}>A</Text>
            </View>
            <View>
              <Text style={styles.brandTitle}>AIIC</Text>
              <Text style={styles.brandSubtitle}>AI & INNOVATION CLUB</Text>
            </View>
          </View>
          <Button
            title={isAuthenticated ? "Open App" : "Sign In"}
            size="sm"
            variant={isAuthenticated ? "primary" : "secondary"}
            onPress={() => {
              if (isAuthenticated) {
                router.push("/(app)/spaces/space-aiic-main/c-general");
              } else {
                router.push("/(auth)/login");
              }
            }}
          />
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Badge label="FRONTIER AI & RESEARCH PLATFORM" variant="teal" size="md" />
          <Text style={styles.heroTitle}>
            Where Builders <Text style={{ color: colors.accent }}>Innovate</Text> and Deploy the Future.
          </Text>
          <Text style={styles.heroDescription}>
            The official AI & Innovation Club client. Realtime multi-space channels, low-latency audio/video SFU, native kanban sprint boards, and deep GitHub collaboration.
          </Text>

          <View style={styles.heroActions}>
            <Button
              title="Launch Workspace"
              size="lg"
              icon={<ArrowRight size={18} color={colors.accentContrast} />}
              onPress={() => {
                if (isAuthenticated) {
                  router.push("/(app)/spaces/space-aiic-main/c-general");
                } else {
                  router.push("/(auth)/login");
                }
              }}
              style={{ flex: 1 }}
            />
            <Button
              title="Explore Projects"
              size="lg"
              variant="secondary"
              onPress={() => router.push("/(app)/projects")}
              style={{ flex: 1 }}
            />
          </View>
        </View>

        {/* Core Pillars */}
        <Text style={styles.sectionHeader}>PLATFORM CAPABILITIES</Text>

        <View style={styles.featuresGrid}>
          <GlassCard style={styles.featureCard}>
            <View style={[styles.iconWrap, { backgroundColor: colors.accentSoft }]}>
              <Layers size={22} color={colors.accent} />
            </View>
            <Text style={styles.cardTitle}>Spaces & Modular Channels</Text>
            <Text style={styles.cardBody}>
              Dedicated spaces for squads, sub-teams, and research labs with rich embeds and permissions.
            </Text>
          </GlassCard>

          <GlassCard style={styles.featureCard}>
            <View style={[styles.iconWrap, { backgroundColor: colors.accentTealSoft }]}>
              <Radio size={22} color={colors.accentTeal} />
            </View>
            <Text style={styles.cardTitle}>Realtime Voice & Keynote Stages</Text>
            <Text style={styles.cardBody}>
              Live audio channels with active speaker detection, noise suppression, and audience queues.
            </Text>
          </GlassCard>

          <GlassCard style={styles.featureCard}>
            <View style={[styles.iconWrap, { backgroundColor: colors.successSoft }]}>
              <Terminal size={22} color={colors.success} />
            </View>
            <Text style={styles.cardTitle}>Boards, Docs & Incidents</Text>
            <Text style={styles.cardBody}>
              Kanban sprints, block documentation, and live incident rooms embedded directly in channels.
            </Text>
          </GlassCard>

          <GlassCard style={styles.featureCard}>
            <View style={[styles.iconWrap, { backgroundColor: colors.warningSoft }]}>
              <Users size={22} color={colors.warning} />
            </View>
            <Text style={styles.cardTitle}>Club Directory & Governance</Text>
            <Text style={styles.cardBody}>
              Verified member directory, leadership history, achievements archive, and audit logs.
            </Text>
          </GlassCard>
        </View>

        {/* Quick Links Section */}
        <Text style={styles.sectionHeader}>EXPLORE AIIC ARCHIVE & NOTICE BOARD</Text>

        <View style={styles.linksRow}>
          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => router.push("/(app)/notices")}
          >
            <Text style={styles.quickLinkTitle}>📢 Notice Board</Text>
            <Text style={styles.quickLinkSub}>Official club broadcasts</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => router.push("/(app)/archive")}
          >
            <Text style={styles.quickLinkTitle}>🏛️ Historical Archive</Text>
            <Text style={styles.quickLinkSub}>Past sessions & repositories</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>AI & Innovation Club © 2026</Text>
          <Text style={styles.footerSub}>Privacy-First · Open-Source Infrastructure</Text>
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
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: "800",
  },
  brandTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    color: colors.accentTeal,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  heroSection: {
    marginBottom: 32,
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 36,
    marginVertical: 14,
    letterSpacing: -0.5,
  },
  heroDescription: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  heroActions: {
    flexDirection: "row",
    gap: 12,
  },
  sectionHeader: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 14,
    marginTop: 8,
  },
  featuresGrid: {
    gap: 12,
    marginBottom: 28,
  },
  featureCard: {
    padding: 16,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  cardBody: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  linksRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 32,
  },
  quickLink: {
    flex: 1,
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.borderHighlight,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 16,
  },
  quickLinkTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  quickLinkSub: {
    color: colors.textMuted,
    fontSize: 12,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 20,
    alignItems: "center",
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  footerSub: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
});
