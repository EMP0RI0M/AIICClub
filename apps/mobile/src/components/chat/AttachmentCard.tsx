import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ActivityIndicator,
} from "react-native";
import { colors, radius } from "../../theme/tokens";
import { FileText, Download, ExternalLink, Play, Film, Music } from "lucide-react-native";
import { ImageViewerModal } from "../ui/ImageViewerModal";
import { NativeHaptics } from "../../lib/haptics";

export interface AttachmentItem {
  id?: string;
  url: string;
  name?: string;
  size?: number;
  mimeType?: string;
  duration?: string;
  kind?: "image" | "video" | "audio" | "file" | "gif";
}

interface AttachmentCardProps {
  attachment: AttachmentItem;
}

export const AttachmentCard: React.FC<AttachmentCardProps> = ({ attachment }) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isVideo =
    attachment.kind === "video" ||
    attachment.mimeType?.startsWith("video/") ||
    Boolean(attachment.url?.match(/\.(mp4|webm|mov|mkv)($|\?)/i));

  const isAudio =
    attachment.kind === "audio" ||
    attachment.mimeType?.startsWith("audio/") ||
    Boolean(attachment.url?.match(/\.(mp3|wav|ogg|m4a)($|\?)/i));

  const isImage =
    !isVideo &&
    !isAudio &&
    (attachment.kind === "image" ||
      attachment.kind === "gif" ||
      attachment.mimeType?.startsWith("image/") ||
      Boolean(attachment.url?.match(/\.(jpeg|jpg|gif|png|webp|bmp|avif)($|\?)/i)));

  const handleOpen = () => {
    NativeHaptics.light();
    if (isImage && !imageError) {
      setViewerOpen(true);
    } else if (attachment.url) {
      Linking.openURL(attachment.url).catch((err) =>
        console.warn("Failed to open URL:", err)
      );
    }
  };

  if (isImage && !imageError) {
    return (
      <>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleOpen}
          style={styles.imageContainer}
        >
          {imageLoading && (
            <View style={styles.imagePlaceholder}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          )}
          <Image
            source={{ uri: attachment.url }}
            style={styles.imagePreview}
            resizeMode="cover"
            onLoadEnd={() => setImageLoading(false)}
            onError={() => setImageError(true)}
          />
          <View style={styles.imageOverlay}>
            <Text style={styles.imageFilename} numberOfLines={1}>
              {attachment.name || "Image attachment"}
            </Text>
            <ExternalLink size={12} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>

        <ImageViewerModal
          visible={viewerOpen}
          imageUrl={attachment.url}
          title={attachment.name || "Image attachment"}
          onClose={() => setViewerOpen(false)}
        />
      </>
    );
  }

  if (isVideo) {
    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={handleOpen}
        style={styles.videoCard}
      >
        <View style={styles.videoThumbnailBox}>
          <View style={styles.playCircle}>
            <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
          </View>
        </View>
        <View style={styles.videoMeta}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Film size={12} color={colors.accent} />
            <Text style={styles.videoName} numberOfLines={1}>
              {attachment.name || "Video Clip"}
            </Text>
          </View>
          <Text style={styles.videoSub}>
            {attachment.duration ? `Duration ${attachment.duration}` : "Play Clip"}
            {attachment.size ? ` · ${formatFileSize(attachment.size)}` : ""}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  if (isAudio) {
    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={handleOpen}
        style={styles.docCard}
      >
        <View style={[styles.docIconWrap, { backgroundColor: "rgba(45, 212, 191, 0.15)" }]}>
          <Music size={18} color={colors.accentTeal} />
        </View>
        <View style={styles.docInfo}>
          <Text style={styles.docName} numberOfLines={1}>
            {attachment.name || "Audio message"}
          </Text>
          <Text style={styles.docMeta}>
            {attachment.duration ? `${attachment.duration} · ` : ""}
            {formatFileSize(attachment.size)}
          </Text>
        </View>
        <View style={styles.downloadBtn}>
          <Play size={14} color={colors.accent} fill={colors.accent} />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handleOpen}
      style={styles.docCard}
    >
      <View style={styles.docIconWrap}>
        <FileText size={18} color={colors.accentTeal} />
      </View>
      <View style={styles.docInfo}>
        <Text style={styles.docName} numberOfLines={1}>
          {attachment.name || "Attachment"}
        </Text>
        <Text style={styles.docMeta}>
          {formatFileSize(attachment.size)} {attachment.mimeType ? `· ${attachment.mimeType.split("/")[1] || ""}` : ""}
        </Text>
      </View>
      <View style={styles.downloadBtn}>
        <Download size={15} color={colors.accent} />
      </View>
    </TouchableOpacity>
  );
};

