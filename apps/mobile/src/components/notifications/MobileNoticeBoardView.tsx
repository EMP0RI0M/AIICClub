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
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
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
import { colors, useAppTheme } from "@/theme/tokens";
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
  const theme = useAppTheme();
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
      <View style={styles.ambientGlowAmber} pointerEvents="none" />
      <View style={styles.ambientGlowTeal} pointerEvents="none" />

      {/* Top Header Capsule */}
      <View style={styles.headerCapsuleWrap}>
        <BlurView intensity={30} tint="dark" style={styles.headerCapsule}>
          <LinearGradient
            colors={["rgba(255,255,255,0.08)", "rgba(255,255,255,0.02)"]}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
          <View style={styles.headerLeft}>
            <View style={[styles.headerIconOrb, { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accentBorder }]}>
              <Bell size={16} color={theme.colors.accent} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>Club Notice Board</Text>
              <Text style={[styles.headerSub, { color: theme.colors.accent }]} numberOfLines={1}>OFFICIAL DISPATCHES</Text>
            </View>
          </View>

          <Pressable
            onPress={() => setShowCreateModal(true)}
            style={[styles.postBtn, { backgroundColor: theme.colors.accent }]}
            hitSlop={6}
          >
            <Plus size={14} color={theme.colors.accentText} />
            <Text style={[styles.postBtnText, { color: theme.colors.accentText }]}>Post Notice</Text>
          </Pressable>
        </BlurView>
      </View>

      {/* Search Input */}
      <View style={styles.searchBarWrap}>
        <BlurView intensity={25} tint="dark" style={styles.searchBar}>
          <LinearGradient
            colors={["rgba(255,255,255,0.06)", "rgba(255,255,255,0.01)"]}
            style={StyleSheet.absoluteFillObject}
          />
          <Search size={15} color={theme.colors.accent} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search notices, workshops, advisories..."
            placeholderTextColor="rgba(255, 255, 255, 0.4)"
            style={styles.searchInput}
          />
          {!!query && (
            <Pressable onPress={() => setQuery("")} hitSlop={6}>
              <X size={14} color={colors.textMuted} />
            </Pressable>
          )}
        </BlurView>
      </View>

      {/* Categories Scroll */}
      <View style={styles.pillRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 14 }}
        >
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              style={[
                styles.categoryPill,
                selectedCategory === cat && [
                  styles.categoryPillActive,
                  { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accentBorder },
                ],
              ]}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  selectedCategory === cat && [
                    styles.categoryPillTextActive,
                    { color: theme.colors.accent },
                  ],
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
    <View style={styles.cardWrap}>
      <BlurView
        intensity={25}
        tint="dark"
        style={[
          styles.card,
          isPinned && styles.cardPinned,
          isUrgent && styles.cardUrgent,
        ]}
      >
        <LinearGradient
          colors={
            isPinned
              ? ["rgba(45, 212, 191, 0.10)", "rgba(45, 212, 191, 0.02)"]
              : isUrgent
              ? ["rgba(239, 68, 68, 0.10)", "rgba(239, 68, 68, 0.02)"]
              : ["rgba(255, 255, 255, 0.06)", "rgba(255, 255, 255, 0.01)"]
          }
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />

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
      </BlurView>
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
  const theme = useAppTheme();
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
        <Pressable style={styles.modalBackdropPress} onPress={onClose}>
          <BlurView intensity={Platform.OS === "ios" ? 25 : 15} tint="dark" style={StyleSheet.absoluteFill} />
        </Pressable>

        <View style={styles.modalSheet}>
          <BlurView intensity={Platform.OS === "ios" ? 50 : 35} tint="dark" style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={["rgba(255, 255, 255, 0.14)", "rgba(10, 12, 18, 0.96)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.sheetHandle} />

          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalSub, { color: theme.colors.accent }]}>COMMUNITY DISPATCH</Text>
              <Text style={styles.modalTitle}>Publish Club Notice</Text>
            </View>
            <Pressable onPress={onClose} style={styles.modalCloseBtn} hitSlop={8}>
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
                    style={[
                      styles.smallCatPill,
                      category === c && [
                        styles.smallCatPillActive,
                        { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accentBorder },
                      ],
                    ]}
                  >
                    <Text
                      style={[
                        styles.smallCatText,
                        category === c && [
                          styles.smallCatTextActive,
                          { color: theme.colors.accent },
                        ],
                      ]}
                    >
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
                    style={[
                      styles.smallCatPill,
                      priority === p.id && [
                        styles.smallCatPillActive,
                        { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accentBorder },
                      ],
                    ]}
                  >
                    <Text
                      style={[
                        styles.smallCatText,
                        priority === p.id && [
                          styles.smallCatTextActive,
                          { color: theme.colors.accent },
                        ],
                      ]}
                    >
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
              style={[styles.modalSubmitBtn, { backgroundColor: theme.colors.accent }, submitting && { opacity: 0.6 }]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={theme.colors.accentText} />
              ) : (
                <Text style={[styles.modalSubmitText, { color: theme.colors.accentText }]}>Publish Notice</Text>
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
    backgroundColor: "#080A0F",
  },
  ambientGlowAmber: {
    position: "absolute",
    top: -60,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(242, 170, 59, 0.04)",
  },
  ambientGlowTeal: {
    position: "absolute",
    bottom: 80,
    left: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(50, 214, 197, 0.03)",
  },
  headerCapsuleWrap: {
    marginHorizontal: 14,
    marginTop: 8,
    marginBottom: 8,
  },
  headerCapsule: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    overflow: "hidden",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  headerIconOrb: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(232, 163, 61, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(232, 163, 61, 0.25)",
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  headerSub: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: "800",
    fontFamily: "monospace",
    letterSpacing: 0.6,
  },
  postBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  postBtnText: {
    color: colors.accentContrast,
    fontSize: 12,
    fontWeight: "700",
  },
  searchBarWrap: {
    marginHorizontal: 14,
    marginBottom: 4,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    gap: 8,
    overflow: "hidden",
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13.5,
    padding: 0,
  },
  pillRow: {
    marginVertical: 10,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  categoryPillActive: {
    backgroundColor: "rgba(232, 163, 61, 0.18)",
    borderColor: colors.accent,
  },
  categoryPillText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 11.5,
    fontWeight: "600",
  },
  categoryPillTextActive: {
    color: colors.accent,
    fontWeight: "800",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingBottom: 40,
    gap: 10,
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
  cardWrap: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  card: {
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.10)",
    backgroundColor: "rgba(18, 22, 30, 0.72)",
    gap: 8,
  },
  cardPinned: {
    borderColor: "rgba(45, 212, 191, 0.40)",
    backgroundColor: "rgba(45, 212, 191, 0.08)",
  },
  cardUrgent: {
    borderColor: "rgba(239, 68, 68, 0.40)",
    backgroundColor: "rgba(239, 68, 68, 0.08)",
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
    borderRadius: 8,
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
    justifyContent: "flex-end",
  },
  modalBackdropPress: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignSelf: "center",
    marginBottom: 14,
  },
  modalSheet: {
    height: "72%",
    backgroundColor: "rgba(12, 14, 22, 0.95)",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 20,
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 24,
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
