import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
  Pressable,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import {
  Play,
  Plus,
  Trash2,
  RotateCcw,
  Terminal,
  FileText,
  Copy,
  Check,
  Code2,
  MoreVertical,
  Download,
  Share2,
  Sparkles,
  Layers,
  ChevronRight,
  Info,
} from "lucide-react-native";
import { colors, radius, useAppTheme } from "../../theme/tokens";
import { NativeHaptics } from "../../lib/haptics";
import { notificationService } from "../../lib/notifications";

export interface MobileNotebookCell {
  id: string;
  type: "code" | "markdown";
  content: string;
  output?: {
    stdout?: string;
    stderr?: string;
    error?: string | null;
    result?: string;
    imageBase64?: string;
    executionCount?: number;
  };
  running?: boolean;
}

const DEFAULT_CELLS: MobileNotebookCell[] = [
  {
    id: "cell-1",
    type: "markdown",
    content: `# 🪐 Interactive Data Science Notebook\nWelcome to your space's live Jupyter-style Notebook powered by our cloud Python runtime.\n\n- **Pre-installed:** \`numpy\`, \`pandas\`, \`matplotlib\`, \`sympy\`\n- Tap **Run** to execute Python cells live.`,
  },
  {
    id: "cell-2",
    type: "code",
    content: `import numpy as np
import matplotlib.pyplot as plt

# Generate sample distribution
x = np.linspace(0, 10, 100)
y = np.sin(x) + np.random.normal(0, 0.1, 100)

plt.figure(figsize=(6, 3))
plt.plot(x, np.sin(x), color='#0ea5e9', label='Sine Wave', lw=2)
plt.scatter(x, y, color='#38bdf8', alpha=0.6, s=15, label='Sample Points')
plt.title('Real-Time Data Distribution', color='white')
plt.grid(True, linestyle='--', alpha=0.25)
plt.legend(loc='upper right')

print("Model initialized. 100 sample data points generated successfully.")`,
  },
];

const API_BASE = "https://aiic-bbs.vercel.app";

async function runPython(code: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/python_exec`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: Failed to execute Python runtime.`);
  }
  return await res.json();
}

