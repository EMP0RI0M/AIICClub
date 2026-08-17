import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from "react-native";
import Svg, {
  Rect,
  Circle,
  Path,
  Line,
  G,
  Text as SvgText,
} from "react-native-svg";
import { colors } from "../../theme/tokens";
import {
  ChevronLeft,
  Square,
  Circle as CircleIcon,
  MoveUpRight,
  Type,
  Eraser,
  Hand,
  PenLine,
  Highlighter,
  Layers,
  MousePointer2,
  Trash2,
} from "lucide-react-native";
import { saveCanvasState } from "../../lib/api";
import { NativeStorage } from "../../lib/storage";

export type CanvasTool =
  | "select"
  | "hand"
  | "pen"
  | "highlighter"
  | "rect"
  | "circle"
  | "arrow"
  | "text"
  | "eraser";

export interface CanvasShape {
  id: string;
  tool: CanvasTool;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  points?: [number, number][];
  text?: string;
  color?: string;
  width?: number;
  style?: "solid" | "dashed" | "dotted";
}

const PALETTE = [
  { id: "#E8A33D", color: "#E8A33D", label: "Gold" },
  { id: "#2DD4BF", color: "#2DD4BF", label: "Teal" },
  { id: "#EF4444", color: "#EF4444", label: "Red" },
  { id: "#3B82F6", color: "#3B82F6", label: "Blue" },
  { id: "#A855F7", color: "#A855F7", label: "Purple" },
  { id: "#F5F5F7", color: "#F5F5F7", label: "White" },
];

const STROKE_WIDTHS = [
  { value: 2, label: "Thin" },
  { value: 4, label: "Medium" },
  { value: 8, label: "Thick" },
];

