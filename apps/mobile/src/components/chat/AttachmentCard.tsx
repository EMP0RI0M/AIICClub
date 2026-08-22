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
import { FileText, Download, ExternalLink, Image as ImageIcon } from "lucide-react-native";

export interface AttachmentItem {
  id?: string;
  url: string;
  name?: string;
  size?: number;
  mimeType?: string;
  kind?: "image" | "video" | "audio" | "file" | "gif";
}

interface AttachmentCardProps {
  attachment: AttachmentItem;
}

export const AttachmentCard: React.FC<AttachmentCardProps> = ({ attachment }) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleOpen = () => {
    if (attachment.url) {
      Linking.openURL(attachment.url).catch((err) =>
        console.warn("Failed to open URL:", err)
      );
    }
  };

  const isImage =
    attachment.kind === "image" ||
    attachment.kind === "gif" ||
    attachment.mimeType?.startsWith("image/") ||
    attachment.url.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i);

  if (isImage && !imageError) {
    return (
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
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handleOpen}
      style={styles.docCard}
    >
      <View style={styles.docIconWrap}>
        <FileText size={20} color={colors.accentTeal} />
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
        <Download size={16} color={colors.accent} />
      </View>
    </TouchableOpacity>
  );
};

export function parseMessageAttachments(rawText: string): {
  cleanText: string;
  attachments: AttachmentItem[];
} {
  const attachments: AttachmentItem[] = [];
  let cleanText = rawText;

  // Regex to detect attachment JSON payloads: attachment:{...} or [attachment: {...}]
  const attachmentRegex = /attachment:((?:%7B.*?%7D)|(?:\{.*?\}))/gi;
  let match;

  while ((match = attachmentRegex.exec(rawText)) !== null) {
    try {
      const decodedStr = decodeURIComponent(match[1]);
      const parsed = JSON.parse(decodedStr);
      if (parsed.url) {
        attachments.push(parsed);
      }
    } catch {}
  }

  // Also extract standalone image/doc markdown URLs: ![alt](url)
  const mdImgRegex = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;
  let imgMatch;
  while ((imgMatch = mdImgRegex.exec(rawText)) !== null) {
    attachments.push({
      name: imgMatch[1] || "Image",
      url: imgMatch[2],
      kind: "image",
    });
  }

  cleanText = cleanText
    .replace(/attachment:((?:%7B.*?%7D)|(?:\{.*?\}))/gi, "")
    .replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, "")
    .trim();

  return { cleanText, attachments };
}

const styles = StyleSheet.create({
  imageContainer: {
    borderRadius: radius.md,
    overflow: "hidden",
    marginTop: 8,
    maxWidth: 280,
    backgroundColor: colors.surfaceInput,
    borderWidth: 1,
    borderColor: colors.borderGlass,
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
  docCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceGlass,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderGlass,
    padding: 10,
    marginTop: 8,
    maxWidth: 300,
    gap: 10,
  },
  docIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  docMeta: {
    color: colors.textMuted,
    fontSize: 11,
  },
  downloadBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
});