export function parseMessageAttachments(rawText: string): {
  cleanText: string;
  reasoningText: string | null;
  attachments: AttachmentItem[];
} {
  const attachments: AttachmentItem[] = [];
  let cleanText = rawText || "";
  let reasoningText: string | null = null;

  // Extract and strip AI thinking/reasoning blocks
  const thinkMatch =
    cleanText.match(/<think>([\s\S]*?)(?:<\/think>|$)/i) ||
    cleanText.match(/<thought>([\s\S]*?)(?:<\/thought>|$)/i) ||
    cleanText.match(/<thinking>([\s\S]*?)(?:<\/thinking>|$)/i) ||
    cleanText.match(/^Here's a thinking process:([\s\S]*?)(?=\n\n(?:[A-Z0-9#]|```)|$)/im);

  if (thinkMatch && thinkMatch[1]?.trim()) {
    reasoningText = thinkMatch[1].trim();
  }

  // Robust regex to detect all prefix payloads: (attachment|clip|video|audio|file):{...} or percent-encoded
  const payloadRegex = /(?:attachment|clip|video|audio|file):((?:%7B[\s\S]*?%7D)|(?:\{[\s\S]*?\}))/gi;
  let match: RegExpExecArray | null;

  while ((match = payloadRegex.exec(cleanText)) !== null) {
    try {
      const fullMatch = match[0];
      const jsonStr = match[1];
      const isClip = fullMatch.toLowerCase().startsWith("clip:");
      const isVideoPrefix = fullMatch.toLowerCase().startsWith("video:");
      const isAudioPrefix = fullMatch.toLowerCase().startsWith("audio:");

      const decodedStr = jsonStr.startsWith("%7B") || jsonStr.startsWith("%7b")
        ? decodeURIComponent(jsonStr)
        : jsonStr;

      const parsed = JSON.parse(decodedStr);
      if (parsed.url) {
        let kind: AttachmentItem["kind"] = parsed.kind;
        if (!kind) {
          if (isClip || isVideoPrefix || parsed.mimeType?.startsWith("video/") || parsed.url.match(/\.(webm|mp4|mov)($|\?)/i)) {
            kind = "video";
          } else if (isAudioPrefix || parsed.mimeType?.startsWith("audio/") || parsed.url.match(/\.(mp3|wav|ogg|m4a)($|\?)/i)) {
            kind = "audio";
          } else if (parsed.mimeType?.startsWith("image/") || parsed.url.match(/\.(png|jpg|jpeg|gif|webp)($|\?)/i)) {
            kind = "image";
          } else {
            kind = "file";
          }
        }

        attachments.push({
          url: parsed.url,
          name: parsed.name || (kind === "video" ? "Video Clip" : "Attachment"),
          size: parsed.size,
          duration: parsed.duration,
          mimeType: parsed.mimeType,
          kind,
        });
      }
    } catch (e) {
      console.warn("Failed to parse attachment payload:", e);
    }
  }

  // Also extract standalone markdown images: ![alt](url)
  const mdImgRegex = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;
  let imgMatch: RegExpExecArray | null;
  while ((imgMatch = mdImgRegex.exec(cleanText)) !== null) {
    attachments.push({
      name: imgMatch[1] || "Image",
      url: imgMatch[2],
      kind: "image",
    });
  }

  // Also extract standalone image URLs
  const rawUrlRegex = /(https?:\/\/[^\s]+?\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?[^\s]*)?)/gi;
  let rawUrlMatch: RegExpExecArray | null;
  while ((rawUrlMatch = rawUrlRegex.exec(cleanText)) !== null) {
    const matchedUrl = rawUrlMatch[1];
    if (!attachments.some((a) => a.url === matchedUrl)) {
      const filename = matchedUrl.split("/").pop()?.split("?")[0] || "Image";
      attachments.push({
        name: filename,
        url: matchedUrl,
        kind: "image",
      });
    }
  }

  // Thoroughly clean cleanText: Strip payload tags, reasoning, and raw payload strings
  cleanText = cleanText
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<think>[\s\S]*/gi, "")
    .replace(/<thought>[\s\S]*?<\/thought>/gi, "")
    .replace(/<thought>[\s\S]*/gi, "")
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
    .replace(/<thinking>[\s\S]*/gi, "")
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
    .replace(/<reasoning>[\s\S]*/gi, "")
    .replace(/^Here's a thinking process:[\s\S]*?(?=\n\n(?:[A-Z0-9#]|```)|$)/gim, "")
    .replace(/(?:attachment|clip|video|audio|file):((?:%7B[\s\S]*?%7D)|(?:\{[\s\S]*?\}))/gi, "")
    .replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, "")
    .replace(/(https?:\/\/[^\s]+?\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?[^\s]*)?)/gi, (m) => {
      if (cleanText.trim() === m.trim()) return "";
      return m;
    })
    .trim();

  return { cleanText, reasoningText, attachments };
}

const styles = StyleSheet.create({
  imageContainer: {
    borderRadius: radius.md,
    overflow: "hidden",
    marginTop: 6,
    maxWidth: 280,
    backgroundColor: "rgba(10, 12, 18, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  imagePlaceholder: {
    width: 280,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    zIndex: 1,
  },
  imagePreview: {
    width: 280,
    height: 160,
  },
  imageOverlay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(10, 11, 17, 0.85)",
  },
  imageFilename: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "500",
    flex: 1,
    marginRight: 6,
  },

  // Video / Clip Card
  videoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(18, 22, 34, 0.85)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 8,
    marginTop: 6,
    maxWidth: 290,
    gap: 10,
  },
  videoThumbnailBox: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  playCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(232, 163, 61, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 2,
  },
  videoMeta: {
    flex: 1,
    gap: 2,
  },
  videoName: {
    color: colors.textPrimary,
    fontSize: 12.5,
    fontWeight: "600",
  },
  videoSub: {
    color: colors.textMuted,
    fontSize: 10.5,
  },

  // Document Card
  docCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(18, 22, 34, 0.85)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 9,
    marginTop: 6,
    maxWidth: 290,
    gap: 10,
  },
  docIconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    color: colors.textPrimary,
    fontSize: 12.5,
    fontWeight: "600",
    marginBottom: 2,
  },
  docMeta: {
    color: colors.textMuted,
    fontSize: 10.5,
  },
  downloadBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: "rgba(232, 163, 61, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
});
