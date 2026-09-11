import React from "react";
import {
  Modal,
  StyleSheet,
  View,
  Image,
  Pressable,
  Text,
  SafeAreaView,
  Dimensions,
  Platform,
  Share,
} from "react-native";
import { colors, radius } from "../../theme/tokens";
import { NativeHaptics } from "../../lib/haptics";
import { X, Share2, Download } from "lucide-react-native";

const { width, height } = Dimensions.get("window");

interface ImageViewerModalProps {
  visible: boolean;
  imageUrl: string | null;
  title?: string;
  onClose: () => void;
}

export function ImageViewerModal({
  visible,
  imageUrl,
  title,
  onClose,
}: ImageViewerModalProps) {
  if (!imageUrl) return null;

  const handleShare = async () => {
    NativeHaptics.light();
    try {
      await Share.share({
        url: imageUrl,
        message: imageUrl,
        title: title || "AIIC Image Attachment",
      });
    } catch {}
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {title || "Image Attachment"}
            </Text>
            <View style={styles.headerActions}>
              <Pressable
                onPress={handleShare}
                style={styles.actionBtn}
                hitSlop={8}
              >
                <Share2 size={18} color={colors.textPrimary} />
              </Pressable>
              <Pressable
                onPress={() => {
                  NativeHaptics.light();
                  onClose();
                }}
                style={[styles.actionBtn, styles.closeBtn]}
                hitSlop={8}
              >
                <X size={18} color={colors.textPrimary} />
              </Pressable>
            </View>
          </View>

          {/* Image Canvas */}
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              resizeMode="contain"
            />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
  },
  safeArea: {
    flex: 1,
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
  title: {
    fontFamily: "JetBrainsMono_700Bold",
    fontSize: 13,
    color: colors.textPrimary,
    flex: 1,
    marginRight: 12,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  imageContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  image: {
    width: width,
    height: height * 0.8,
  },
});
