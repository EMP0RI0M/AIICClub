import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import {
  Bell,
  Pin,
  Search,
  Plus,
  X,
  Sparkles,
  Calendar,
  AlertTriangle,
  Tag,
  Shield,
} from "lucide-react-native";
import { colors } from "@/theme/tokens";
import { useAuthStore } from "@/stores/auth-store";
import { api } from "@/lib/api";

export interface NoticeItem {
  id: string;
  title: string;
  content: string;
  author: string;
  category: string;
  priority?: "normal" | "urgent" | "pinned";
  isPinned?: boolean;
  publishedAt?: string;
}

const CATEGORIES = ["All", "Pinned", "Alert", "Workshop", "Club", "Academic", "Release", "General"];

export function MobileNoticeBoardView({
  onBack,
}: {
  onBack?: () => void;
}) {
  const { user, isAuthenticated } = useAuthStore();
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadNotices = async () => {
    setLoading(true);
    try {
      const res = await api<{ announcements: NoticeItem[] }>("/announcements");
      setNotices(res?.announcements || []);
    } catch (err: any) {
      console.warn("[MobileNoticeBoardView] load error:", err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotices();
  }, []);

  const filtered = notices.filter((n) => {
    const matchesCategory =
      selectedCategory === "All"
        ? true
        : selectedCategory === "Pinned"
        ? n.isPinned || n.priority === "pinned"
        : (n.category || "general").toLowerCase() === selectedCategory.toLowerCase();

    if (!matchesCategory) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      (n.title || "").toLowerCase().includes(q) ||
      (n.content || "").toLowerCase().includes(q) ||
      (n.author || "").toLowerCase().includes(q)
    );
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <View style={styles.headerBadge}>
            <Bell size={11} color={colors.accent} />
            <Text style={styles.headerBadgeText}>OFFICIAL DISPATCHES</Text>
          </View>
          <Text style={styles.headerTitle}>Club Notice Board</Text>
        </View>

        <Pressable
          onPress={() => setShowCreateModal(true)}
          style={styles.postBtn}
        >
          <Plus size={15} color={colors.accentContrast} />
          <Text style={styles.postBtnText}>Post Notice</Text>
        </Pressable>
      </View>

      {/* Search Input */}
      <View style={styles.searchBar}>
        <Search size={16} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search notices, workshops, advisories..."
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
        />
      </View>

      {/* Categories Scroll */}
      <View style={styles.pillRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
        >
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              style={[
                styles.categoryPill,
                selectedCategory === cat && styles.categoryPillActive,
              ]}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  selectedCategory === cat && styles.categoryPillTextActive,
                ]}
              >
                {cat}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Notice List */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Bell size={40} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No notices found</Text>
            <Text style={styles.emptySubtitle}>
              {query
                ? `No dispatches matching "${query}".`
                : "Official notices, workshop announcements, and club advisories appear here."}
            </Text>
          </View>
        ) : (
          filtered.map((notice) => (
            <NoticeCardItem key={notice.id} notice={notice} />
          ))
        )}
      </ScrollView>

      {/* Create Notice Modal */}
      <CreateNoticeModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => {
          loadNotices();
          setShowCreateModal(false);
        }}
      />
    </View>
  );
}

function NoticeCardItem({ notice }: { notice: NoticeItem }) {
  const isPinned = notice.isPinned || notice.priority === "pinned";
  const isUrgent = notice.priority === "urgent";

  return (
    <View style={[styles.card, isPinned && styles.cardPinned, isUrgent && styles.cardUrgent]}>
      {/* Category & Pin / Urgent Tag */}
      <View style={styles.cardHeader}>
        <View style={styles.catBadge}>
          <Text style={styles.catBadgeText}>{(notice.category || "GENERAL").toUpperCase()}</Text>
        </View>
        {isPinned && (
          <View style={styles.pinPill}>
            <Pin size={11} color={colors.accentTeal} />
            <Text style={styles.pinPillText}>PINNED</Text>
          </View>
        )}
        {isUrgent && (
          <View style={styles.urgentPill}>
            <AlertTriangle size={11} color={colors.danger} />
            <Text style={styles.urgentPillText}>URGENT</Text>
          </View>
        )}
      </View>

      {/* Title */}
      <Text style={styles.noticeTitle}>{notice.title}</Text>

      {/* Content */}
      <Text style={styles.noticeContent}>{notice.content}</Text>

      {/* Author & Timestamp */}
      <View style={styles.cardFooter}>
        <Text style={styles.authorText}>By {notice.author || "Executive Board"}</Text>
        <Text style={styles.dateText}>{notice.publishedAt || "Official Notice"}</Text>
      </View>
    </View>
  );
}

function CreateNoticeModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { user } = useAuthStore();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("General");
  const [priority, setPriority] = useState<"normal" | "urgent" | "pinned">("normal");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert("Required", "Please provide both a title and content for the notice.");
      return;
    }
    setSubmitting(true);
    try {
      await api("/announcements", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          category,
          priority,
          isPinned: priority === "pinned",
          author: user?.displayName || user?.username || "AIIC Executive Board",
        }),
      });

      Alert.alert("Success", "Notice dispatched to community.");
      onCreated();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to publish notice.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalSub}>COMMUNITY DISPATCH</Text>
              <Text style={styles.modalTitle}>Publish Club Notice</Text>
            </View>
            <Pressable onPress={onClose} style={styles.modalCloseBtn}>
              <X size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>NOTICE TITLE *</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Mandatory Squad Sync & Project Milestones"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CATEGORY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {["General", "Workshop", "Alert", "Academic", "Release", "Club"].map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setCategory(c)}
                    style={[styles.smallCatPill, category === c && styles.smallCatPillActive]}
                  >
                    <Text style={[styles.smallCatText, category === c && styles.smallCatTextActive]}>
                      {c}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PRIORITY LEVEL</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {[
                  { id: "normal", label: "Normal" },
                  { id: "pinned", label: "Pinned Notice" },
                  { id: "urgent", label: "Urgent Alert" },
                ].map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => setPriority(p.id as any)}
                    style={[styles.smallCatPill, priority === p.id && styles.smallCatPillActive]}
                  >
                    <Text style={[styles.smallCatText, priority === p.id && styles.smallCatTextActive]}>
                      {p.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ANNOUNCEMENT BODY *</Text>
              <TextInput
                value={content}
                onChangeText={setContent}
                placeholder="Write the full notice content, instructions, or agenda..."
                placeholderTextColor={colors.textMuted}
                multiline
                style={[styles.input, { height: 110, textAlignVertical: "top" }]}
              />
            </View>

            <Pressable
              onPress={handleSubmit}
              disabled={submitting}
              style={[styles.modalSubmitBtn, submitting && { opacity: 0.6 }]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.accentContrast} />
              ) : (
                <Text style={styles.modalSubmitText}>Publish Notice</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090C12",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  headerBadgeText: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: "800",
    fontFamily: "monospace",
    letterSpacing: 0.8,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 2,
  },
  postBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  postBtnText: {
    color: colors.accentContrast,
    fontSize: 12,
    fontWeight: "700",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
    padding: 0,
  },
  pillRow: {
    marginVertical: 10,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  categoryPillActive: {
    backgroundColor: "rgba(232, 163, 61, 0.16)",
    borderColor: "rgba(232, 163, 61, 0.3)",
  },
  categoryPillText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  categoryPillTextActive: {
    color: colors.accent,
    fontWeight: "700",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 8,
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 18,
  },
  card: {
    backgroundColor: "rgba(18, 23, 34, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  cardPinned: {
    borderColor: "rgba(45, 212, 191, 0.3)",
    backgroundColor: "rgba(18, 28, 38, 0.88)",
  },
  cardUrgent: {
    borderColor: "rgba(239, 68, 68, 0.3)",
    backgroundColor: "rgba(34, 18, 22, 0.88)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  catBadge: {
    backgroundColor: "rgba(232, 163, 61, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  catBadgeText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: "800",
    fontFamily: "monospace",
  },
  pinPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(45, 212, 191, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pinPillText: {
    color: colors.accentTeal,
    fontSize: 9,
    fontWeight: "800",
    fontFamily: "monospace",
  },
  urgentPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  urgentPillText: {
    color: colors.danger,
    fontSize: 9,
    fontWeight: "800",
    fontFamily: "monospace",
  },
  noticeTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
  noticeContent: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  authorText: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: "monospace",
  },
  dateText: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: "monospace",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    height: "80%",
    backgroundColor: "#11141E",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalSub: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: "800",
    fontFamily: "monospace",
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "800",
    fontFamily: "monospace",
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.textPrimary,
    fontSize: 13,
  },
  smallCatPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  smallCatPillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  smallCatText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  smallCatTextActive: {
    color: colors.accentContrast,
    fontWeight: "700",
  },
  modalSubmitBtn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },
  modalSubmitText: {
    color: colors.accentContrast,
    fontSize: 13,
    fontWeight: "700",
  },
});
