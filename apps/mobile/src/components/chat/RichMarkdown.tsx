import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Linking,
  Platform,
} from "react-native";
import {
  ChevronDown,
  ChevronRight,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  Code2,
} from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { colors, radius } from "../../theme/tokens";

/* =========================================================
   LATEX MATH FORMATTING UTILITIES
   Translates raw LaTeX tokens into typographic mathematical text
   ========================================================= */

const GREEK_MAP: Record<string, string> = {
  "\\alpha": "α",
  "\\beta": "β",
  "\\gamma": "γ",
  "\\Gamma": "Γ",
  "\\delta": "δ",
  "\\Delta": "Δ",
  "\\epsilon": "ε",
  "\\varepsilon": "ε",
  "\\zeta": "ζ",
  "\\eta": "η",
  "\\theta": "θ",
  "\\Theta": "Θ",
  "\\iota": "ι",
  "\\kappa": "κ",
  "\\lambda": "λ",
  "\\Lambda": "Λ",
  "\\mu": "μ",
  "\\nu": "ν",
  "\\xi": "ξ",
  "\\Xi": "Ξ",
  "\\pi": "π",
  "\\Pi": "Π",
  "\\rho": "ρ",
  "\\sigma": "σ",
  "\\Sigma": "Σ",
  "\\tau": "τ",
  "\\upsilon": "υ",
  "\\phi": "φ",
  "\\Phi": "Φ",
  "\\chi": "χ",
  "\\psi": "ψ",
  "\\Psi": "Ψ",
  "\\omega": "ω",
  "\\Omega": "Ω",
};

const SYMBOL_MAP: Record<string, string> = {
  "\\pm": "±",
  "\\mp": "∓",
  "\\times": "×",
  "\\cdot": "·",
  "\\div": "÷",
  "\\ast": "∗",
  "\\star": "★",
  "\\circ": "∘",
  "\\bullet": "•",
  "\\leq": "≤",
  "\\le": "≤",
  "\\geq": "≥",
  "\\ge": "≥",
  "\\neq": "≠",
  "\\ne": "≠",
  "\\approx": "≈",
  "\\sim": "∼",
  "\\simeq": "≃",
  "\\equiv": "≡",
  "\\propto": "∝",
  "\\infty": "∞",
  "\\partial": "∂",
  "\\nabla": "∇",
  "\\int": "∫",
  "\\iint": "∬",
  "\\iiint": "∭",
  "\\oint": "∮",
  "\\sum": "∑",
  "\\prod": "∏",
  "\\coprod": "∐",
  "\\in": "∈",
  "\\notin": "∉",
  "\\subset": "⊂",
  "\\subseteq": "⊆",
  "\\supset": "⊃",
  "\\supseteq": "⊇",
  "\\cup": "∪",
  "\\cap": "∩",
  "\\setminus": "∖",
  "\\forall": "∀",
  "\\exists": "∃",
  "\\nexists": "∄",
  "\\neg": "¬",
  "\\land": "∧",
  "\\lor": "∨",
  "\\rightarrow": "→",
  "\\to": "→",
  "\\leftarrow": "←",
  "\\gets": "←",
  "\\Rightarrow": "⇒",
  "\\Leftarrow": "⇐",
  "\\Leftrightarrow": "⇔",
  "\\iff": "⇔",
  "\\uparrow": "↑",
  "\\downarrow": "↓",
  "\\updownarrow": "↕",
  "\\dots": "…",
  "\\cdots": "⋯",
  "\\ddots": "⋱",
  "\\vdots": "⋮",
  "\\quad": "  ",
  "\\qquad": "    ",
  "\\,": " ",
  "\\;": " ",
  "\\!": "",
  "\\{": "{",
  "\\}": "}",
  "\\%": "%",
  "\\$": "$",
  "\\&": "&",
  "\\_": "_",
  "\\#": "#",
};