export function NotebookChannelView({
  channelId,
  channelName,
  onBack,
}: {
  channelId: string;
  channelName: string;
  onBack?: () => void;
}) {
  const theme = useAppTheme();
  const storageKey = `@corvus_notebook_${channelId}`;

  const [cells, setCells] = useState<MobileNotebookCell[]>(DEFAULT_CELLS);
  const [execCounter, setExecCounter] = useState(1);
  const [isExecutingAll, setIsExecutingAll] = useState(false);
  const [copiedCellId, setCopiedCellId] = useState<string | null>(null);
  const [notebookMenuOpen, setNotebookMenuOpen] = useState(false);
  const [activeCellActionId, setActiveCellActionId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(storageKey);
        if (saved) {
          setCells(JSON.parse(saved));
        }
      } catch {}
    })();
  }, [storageKey]);

  const saveCells = async (next: MobileNotebookCell[]) => {
    setCells(next);
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
  };

  const addCell = (type: "code" | "markdown") => {
    NativeHaptics.light();
    const newCell: MobileNotebookCell = {
      id: `cell-${Date.now()}`,
      type,
      content:
        type === "code"
          ? `# Write Python code here\nprint("Hello from AIIC Notebook")`
          : `### New Note\nEnter markdown text here`,
    };
    saveCells([...cells, newCell]);
  };

  const updateCellContent = (id: string, text: string) => {
    const next = cells.map((c) => (c.id === id ? { ...c, content: text } : c));
    saveCells(next);
  };

  const deleteCell = (id: string) => {
    if (cells.length <= 1) {
      Alert.alert("Notebook", "A notebook must have at least one cell.");
      return;
    }
    NativeHaptics.selection();
    const next = cells.filter((c) => c.id !== id);
    saveCells(next);
  };

  const copyCellCode = async (id: string, code: string) => {
    NativeHaptics.selection();
    await Clipboard.setStringAsync(code);
    setCopiedCellId(id);
    setTimeout(() => setCopiedCellId(null), 1800);
  };

  const runCell = async (id: string) => {
    const target = cells.find((c) => c.id === id);
    if (!target || target.type !== "code") return;

    NativeHaptics.medium();
    setCells((prev) =>
      prev.map((c) => (c.id === id ? { ...c, running: true } : c))
    );

    try {
      const res = await runPython(target.content);
      const count = execCounter;
      setExecCounter((c) => c + 1);

      const next = cells.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            running: false,
            output: {
              stdout: res.stdout,
              stderr: res.stderr,
              error: res.error,
              result: res.data?.result,
              imageBase64: res.data?.image_base64,
              executionCount: count,
            },
          };
        }
        return c;
      });
      saveCells(next);
    } catch (err: any) {
      const next = cells.map((c) =>
        c.id === id
          ? {
              ...c,
              running: false,
              output: {
                error: err.message || "Failed to execute cell",
              },
            }
          : c
      );
      saveCells(next);
    }
  };

  const runAllCells = async () => {
    setIsExecutingAll(true);
    NativeHaptics.medium();
    for (const cell of cells) {
      if (cell.type === "code") {
        await runCell(cell.id);
      }
    }
    setIsExecutingAll(false);
  };

  const clearAllOutputs = () => {
    NativeHaptics.selection();
    const next = cells.map((c) => ({ ...c, output: undefined }));
    saveCells(next);
    setNotebookMenuOpen(false);
    notificationService.show({
      title: "Notebook Outputs Cleared",
      body: "All execution outputs have been reset.",
      type: "info",
    });
  };

  const resetToSample = () => {
    NativeHaptics.medium();
    saveCells(DEFAULT_CELLS);
    setNotebookMenuOpen(false);
    notificationService.show({
      title: "Notebook Reset",
      body: "Restored sample data science cells.",
      type: "info",
    });
  };

  const copyFullNotebook = async () => {
    NativeHaptics.selection();
    const fullText = cells
      .map((c, i) => `# --- Cell ${i + 1} (${c.type}) ---\n${c.content}`)
      .join("\n\n");
    await Clipboard.setStringAsync(fullText);
    setNotebookMenuOpen(false);
    notificationService.show({
      title: "Notebook Copied",
      body: "Full notebook content copied to clipboard.",
      type: "success",
    });
  };

  return (
    <View style={styles.container}>
      {/* ── Top Floating Action Controls (Transparent & Borderless) ── */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            onPress={runAllCells}
            disabled={isExecutingAll}
            style={styles.pillActionBtn}
            activeOpacity={0.7}
          >
            {isExecutingAll ? (
              <ActivityIndicator size="small" color="#38bdf8" />
            ) : (
              <>
                <Play size={11} color="#38bdf8" fill="#38bdf8" />
                <Text style={styles.pillActionTextRun}>Run All</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => addCell("code")}
            style={styles.pillActionBtn}
            activeOpacity={0.7}
          >
            <Code2 size={12} color="rgba(255, 255, 255, 0.85)" />
            <Text style={styles.pillActionText}>+Code</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => addCell("markdown")}
            style={styles.pillActionBtn}
            activeOpacity={0.7}
          >
            <FileText size={12} color="rgba(255, 255, 255, 0.85)" />
            <Text style={styles.pillActionText}>+MD</Text>
          </TouchableOpacity>
        </View>

        {/* Specialized Notebook 3-Dot Menu */}
        <TouchableOpacity
          onPress={() => {
            NativeHaptics.light();
            setNotebookMenuOpen(true);
          }}
          style={styles.menuIconBtn}
          activeOpacity={0.7}
        >
          <MoreVertical size={18} color="rgba(255, 255, 255, 0.8)" />
        </TouchableOpacity>
      </View>

      {/* ── Cells List (Completely Transparent Liquid Glass) ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {cells.map((cell, idx) => (
          <View key={cell.id} style={styles.cellCard}>
            {/* Cell Top Meta & Run Bar */}
            <View style={styles.cellHeader}>
              <View style={styles.cellMeta}>
                <Text style={styles.cellPrompt}>
                  {cell.type === "code"
                    ? cell.output?.executionCount
                      ? `In [${cell.output.executionCount}]:`
                      : "In [ ]:"
                    : "MD:"}
                </Text>
                <View style={styles.cellTypePill}>
                  <Text style={styles.cellTypeText}>
                    {cell.type.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.cellHeaderActions}>
                {cell.type === "code" && (
                  <>
                    <TouchableOpacity
                      onPress={() => copyCellCode(cell.id, cell.content)}
                      style={styles.cellMiniBtn}
                      activeOpacity={0.7}
                    >
                      {copiedCellId === cell.id ? (
                        <Check size={12} color="#10b981" />
                      ) : (
                        <Copy size={12} color="rgba(255, 255, 255, 0.6)" />
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => runCell(cell.id)}
                      disabled={cell.running}
                      style={[styles.cellMiniBtn, styles.cellRunBtn]}
                      activeOpacity={0.7}
                    >
                      {cell.running ? (
                        <ActivityIndicator size="small" color="#38bdf8" />
                      ) : (
                        <Play size={10} color="#38bdf8" fill="#38bdf8" />
                      )}
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity
                  onPress={() => deleteCell(cell.id)}
                  style={styles.cellMiniBtn}
                  activeOpacity={0.7}
                >
                  <Trash2 size={12} color="rgba(239, 68, 68, 0.85)" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Cell Editor Input (Transparent Glass) */}
            <View style={styles.editorBox}>
              <TextInput
                multiline
                scrollEnabled={false}
                value={cell.content}
                onChangeText={(text) => updateCellContent(cell.id, text)}
                style={[
                  styles.codeInput,
                  cell.type === "markdown" && styles.mdInput,
                ]}
                placeholder={
                  cell.type === "code"
                    ? "# Write Python code..."
                    : "Write Markdown note..."
                }
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Cell Output Display (Transparent Glass Output) */}
            {cell.output && (
              <View style={styles.outputBox}>
                <View style={styles.outputHeader}>
                  <Text style={styles.outputPrompt}>
                    {`Out [${cell.output.executionCount || " "}]:`}
                  </Text>
                </View>

                {cell.output.error ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{cell.output.error}</Text>
                  </View>
                ) : null}

                {cell.output.stdout ? (
                  <Text style={styles.stdoutText}>{cell.output.stdout}</Text>
                ) : null}

                {cell.output.result ? (
                  <Text style={styles.resultText}>{cell.output.result}</Text>
                ) : null}

                {cell.output.imageBase64 ? (
                  <View style={styles.imageContainer}>
                    <Image
                      source={{
                        uri: `data:image/png;base64,${cell.output.imageBase64}`,
                      }}
                      style={styles.renderedImage}
                      resizeMode="contain"
                    />
                  </View>
                ) : null}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* ── Specialized Notebook Three-Dot Bottom Sheet ── */}
      <Modal
        visible={notebookMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setNotebookMenuOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setNotebookMenuOpen(false)}
        >
          <Pressable
            style={styles.modalSheet}
            onPress={(e) => e.stopPropagation()}
          >
            <BlurView
              intensity={Platform.OS === "ios" ? 40 : 25}
              tint="dark"
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <Terminal size={18} color="#38bdf8" />
              <Text style={styles.sheetTitle}>Notebook Actions</Text>
            </View>

            <View style={styles.menuItemsList}>
              <TouchableOpacity
                onPress={runAllCells}
                style={styles.menuItem}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconWrap, { backgroundColor: "rgba(14, 165, 233, 0.15)" }]}>
                  <Play size={16} color="#38bdf8" />
                </View>
                <View style={styles.menuItemTextCol}>
                  <Text style={styles.menuItemLabel}>Run All Cells</Text>
                  <Text style={styles.menuItemDesc}>Execute all Python code sequentially</Text>
                </View>
                <ChevronRight size={16} color="rgba(255, 255, 255, 0.3)" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={clearAllOutputs}
                style={styles.menuItem}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconWrap, { backgroundColor: "rgba(232, 163, 61, 0.15)" }]}>
                  <RotateCcw size={16} color={colors.accent} />
                </View>
                <View style={styles.menuItemTextCol}>
                  <Text style={styles.menuItemLabel}>Clear All Outputs</Text>
                  <Text style={styles.menuItemDesc}>Reset terminal results and plots</Text>
                </View>
                <ChevronRight size={16} color="rgba(255, 255, 255, 0.3)" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={copyFullNotebook}
                style={styles.menuItem}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconWrap, { backgroundColor: "rgba(255, 255, 255, 0.08)" }]}>
                  <Copy size={16} color="rgba(255, 255, 255, 0.85)" />
                </View>
                <View style={styles.menuItemTextCol}>
                  <Text style={styles.menuItemLabel}>Copy Full Code</Text>
                  <Text style={styles.menuItemDesc}>Copy all notebook cells to clipboard</Text>
                </View>
                <ChevronRight size={16} color="rgba(255, 255, 255, 0.3)" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={resetToSample}
                style={styles.menuItem}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconWrap, { backgroundColor: "rgba(168, 85, 247, 0.15)" }]}>
                  <Sparkles size={16} color="#C084FC" />
                </View>
                <View style={styles.menuItemTextCol}>
                  <Text style={styles.menuItemLabel}>Reset to Sample Code</Text>
                  <Text style={styles.menuItemDesc}>Restore theoretical sine distribution</Text>
                </View>
                <ChevronRight size={16} color="rgba(255, 255, 255, 0.3)" />
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "transparent",
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pillActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4.5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  pillActionText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 11.5,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  pillActionTextRun: {
    color: "#38bdf8",
    fontSize: 11.5,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  menuIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  scroll: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 40,
    gap: 12,
  },
  cellCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(14, 17, 26, 0.4)",
    overflow: "hidden",
  },
  cellHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  cellMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cellPrompt: {
    color: "#38bdf8",
    fontSize: 11,
    fontFamily: "monospace",
    fontWeight: "700",
  },
  cellTypePill: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  cellTypeText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 8.5,
    fontFamily: "monospace",
    fontWeight: "600",
  },
  cellHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cellMiniBtn: {
    padding: 5,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  cellRunBtn: {
    backgroundColor: "rgba(14, 165, 233, 0.2)",
  },
  editorBox: {
    padding: 12,
    backgroundColor: "transparent",
  },
  codeInput: {
    color: "#F1F5F9",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 13,
    lineHeight: 19,
    minHeight: 55,
  },
  mdInput: {
    color: "#E2E8F0",
    fontFamily: "System",
    fontSize: 13.5,
    lineHeight: 20,
  },
  outputBox: {
    padding: 12,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },
  outputHeader: {
    marginBottom: 6,
  },
  outputPrompt: {
    color: colors.accent,
    fontSize: 10,
    fontFamily: "monospace",
    fontWeight: "700",
  },
  stdoutText: {
    color: "#E2E8F0",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
    lineHeight: 18,
  },
  resultText: {
    color: "#38bdf8",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  errorBox: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
    marginBottom: 6,
  },
  errorText: {
    color: "#F87171",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 11.5,
    lineHeight: 16,
  },
  imageContainer: {
    marginTop: 8,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  renderedImage: {
    width: "100%",
    height: 220,
    backgroundColor: "#000",
  },
  // Specialized Three-Dot Modal Sheet
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "rgba(10, 13, 20, 0.85)",
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    paddingHorizontal: 16,
    overflow: "hidden",
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    alignSelf: "center",
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sheetTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  menuItemsList: {
    gap: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuItemTextCol: {
    flex: 1,
  },
  menuItemLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  menuItemDesc: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 11,
    marginTop: 1,
  },
});
