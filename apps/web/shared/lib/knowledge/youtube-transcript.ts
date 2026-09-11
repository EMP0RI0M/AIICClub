import { YoutubeTranscript } from "youtube-transcript";

export interface TranscriptChunk {
  timestamp: string; // e.g. "[04:20]"
  startSeconds: number;
  endSeconds: number;
  text: string;
}

export interface VideoTranscriptResult {
  videoId: string;
  hasSubtitles: boolean;
  fullTranscript: string;
  chunks: TranscriptChunk[];
  totalWords: number;
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `[${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}]`;
}

/**
 * Extracts full YouTube video transcripts with timestamped chunks for pgvector semantic search.
 */
export async function fetchYouTubeTranscript(
  videoId: string,
  fallbackDescription?: string
): Promise<VideoTranscriptResult> {
  if (!videoId) {
    return {
      videoId: "",
      hasSubtitles: false,
      fullTranscript: "",
      chunks: [],
      totalWords: 0,
    };
  }

  // 1. Attempt Subtitle / Closed-Caption Extraction
  try {
    const rawTranscript = await YoutubeTranscript.fetchTranscript(videoId);
    if (rawTranscript && Array.isArray(rawTranscript) && rawTranscript.length > 0) {
      const chunks: TranscriptChunk[] = [];
      let currentChunkText: string[] = [];
      let chunkStartSec = 0;
      let chunkEndSec = 0;
      const fullLines: string[] = [];

      for (let i = 0; i < rawTranscript.length; i++) {
        const item = rawTranscript[i];
        const offsetSec = Math.floor((item.offset || 0) / 1000);
        const durationSec = Math.ceil((item.duration || 0) / 1000);
        const cleanText = (item.text || "")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\[.*?\]/g, "") // remove sound effects like [Music]
          .replace(/\n/g, " ")
          .trim();

        if (!cleanText) continue;

        if (currentChunkText.length === 0) {
          chunkStartSec = offsetSec;
        }

        currentChunkText.push(cleanText);
        chunkEndSec = offsetSec + durationSec;

        // Group into ~35-50 word or ~25-45 second semantic segments
        const wordCount = currentChunkText.join(" ").split(/\s+/).length;
        if (wordCount >= 40 || i === rawTranscript.length - 1) {
          const timestampLabel = formatTimestamp(chunkStartSec);
          const chunkBody = currentChunkText.join(" ").trim();
          if (chunkBody.length > 10) {
            chunks.push({
              timestamp: timestampLabel,
              startSeconds: chunkStartSec,
              endSeconds: chunkEndSec,
              text: `${timestampLabel} ${chunkBody}`,
            });
            fullLines.push(`${timestampLabel} ${chunkBody}`);
          }
          currentChunkText = [];
        }
      }

      const fullTranscript = fullLines.join("\n\n");
      const totalWords = fullTranscript.split(/\s+/).filter(Boolean).length;

      return {
        videoId,
        hasSubtitles: true,
        fullTranscript,
        chunks,
        totalWords,
      };
    }
  } catch (err: any) {
    console.warn(`[YOUTUBE_TRANSCRIPT_FETCH_WARN] for ${videoId}:`, err?.message || err);
  }

  // 2. Fallback: Parse Description Timestamps & Syllabus
  const desc = fallbackDescription?.trim() || "";
  const chunks: TranscriptChunk[] = [];
  const lines = desc.split("\n");
  let currentTimestamp = "[00:00]";
  let currentSeconds = 0;
  let currentGroup: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const timeMatch = trimmed.match(/(?:^|\s)(?:(\d{1,2}):)?(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      if (currentGroup.length > 0) {
        chunks.push({
          timestamp: currentTimestamp,
          startSeconds: currentSeconds,
          endSeconds: currentSeconds + 60,
          text: `${currentTimestamp} ${currentGroup.join(" ")}`,
        });
        currentGroup = [];
      }
      const hrs = timeMatch[1] ? parseInt(timeMatch[1], 10) : 0;
      const mins = parseInt(timeMatch[2], 10);
      const secs = parseInt(timeMatch[3], 10);
      currentSeconds = hrs * 3600 + mins * 60 + secs;
      currentTimestamp = formatTimestamp(currentSeconds);
      currentGroup.push(trimmed);
    } else {
      currentGroup.push(trimmed);
    }
  }

  if (currentGroup.length > 0) {
    chunks.push({
      timestamp: currentTimestamp,
      startSeconds: currentSeconds,
      endSeconds: currentSeconds + 60,
      text: `${currentTimestamp} ${currentGroup.join(" ")}`,
    });
  }

  const fallbackText = chunks.length > 0 ? chunks.map((c) => c.text).join("\n\n") : desc;
  const totalWords = fallbackText.split(/\s+/).filter(Boolean).length;

  return {
    videoId,
    hasSubtitles: false,
    fullTranscript: fallbackText,
    chunks,
    totalWords,
  };
}