function splitTableRow(line: string): string[] {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function isTableSeparator(line: string): boolean {
  const cells = splitTableRow(line);
  return cells.length >= 2 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function MarkdownTable({ rows, textColor, fontSize }: { rows: string[][]; textColor?: string; fontSize: number }) {
  const columnCount = Math.max(...rows.map((row) => row.length));
  return (
    <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator style={styles.tableScroll}>
      <View style={styles.table}>
        {rows.map((row, rowIndex) => (
          <View key={`table-row-${rowIndex}`} style={[styles.tableRow, rowIndex === 0 && styles.tableHeaderRow]}>
            {Array.from({ length: columnCount }).map((_, columnIndex) => (
              <View key={`table-cell-${rowIndex}-${columnIndex}`} style={styles.tableCell}>
                <InlineText
                  text={row[columnIndex] || ""}
                  textColor={textColor}
                  fontSize={fontSize * 0.92}
                />
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const SUPERSCRIPTS: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
  "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
  "+": "⁺", "-": "⁻", "=": "⁼", "(": "⁽", ")": "⁾",
  "n": "ⁿ", "i": "ⁱ", "x": "ˣ", "y": "ʸ", "t": "ᵗ",
};

const SUBSCRIPTS: Record<string, string> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
  "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
  "+": "₊", "-": "₋", "=": "₌", "(": "₍", ")": "₎",
  "a": "ₐ", "e": "ₑ", "i": "ᵢ", "j": "ⱼ", "k": "ₖ",
  "m": "ₘ", "n": "ₙ", "o": "ₒ", "p": "ₚ", "r": "ᵣ",
  "s": "ₛ", "t": "ₜ", "u": "ᵤ", "v": "ᵥ", "x": "ₓ",
};

export function formatLatexFormula(latex: string): string {
  let res = latex.trim();

  // Replace \text{...}, \mathbf{...}, \mathit{...}, \mathrm{...}
  res = res.replace(/\\(text|mathbf|mathit|mathrm|mathbb)\{([^}]+)\}/g, "$2");

  // Handle \frac{a}{b} -> (a / b)
  res = res.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1 / $2)");

  // Handle \sqrt{a} -> √(a)
  res = res.replace(/\\sqrt\{([^}]+)\}/g, "√($1)");
  res = res.replace(/\\sqrt\[(\d+)\]\{([^}]+)\}/g, "$1√($2)");

  // Handle Greek letters
  for (const [cmd, unicode] of Object.entries(GREEK_MAP)) {
    res = res.replaceAll(cmd, unicode);
  }

  // Handle Symbols
  for (const [cmd, unicode] of Object.entries(SYMBOL_MAP)) {
    res = res.replaceAll(cmd, unicode);
  }

  // Superscripts x^{12} or x^2
  res = res.replace(/\^{([^}]+)}|\^([0-9a-zA-Z+-])/g, (_, p1, p2) => {
    const power = p1 || p2 || "";
    return power
      .split("")
      .map((ch: string) => SUPERSCRIPTS[ch] || `^${ch}`)
      .join("");
  });

  // Subscripts x_{12} or x_2
  res = res.replace(/_{([^}]+)}|_([0-9a-zA-Z+-])/g, (_, p1, p2) => {
    const sub = p1 || p2 || "";
    return sub
      .split("")
      .map((ch: string) => SUBSCRIPTS[ch] || `_${ch}`)
      .join("");
  });

  // Clean unparsed escaped backslashes
  res = res.replace(/\\([a-zA-Z]+)/g, "$1");

  return res;
}

/* =========================================================
   CODE BLOCK COMPONENT WITH COPY ACTION
   ========================================================= */

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={styles.codeBlockContainer}>
      <View style={styles.codeBlockHeader}>
        <View style={styles.codeBlockLangWrap}>
          <Code2 size={13} color={colors.accent} />
          <Text style={styles.codeBlockLangText}>
            {(language || "code").toUpperCase()}
          </Text>
        </View>
        <Pressable
          onPress={handleCopy}
          style={styles.codeCopyBtn}
          hitSlop={8}
        >
          {copied ? (
            <>
              <Check size={12} color={colors.statusOnline} />
              <Text style={[styles.codeCopyText, { color: colors.statusOnline }]}>
                Copied
              </Text>
            </>
          ) : (
            <>
              <Copy size={12} color={colors.textMuted} />
              <Text style={styles.codeCopyText}>Copy</Text>
            </>
          )}
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.codeContentScroll}
      >
        <Text style={styles.codeBlockText}>{code.trim()}</Text>
      </ScrollView>
    </View>
  );
}

