import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius } from "../../../theme/tokens";
import { GlassCard } from "../../../components/ui/GlassCard";
import { Badge } from "../../../components/ui/Badge";
import { ArrowLeft, Edit3, Share2, Clock, User } from "lucide-react-native";

export default function DocScreen() {
  const router = useRouter();

  const doc = {
    title: "AI & Innovation Club Constitution & Architecture",
    author: "Alex Rivera",
    updated: "Updated 2 hours ago",
    blocks: [
      {
        type: "h1",
        text: "1. Mission & Engineering Principles",
      },
      {
        type: "p",
        text: "The AI & Innovation Club (AIIC) is an elite, multidisciplinary research and engineering organization dedicated to creating production-grade frontier software, edge ML kernels, neuromorphic algorithms, and autonomous robotics.",
      },
      {
        type: "h2",
        text: "2. Realtime Infrastructure Guidelines",
      },
      {
        type: "p",
        text: "All collaborative spaces, voice communications, and project boards must follow low-latency event synchronization best practices with end-to-end security and local privacy.",
      },
      {
        type: "bullet",
        items: [
          "Every flagship project must maintain open reproduction benchmarks.",
          "Live communication leverages WebRTC selective forwarding units.",
          "Database integrity backed by Supabase PostgreSQL and Row-Level Security.",
        ],
      },
    ],
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn}>
            <Edit3 size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{doc.title}</Text>
        <View style={styles.metaRow}>
          <View style={styles.authorRow}>
            <User size={14} color={colors.accent} />
            <Text style={styles.authorText}>{doc.author}</Text>
          </View>
          <View style={styles.authorRow}>
            <Clock size={14} color={colors.textMuted} />
            <Text style={styles.metaText}>{doc.updated}</Text>
          </View>
        </View>

        <GlassCard elevated style={styles.docCard}>
          {doc.blocks.map((b, i) => {
            if (b.type === "h1") {
              return (
                <Text key={i} style={styles.h1}>
                  {b.text}
                </Text>
              );
            }
            if (b.type === "h2") {
              return (
                <Text key={i} style={styles.h2}>
                  {b.text}
                </Text>
              );
            }
            if (b.type === "bullet") {
              return (
                <View key={i} style={styles.bulletList}>
                  {b.items?.map((item, idx) => (
                    <Text key={idx} style={styles.bulletItem}>
                      • {item}
                    </Text>
                  ))}
                </View>
              );
            }
            return (
              <Text key={i} style={styles.p}>
                {b.text}
              </Text>
            );
          })}
        </GlassCard>
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 6,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 20,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  authorText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "600",
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  docCard: {
    padding: 18,
  },
  h1: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 14,
    marginBottom: 8,
  },
  h2: {
    color: colors.accentTeal,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 6,
  },
  p: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 10,
  },
  bulletList: {
    gap: 6,
    marginVertical: 8,
  },
  bulletItem: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
});
