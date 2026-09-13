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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import {
  Play,
  Plus,
  Trash2,
  RotateCcw,
  Terminal,
  FileCode2,
  FileText,
  Copy,
  Check,
  ChevronLeft,
  Sparkles,
  Code2,
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
    notificationService.show({
      title: "Notebook Outputs Cleared",
      body: "All execution outputs have been reset.",
      type: "info",
    });
  };

  return (
    <View style={styles.container}>
      {/* Top Interactive Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.toolbarLeft}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <ChevronLeft size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          )}
          <View style={styles.channelBadge}>
            <Terminal size={14} color="#0ea5e9" />
            <Text style={styles.channelTitle} numberOfLines={1}>
              {channelName}
            </Text>
            <View style={styles.runtimeTag}>
              <Text style={styles.runtimeText}>Py 3.12</Text>
            </View>
          </View>
        </View>

        <View style={styles.toolbarRight}>
          <TouchableOpacity
            onPress={runAllCells}
            disabled={isExecutingAll}
            style={[styles.actionBtn, styles.runAllBtn]}
          >
            {isExecutingAll ? (
              <ActivityIndicator size="small" color="#0ea5e9" />
            ) : (
              <>
                <Play size={12} color="#0ea5e9" fill="#0ea5e9" />
                <Text style={styles.runAllText}>Run All</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => addCell("code")}
            style={styles.actionBtn}
          >
            <Code2 size={12} color={colors.textSecondary} />
            <Text style={styles.actionBtnText}>+Code</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => addCell("markdown")}
            style={styles.actionBtn}
          >
            <FileText size={12} color={colors.textSecondary} />
            <Text style={styles.actionBtnText}>+MD</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={clearAllOutputs}
            style={styles.iconActionBtn}
          >
            <RotateCcw size={13} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Cells List */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {cells.map((cell, idx) => (
          <View key={cell.id} style={styles.cellCard}>
            <LinearGradient
              colors={["rgba(255, 255, 255, 0.03)", "rgba(10, 11, 17, 0.6)"]}
              style={StyleSheet.absoluteFillObject}
            />

            {/* Cell Header */}
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
                    >
                      {copiedCellId === cell.id ? (
                        <Check size={12} color="#10b981" />
                      ) : (
                        <Copy size={12} color={colors.textMuted} />
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => runCell(cell.id)}
                      disabled={cell.running}
                      style={[styles.cellMiniBtn, styles.cellRunBtn]}
                    >
                      {cell.running ? (
                        <ActivityIndicator size="small" color="#0ea5e9" />
                      ) : (
                        <Play size={11} color="#0ea5e9" fill="#0ea5e9" />
                      )}
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity
                  onPress={() => deleteCell(cell.id)}
                  style={styles.cellMiniBtn}
                >
                  <Trash2 size={12} color="rgba(239, 68, 68, 0.8)" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Cell Editor Input */}
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
                placeholderTextColor={colors.textFaint}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Cell Output Display */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#07090E",
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(11, 14, 23, 0.95)",
  },
  toolbarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  backBtn: {
    padding: 4,
  },
  channelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  channelTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    maxWidth: 130,
  },
  runtimeTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "rgba(14, 165, 233, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(14, 165, 233, 0.3)",
  },
  runtimeText: {
    color: "#38bdf8",
    fontSize: 9.5,
    fontFamily: "monospace",
    fontWeight: "700",
  },
  toolbarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  runAllBtn: {
    backgroundColor: "rgba(14, 165, 233, 0.15)",
    borderColor: "rgba(14, 165, 233, 0.35)",
  },
  runAllText: {
    color: "#38bdf8",
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  actionBtnText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "monospace",
  },
  iconActionBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    gap: 12,
    paddingBottom: 40,
  },
  cellCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(12, 16, 26, 0.85)",
    overflow: "hidden",
  },
  cellHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "rgba(8, 11, 18, 0.9)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
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
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  cellTypeText: {
    color: colors.textMuted,
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
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  cellRunBtn: {
    backgroundColor: "rgba(14, 165, 233, 0.18)",
  },
  editorBox: {
    padding: 12,
  },
  codeInput: {
    color: "#E2E8F0",
    fontFamily: "monospace",
    fontSize: 13,
    lineHeight: 19,
    minHeight: 60,
  },
  mdInput: {
    color: "#CBD5E1",
    fontFamily: "System",
    fontSize: 13.5,
    lineHeight: 20,
  },
  outputBox: {
    padding: 12,
    backgroundColor: "rgba(4, 5, 8, 0.85)",
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
    fontFamily: "monospace",
    fontSize: 12,
    lineHeight: 18,
  },
  resultText: {
    color: "#38bdf8",
    fontFamily: "monospace",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  errorBox: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    marginBottom: 6,
  },
  errorText: {
    color: "#F87171",
    fontFamily: "monospace",
    fontSize: 11.5,
    lineHeight: 16,
  },
  imageContainer: {
    marginTop: 8,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  renderedImage: {
    width: "100%",
    height: 220,
    backgroundColor: "#000",
  },
});
