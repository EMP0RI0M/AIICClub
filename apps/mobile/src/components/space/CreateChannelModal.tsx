import React, { useState, useEffect } from "react";
import {
  Modal,
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius } from "../../theme/tokens";
import { NativeHaptics } from "../../lib/haptics";
import { notificationService } from "../../lib/notifications";
import { createChannel } from "../../lib/api";
import {
  X,
  Plus,
  Hash,
  Volume2,
  Radio,
  Kanban,
  FileText,
  Layers,
  Github,
  AlertTriangle,
  FolderPlus,
  Sparkles,
  Bell,
} from "lucide-react-native";

export type ChannelTypeOption = {
  type: "text" | "voice" | "stage" | "board" | "docs" | "canvas" | "github" | "incident" | "announcement";
  label: string;
  desc: string;
  icon: any;
  color: string;
};

const CHANNEL_TYPES: ChannelTypeOption[] = [
  {
    type: "text",
    label: "Text Channel",
    desc: "Post messages, images, memes, and code",
    icon: Hash,
    color: colors.textPrimary,
  },
  {
    type: "voice",
    label: "Voice Lounge",
    desc: "Hang out with open mic voice chat",
    icon: Volume2,
    color: colors.accentTeal,
  },
  {
    type: "stage",
    label: "Town Hall / Stage",
    desc: "Moderated stage for AMAs, keynotes, and events",
    icon: Radio,
    color: colors.live,
  },
  {
    type: "board",
    label: "Kanban Board",
    desc: "Track tasks, sprints, and project tickets",
    icon: Kanban,
    color: colors.accentWarm,
  },
  {
    type: "docs",
    label: "Knowledge & Docs",
    desc: "Structured documentation and research papers",
    icon: FileText,
    color: colors.info,
  },
  {
    type: "canvas",
    label: "Canvas",
    desc: "Interactive whiteboard and diagrams",
    icon: Layers,
    color: colors.accent,
  },
  {
    type: "github",
    label: "GitHub Sync",
    desc: "Real-time repository commits, PRs, and issues",
    icon: Github,
    color: colors.accentTeal,
  },
  {
    type: "incident",
    label: "Incident War Room",
    desc: "Live triage, alert feeds, and resolution",
    icon: AlertTriangle,
    color: colors.danger,
  },
];

interface CreateChannelModalProps {
  visible: boolean;
  onClose: () => void;
  spaceId: string;
  existingCategories?: string[];
  initialCategory?: string;
  onCreated?: (newChannel: any) => void;
}

