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
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
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
import { colors, useAppTheme } from "@/theme/tokens";
import { useAuthStore } from "@/stores/auth-store";
import { api } from "@/lib/api";
import { MobileDocumentReaderModal } from "./MobileDocumentReaderModal";

export interface ArchiveRecord {
  id: string;
  archiveId: string;
  title: string;
  description: string;
  session: string;
  type: string;
  tags?: string[];
  createdAt?: string;
  fileUrl?: string;
  content?: string;
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
    fileSize?: string | number;
    category?: string;
    fileUrl?: string;
    url?: string;
    content?: string;
    summary?: string;
    mimeType?: string;
  };
}

export function MobileArchiveView({
  onBack,
}: {
  onBack?: () => void;
}) {
  const theme = useAppTheme();
  const { user, isAuthenticated } = useAuthStore();
  const [records, setRecords] = useState<ArchiveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [activeDoc, setActiveDoc] = useState<ArchiveRecord | null>(null);

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
      <BlurView intensity={Platform.OS === "ios" ? 30 : 20} tint="dark" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={["rgba(255, 255, 255, 0.08)", "rgba(255, 255, 255, 0.01)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.ambientGlowAmber} pointerEvents="none" />
      <View style={styles.ambientGlowTeal} pointerEvents="none" />

      {/* Top Header Capsule */}
      <View style={styles.headerCapsuleWrap}>
        <BlurView intensity={30} tint="dark" style={styles.headerCapsule}>
          <LinearGradient
            colors={["rgba(255,255,255,0.08)", "rgba(255,255,255,0.02)"]}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <View style={styles.headerLeft}>
            <View style={[styles.headerIconOrb, { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accentBorder }]}>
              <Sparkles size={16} color={theme.colors.accent} />
            </View>
            <View>
              <Text style={styles.headerTitle}>AIIC Archive</Text>
              <Text style={[styles.headerSub, { color: theme.colors.accent }]}>INSTITUTIONAL KNOWLEDGE</Text>
            </View>
          </View>

          <Pressable
            onPress={() => setShowSubmitModal(true)}
            style={[styles.submitBtn, { backgroundColor: theme.colors.accent }]}
          >
            <Plus size={15} color={theme.colors.accentText} />
            <Text style={[styles.submitBtnText, { color: theme.colors.accentText }]}>Submit</Text>
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
            placeholder="Search releases, builds, repos, transcripts..."
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
                selectedType === pill.id && [
                  styles.filterPillActive,
                  { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accentBorder },
                ],
              ]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  selectedType === pill.id && [
                    styles.filterPillTextActive,
                    { color: theme.colors.accent },
                  ],
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
            <ArchiveRecordCard
              key={record.id || record.archiveId}
              record={record}
              onOpenDocument={(rec) => setActiveDoc(rec)}
            />
          ))
        )}
      </ScrollView>

      {/* Document Reader Modal */}
      <MobileDocumentReaderModal
        visible={Boolean(activeDoc)}
        record={activeDoc}
        onClose={() => setActiveDoc(null)}
      />

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

function ArchiveRecordCard({
  record,
  onOpenDocument,
}: {
  record: ArchiveRecord;
  onOpenDocument?: (record: ArchiveRecord) => void;
}) {
  const isVideo = record.type === "video" || !!record.video;
  const isRepo = record.type === "repository" || !!record.repository;
  const isBuild = record.type === "build" || !!record.build;
  const isDoc = record.type === "document" || !!record.document;

  const handleOpenLink = (url?: string) => {
    if (url) Linking.openURL(url).catch(() => {});
  };

  const docFileUrl =
    record.document?.fileUrl ||
    record.document?.url ||
    record.fileUrl ||
    (record as any).url;

  return (
    <Pressable
      onPress={() => {
        if (isDoc && onOpenDocument) {
          onOpenDocument(record);
        }
      }}
      style={styles.cardWrap}
    >
      <BlurView intensity={25} tint="dark" style={styles.card}>
        <LinearGradient
          colors={["rgba(255,255,255,0.06)", "rgba(255,255,255,0.01)"]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
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

      {isDoc && (
        <View style={styles.detailBox}>
          <View style={styles.detailRow}>
            <FileText size={13} color={colors.info} />
            <Text style={styles.detailText}>
              {record.document?.fileName || record.title}{" "}
              {record.document?.fileSize ? `(${record.document.fileSize})` : ""}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Pressable
              onPress={() => onOpenDocument && onOpenDocument(record)}
              style={[styles.actionLink, { backgroundColor: "rgba(34, 224, 214, 0.15)", borderColor: "rgba(34, 224, 214, 0.35)", borderWidth: 1 }]}
            >
              <FileText size={12} color={colors.accentTeal} />
              <Text style={[styles.actionLinkText, { color: colors.accentTeal, fontWeight: "800" }]}>
                Read Document & Notes
              </Text>
            </Pressable>

            {docFileUrl ? (
              <Pressable
                onPress={() => handleOpenLink(docFileUrl)}
                style={styles.actionLink}
              >
                <Download size={12} color={colors.info} />
                <Text style={[styles.actionLinkText, { color: colors.info }]}>
                  Open File
                </Text>
              </Pressable>
            ) : null}
          </View>
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
      </BlurView>
    </Pressable>
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
  const theme = useAppTheme();
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
              <Text style={[styles.modalSub, { color: theme.colors.accent }]}>INSTITUTIONAL RECORD</Text>
              <Text style={styles.modalTitle}>Submit to Archive</Text>
            </View>
            <Pressable onPress={onClose} style={styles.modalCloseBtn} hitSlop={8}>
              <X size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Tab Selector */}
          <View style={styles.tabSelector}>
            {(["video", "repository", "build", "document"] as const).map((t) => (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                style={[
                  styles.modalTabPill,
                  tab === t && [
                    styles.modalTabPillActive,
                    { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accentBorder },
                  ],
                ]}
              >
                <Text
                  style={[
                    styles.modalTabText,
                    tab === t && [
                      styles.modalTabTextActive,
                      { color: theme.colors.accent },
                    ],
                  ]}
                >
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
              style={[styles.modalSubmitBtn, { backgroundColor: theme.colors.accent }, submitting && { opacity: 0.6 }]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={theme.colors.accentText} />
              ) : (
                <Text style={[styles.modalSubmitText, { color: theme.colors.accentText }]}>Publish Record</Text>
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
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  submitBtnText: {
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
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  filterPillActive: {
    backgroundColor: "rgba(232, 163, 61, 0.18)",
    borderColor: colors.accent,
  },
  filterPillText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 11.5,
    fontWeight: "600",
  },
  filterPillTextActive: {
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
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  card: {
    padding: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.10)",
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
    borderRadius: 8,
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
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    borderRadius: 14,
    padding: 12,
    marginTop: 4,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
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
