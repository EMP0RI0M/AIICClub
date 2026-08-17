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
  Linking,
} from "react-native";
import {
  Search,
  Plus,
  X,
  FileText,
  Play,
  Github,
  Layers,
  Sparkles,
  Download,
  ExternalLink,
  Cpu,
  Calendar,
  Tag,
  ArrowRight,
  Shield,
} from "lucide-react-native";
import { colors } from "@/theme/tokens";
import { useAuthStore } from "@/stores/auth-store";
import { api } from "@/lib/api";

export interface ArchiveRecord {
  id: string;
  archiveId: string;
  title: string;
  description: string;
  session: string;
  type: string;
  tags?: string[];
  createdAt?: string;
  video?: {
    speaker?: string;
    duration?: string;
    youtubeUrl?: string;
    topic?: string;
  };
  build?: {
    version?: string;
    environment?: string;
    buildUrl?: string;
    artifactUrl?: string;
  };
  repository?: {
    githubName?: string;
    githubUrl?: string;
    primaryLanguage?: string;
  };
  document?: {
    fileName?: string;
    fileSize?: string;
    category?: string;
  };
}

export function MobileArchiveView({
  onBack,
}: {
  onBack?: () => void;
}) {
  const { user, isAuthenticated } = useAuthStore();
  const [records, setRecords] = useState<ArchiveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  const loadArchive = async () => {
    setLoading(true);
    try {
      const res = await api<{ records: ArchiveRecord[] }>("/archive/records");
      setRecords(res?.records || []);
    } catch (err: any) {
      console.warn("[MobileArchiveView] load error:", err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArchive();
  }, []);

  const filtered = records.filter((r) => {
    if (selectedType !== "all") {
      if (selectedType === "video" && r.type !== "video" && !r.video) return false;
      if (selectedType === "build" && r.type !== "build" && !r.build) return false;
      if (selectedType === "repository" && r.type !== "repository" && !r.repository) return false;
      if (selectedType === "document" && r.type !== "document" && !r.document) return false;
    }
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      (r.title || "").toLowerCase().includes(q) ||
      (r.description || "").toLowerCase().includes(q) ||
      (r.archiveId || "").toLowerCase().includes(q) ||
      (r.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <View style={styles.headerBadge}>
            <Sparkles size={11} color={colors.accent} />
            <Text style={styles.headerBadgeText}>KNOWLEDGE REPOSITORY</Text>
          </View>
          <Text style={styles.headerTitle}>AIIC Archive</Text>
        </View>

        <Pressable
          onPress={() => setShowSubmitModal(true)}
          style={styles.submitBtn}
        >
          <Plus size={15} color={colors.accentContrast} />
          <Text style={styles.submitBtnText}>Submit Record</Text>
        </Pressable>
      </View>

      {/* Search Input */}
      <View style={styles.searchBar}>
        <Search size={16} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search releases, builds, repos, transcripts..."
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
        />
      </View>

      {/* Category Pills */}
      <View style={styles.pillRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
        >
          {[
            { id: "all", label: "All Items" },
            { id: "video", label: "YouTube / Sessions" },
            { id: "repository", label: "Repositories" },
            { id: "build", label: "Releases & Builds" },
            { id: "document", label: "Documents" },
          ].map((pill) => (
            <Pressable
              key={pill.id}
              onPress={() => setSelectedType(pill.id)}
              style={[
                styles.filterPill,
                selectedType === pill.id && styles.filterPillActive,
              ]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  selectedType === pill.id && styles.filterPillTextActive,
                ]}
              >
                {pill.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Archive Card List */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Layers size={40} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No archive records found</Text>
            <Text style={styles.emptySubtitle}>
              {query
                ? `No records matching "${query}".`
                : "The institutional repository contains all AIIC builds, recordings, and publications."}
            </Text>
          </View>
        ) : (
          filtered.map((record) => (
            <ArchiveRecordCard key={record.id || record.archiveId} record={record} />
          ))
        )}
      </ScrollView>

      {/* Submit Archive Record Modal */}
      <SubmitArchiveModal
        visible={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        onCreated={() => {
          loadArchive();
          setShowSubmitModal(false);
        }}
      />
    </View>
  );
}

function ArchiveRecordCard({ record }: { record: ArchiveRecord }) {
  const isVideo = record.type === "video" || !!record.video;
  const isRepo = record.type === "repository" || !!record.repository;
  const isBuild = record.type === "build" || !!record.build;

  const handleOpenLink = (url?: string) => {
    if (url) Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={styles.card}>
      {/* Top Meta Bar */}
      <View style={styles.cardTop}>
        <View style={styles.idBadge}>
          <Text style={styles.idText}>{record.archiveId}</Text>
        </View>
        <Text style={styles.sessionText}>{record.session || "2026–27"}</Text>
      </View>

      {/* Title & Description */}
      <Text style={styles.cardTitle}>{record.title}</Text>
      {record.description ? (
        <Text style={styles.cardDesc} numberOfLines={3}>
          {record.description}
        </Text>
      ) : null}

      {/* Specific Payload Badges */}
      {isVideo && record.video && (
        <View style={styles.detailBox}>
          <View style={styles.detailRow}>
            <Play size={13} color={colors.accent} />
            <Text style={styles.detailText}>
              Speaker: {record.video.speaker || "AIIC Member"} · {record.video.duration || "Session"}
            </Text>
          </View>
          {record.video.youtubeUrl && (
            <Pressable
              onPress={() => handleOpenLink(record.video?.youtubeUrl)}
              style={styles.actionLink}
            >
              <ExternalLink size={12} color={colors.accent} />
              <Text style={styles.actionLinkText}>Watch YouTube Stream</Text>
            </Pressable>
          )}
        </View>
      )}

      {isRepo && record.repository && (
        <View style={styles.detailBox}>
          <View style={styles.detailRow}>
            <Github size={13} color={colors.accentTeal} />
            <Text style={styles.detailText}>
              {record.repository.githubName || "AIIC Repository"}
            </Text>
          </View>
          {record.repository.githubUrl && (
            <Pressable
              onPress={() => handleOpenLink(record.repository?.githubUrl)}
              style={styles.actionLink}
            >
              <ExternalLink size={12} color={colors.accentTeal} />
              <Text style={[styles.actionLinkText, { color: colors.accentTeal }]}>
                View Source Repository
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {isBuild && record.build && (
        <View style={styles.detailBox}>
          <View style={styles.detailRow}>
            <Cpu size={13} color={colors.accentWarm} />
            <Text style={styles.detailText}>
              Release {record.build.version || "v1.0.0"} · {record.build.environment || "Production"}
            </Text>
          </View>
          {record.build.buildUrl && (
            <Pressable
              onPress={() => handleOpenLink(record.build?.buildUrl)}
              style={styles.actionLink}
            >
              <ExternalLink size={12} color={colors.accentWarm} />
              <Text style={[styles.actionLinkText, { color: colors.accentWarm }]}>
                Open Live Deployment
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Tags Row */}
      {record.tags && record.tags.length > 0 && (
        <View style={styles.tagRow}>
          {record.tags.map((tag, idx) => (
            <View key={idx} style={styles.tagPill}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function SubmitArchiveModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [tab, setTab] = useState<"video" | "repository" | "build" | "document">("video");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [version, setVersion] = useState("v1.0.0");
  const [buildUrl, setBuildUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert("Required", "Please provide a title for the archive record.");
      return;
    }
    setSubmitting(true);
    try {
      const payload: any = {
        type: tab,
        title: title.trim(),
        description: description.trim(),
        session: "2026–27",
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      };

      if (tab === "video") {
        payload.video = { youtubeUrl, speaker: speaker || "AIIC Member", duration: "Recording" };
      } else if (tab === "repository") {
        payload.repository = { githubUrl, githubName: title.trim() };
      } else if (tab === "build") {
        payload.build = { version, buildUrl, environment: "production" };
      }

      await api("/archive/records", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      Alert.alert("Success", "Archive record published.");
      onCreated();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to publish archive record.");
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
              <Text style={styles.modalSub}>INSTITUTIONAL RECORD</Text>
              <Text style={styles.modalTitle}>Submit to Archive</Text>
            </View>
            <Pressable onPress={onClose} style={styles.modalCloseBtn}>
              <X size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Tab Selector */}
          <View style={styles.tabSelector}>
            {(["video", "repository", "build", "document"] as const).map((t) => (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                style={[styles.modalTabPill, tab === t && styles.modalTabPillActive]}
              >
                <Text style={[styles.modalTabText, tab === t && styles.modalTabTextActive]}>
                  {t.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>RECORD TITLE *</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Distributed LLM Inference Workshop"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>DESCRIPTION</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Summary of research or session notes..."
                placeholderTextColor={colors.textMuted}
                multiline
                style={[styles.input, { height: 64, textAlignVertical: "top" }]}
              />
            </View>

            {tab === "video" && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>YOUTUBE STREAM URL</Text>
                  <TextInput
                    value={youtubeUrl}
                    onChangeText={setYoutubeUrl}
                    placeholder="https://youtube.com/watch?v=..."
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                    autoCapitalize="none"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>SPEAKER / PRESENTER</Text>
                  <TextInput
                    value={speaker}
                    onChangeText={setSpeaker}
                    placeholder="e.g. Dr. Jane Doe"
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                  />
                </View>
              </>
            )}

            {tab === "repository" && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>GITHUB REPOSITORY URL</Text>
                <TextInput
                  value={githubUrl}
                  onChangeText={setGithubUrl}
                  placeholder="https://github.com/org/repo"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  autoCapitalize="none"
                />
              </View>
            )}

            {tab === "build" && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>RELEASE VERSION</Text>
                  <TextInput
                    value={version}
                    onChangeText={setVersion}
                    placeholder="v1.0.0"
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>LIVE DEPLOYMENT URL</Text>
                  <TextInput
                    value={buildUrl}
                    onChangeText={setBuildUrl}
                    placeholder="https://aiic.club/app"
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                    autoCapitalize="none"
                  />
                </View>
              </>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>TAGS (COMMA SEPARATED)</Text>
              <TextInput
                value={tags}
                onChangeText={setTags}
                placeholder="ai, pytorch, release, production"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
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
                <Text style={styles.modalSubmitText}>Publish Record</Text>
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
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  submitBtnText: {
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
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  filterPillActive: {
    backgroundColor: "rgba(232, 163, 61, 0.16)",
    borderColor: "rgba(232, 163, 61, 0.3)",
  },
  filterPillText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  filterPillTextActive: {
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
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  idBadge: {
    backgroundColor: "rgba(232, 163, 61, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(232, 163, 61, 0.25)",
  },
  idText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: "800",
    fontFamily: "monospace",
  },
  sessionText: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: "monospace",
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  cardDesc: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  detailBox: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },
  actionLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  actionLinkText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "700",
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  tagPill: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
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
    height: "85%",
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
  tabSelector: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 16,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    padding: 4,
    borderRadius: 12,
  },
  modalTabPill: {
    flex: 1,
    paddingVertical: 6,
    alignItems: "center",
    borderRadius: 8,
  },
  modalTabPillActive: {
    backgroundColor: colors.accent,
  },
  modalTabText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    fontFamily: "monospace",
  },
  modalTabTextActive: {
    color: colors.accentContrast,
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
