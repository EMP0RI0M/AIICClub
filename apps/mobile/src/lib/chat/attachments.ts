import type { MessageAttachment } from './types';

function decodeURIComponentSafe(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function tryParseJson(value: string): any | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function attachmentObject(value: any): MessageAttachment | null {
  if (!value || typeof value !== 'object') return null;

  const uri =
    value.uri ??
    value.url ??
    value.publicUrl ??
    value.path;

  if (typeof uri !== 'string' || !uri.trim()) {
    return null;
  }

  const mime = String(
    value.mimeType ??
    value.mime_type ??
    value.type ??
    ''
  ).toLowerCase();

  if (mime === 'image/gif' || value.type === 'gif') {
    return {
      kind: 'gif',
      uri,
      width: value.width,
      height: value.height,
    };
  }

  if (mime.startsWith('image/')) {
    return {
      kind: 'image',
      uri,
      width: value.width,
      height: value.height,
      name: value.name,
    };
  }

  if (mime.startsWith('video/')) {
    return {
      kind: 'video',
      uri,
      width: value.width,
      height: value.height,
      duration: value.duration,
      name: value.name,
    };
  }

  if (mime.startsWith('audio/')) {
    return {
      kind: 'audio',
      uri,
      duration: value.duration,
      name: value.name,
    };
  }

  return {
    kind: 'file',
    uri,
    name: value.name ?? 'File',
    size: value.size,
    mimeType: value.mimeType ?? value.mime_type,
  };
}

export function normalizeAttachment(raw: any): MessageAttachment | null {
  if (raw?.attachment && typeof raw.attachment === 'object') {
    return attachmentObject(raw.attachment);
  }

  const content =
    typeof raw?.content === 'string'
      ? raw.content.trim()
      : '';

  // IMPORTANT:
  // Only attempt decoding when this actually looks like an attachment.
  if (!content.startsWith('clip:')) {
    return null;
  }

  const encoded = content.slice(5);
  const decoded = decodeURIComponentSafe(encoded);
  const parsed = tryParseJson(decoded);

  return attachmentObject(parsed);
}
