import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
} from "react-native";
import { colors, radius } from "../../theme/tokens";
import { GlassCard } from "./GlassCard";
import {
  ChevronLeft,
  Square,
  Circle,
  MoveUpRight,
  Type,
  Eraser,
  Hand,
  PenLine,
  Highlighter,
  Download,
  Layers,
} from "lucide-react-native";

export function CanvasChannelView({
  channelName,
  onBack,
}: {
  channelName: string;
  onBack: () => void;
}) {
  const [selectedTool, setSelectedTool] = useState<"select" | "pen" | "rect" | "circle" | "arrow" | "text" | "eraser">("pen");
  const [selectedColor, setSelectedColor] = useState("#E8A33D");
  const [shapes, setShapes] = useState<Array<{ id: string; type: string; label: string; x: number; y: number }>>([
    { id: "s1", type: "rect", label: "Neural Architecture", x: 40, y: 80 },
    { id: "s2", type: "circle", label: "Attention Head", x: 180, y: 160 },
    { id: "s3", type: "text", label: "quantized_matmul()", x: 60, y: 260 },
  ]);

  const tools = [
    { id: "pen", icon: PenLine, label: "Pen" },
    { id: "rect", icon: Square, label: "Rect" },
    { id: "circle", icon: Circle, label: "Circle" },
    { id: "arrow", icon: MoveUpRight, label: "Arrow" },
    { id: "text", icon: Type, label: "Text" },
    { id: "eraser", icon: Eraser, label: "Eraser" },
  ] as const;

  const colorPalette = ["#E8A33D", "#2DD4BF", "#EF4444", "#3B82F6", "#F5F5F7"];

  return (
    <View style={styles.container}>
      {/* Canvas Header */}
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.channelName} numberOfLines={1}>
            {channelName}
          </Text>
          <Text style={styles.subText}>Infinite Collaborative Canvas · {shapes.length} Objects</Text>
        </View>

        <View style={styles.canvasPill}>
          <Layers size={13} color={colors.accent} />
          <Text style={styles.canvasPillText}>Vector Canvas</Text>
        </View>
      </View>

      {/* Floating Toolbar */}
      <View style={styles.toolbar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolScroll}>
          {tools.map((t) => {
            const IconComponent = t.icon;
            const active = selectedTool === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => setSelectedTool(t.id)}
                style={[styles.toolBtn, active && styles.toolBtnActive]}
              >
                <IconComponent size={16} color={active ? colors.accent : colors.textMuted} />
              </Pressable>
            );
          })}

          <View style={styles.toolDivider} />

          {colorPalette.map((c) => (
            <Pressable
              key={c}
              onPress={() => setSelectedColor(c)}
              style={[
                styles.colorDot,
                { backgroundColor: c },
                selectedColor === c && styles.colorDotActive,
              ]}
            />
          ))}
        </ScrollView>
      </View>

      {/* Canvas Workspace View */}
      <View style={styles.canvasBoard}>
        {shapes.map((s) => (
          <GlassCard
            key={s.id}
            elevated
            style={[
              styles.canvasObject,
              { top: s.y, left: s.x, borderColor: selectedColor },
            ]}
          >
            <Text style={styles.objectLabel}>{s.label}</Text>
          </GlassCard>
        ))}

        <View style={styles.canvasHelper}>
          <Text style={styles.helperText}>Tap to place vector cards or sketch equations</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#07080D",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.12)",
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(28, 30, 42, 0.88)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    flex: 1,
  },
  channelName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
  subText: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  canvasPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(232, 163, 61, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(232, 163, 61, 0.25)",
  },
  canvasPillText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: "800",
  },
  toolbar: {
    backgroundColor: "rgba(22, 24, 33, 0.95)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.12)",
    paddingVertical: 8,
  },
  toolScroll: {
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 8,
  },
  toolBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  toolBtnActive: {
    backgroundColor: "rgba(232, 163, 61, 0.18)",
    borderWidth: 1,
    borderColor: colors.accent,
  },
  toolDivider: {
    width: 1,
    height: 20,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    marginHorizontal: 4,
  },
  colorDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  colorDotActive: {
    borderWidth: 2,
    borderColor: "#FFF",
  },
  canvasBoard: {
    flex: 1,
    position: "relative",
    backgroundColor: "#08090E",
  },
  canvasObject: {
    position: "absolute",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(22, 24, 33, 0.9)",
    borderRadius: 12,
    borderWidth: 1,
  },
  objectLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  canvasHelper: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 11,
  },
});
