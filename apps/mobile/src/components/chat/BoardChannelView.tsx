import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  Kanban,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  ArrowRight,
  User,
} from "lucide-react-native";
import { colors } from "@/theme/tokens";
import { useAuthStore } from "@/stores/auth-store";
import { api } from "@/lib/api";

export interface BoardCard {
  id: string;
  title: string;
  assignee?: { id: string; name: string };
  label?: string;
}

export interface BoardColumn {
  id: string;
  title: string;
  cards: BoardCard[];
}

export interface BoardData {
  id: string;
  name: string;
  columns: BoardColumn[];
}

export function BoardChannelView({
  channelId,
  channelName,
  onBack,
}: {
  channelId?: string;
  channelName?: string;
  onBack?: () => void;
}) {
  const [board, setBoard] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingColId, setAddingColId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");

  const loadBoard = async () => {
    if (!channelId) return;
    setLoading(true);
    try {
      const res = await api<{ board: BoardData }>(`/channels/${channelId}/board`);
      if (res?.board) {
        setBoard(res.board);
      }
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoard();
  }, [channelId]);

  const saveBoard = async (nextBoard: BoardData) => {
    setBoard(nextBoard);
    if (!channelId) return;
    try {
      await api(`/channels/${channelId}/board`, {
        method: "PUT",
        body: JSON.stringify({ board: nextBoard }),
      });
    } catch (err: any) {
      console.warn("[BoardChannelView] Save failed:", err?.message);
    }
  };

  const handleAddCard = (colId: string) => {
    if (!newCardTitle.trim() || !board) return;
    const cardId = `CARD-${Math.floor(100 + Math.random() * 900)}`;
    const newCard: BoardCard = {
      id: cardId,
      title: newCardTitle.trim(),
    };

    const nextCols = board.columns.map((c) =>
      c.id === colId ? { ...c, cards: [...c.cards, newCard] } : c
    );

    saveBoard({ ...board, columns: nextCols });
    setNewCardTitle("");
    setAddingColId(null);
  };

  const handleMoveCard = (card: BoardCard, fromColId: string, toColId: string) => {
    if (!board || fromColId === toColId) return;
    const nextCols = board.columns.map((c) => {
      if (c.id === fromColId) {
        return { ...c, cards: c.cards.filter((x) => x.id !== card.id) };
      }
      if (c.id === toColId) {
        return { ...c, cards: [...c.cards, card] };
      }
      return c;
    });
    saveBoard({ ...board, columns: nextCols });
  };

  const handleDeleteCard = (cardId: string, colId: string) => {
    if (!board) return;
    const nextCols = board.columns.map((c) =>
      c.id === colId ? { ...c, cards: c.cards.filter((x) => x.id !== cardId) } : c
    );
    saveBoard({ ...board, columns: nextCols });
  };

  return (
    <View style={styles.container}>
      {/* Board Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Kanban size={18} color={colors.accentWarm} />
          <Text style={styles.headerTitle}>#{channelName || "board"}</Text>
          <View style={styles.boardBadge}>
            <Text style={styles.boardBadgeText}>KANBAN BOARD</Text>
          </View>
        </View>
      </View>

      {/* Horizontal Column Scroll */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading board data...</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.boardScroll}
        >
          {board?.columns.map((column, colIdx) => (
            <View key={column.id} style={styles.columnContainer}>
              <View style={styles.columnHeader}>
                <Text style={styles.columnTitle}>
                  {column.title.toUpperCase()} ({column.cards.length})
                </Text>
                <Pressable
                  onPress={() => setAddingColId(column.id)}
                  style={styles.addCardBtn}
                >
                  <Plus size={14} color={colors.accent} />
                </Pressable>
              </View>

              {/* Add Card Form in Column */}
              {addingColId === column.id && (
                <View style={styles.newCardForm}>
                  <TextInput
                    value={newCardTitle}
                    onChangeText={setNewCardTitle}
                    placeholder="Enter card title..."
                    placeholderTextColor={colors.textMuted}
                    style={styles.newCardInput}
                    autoFocus
                  />
                  <View style={styles.rowAlign}>
                    <Pressable
                      onPress={() => handleAddCard(column.id)}
                      style={styles.saveCardBtn}
                    >
                      <Text style={styles.saveCardBtnText}>Add Card</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setAddingColId(null)}
                      style={styles.cancelCardBtn}
                    >
                      <Text style={styles.cancelCardBtnText}>Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Card List in Column */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.cardList}
                contentContainerStyle={{ gap: 8 }}
              >
                {column.cards.length === 0 ? (
                  <View style={styles.emptyColBox}>
                    <Text style={styles.emptyColText}>No cards in this column</Text>
                  </View>
                ) : (
                  column.cards.map((card) => (
                    <View key={card.id} style={styles.card}>
                      <View style={styles.cardTop}>
                        <Text style={styles.cardId}>{card.id}</Text>
                        <Pressable
                          onPress={() => handleDeleteCard(card.id, column.id)}
                          hitSlop={8}
                        >
                          <Trash2 size={12} color={colors.textMuted} />
                        </Pressable>
                      </View>
                      <Text style={styles.cardTitle}>{card.title}</Text>

                      {/* Move Actions */}
                      <View style={styles.cardActions}>
                        {colIdx < (board?.columns.length || 0) - 1 && (
                          <Pressable
                            onPress={() =>
                              handleMoveCard(
                                card,
                                column.id,
                                board!.columns[colIdx + 1].id
                              )
                            }
                            style={styles.moveBtn}
                          >
                            <Text style={styles.moveBtnText}>
                              Move → {board!.columns[colIdx + 1].title}
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0E14",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  boardBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  boardBadgeText: {
    color: colors.accentWarm,
    fontSize: 9,
    fontWeight: "800",
    fontFamily: "monospace",
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: "monospace",
    marginTop: 12,
  },
  boardScroll: {
    padding: 14,
    gap: 12,
  },
  columnContainer: {
    width: 270,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 12,
    maxHeight: "100%",
  },
  columnHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  columnTitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
    fontFamily: "monospace",
    letterSpacing: 0.8,
  },
  addCardBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "rgba(232, 163, 61, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  newCardForm: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 10,
    padding: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    gap: 6,
  },
  newCardInput: {
    color: colors.textPrimary,
    fontSize: 13,
    padding: 0,
  },
  rowAlign: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  saveCardBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  saveCardBtnText: {
    color: colors.accentContrast,
    fontSize: 11,
    fontWeight: "700",
  },
  cancelCardBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cancelCardBtnText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  cardList: {
    flex: 1,
  },
  card: {
    backgroundColor: "#131824",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    gap: 6,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardId: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: "800",
    fontFamily: "monospace",
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  cardActions: {
    marginTop: 4,
  },
  moveBtn: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  moveBtnText: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: "monospace",
  },
  emptyColBox: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyColText: {
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: "italic",
  },
});