/* =========================================================
   DISPLAY LATEX MATH BLOCK COMPONENT
   ========================================================= */

function MathDisplayBlock({ latex }: { latex: string }) {
  const [copied, setCopied] = useState(false);
  const formatted = formatLatexFormula(latex);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(latex);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <View style={styles.mathBlockContainer}>
      <View style={styles.mathBlockHeader}>
        <View style={styles.mathBlockBadgeWrap}>
          <Text style={styles.mathBlockBadge}>FORMULA</Text>
        </View>
        <Pressable onPress={handleCopy} style={styles.mathCopyBtn} hitSlop={8}>
          {copied ? (
            <>
              <Check size={11} color={colors.statusOnline} />
              <Text style={[styles.mathCopyText, { color: colors.statusOnline }]}>Copied</Text>
            </>
          ) : (
            <>
              <Copy size={11} color={colors.textMuted} />
              <Text style={styles.mathCopyText}>Copy</Text>
            </>
          )}
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.mathContentScroll}
        nestedScrollEnabled
      >
        <Text style={styles.mathDisplayText}>{formatted}</Text>
      </ScrollView>
    </View>
  );
}

/* =========================================================
   INLINE MARKDOWN & MATH TOKENIZER
   ========================================================= */

const INLINE_RE =
  /\$\$[\s\S]*?\$\$|\$(?!\$)[\s\S]*?\$|https?:\/\/[^\s<>"]+|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|~~([^~]+)~~|`([^`]+)`|\*([^*]+)\*|_([^_]+)_/g;

export function InlineText({
  text,
  textColor,
  fontSize = 14,
}: {
  text: string;
  textColor?: string;
  fontSize?: number;
}) {
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  INLINE_RE.lastIndex = 0;

  while ((match = INLINE_RE.exec(text)) !== null) {
    if (match.index > cursor) {
      nodes.push(
        <Text
          key={`txt-${cursor}`}
          style={[
            styles.baseText,
            { color: textColor || colors.textPrimary, fontSize },
          ]}
        >
          {text.slice(cursor, match.index)}
        </Text>
      );
    }

    const token = match[0];
    const key = `tok-${match.index}`;

    if (token.startsWith("$$") && token.endsWith("$$")) {
      // Display Math inline token
      const latex = token.slice(2, -2);
      nodes.push(
        <Text
          key={key}
          style={[
            styles.mathInlineText,
            { fontSize: fontSize + 1, color: colors.accentTeal },
          ]}
        >
          {formatLatexFormula(latex)}
        </Text>
      );
    } else if (
      token.startsWith("$") &&
      token.endsWith("$") &&
      !token.startsWith("$$")
    ) {
      // Inline Math $...$
      const latex = token.slice(1, -1);
      nodes.push(
        <Text
          key={key}
          style={[
            styles.mathInlineText,
            { fontSize, color: colors.accentTeal },
          ]}
        >
          {formatLatexFormula(latex)}
        </Text>
      );
    } else if (token.startsWith("[") && match[1] && match[2]) {
      // Markdown link [title](url)
      const linkTitle = match[1];
      const linkUrl = match[2];
      nodes.push(
        <Text
          key={key}
          onPress={() => Linking.openURL(linkUrl).catch(() => {})}
          style={[styles.linkText, { fontSize }]}
        >
          {linkTitle}
        </Text>
      );
    } else if (token.startsWith("http://") || token.startsWith("https://")) {
      // Plain URL
      nodes.push(
        <Text
          key={key}
          onPress={() => Linking.openURL(token).catch(() => {})}
          style={[styles.linkText, { fontSize }]}
        >
          {token}
        </Text>
      );
    } else if (
      (token.startsWith("**") && token.endsWith("**")) ||
      (token.startsWith("__") && token.endsWith("__"))
    ) {
      // Bold
      const content = token.slice(2, -2);
      nodes.push(
        <Text
          key={key}
          style={[
            styles.boldText,
            { color: textColor || colors.textPrimary, fontSize },
          ]}
        >
          {content}
        </Text>
      );
    } else if (token.startsWith("~~") && token.endsWith("~~")) {
      // Strikethrough
      const content = token.slice(2, -2);
      nodes.push(
        <Text
          key={key}
          style={[styles.strikeText, { color: colors.textMuted, fontSize }]}
        >
          {content}
        </Text>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      // Inline Code
      const code = token.slice(1, -1);
      nodes.push(
        <Text key={key} style={[styles.inlineCodePill, { fontSize: fontSize * 0.9 }]}>
          {` ${code} `}
        </Text>
      );
    } else if (
      (token.startsWith("*") && token.endsWith("*")) ||
      (token.startsWith("_") && token.endsWith("_"))
    ) {
      // Italic
      const content = token.slice(1, -1);
      nodes.push(
        <Text
          key={key}
          style={[
            styles.italicText,
            { color: textColor || colors.textPrimary, fontSize },
          ]}
        >
          {content}
        </Text>
      );
    }

    cursor = match.index + token.length;
  }

  if (cursor < text.length) {
    nodes.push(
      <Text
        key={`txt-tail`}
        style={[
          styles.baseText,
          { color: textColor || colors.textPrimary, fontSize },
        ]}
      >
        {text.slice(cursor)}
      </Text>
    );
  }

  return <Text style={{ lineHeight: fontSize * 1.45 }}>{nodes}</Text>;
}

/* =========================================================
   RICH MARKDOWN RENDERER (BLOCK LEVEL)
   ========================================================= */

export function RichMarkdown({
  content,
  textColor,
  fontSize = 14.5,
}: {
  content: string;
  textColor?: string;
  fontSize?: number;
}) {
  if (!content) return null;

  // Split into block segments: Code blocks (```), Display math ($$), and regular markdown paragraphs
  const blocks: React.ReactNode[] = [];
  const lines = content.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // GitHub-style Markdown table: header row, separator row, then body rows.
    const headerCells = line.includes("|") ? splitTableRow(line) : [];
    const separatorCells = i + 1 < lines.length && lines[i + 1].includes("|") ? splitTableRow(lines[i + 1]) : [];
    if (headerCells.length >= 2 && separatorCells.length === headerCells.length && isTableSeparator(lines[i + 1])) {
      const tableRows = [splitTableRow(line)];
      i += 2;
      while (
        i < lines.length &&
        tableRows.length < 50 &&
        lines[i].includes("|") &&
        lines[i].trim().length > 0 &&
        splitTableRow(lines[i]).length === headerCells.length
      ) {
        tableRows.push(splitTableRow(lines[i]));
        i++;
      }
      blocks.push(
        <MarkdownTable key={`table-${i}`} rows={tableRows} textColor={textColor} fontSize={fontSize} />
      );
      continue;
    }

    // Fenced code block ```lang
    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push(
        <CodeBlock
          key={`code-${i}`}
          code={codeLines.join("\n")}
          language={lang}
        />
      );
      continue;
    }

    // Display Math $$ ... $$ (block)
    if (line.trim().startsWith("$$") && !line.trim().endsWith("$$", 3)) {
      const mathLines: string[] = [];
      if (line.trim() !== "$$") {
        mathLines.push(line.trim().replace(/^\$\$/, ""));
      }
      i++;
      while (i < lines.length && !lines[i].trim().endsWith("$$")) {
        mathLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) {
        mathLines.push(lines[i].trim().replace(/\$\$$/, ""));
        i++;
      }
      blocks.push(
        <MathDisplayBlock
          key={`math-block-${i}`}
          latex={mathLines.join(" ")}
        />
      );
      continue;
    }

    if (
      line.trim().startsWith("$$") &&
      line.trim().endsWith("$$") &&
      line.trim().length > 4
    ) {
      const latex = line.trim().slice(2, -2);
      blocks.push(
        <MathDisplayBlock key={`math-line-${i}`} latex={latex} />
      );
      i++;
      continue;
    }

    // Headers #, ##, ###
    if (line.startsWith("# ")) {
      blocks.push(
        <View key={`h1-${i}`} style={styles.h1Wrap}>
          <Text style={styles.h1Text}>{line.slice(2)}</Text>
        </View>
      );
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push(
        <View key={`h2-${i}`} style={styles.h2Wrap}>
          <Text style={styles.h2Text}>{line.slice(3)}</Text>
        </View>
      );
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push(
        <View key={`h3-${i}`} style={styles.h3Wrap}>
          <Text style={styles.h3Text}>{line.slice(4)}</Text>
        </View>
      );
      i++;
      continue;
    }

    // Blockquote >
    if (line.startsWith("> ")) {
      const quoteText = line.slice(2);
      blocks.push(
        <View key={`quote-${i}`} style={styles.blockquote}>
          <InlineText
            text={quoteText}
            textColor={colors.textMuted}
            fontSize={fontSize * 0.95}
          />
        </View>
      );
      i++;
      continue;
    }

    // Unordered List - or *
    if (/^\s*[-*]\s+/.test(line)) {
      const listText = line.replace(/^\s*[-*]\s+/, "");
      blocks.push(
        <View key={`ul-${i}`} style={styles.listItem}>
          <View style={styles.listBullet} />
          <View style={styles.listTextWrap}>
            <InlineText
              text={listText}
              textColor={textColor}
              fontSize={fontSize}
            />
          </View>
        </View>
      );
      i++;
      continue;
    }

    // Ordered List 1. 2.
    const olMatch = line.match(/^\s*(\d+)\.\s+(.*)/);
    if (olMatch) {
      blocks.push(
        <View key={`ol-${i}`} style={styles.listItem}>
          <Text style={styles.listNumber}>{olMatch[1]}.</Text>
          <View style={styles.listTextWrap}>
            <InlineText
              text={olMatch[2]}
              textColor={textColor}
              fontSize={fontSize}
            />
          </View>
        </View>
      );
      i++;
      continue;
    }

    // Regular line or paragraph
    if (line.trim().length > 0) {
      blocks.push(
        <View key={`p-${i}`} style={styles.paragraph}>
          <InlineText
            text={line}
            textColor={textColor}
            fontSize={fontSize}
          />
        </View>
      );
    } else {
      // Empty line / spacer
      blocks.push(<View key={`sp-${i}`} style={{ height: 4 }} />);
    }

    i++;
  }

  return <View style={styles.container}>{blocks}</View>;
}

