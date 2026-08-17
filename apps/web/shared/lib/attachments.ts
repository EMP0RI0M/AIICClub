export type AttachmentKind = "image" | "video" | "document" | "file" | "gif" | "audio";

export interface SharedAttachment {
    url: string;
    name: string;
    size: number;
    mimeType: string;
    kind: AttachmentKind;
}

export const ATTACHMENT_CONTENT_PREFIX = "attachment:";
export const FREE_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const FREE_ATTACHMENT_MAX_LABEL = "10MB";

const DOCUMENT_EXTENSIONS = new Set([
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".txt",
    ".zip",
]);

const DOCUMENT_MIME_TYPES = new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "application/zip",
    "application/x-zip-compressed",
]);

export const ATTACHMENT_INPUT_ACCEPT =
    "image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip";

export function isAttachmentFileAllowed(file: File): boolean {
    const mimeType = (file.type || "").toLowerCase();
    const ext = file.name.includes(".")
        ? `.${file.name.split(".").pop()?.toLowerCase()}`
        : "";

    if (mimeType.startsWith("image/") || mimeType.startsWith("video/")) return true;
    if (DOCUMENT_MIME_TYPES.has(mimeType)) return true;
    if (DOCUMENT_EXTENSIONS.has(ext)) return true;

    return false;
}

export function validateAttachmentFile(file: File): string | null {
    if (!isAttachmentFileAllowed(file)) {
        return "Unsupported file type. Allowed: images, videos, and common documents.";
    }

    if (file.size > FREE_ATTACHMENT_MAX_BYTES) {
        return `Free plan upload limit is ${FREE_ATTACHMENT_MAX_LABEL} per file.`;
    }

    return null;
}

export function encodeAttachmentContent(attachment: SharedAttachment): string {
    return `${ATTACHMENT_CONTENT_PREFIX}${encodeURIComponent(JSON.stringify(attachment))}`;
}

export function parseAttachmentContent(content: string): SharedAttachment | null {
    if (!content) return null;
    const trimmed = content.trim();

    let raw = "";
    if (trimmed.startsWith(ATTACHMENT_CONTENT_PREFIX)) {
        raw = trimmed.slice(ATTACHMENT_CONTENT_PREFIX.length);
    } else if (
        trimmed.includes("application%2F") ||
        trimmed.includes("%22url%22") ||
        trimmed.startsWith("%7B%22url%22") ||
        trimmed.startsWith('{"url"')
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

        const mime = (parsed.mimeType || "").toLowerCase();
        let kind: AttachmentKind = "file";
        if (parsed.kind === "image" || parsed.kind === "gif" || mime.startsWith("image/")) {
            kind = parsed.kind === "gif" || mime === "image/gif" ? "gif" : "image";
        } else if (parsed.kind === "video" || mime.startsWith("video/")) {
            kind = "video";
        } else if (parsed.kind === "audio" || mime.startsWith("audio/")) {
            kind = "audio";
        }

        return {
            url: parsed.url,
            name: parsed.name || "Attachment",
            size: typeof parsed.size === "number" ? parsed.size : 0,
            mimeType: parsed.mimeType || "application/octet-stream",
            kind,
        };
    } catch {
        return null;
    }
}

export function formatAttachmentSize(bytes: number): string {
    if (!bytes || bytes <= 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function resolveAttachmentUrl(rawUrl: string, apiBaseUrl?: string): string {
    if (!rawUrl) return rawUrl;

    const normalizedBase = apiBaseUrl?.trim().replace(/\/+$/, "");
    const fallbackBase = normalizedBase ? new URL(normalizedBase) : null;

    try {
        const parsed = fallbackBase
            ? new URL(rawUrl, `${fallbackBase.origin}/`)
            : new URL(rawUrl);

        if (!fallbackBase) {
            return parsed.toString();
        }

        const isLoopbackHost =
            parsed.hostname === "localhost" ||
            parsed.hostname === "127.0.0.1" ||
            parsed.hostname === "[::1]";

        const shouldUseApiHost =
            isLoopbackHost && fallbackBase.hostname !== parsed.hostname;

        const shouldUpgradeProtocol =
            parsed.protocol === "http:" &&
            fallbackBase.protocol === "https:" &&
            parsed.hostname === fallbackBase.hostname;

        if (shouldUseApiHost || shouldUpgradeProtocol) {
            const upgraded = new URL(parsed.pathname + parsed.search + parsed.hash, fallbackBase.origin);
            return upgraded.toString();
        }

        return parsed.toString();
    } catch {
        if (!normalizedBase) return rawUrl;
        try {
            return new URL(rawUrl.replace(/^\/+/, ""), `${normalizedBase}/`).toString();
        } catch {
            return rawUrl;
        }
    }
}
