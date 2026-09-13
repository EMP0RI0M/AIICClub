import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import {
  BookOpen,
  X,
  Copy,
  Check,
  Download,
  ExternalLink,
  Sparkles,
  FileText,
  Clock,
  Tag,
} from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { colors, radius } from "../../theme/tokens";
import { NativeHaptics } from "../../lib/haptics";
import { RichMarkdown } from "../chat/RichMarkdown";
import type { ArchiveRecord } from "./MobileArchiveView";

interface MobileDocumentReaderModalProps {
  visible: boolean;
  onClose: () => void;
  record: ArchiveRecord | null;
}

export function MobileDocumentReaderModal({
  visible,
  onClose,
  record,
}: MobileDocumentReaderModalProps) {
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg">("base");

  const rawContent = useMemo(() => {
    if (!record) return "";
    return (
      record.document?.content ||
      (record as any).content ||
      record.document?.summary ||
      record.description ||
      ""
    );
  }, [record]);

  const fileUrl = useMemo(() => {
    if (!record) return null;
    return (
      record.document?.fileUrl ||
      record.document?.url ||
      (record as any).fileUrl ||
      (record as any).url ||
      null
    );
  }, [record]);

  const isExternalFile = Boolean(
    fileUrl && (fileUrl.startsWith("http://") || fileUrl.startsWith("https://"))
  );

  const isPdf = Boolean(
    fileUrl && (fileUrl.endsWith(".pdf") || record?.document?.mimeType?.includes("pdf"))
  );

  const wordCount = useMemo(() => {
    if (!rawContent) return 0;
    return rawContent.split(/\s+/).filter(Boolean).length;
  }, [rawContent]);

  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 180));

  const handleCopy = async () => {
    if (!rawContent) return;
    NativeHaptics.selection();
    await Clipboard.setStringAsync(rawContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenExternal = () => {
    if (fileUrl) {
      NativeHaptics.selection();
      Linking.openURL(fileUrl).catch(() => {});
    }
  };

  if (!record) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <BlurView
          intensity={Platform.OS === "ios" ? 40 : 25}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={["rgba(255, 255, 255, 0.08)", "rgba(255, 255, 255, 0.01)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Header Bar */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.badgeRow}>
              <View style={styles.idBadge}>
                <Sparkles size={11} color={colors.accent} />
                <Text style={styles.idBadgeText}>{record.archiveId || "DOCUMENT"}</Text>
              </View>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>
                  {record.document?.category || "Study Notes"}
                </Text>
              </View>
              <Text style={styles.sessionText}>{record.session || "2026–27"}</Text>
            </View>
            <Text style={styles.titleText} numberOfLines={2}>
              {record.document?.fileName || record.title}
            </Text>
            <View style={styles.metaInfoRow}>
              <Clock size={12} color={colors.textMuted} />
              <Text style={styles.metaInfoText}>
                {wordCount} words · ~{readingTimeMinutes} min read
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => {
              NativeHaptics.light();
              onClose();
            }}
            style={styles.closeBtn}
            hitSlop={8}
          >
            <X size={20} color={colors.textPrimary} />
          </Pressable>
        </View>

        {/* Toolbar Controls */}
        <View style={styles.toolbar}>
          {/* Font Size Adjusters */}
          <View style={styles.fontSizeGroup}>
            {(["sm", "base", "lg"] as const).map((size) => (
              <Pressable
                key={size}
                onPress={() => {
                  NativeHaptics.selection();
                  setFontSize(size);
                }}
                style={[
                  styles.fontSizeBtn,
                  fontSize === size && styles.fontSizeBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.fontSizeText,
                    fontSize === size && styles.fontSizeTextActive,
                    size === "sm" && { fontSize: 11 },
                    size === "base" && { fontSize: 13 },
                    size === "lg" && { fontSize: 15 },
                  ]}
                >
                  {size === "sm" ? "A-" : size === "base" ? "A" : "A+"}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.toolbarRight}>
            {/* Copy Button */}
            {rawContent ? (
              <Pressable onPress={handleCopy} style={styles.toolBtn}>
                {copied ? (
                  <Check size={14} color={colors.success} />
                ) : (
                  <Copy size={14} color={colors.textSecondary} />
                )}
                <Text
                  style={[
                    styles.toolBtnText,
                    copied && { color: colors.success },
                  ]}
                >
                  {copied ? "Copied" : "Copy Notes"}
                </Text>
              </Pressable>
            ) : null}

            {/* External File Link / Download */}
            {fileUrl ? (
              <Pressable onPress={handleOpenExternal} style={styles.downloadBtn}>
                {isPdf ? (
                  <FileText size={14} color="#000" />
                ) : (
                  <Download size={14} color="#000" />
                )}
                <Text style={styles.downloadBtnText}>
                  {isPdf ? "Open PDF" : "Download"}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Scrollable Content Body */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          {/* External File Banner if available */}
          {fileUrl ? (
            <Pressable onPress={handleOpenExternal} style={styles.fileBanner}>
              <View style={styles.fileBannerLeft}>
                <FileText size={20} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.fileBannerTitle} numberOfLines={1}>
                    {record.document?.fileName || "Attached Document"}
                  </Text>
                  <Text style={styles.fileBannerSub}>
                    {record.document?.fileSize
                      ? `${record.document.fileSize} · `
                      : ""}
                    Tap to open / download in browser
                  </Text>
                </View>
              </View>
              <ExternalLink size={16} color={colors.accent} />
            </Pressable>
          ) : null}

          {/* Render Rich Markdown Notes */}
          {rawContent ? (
            <View
              style={[
                styles.contentContainer,
                fontSize === "sm" && { paddingHorizontal: 2 },
                fontSize === "lg" && { paddingHorizontal: 0 },
              ]}
            >
              <RichMarkdown content={rawContent} />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <FileText size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No Text Synopsis Available</Text>
              <Text style={styles.emptySub}>
                This archival record consists of an external document file.
              </Text>
              {fileUrl ? (
                <Pressable
                  onPress={handleOpenExternal}
                  style={styles.emptyActionBtn}
                >
                  <Download size={15} color="#000" />
                  <Text style={styles.emptyActionBtnText}>Open Document File</Text>
                </Pressable>
              ) : null}
            </View>
          )}

          {/* Tags Footer */}
          {record.tags && record.tags.length > 0 ? (
            <View style={styles.tagsFooter}>
              <View style={styles.tagsTitleRow}>
                <Tag size={12} color={colors.textMuted} />
                <Text style={styles.tagsTitleText}>INDEXED TAGS</Text>
              </View>
              <View style={styles.tagPillList}>
                {record.tags.map((tag, idx) => (
                  <View key={idx} style={styles.tagPill}>
                    <Text style={styles.tagPillText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0C10",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    gap: 12,
  },
  headerTitleRow: {
    flex: 1,
    gap: 6,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  idBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(232, 163, 61, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(232, 163, 61, 0.35)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  idBadgeText: {
    color: colors.accent,
    fontSize: 10,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontWeight: "700",
  },
  categoryBadge: {
    backgroundColor: "rgba(34, 224, 214, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(34, 224, 214, 0.3)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeText: {
    color: colors.accentTeal,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  sessionText: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  titleText: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 22,
    marginTop: 2,
  },
  metaInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  metaInfoText: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  fontSizeGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  fontSizeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  fontSizeBtnActive: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  fontSizeText: {
    color: colors.textMuted,
    fontWeight: "700",
  },
  fontSizeTextActive: {
    color: colors.textPrimary,
  },
  toolbarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toolBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  toolBtnText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.accent,
  },
  downloadBtnText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "800",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  fileBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(232, 163, 61, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(232, 163, 61, 0.3)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  fileBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  fileBannerTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  fileBannerSub: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  contentContainer: {
    paddingVertical: 8,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 8,
  },
  emptySub: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "center",
    maxWidth: 260,
  },
  emptyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  emptyActionBtnText: {
    color: "#000",
    fontSize: 13,
    fontWeight: "800",
  },
  tagsFooter: {
    marginTop: 28,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  tagsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  tagsTitleText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  tagPillList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tagPill: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagPillText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
});