/* =========================================================
   REASONING TRACE (HIDDEN / SUPPRESSED)
   Per security guidelines, model internal reasoning & thought processes
   are stripped and not exposed in user-facing UI.
   ========================================================= */

export function ReasoningTrace(_props: {
  reasoning?: string | null;
  initiallyExpanded?: boolean;
}) {
  return null;
}

/* =========================================================
   STYLES
   ========================================================= */

const styles = StyleSheet.create({
  container: {
    gap: 3,
  },
  tableScroll: {
    maxWidth: "100%",
    maxHeight: 280,
    marginVertical: 5,
  },
  table: {
    minWidth: 360,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 8,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.025)",
  },
  tableHeaderRow: {
    borderTopWidth: 0,
    backgroundColor: "rgba(45,212,191,0.10)",
  },
  tableCell: {
    width: 150,
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRightWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  paragraph: {
    marginVertical: 1.5,
  },
  baseText: {
    color: colors.textPrimary,
    flexShrink: 1,
    minWidth: 0,
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  boldText: {
    fontWeight: "700",
    color: "#FFFFFF",
  },
  italicText: {
    fontStyle: "italic",
  },
  strikeText: {
    textDecorationLine: "line-through",
    color: colors.textMuted,
  },
  linkText: {
    color: colors.accent,
    flexShrink: 1,
    textDecorationLine: "underline",
  },
  inlineCodePill: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    color: "#F6AD55",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  mathInlineText: {
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    color: colors.accentTeal,
    fontStyle: "italic",
    paddingHorizontal: 2,
  },

  // Code Block
  codeBlockContainer: {
    marginVertical: 4,
    borderRadius: radius.sm || 6,
    backgroundColor: "rgba(10, 12, 18, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
    width: "100%",
  },
  codeBlockHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  codeBlockLangWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  codeBlockLangText: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    color: colors.accent,
    letterSpacing: 0.5,
  },
  codeCopyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  codeCopyText: {
    fontSize: 10,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    color: colors.textMuted,
  },
  codeContentScroll: {
    padding: 8,
  },
  codeBlockText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
    lineHeight: 17,
    color: "#E2E8F0",
  },

  // Math Display Block
  mathBlockContainer: {
    marginVertical: 6,
    borderRadius: radius.sm || 6,
    backgroundColor: "rgba(12, 22, 32, 0.65)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.22)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    width: "100%",
    maxWidth: "100%",
    overflow: "hidden",
  },
  mathBlockHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  mathBlockBadgeWrap: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 3,
    backgroundColor: "rgba(56, 189, 248, 0.12)",
  },
  mathBlockBadge: {
    fontSize: 8.5,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontWeight: "800",
    color: "#38BDF8",
    letterSpacing: 0.8,
  },
  mathCopyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  mathCopyText: {
    fontSize: 9.5,
    color: colors.textMuted,
    fontWeight: "600",
  },
  mathContentScroll: {
    paddingVertical: 4,
    alignItems: "center",
  },
  mathDisplayText: {
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    fontSize: 15,
    color: "#38BDF8",
    fontStyle: "italic",
    letterSpacing: 0.5,
  },

  // Headers
  h1Wrap: {
    marginTop: 6,
    marginBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    paddingBottom: 2,
  },
  h1Text: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 21,
  },
  h2Wrap: {
    marginTop: 5,
    marginBottom: 2,
  },
  h2Text: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 20,
  },
  h3Wrap: {
    marginTop: 4,
    marginBottom: 2,
  },
  h3Text: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.accent,
    lineHeight: 19,
  },

  // Blockquote
  blockquote: {
    marginVertical: 4,
    paddingLeft: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    paddingVertical: 3,
    borderRadius: 2,
  },

  // Lists
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 2,
  },
  listBullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.accent,
    marginTop: 7,
    marginRight: 8,
  },
  listNumber: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    color: colors.accent,
    marginRight: 6,
    marginTop: 1,
  },
  listTextWrap: {
    flex: 1,
  },

  // Reasoning Trace
  reasoningContainer: {
    marginVertical: 6,
    borderRadius: radius.md,
    backgroundColor: "rgba(129, 140, 248, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(129, 140, 248, 0.18)",
    borderLeftWidth: 3,
    borderLeftColor: "#818CF8",
    overflow: "hidden",
  },
  reasoningHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "rgba(129, 140, 248, 0.08)",
  },
  reasoningHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  reasoningIconBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(129, 140, 248, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  reasoningTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#C7D2FE",
  },
  reasoningPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: "rgba(129, 140, 248, 0.2)",
  },
  reasoningPillText: {
    fontSize: 9,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontWeight: "700",
    color: "#A5B4FC",
  },
  reasoningChevronWrap: {
    padding: 2,
  },
  reasoningContentWrap: {
    padding: 10,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  reasoningGlowLine: {
    height: 1,
    backgroundColor: "rgba(129, 140, 248, 0.15)",
    marginBottom: 8,
  },
});
