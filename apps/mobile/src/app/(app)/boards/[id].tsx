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
import { Button } from "../../../components/ui/Button";
import { ArrowLeft, Plus, CheckCircle, Clock } from "lucide-react-native";

export default function KanbanBoardScreen() {
  const router = useRouter();

  const board = {
    title: "Sprint 14: Neural Runtime & Mobile Edge Core",
    sprint: "CURRENT SPRINT · ENDS AUG 24",
    columns: [
      {
        id: "todo",
        title: "To Do",
        cards: [
          {
            id: "CARD-101",
            title: "Implement KV Cache quantized lookup in Triton",
            tag: "Kernel",
            assignee: "Alex Rivera",
          },
          {
            id: "CARD-104",
            title: "Optimize LiveKit WebRTC SFU reconnection backoff",
            tag: "Voice",
            assignee: "Marcus Brody",
          },
        ],
      },
      {
        id: "in_progress",
        title: "In Progress",
        cards: [
          {
            id: "CARD-099",
            title: "Expo React Native Glassmora navigation shell",
            tag: "Mobile",
            assignee: "Humayun",
          },
          {
            id: "CARD-102",
            title: "AEC noise gate worklet audio processor",
            tag: "DSP",
            assignee: "Sarah Chen",
          },
        ],
      },
      {
        id: "done",
        title: "Done",
        cards: [
          {
            id: "CARD-088",
            title: "Supabase real-time multi-tenant database migration",
            tag: "Infra",
            assignee: "Alex Rivera",
          },
          {
            id: "CARD-089",
            title: "GitHub organization webhook dispatch verification",
            tag: "CI/CD",
            assignee: "Elena Rostova",
          },
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
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {board.title}
          </Text>
          <Text style={styles.headerSprint}>{board.sprint}</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.boardScroll}
      >
        {board.columns.map((col) => (
          <View key={col.id} style={styles.columnWrap}>
            <View style={styles.columnHeader}>
              <Text style={styles.columnTitle}>{col.title}</Text>
              <Badge label={String(col.cards.length)} variant="muted" />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.cardList}
            >
              {col.cards.map((card) => (
                <GlassCard key={card.id} elevated style={styles.card}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardId}>{card.id}</Text>
                    <Badge label={card.tag} variant="teal" />
                  </View>
                  <Text style={styles.cardTitle}>{card.title}</Text>
                  <Text style={styles.cardAssignee}>👤 {card.assignee}</Text>
                </GlassCard>
              ))}

              <TouchableOpacity style={styles.addCardBtn}>
                <Plus size={16} color={colors.textMuted} />
                <Text style={styles.addCardText}>Add Card</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        ))}
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
    backgroundColor: colors.bgDeep,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  headerSprint: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
    fontFamily: "monospace",
  },
  boardScroll: {
    padding: 16,
    gap: 16,
  },
  columnWrap: {
    width: 280,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  columnHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  columnTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  cardList: {
    gap: 10,
  },
  card: {
    padding: 12,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  cardId: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: "monospace",
    fontWeight: "700",
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    marginBottom: 8,
  },
  cardAssignee: {
    color: colors.textMuted,
    fontSize: 11,
  },
  addCardBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderStyle: "dashed",
    gap: 6,
  },
  addCardText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
});