function pointsToSvgPath(points: [number, number][]): string {
  if (!points || points.length === 0) return "";
  if (points.length === 1) {
    return `M ${points[0][0]} ${points[0][1]} L ${points[0][0] + 0.1} ${points[0][1] + 0.1}`;
  }
  let path = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i][0]} ${points[i][1]}`;
  }
  return path;
}

function distToSeg(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function hitTestShape(sh: CanvasShape, x: number, y: number, r = 16): boolean {
  if ((sh.tool === "pen" || sh.tool === "highlighter") && sh.points) {
    for (let i = 0; i < sh.points.length; i++) {
      const [px, py] = sh.points[i];
      if (Math.hypot(px - x, py - y) <= r) return true;
      if (i > 0) {
        const [qx, qy] = sh.points[i - 1];
        if (distToSeg(x, y, qx, qy, px, py) <= r) return true;
      }
    }
    return false;
  }

  const minX = Math.min(sh.x1, sh.x2);
  const maxX = Math.max(sh.x1, sh.x2);
  const minY = Math.min(sh.y1, sh.y2);
  const maxY = Math.max(sh.y1, sh.y2);

  switch (sh.tool) {
    case "arrow":
      return distToSeg(x, y, sh.x1, sh.y1, sh.x2, sh.y2) <= r;
    case "rect":
    case "circle":
      return x >= minX - r && x <= maxX + r && y >= minY - r && y <= maxY + r;
    case "text": {
      const w = (sh.text?.length ?? 4) * 10;
      return x >= sh.x1 - r && x <= sh.x1 + w + r && y >= sh.y1 - 20 - r && y <= sh.y1 + 10 + r;
    }
    default:
      return false;
  }
}

export function CanvasChannelView({
  channelId,
  channelName,
  initialShapes,
  onBack,
}: {
  channelId?: string;
  channelName: string;
  initialShapes?: CanvasShape[];
  onBack: () => void;
}) {
  const [tool, setTool] = useState<CanvasTool>("pen");
  const [strokeColor, setStrokeColor] = useState("#E8A33D");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [shapes, setShapes] = useState<CanvasShape[]>(initialShapes || []);
  const [draftShape, setDraftShape] = useState<CanvasShape | null>(null);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Text inline input state
  const [textInputPos, setTextInputPos] = useState<{ x: number; y: number } | null>(null);
  const [textInputValue, setTextInputValue] = useState("");

  const shapesRef = useRef<CanvasShape[]>(shapes);
  shapesRef.current = shapes;

  const toolRef = useRef<CanvasTool>(tool);
  toolRef.current = tool;

  const colorRef = useRef<string>(strokeColor);
  colorRef.current = strokeColor;

  const widthRef = useRef<number>(strokeWidth);
  widthRef.current = strokeWidth;

  const panRef = useRef(pan);
  panRef.current = pan;

  const selectedShapeIdRef = useRef(selectedShapeId);
  selectedShapeIdRef.current = selectedShapeId;

  // Local storage cache key for instant reload recovery
  const storageKey = channelId ? `aiic_canvas_${channelId}` : `aiic_canvas_default`;

  useEffect(() => {
    NativeStorage.getItem(storageKey).then((saved) => {
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setShapes(parsed);
          }
        } catch {
          // ignore corrupted local state
        }
      }
    });
  }, [storageKey]);

  const persistShapes = (next: CanvasShape[]) => {
    NativeStorage.setItem(storageKey, JSON.stringify(next)).catch(() => {});
    if (channelId) {
      saveCanvasState(channelId, { shapes: next }).catch((err) => {
        console.log("[Canvas] sync:", err?.message || err);
      });
    }
  };

  const handleFinishText = () => {
    if (!textInputPos || !textInputValue.trim()) {
      setTextInputPos(null);
      setTextInputValue("");
      return;
    }
    const newTextShape: CanvasShape = {
      id: `text_${Date.now()}`,
      tool: "text",
      x1: textInputPos.x,
      y1: textInputPos.y,
      x2: textInputPos.x + textInputValue.length * 10,
      y2: textInputPos.y + 20,
      text: textInputValue.trim(),
      color: colorRef.current,
      width: widthRef.current,
    };
    const next = [...shapesRef.current, newTextShape];
    setShapes(next);
    persistShapes(next);
    setTextInputPos(null);
    setTextInputValue("");
  };

  const handleDeleteSelected = () => {
    if (!selectedShapeId) return;
    const next = shapes.filter((s) => s.id !== selectedShapeId);
    setShapes(next);
    setSelectedShapeId(null);
    persistShapes(next);
  };

  // Touch Gesture PanResponder for drawing, erasing, selecting, and panning
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const touchX = evt.nativeEvent.locationX - panRef.current.x;
        const touchY = evt.nativeEvent.locationY - panRef.current.y;
        const activeTool = toolRef.current;

        if (activeTool === "hand") {
          return;
        }

        if (activeTool === "eraser") {
          const filtered = shapesRef.current.filter((sh) => !hitTestShape(sh, touchX, touchY, 20));
          if (filtered.length !== shapesRef.current.length) {
            setShapes(filtered);
            persistShapes(filtered);
          }
          return;
        }

        if (activeTool === "select") {
          const hit = [...shapesRef.current]
            .reverse()
            .find((sh) => hitTestShape(sh, touchX, touchY, 16));
          setSelectedShapeId(hit ? hit.id : null);
          return;
        }

        if (activeTool === "text") {
          setTextInputPos({ x: touchX, y: touchY });
          setTextInputValue("");
          return;
        }

        // Pen, Highlighter, Rect, Circle, Arrow
        const isFreehand = activeTool === "pen" || activeTool === "highlighter";
        const newShape: CanvasShape = {
          id: `shape_${Date.now()}`,
          tool: activeTool,
          x1: touchX,
          y1: touchY,
          x2: touchX,
          y2: touchY,
          points: isFreehand ? [[touchX, touchY]] : undefined,
          color: colorRef.current,
          width: widthRef.current,
        };
        setDraftShape(newShape);
      },

      onPanResponderMove: (
        evt: GestureResponderEvent,
        gestureState: PanResponderGestureState
      ) => {
        const activeTool = toolRef.current;
        const touchX = evt.nativeEvent.locationX - panRef.current.x;
        const touchY = evt.nativeEvent.locationY - panRef.current.y;

        if (activeTool === "hand") {
          setPan({
            x: panRef.current.x + gestureState.dx * 0.1,
            y: panRef.current.y + gestureState.dy * 0.1,
          });
          return;
        }

        if (activeTool === "eraser") {
          const filtered = shapesRef.current.filter((sh) => !hitTestShape(sh, touchX, touchY, 20));
          if (filtered.length !== shapesRef.current.length) {
            setShapes(filtered);
            persistShapes(filtered);
          }
          return;
        }

        setDraftShape((prev) => {
          if (!prev) return null;
          if (prev.tool === "pen" || prev.tool === "highlighter") {
            const nextPoints = [...(prev.points || []), [touchX, touchY] as [number, number]];
            return {
              ...prev,
              x2: touchX,
              y2: touchY,
              points: nextPoints,
            };
          }
          return {
            ...prev,
            x2: touchX,
            y2: touchY,
          };
        });
      },

      onPanResponderRelease: () => {
        setDraftShape((currentDraft) => {
          if (currentDraft) {
            const dist = Math.hypot(
              currentDraft.x2 - currentDraft.x1,
              currentDraft.y2 - currentDraft.y1
            );
            const isFreehand =
              currentDraft.tool === "pen" || currentDraft.tool === "highlighter";

            if (isFreehand || dist > 6) {
              const next = [...shapesRef.current, currentDraft];
              setShapes(next);
              persistShapes(next);
            }
          }
          return null;
        });
      },
    })
  ).current;

  const tools: { id: CanvasTool; icon: any; label: string }[] = [
    { id: "select", icon: MousePointer2, label: "Select" },
    { id: "pen", icon: PenLine, label: "Pen" },
    { id: "highlighter", icon: Highlighter, label: "Highlighter" },
    { id: "rect", icon: Square, label: "Rect" },
    { id: "circle", icon: CircleIcon, label: "Circle" },
    { id: "arrow", icon: MoveUpRight, label: "Arrow" },
    { id: "text", icon: Type, label: "Text" },
    { id: "eraser", icon: Eraser, label: "Eraser" },
    { id: "hand", icon: Hand, label: "Pan" },
  ];

  // Visual SVG Shape Component
  function renderSvgShape(sh: CanvasShape, isSelected = false) {
    const stroke = sh.color || "#E8A33D";
    const w = sh.width || 2;
    const isDashed = sh.style === "dashed";

    if ((sh.tool === "pen" || sh.tool === "highlighter") && sh.points) {
      const d = pointsToSvgPath(sh.points);
      return (
        <Path
          key={sh.id}
          d={d}
          stroke={stroke}
          strokeWidth={sh.tool === "highlighter" ? w * 4 : w}
          opacity={sh.tool === "highlighter" ? 0.35 : 1}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      );
    }

    const minX = Math.min(sh.x1, sh.x2);
    const minY = Math.min(sh.y1, sh.y2);
    const shapeW = Math.max(1, Math.abs(sh.x2 - sh.x1));
    const shapeH = Math.max(1, Math.abs(sh.y2 - sh.y1));

    if (sh.tool === "rect") {
      return (
        <G key={sh.id}>
          <Rect
            x={minX}
            y={minY}
            width={shapeW}
            height={shapeH}
            rx={6}
            stroke={stroke}
            strokeWidth={w}
            strokeDasharray={isDashed ? "6,4" : undefined}
            fill="none"
          />
          {isSelected && (
            <Rect
              x={minX - 6}
              y={minY - 6}
              width={shapeW + 12}
              height={shapeH + 12}
              stroke="#E8A33D"
              strokeWidth={1}
              strokeDasharray="4,4"
              fill="none"
            />
          )}
        </G>
      );
    }

    if (sh.tool === "circle") {
      const cx = minX + shapeW / 2;
      const cy = minY + shapeH / 2;
      const r = Math.min(shapeW, shapeH) / 2;
      return (
        <G key={sh.id}>
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            stroke={stroke}
            strokeWidth={w}
            strokeDasharray={isDashed ? "6,4" : undefined}
            fill="none"
          />
          {isSelected && (
            <Rect
              x={cx - r - 6}
              y={cy - r - 6}
              width={r * 2 + 12}
              height={r * 2 + 12}
              stroke="#E8A33D"
              strokeWidth={1}
              strokeDasharray="4,4"
              fill="none"
            />
          )}
        </G>
      );
    }

    if (sh.tool === "arrow") {
      const angle = Math.atan2(sh.y2 - sh.y1, sh.x2 - sh.x1);
      const headLen = 12 + w;
      const xHead1 = sh.x2 - headLen * Math.cos(angle - 0.45);
      const yHead1 = sh.y2 - headLen * Math.sin(angle - 0.45);
      const xHead2 = sh.x2 - headLen * Math.cos(angle + 0.45);
      const yHead2 = sh.y2 - headLen * Math.sin(angle + 0.45);

      return (
        <G key={sh.id}>
          <Line
            x1={sh.x1}
            y1={sh.y1}
            x2={sh.x2}
            y2={sh.y2}
            stroke={stroke}
            strokeWidth={w}
            strokeLinecap="round"
          />
          <Line
            x1={sh.x2}
            y1={sh.y2}
            x2={xHead1}
            y2={yHead1}
            stroke={stroke}
            strokeWidth={w}
            strokeLinecap="round"
          />
          <Line
            x1={sh.x2}
            y1={sh.y2}
            x2={xHead2}
            y2={yHead2}
            stroke={stroke}
            strokeWidth={w}
            strokeLinecap="round"
          />
        </G>
      );
    }

    if (sh.tool === "text") {
      return (
        <G key={sh.id}>
          <SvgText
            x={sh.x1}
            y={sh.y1}
            fill={stroke}
            fontSize={16}
            fontWeight="bold"
            fontFamily="monospace"
          >
            {sh.text || "Text"}
          </SvgText>
          {isSelected && (
            <Rect
              x={sh.x1 - 4}
              y={sh.y1 - 18}
              width={(sh.text?.length || 4) * 10 + 8}
              height={24}
              stroke="#E8A33D"
              strokeWidth={1}
              strokeDasharray="4,4"
              fill="none"
            />
          )}
        </G>
      );
    }

    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.channelName} numberOfLines={1}>
            {channelName}
          </Text>
          <Text style={styles.subText}>
            Vector Whiteboard · {shapes.length} Objects
          </Text>
        </View>

        {selectedShapeId ? (
          <Pressable onPress={handleDeleteSelected} style={styles.deletePill}>
            <Trash2 size={14} color={colors.danger} />
            <Text style={styles.deletePillText}>Delete Object</Text>
          </Pressable>
        ) : (
          <View style={styles.canvasPill}>
            <Layers size={13} color={colors.accent} />
            <Text style={styles.canvasPillText}>SVG Canvas</Text>
          </View>
        )}
      </View>

      {/* Floating Toolbar matching Web Toolbar specification */}
      <View style={styles.toolbar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.toolScroll}
        >
          {tools.map((t) => {
            const IconComponent = t.icon;
            const active = tool === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => {
                  setTool(t.id);
                  if (t.id !== "select") setSelectedShapeId(null);
                }}
                style={[styles.toolBtn, active && styles.toolBtnActive]}
              >
                <IconComponent
                  size={16}
                  color={active ? colors.accent : colors.textMuted}
                />
              </Pressable>
            );
          })}

          <View style={styles.toolDivider} />

          {/* Color Palette */}
          {PALETTE.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => setStrokeColor(c.color)}
              style={[
                styles.colorDot,
                { backgroundColor: c.color },
                strokeColor === c.color && styles.colorDotActive,
              ]}
            />
          ))}

          <View style={styles.toolDivider} />

          {/* Stroke Width Selector */}
          {STROKE_WIDTHS.map((w) => (
            <Pressable
              key={w.value}
              onPress={() => setStrokeWidth(w.value)}
              style={[
                styles.widthBtn,
                strokeWidth === w.value && styles.widthBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.widthText,
                  strokeWidth === w.value && styles.widthTextActive,
                ]}
              >
                {w.label[0]}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Main Interactive SVG Vector Canvas Board */}
      <View style={styles.canvasBoard} {...panResponder.panHandlers}>
        <Svg style={StyleSheet.absoluteFill}>
          <G x={pan.x} y={pan.y}>
            {/* Render all confirmed vector shapes */}
            {shapes.map((s) => renderSvgShape(s, s.id === selectedShapeId))}

            {/* Render active live drawing draft */}
            {draftShape && renderSvgShape(draftShape, false)}
          </G>
        </Svg>

        {/* Inline Text Input Overlay when Text tool is placed */}
        {textInputPos && (
          <View
            style={[
              styles.textInputBox,
              {
                left: textInputPos.x + pan.x,
                top: textInputPos.y + pan.y - 14,
              },
            ]}
          >
            <TextInput
              autoFocus
              value={textInputValue}
              onChangeText={setTextInputValue}
              onBlur={handleFinishText}
              onSubmitEditing={handleFinishText}
              placeholder="Type text..."
              placeholderTextColor={colors.textMuted}
              style={[styles.nativeTextInput, { color: strokeColor }]}
            />
          </View>
        )}

        {/* User Interaction Guide */}
        <View style={styles.canvasHelper}>
          <Text style={styles.helperText}>
            {tool === "eraser"
              ? "Touch or drag across objects to erase"
              : tool === "select"
              ? "Tap an object to select & delete"
              : tool === "hand"
              ? "Drag canvas to pan workspace"
              : tool === "text"
              ? "Tap canvas to place inline text"
              : `Draw ${tool.toUpperCase()} on canvas`}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#08090E",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    gap: 8,
    backgroundColor: "rgba(14, 18, 26, 0.95)",
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
    fontSize: 15,
    fontWeight: "800",
  },
  subText: {
    color: colors.textMuted,
    fontSize: 10.5,
    marginTop: 1,
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
  deletePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  deletePillText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: "700",
  },
  toolbar: {
    backgroundColor: "rgba(18, 22, 34, 0.98)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
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
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  colorDotActive: {
    borderWidth: 2,
    borderColor: "#FFF",
    transform: [{ scale: 1.15 }],
  },
  widthBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  widthBtnActive: {
    backgroundColor: "rgba(232, 163, 61, 0.2)",
    borderColor: colors.accent,
    borderWidth: 1,
  },
  widthText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  widthTextActive: {
    color: colors.accent,
  },
  canvasBoard: {
    flex: 1,
    backgroundColor: "#07090E",
    overflow: "hidden",
  },
  textInputBox: {
    position: "absolute",
    backgroundColor: "rgba(18, 22, 34, 0.95)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.accent,
    minWidth: 120,
    zIndex: 50,
  },
  nativeTextInput: {
    fontSize: 15,
    fontFamily: "monospace",
    padding: 0,
    margin: 0,
  },
  canvasHelper: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    backgroundColor: "rgba(14, 18, 26, 0.85)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: "monospace",
  },
});
