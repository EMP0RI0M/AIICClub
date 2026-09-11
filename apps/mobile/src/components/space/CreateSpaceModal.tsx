import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { colors, radius } from "../../theme/tokens";
import { NativeHaptics } from "../../lib/haptics";
import { notificationService } from "../../lib/notifications";
import { createSpace } from "../../lib/api";
import { useWorkspaceStore } from "../../stores/workspace-store";
import {
  FolderKanban,
  X,
  Plus,
  Sparkles,
  Hash,
  Volume2,
  Kanban,
  FileText,
  Layers,
} from "lucide-react-native";

interface CreateSpaceModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated?: (newServer: any) => void;
}

export function CreateSpaceModal({
  visible,
  onClose,
  onCreated,
}: CreateSpaceModalProps) {
  const { loadSpaces } = useWorkspaceStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<"general" | "research" | "dev">("general");

  const handleCreate = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert("Required", "Please enter a space name.");
      return;
    }

    setCreating(true);
    NativeHaptics.medium();

    try {
      let channels = [
        { name: "general", type: "text", category: "General" },
        { name: "lounge", type: "voice", category: "Voice" },
      ];

      if (selectedTemplate === "research") {
        channels = [
          { name: "announcements", type: "announcement", category: "Governance" },
          { name: "general", type: "text", category: "Discussions" },
          { name: "research-board", type: "board", category: "Projects" },
          { name: "documentation", type: "docs", category: "Knowledge" },
          { name: "lab-voice", type: "voice", category: "Voice" },
        ];
      } else if (selectedTemplate === "dev") {
        channels = [
          { name: "general", type: "text", category: "Discussions" },
          { name: "git-feed", type: "github", category: "Engineering" },
          { name: "sprint-board", type: "board", category: "Engineering" },
          { name: "system-canvas", type: "canvas", category: "Design" },
          { name: "dev-sync", type: "voice", category: "Voice" },
        ];
      }

      const res = await createSpace({
        name: trimmedName,
        description: description.trim() || undefined,
        iconUrl: iconUrl.trim() || undefined,
        channels,
      });

      notificationService.show({
        title: "Space Created!",
        body: `"${trimmedName}" is now active with default channels.`,
        type: "success",
      });

      setName("");
      setDescription("");
      setIconUrl("");
      await loadSpaces();
      onCreated?.(res.server);
      onClose();
    } catch (err: any) {
      console.error("[CreateSpaceModal] Error:", err);
      Alert.alert("Creation Failed", err?.message || "Could not create space.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.modalSheet}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleWrap}>
              <FolderKanban size={20} color={colors.accent} />
              <Text style={styles.modalTitle}>Create New Space</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <X size={18} color={colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            <Text style={styles.label}>SPACE NAME *</Text>
            <TextInput
              placeholder="e.g. Quantum Computing Lab, AI Squad 1"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              style={styles.input}
              maxLength={60}
            />

            <Text style={styles.label}>DESCRIPTION (OPTIONAL)</Text>
            <TextInput
              placeholder="Brief description of research focus, team, or purpose"
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              style={[styles.input, { height: 70, textAlignVertical: "top" }]}
              maxLength={250}
            />

            <Text style={styles.label}>STARTER TEMPLATE</Text>
            <View style={styles.templatesRow}>
              <Pressable
                onPress={() => setSelectedTemplate("general")}
                style={[
                  styles.templateCard,
                  selectedTemplate === "general" && styles.templateCardActive,
                ]}
              >
                <Hash size={16} color={selectedTemplate === "general" ? colors.accent : colors.textMuted} />
                <Text style={[styles.templateTitle, selectedTemplate === "general" && styles.templateTitleActive]}>
                  Standard
                </Text>
                <Text style={styles.templateSub}>Text + Voice</Text>
              </Pressable>

              <Pressable
                onPress={() => setSelectedTemplate("research")}
                style={[
                  styles.templateCard,
                  selectedTemplate === "research" && styles.templateCardActive,
                ]}
              >
                <FileText size={16} color={selectedTemplate === "research" ? colors.accent : colors.textMuted} />
                <Text style={[styles.templateTitle, selectedTemplate === "research" && styles.templateTitleActive]}>
                  Research Lab
                </Text>
                <Text style={styles.templateSub}>Docs + Board</Text>
              </Pressable>

              <Pressable
                onPress={() => setSelectedTemplate("dev")}
                style={[
                  styles.templateCard,
                  selectedTemplate === "dev" && styles.templateCardActive,
                ]}
              >
                <Layers size={16} color={selectedTemplate === "dev" ? colors.accent : colors.textMuted} />
                <Text style={[styles.templateTitle, selectedTemplate === "dev" && styles.templateTitleActive]}>
                  Engineering
                </Text>
                <Text style={styles.templateSub}>Git + Canvas</Text>
              </Pressable>
            </View>

            {/* Create Button */}
            <Pressable
              onPress={handleCreate}
              disabled={!name.trim() || creating}
              style={[
                styles.createBtn,
                (!name.trim() || creating) && { opacity: 0.4 },
              ]}
            >
              {creating ? (
                <ActivityIndicator color={colors.accentContrast} size="small" />
              ) : (
                <>
                  <Sparkles size={16} color={colors.accentContrast} />
                  <Text style={styles.createBtnText}>Create Space</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#11121A",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    maxHeight: "85%",
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontFamily: "JetBrainsMono_700Bold",
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: "bold",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollBody: {
    padding: 20,
    gap: 12,
  },
  label: {
    fontFamily: "JetBrainsMono_700Bold",
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginTop: 4,
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 14,
  },
  templatesRow: {
    flexDirection: "row",
    gap: 8,
  },
  templateCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 10,
    alignItems: "center",
    gap: 4,
  },
  templateCardActive: {
    backgroundColor: "rgba(212, 160, 23, 0.12)",
    borderColor: colors.accent,
  },
  templateTitle: {
    fontFamily: "JetBrainsMono_700Bold",
    fontSize: 11,
    color: colors.textPrimary,
    textAlign: "center",
  },
  templateTitleActive: {
    color: colors.accent,
  },
  templateSub: {
    fontSize: 9,
    color: colors.textMuted,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 14,
    marginTop: 12,
  },
  createBtnText: {
    fontFamily: "JetBrainsMono_700Bold",
    fontSize: 14,
    color: colors.accentContrast,
    fontWeight: "bold",
  },
});
