export type AttachmentKind = "image" | "video" | "document" | "file" | "gif" | "audio";

export interface SharedAttachment {
  url: string;
  name: string;
  size?: number;
  mimeType?: string;
  kind: AttachmentKind;
  duration?: string;
}

export const ATTACHMENT_CONTENT_PREFIX = "attachment:";

export function encodeAttachmentContent(attachment: {
  url: string;
  name?: string;
  size?: number | string;
  mimeType?: string;
  type?: string;
  kind?: string;
  duration?: string;
}): string {
  const normalized: SharedAttachment = {
    url: attachment.url,
    name: attachment.name || "Attachment",
    size: typeof attachment.size === "number" ? attachment.size : 0,
    mimeType: attachment.mimeType || attachment.type || "application/octet-stream",
    kind: (attachment.kind as AttachmentKind) || "image",
    duration: attachment.duration,
  };
  return `${ATTACHMENT_CONTENT_PREFIX}${encodeURIComponent(JSON.stringify(normalized))}`;
}

export function parseAttachmentContent(content: string): SharedAttachment | null {
  if (!content) return null;
  const trimmed = content.trim();

  let raw = "";
  if (trimmed.startsWith(ATTACHMENT_CONTENT_PREFIX)) {
    raw = trimmed.slice(ATTACHMENT_CONTENT_PREFIX.length);
  } else if (
    trimmed.startsWith("clip:") ||
    trimmed.startsWith("video:") ||
    trimmed.startsWith("audio:") ||
    trimmed.startsWith("file:")
  ) {
    const colonIdx = trimmed.indexOf(":");
    raw = trimmed.slice(colonIdx + 1);
  } else if (
    trimmed.includes("application%2F") ||
    trimmed.includes("%22url%22") ||
    trimmed.startsWith("%7B%22url%22") ||
    trimmed.startsWith('{"url"') ||
    trimmed.startsWith("{")
  ) {
    raw = trimmed;
  } else {
    return null;
  }

  if (!raw) return null;

  try {
    let parsed: any = null;
    if (raw.startsWith("{")) {
      parsed = JSON.parse(raw);
    } else {
      const decoded = decodeURIComponent(raw);
      parsed = JSON.parse(decoded);
    }

    if (!parsed || typeof parsed.url !== "string") {
      return null;
    }

    const mime = (parsed.mimeType || parsed.type || "").toLowerCase();
    let kind: AttachmentKind = "file";
    if (parsed.kind === "gif" || mime === "image/gif" || parsed.url.includes(".gif")) {
      kind = "gif";
    } else if (parsed.kind === "image" || mime.startsWith("image/") || parsed.url.match(/\.(png|jpe?g|webp|avif|bmp)($|\?)/i)) {
      kind = "image";
    } else if (parsed.kind === "video" || mime.startsWith("video/") || parsed.url.match(/\.(mp4|webm|mov|mkv)($|\?)/i)) {
      kind = "video";
    } else if (parsed.kind === "audio" || mime.startsWith("audio/") || parsed.url.match(/\.(mp3|wav|ogg|m4a|aac)($|\?)/i)) {
      kind = "audio";
    }

    return {
      url: parsed.url,
      name: parsed.name || (kind === "video" ? "Video Clip" : kind === "audio" ? "Voice Note" : "Attachment"),
      size: typeof parsed.size === "number" ? parsed.size : 0,
      mimeType: parsed.mimeType || parsed.type || "application/octet-stream",
      kind,
      duration: parsed.duration,
    };
  } catch {
    return null;
  }
}

export function parseMessageAttachments(rawText: string): {
  cleanText: string;
  reasoningText: string | null;
  attachments: SharedAttachment[];
} {
  const attachments: SharedAttachment[] = [];
  let cleanText = rawText || "";
  let reasoningText: string | null = null;

  if (!cleanText) return { cleanText: "", reasoningText: null, attachments: [] };

  // 1. Extract and strip AI thinking/reasoning blocks
  const thinkMatch =
    cleanText.match(/<think>([\s\S]*?)(?:<\/think>|$)/i) ||
    cleanText.match(/<thought>([\s\S]*?)(?:<\/thought>|$)/i) ||
    cleanText.match(/<thinking>([\s\S]*?)(?:<\/thinking>|$)/i) ||
    cleanText.match(/^Here's a thinking process:([\s\S]*?)(?=\n\n(?:[A-Z0-9#]|```)|$)/im);

  if (thinkMatch && thinkMatch[1]?.trim()) {
    reasoningText = thinkMatch[1].trim();
  }

  // 2. Parse attachments on line-by-line and regex patterns (matches web implementation)
  const lines = cleanText.split("\n");
  const textLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const parsed = parseAttachmentContent(trimmed);
    if (parsed) {
      attachments.push(parsed);
    } else {
      textLines.push(line);
    }
  }

  cleanText = textLines.join("\n");

  // 3. Fallback regex for inline attachments: (attachment|clip|video|audio|file):(...)
  const inlinePayloadRegex = /(?:attachment|clip|video|audio|file):((?:%7B[\s\S]*?%7D)|(?:\{[\s\S]*?\}))/gi;
  let match: RegExpExecArray | null;
  while ((match = inlinePayloadRegex.exec(cleanText)) !== null) {
    const single = parseAttachmentContent(match[0]);
    if (single && !attachments.some((a) => a.url === single.url)) {
      attachments.push(single);
    }
  }

  // 4. Extract standalone markdown images: ![alt](url)
  const mdImgRegex = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;
  let imgMatch: RegExpExecArray | null;
  while ((imgMatch = mdImgRegex.exec(cleanText)) !== null) {
    if (!attachments.some((a) => a.url === imgMatch![2])) {
      attachments.push({
        name: imgMatch[1] || "Image",
        url: imgMatch[2],
        kind: "image",
      });
    }
  }

  // 5. Clean cleanText of artifacts, payloads, and image markdown
  cleanText = cleanText
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<think>[\s\S]*/gi, "")
    .replace(/<thought>[\s\S]*?<\/thought>/gi, "")
    .replace(/<thought>[\s\S]*/gi, "")
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
    .replace(/<thinking>[\s\S]*/gi, "")
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
    .replace(/<reasoning>[\s\S]*/gi, "")
    .replace(/^Here's a thinking process:[\s\S]*?(?=\n\n(?:[A-Z0-9#]|```)|$)/gim, "")
    .replace(/(?:attachment|clip|video|audio|file):((?:%7B[\s\S]*?%7D)|(?:\{[\s\S]*?\}))/gi, "")
    .replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, "")
    .trim();

  return { cleanText, reasoningText, attachments };
}
