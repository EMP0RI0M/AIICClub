import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  FileText,
  FilePlus,
  Search,
  ArrowLeft,
  Trash2,
  Save,
  Clock,
  User,
  Layers,
  Sparkles,
} from "lucide-react-native";
import { colors } from "@/theme/tokens";
import { useAuthStore } from "@/stores/auth-store";
import { api } from "@/lib/api";

export interface DocBlock {
  id: string;
  type: "p" | "h1" | "h2" | "bullet" | "numbered" | "code" | "quote" | "callout";
  text: string;
}

export interface DocContent {
  id: string;
  title: string;
  author: {
    id: string;
    name: string;
    avatar?: string | null;
  };
  editedLabel: string;
  blocks: DocBlock[];
}

export function DocsChannelView({
  channelId,
  channelName,
  onBack,
}: {
  channelId?: string;
  channelName?: string;
  onBack?: () => void;
}) {
  const { user } = useAuthStore();
  const [docs, setDocs] = useState<DocContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDocId, setOpenDocId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const loadDocs = async () => {
    if (!channelId) return;
    setLoading(true);
    try {
      const res = await api<{ docs: DocContent[] }>(`/channels/${channelId}/docs`);
      setDocs(res?.docs || []);
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocs();
  }, [channelId]);

  const saveDocsState = async (nextDocs: DocContent[]) => {
    setDocs(nextDocs);
    if (!channelId) return;
    setSaving(true);
    try {
      await api(`/channels/${channelId}/docs`, {
        method: "PUT",
        body: JSON.stringify({ docs: nextDocs }),
      });
    } catch (err: any) {
      console.warn("[DocsChannelView] Save failed:", err?.message);
    } finally {
      setSaving(false);
    }
  };

  const createDoc = () => {
    const newDoc: DocContent = {
      id: `doc_${Date.now()}`,
      title: "Untitled Document",
      author: {
        id: user?.id || "me",
        name: user?.displayName || user?.username || "You",
        avatar: user?.avatar,
      },
      editedLabel: "just now",
      blocks: [
        { id: `b1_${Date.now()}`, type: "h1", text: "New Document" },
        { id: `b2_${Date.now()}`, type: "p", text: "Start typing document content..." },
      ],
    };
    const next = [newDoc, ...docs];
    saveDocsState(next);
    setOpenDocId(newDoc.id);
  };

  const activeDoc = docs.find((d) => d.id === openDocId) || null;

  if (activeDoc) {
    return (
      <DocEditorView
        doc={activeDoc}
        saving={saving}
        onBack={() => setOpenDocId(null)}
        onChange={(updated) => {
          const next = docs.map((d) =>
            d.id === updated.id ? { ...updated, editedLabel: "edited just now" } : d
          );
          saveDocsState(next);
        }}
        onDelete={() => {
          Alert.alert("Delete Document?", "This action cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: () => {
                setOpenDocId(null);
                const next = docs.filter((d) => d.id !== activeDoc.id);
                saveDocsState(next);
              },
            },
          ]);
        }}
      />
    );
  }

  const filtered = query
    ? docs.filter((d) => d.title.toLowerCase().includes(query.toLowerCase()))
    : docs;

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <FileText size={18} color={colors.accentTeal} />
          <Text style={styles.headerTitle}>#{channelName || "docs"}</Text>
          <View style={styles.docsBadge}>
            <Text style={styles.docsBadgeText}>DOCUMENTS</Text>
          </View>
        </View>

        <Pressable onPress={createDoc} style={styles.newDocBtn}>
          <FilePlus size={14} color={colors.accentContrast} />
          <Text style={styles.newDocBtnText}>New Doc</Text>
        </Pressable>
      </View>

      {/* Search Filter */}
      <View style={styles.searchBar}>
        <Search size={14} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search documents in this channel..."
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
        />
      </View>

      {/* Document List */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: 30 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={36} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No documents yet</Text>
            <Text style={styles.emptySubtitle}>
              {query
                ? `No documents matching "${query}"`
                : "Create shared technical specs, PRDs, or club meeting notes."}
            </Text>
            <Pressable onPress={createDoc} style={styles.createFirstBtn}>
              <FilePlus size={14} color={colors.accentContrast} />
              <Text style={styles.createFirstBtnText}>Create First Document</Text>
            </Pressable>
          </View>
        ) : (
          filtered.map((doc) => (
            <Pressable
              key={doc.id}
              onPress={() => setOpenDocId(doc.id)}
              style={({ pressed }) => [styles.docRow, pressed && styles.docRowPressed]}
            >
              <View style={styles.docIconBox}>
                <FileText size={16} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.docTitle}>{doc.title || "Untitled Document"}</Text>
                <Text style={styles.docMeta}>
                  By {doc.author?.name || "Author"} · {doc.editedLabel || "recently"}
                </Text>
              </View>
              <View style={styles.arrowBox}>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>→</Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function DocEditorView({
  doc,
  saving,
  onBack,
  onChange,
  onDelete,
}: {
  doc: DocContent;
  saving: boolean;
  onBack: () => void;
  onChange: (doc: DocContent) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(doc.title);
  const [blocks, setBlocks] = useState<DocBlock[]>(doc.blocks || []);

  const updateBlockText = (id: string, text: string) => {
    const updated = blocks.map((b) => (b.id === id ? { ...b, text } : b));
    setBlocks(updated);
    onChange({ ...doc, title, blocks: updated });
  };

  const addBlock = (type: DocBlock["type"]) => {
    const newBlock: DocBlock = {
      id: `b_${Date.now()}`,
      type,
      text: "",
    };
    const updated = [...blocks, newBlock];
    setBlocks(updated);
    onChange({ ...doc, title, blocks: updated });
  };

  const deleteBlock = (id: string) => {
    if (blocks.length <= 1) return;
    const updated = blocks.filter((b) => b.id !== id);
    setBlocks(updated);
    onChange({ ...doc, title, blocks: updated });
  };

  return (
    <View style={styles.container}>
      {/* Editor Header */}
      <View style={styles.editorHeader}>
        <Pressable onPress={onBack} style={styles.editorBackBtn}>
          <ArrowLeft size={18} color={colors.textPrimary} />
        </Pressable>

        <View style={{ flex: 1, marginHorizontal: 8 }}>
          <Text style={styles.editorDocName} numberOfLines={1}>
            {title || "Untitled"}
          </Text>
          <Text style={styles.editorDocMeta}>
            {saving ? "Saving changes..." : `Auto-saved · ${doc.editedLabel}`}
          </Text>
        </View>

        <Pressable onPress={onDelete} style={styles.deleteDocBtn}>
          <Trash2 size={16} color={colors.danger} />
        </Pressable>
      </View>

      {/* Editor Content Scroll */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.editorScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Input */}
        <TextInput
          value={title}
          onChangeText={(t) => {
            setTitle(t);
            onChange({ ...doc, title: t, blocks });
          }}
          placeholder="Document Title"
          placeholderTextColor={colors.textMuted}
          style={styles.titleInput}
        />

        <View style={styles.docAuthorRow}>
          <User size={12} color={colors.textMuted} />
          <Text style={styles.docAuthorText}>Authored by {doc.author?.name || "Member"}</Text>
        </View>

        <View style={styles.divider} />

        {/* Content Blocks */}
        {blocks.map((block) => (
          <View key={block.id} style={styles.blockRow}>
            <TextInput
              value={block.text}
              onChangeText={(txt) => updateBlockText(block.id, txt)}
              placeholder={
                block.type === "h1"
                  ? "Heading 1"
                  : block.type === "h2"
                  ? "Heading 2"
                  : block.type === "code"
                  ? "Code snippet..."
                  : "Type text..."
              }
              placeholderTextColor={colors.textMuted}
              multiline
              style={[
                styles.blockInput,
                block.type === "h1" && styles.blockH1,
                block.type === "h2" && styles.blockH2,
                block.type === "quote" && styles.blockQuote,
                block.type === "code" && styles.blockCode,
              ]}
            />
            {blocks.length > 1 && (
              <Pressable
                onPress={() => deleteBlock(block.id)}
                style={styles.blockDeleteBtn}
                hitSlop={8}
              >
                <Trash2 size={12} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
        ))}

        {/* Add Block Toolbar */}
        <View style={styles.addToolbar}>
          <Text style={styles.addToolbarLabel}>+ ADD BLOCK</Text>
          <View style={styles.addBtnRow}>
            <Pressable onPress={() => addBlock("p")} style={styles.toolPill}>
              <Text style={styles.toolPillText}>Paragraph</Text>
            </Pressable>
            <Pressable onPress={() => addBlock("h1")} style={styles.toolPill}>
              <Text style={styles.toolPillText}>H1</Text>
            </Pressable>
            <Pressable onPress={() => addBlock("h2")} style={styles.toolPill}>
              <Text style={styles.toolPillText}>H2</Text>
            </Pressable>
            <Pressable onPress={() => addBlock("code")} style={styles.toolPill}>
              <Text style={styles.toolPillText}>Code</Text>
            </Pressable>
            <Pressable onPress={() => addBlock("quote")} style={styles.toolPill}>
              <Text style={styles.toolPillText}>Quote</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0B11",
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
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  docsBadge: {
    backgroundColor: "rgba(45, 212, 191, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(45, 212, 191, 0.3)",
  },
  docsBadgeText: {
    color: colors.accentTeal,
    fontSize: 9,
    fontWeight: "800",
    fontFamily: "monospace",
  },
  newDocBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  newDocBtnText: {
    color: colors.accentContrast,
    fontSize: 12,
    fontWeight: "700",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginVertical: 10,
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
    gap: 8,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
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
    maxWidth: 240,
    lineHeight: 18,
  },
  createFirstBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 12,
  },
  createFirstBtnText: {
    color: colors.accentContrast,
    fontSize: 13,
    fontWeight: "700",
  },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  docRowPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.07)",
  },
  docIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(232, 163, 61, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(232, 163, 61, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  docTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  docMeta: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
    fontFamily: "monospace",
  },
  arrowBox: {
    paddingLeft: 8,
  },
  editorHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  editorBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  editorDocName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  editorDocMeta: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: "monospace",
  },
  deleteDocBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  editorScrollContent: {
    padding: 16,
    paddingBottom: 50,
  },
  titleInput: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 6,
  },
  docAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  docAuthorText: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: "monospace",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 16,
  },
  blockRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 10,
  },
  blockInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 22,
    padding: 0,
  },
  blockH1: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textPrimary,
    marginTop: 8,
  },
  blockH2: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.accent,
    marginTop: 6,
  },
  blockQuote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    paddingLeft: 10,
    fontStyle: "italic",
    color: colors.textSecondary,
  },
  blockCode: {
    fontFamily: "monospace",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    padding: 8,
    borderRadius: 8,
    fontSize: 12,
  },
  blockDeleteBtn: {
    padding: 4,
    marginTop: 4,
  },
  addToolbar: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },
  addToolbarLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    fontFamily: "monospace",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  addBtnRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  toolPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  toolPillText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
});