export function CreateChannelModal({
  visible,
  onClose,
  spaceId,
  existingCategories = ["General", "Voice Channels", "Projects"],
  initialCategory,
  onCreated,
}: CreateChannelModalProps) {
  const [name, setName] = useState("");
  const [selectedType, setSelectedType] = useState<ChannelTypeOption["type"]>("text");
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || "General");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [topic, setTopic] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
      setIsCustomCategory(false);
    }
  }, [initialCategory]);

  const uniqueCategories = Array.from(
    new Set(
      [
        "General",
        "Voice Channels",
        "Projects & Engineering",
        ...existingCategories,
      ].filter(Boolean)
    )
  );

  const handleCreate = async () => {
    const rawName = name.trim().toLowerCase().replace(/\s+/g, "-");
    if (!rawName) {
      Alert.alert("Required", "Please enter a channel name.");
      return;
    }

    const finalCategory = isCustomCategory
      ? customCategoryName.trim() || "General"
      : selectedCategory;

    setCreating(true);
    NativeHaptics.medium();

    try {
      const res = await createChannel(
        spaceId,
        rawName,
        selectedType,
        finalCategory,
        topic.trim() || undefined
      );

      notificationService.show({
        title: "Channel Created!",
        body: `#${rawName} added to ${finalCategory}.`,
        type: "success",
      });

      setName("");
      setTopic("");
      setCustomCategoryName("");
      setIsCustomCategory(false);
      onCreated?.(res.channel);
      onClose();
    } catch (err: any) {
      Alert.alert("Failed", err?.message || "Could not create channel.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalContainer}
      >
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

        {/* Header */}
        <View style={styles.header}>
          <View>
            <View style={styles.headerBadge}>
              <Sparkles size={11} color={colors.accent} />
              <Text style={styles.headerBadgeText}>SPACE ARCHITECTURE</Text>
            </View>
            <Text style={styles.headerTitle}>Create Channel</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
            <X size={20} color={colors.textPrimary} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Channel Type Selector */}
          <Text style={styles.sectionLabel}>CHANNEL TYPE</Text>
          <View style={styles.typesGrid}>
            {CHANNEL_TYPES.map((t) => {
              const IconComp = t.icon;
              const isSelected = selectedType === t.type;
              return (
                <Pressable
                  key={t.type}
                  onPress={() => {
                    NativeHaptics.selection();
                    setSelectedType(t.type);
                  }}
                  style={[
                    styles.typeCard,
                    isSelected && styles.typeCardSelected,
                  ]}
                >
                  <View
                    style={[
                      styles.typeIconBox,
                      { backgroundColor: `${t.color}22` },
                      isSelected && { backgroundColor: `${t.color}44` },
                    ]}
                  >
                    <IconComp size={18} color={t.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.typeLabel,
                        isSelected && { color: colors.textPrimary },
                      ]}
                    >
                      {t.label}
                    </Text>
                    <Text style={styles.typeDesc} numberOfLines={2}>
                      {t.desc}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radioCircle,
                      isSelected && styles.radioCircleSelected,
                    ]}
                  >
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Channel Name */}
          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
            CHANNEL NAME *
          </Text>
          <View style={styles.inputWrap}>
            <Text style={styles.inputPrefix}>#</Text>
            <TextInput
              value={name}
              onChangeText={(text) =>
                setName(text.toLowerCase().replace(/\s+/g, "-"))
              }
              placeholder="e.g. general, announcements, standup"
              placeholderTextColor={colors.textMuted}
              style={styles.textInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Category Selector */}
          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
            CATEGORY / GROUPING
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryPillsRow}
          >
            {uniqueCategories.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => {
                  NativeHaptics.selection();
                  setSelectedCategory(cat);
                  setIsCustomCategory(false);
                }}
                style={[
                  styles.categoryPill,
                  !isCustomCategory && selectedCategory === cat && styles.categoryPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    !isCustomCategory && selectedCategory === cat && styles.categoryPillTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            ))}

            <Pressable
              onPress={() => {
                NativeHaptics.selection();
                setIsCustomCategory(true);
              }}
              style={[
                styles.categoryPill,
                isCustomCategory && styles.categoryPillActive,
                { borderStyle: "dashed" },
              ]}
            >
              <FolderPlus
                size={13}
                color={isCustomCategory ? colors.accent : colors.textMuted}
              />
              <Text
                style={[
                  styles.categoryPillText,
                  isCustomCategory && styles.categoryPillTextActive,
                ]}
              >
                + New Category
              </Text>
            </Pressable>
          </ScrollView>

          {/* New Category Name Input if selected */}
          {isCustomCategory && (
            <View style={[styles.inputWrap, { marginTop: 10 }]}>
              <TextInput
                value={customCategoryName}
                onChangeText={setCustomCategoryName}
                placeholder="Enter new category name (e.g. AI Research)"
                placeholderTextColor={colors.textMuted}
                style={[styles.textInput, { paddingLeft: 12 }]}
              />
            </View>
          )}

          {/* Topic / Purpose */}
          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
            TOPIC / DESCRIPTION (OPTIONAL)
          </Text>
          <View style={styles.inputWrap}>
            <TextInput
              value={topic}
              onChangeText={setTopic}
              placeholder="What is this channel about?"
              placeholderTextColor={colors.textMuted}
              style={[styles.textInput, { paddingLeft: 12 }]}
            />
          </View>
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.footer}>
          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>

          <Pressable
            onPress={handleCreate}
            disabled={creating || !name.trim()}
            style={[
              styles.createBtn,
              (!name.trim() || creating) && { opacity: 0.5 },
            ]}
          >
            {creating ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <>
                <Plus size={16} color="#000" />
                <Text style={styles.createBtnText}>Create Channel</Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "#0B0C10",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(232, 163, 61, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(232, 163, 61, 0.3)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  headerBadgeText: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  typesGrid: {
    gap: 8,
  },
  typeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    padding: 12,
  },
  typeCardSelected: {
    backgroundColor: "rgba(232, 163, 61, 0.1)",
    borderColor: colors.accent,
  },
  typeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  typeLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "700",
  },
  typeDesc: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleSelected: {
    borderColor: colors.accent,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 12,
    overflow: "hidden",
  },
  inputPrefix: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: "700",
    paddingLeft: 14,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 14,
  },
  categoryPillsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryPillActive: {
    backgroundColor: "rgba(232, 163, 61, 0.18)",
    borderColor: colors.accent,
  },
  categoryPillText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  categoryPillTextActive: {
    color: colors.accent,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "700",
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.accent,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
  },
  createBtnText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "800",
  },
});
