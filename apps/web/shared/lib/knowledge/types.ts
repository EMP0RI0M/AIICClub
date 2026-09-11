/**
 * AIIC Knowledge Engine (RAG) Core Types
 */

export type QueryIntent =
  | "institutional_overview"
  | "institutional_objectives"
  | "prospectus_strict"
  | "masterclass_information"
  | "lecture_information"
  | "cross_source_comparison"
  | "financial_budget_lookup"
  | "traceability_audit"
  | "technical_concept"
  | "source_catalog_inquiry"
  | "general_knowledge";

export type KnowledgeSourceType =
  | "archive_document"
  | "youtube_lecture"
  | "repository"
  | "space_document"
  | "build_release"
  | "curated_guideline";

export type KnowledgeIndexingStatus =
  | "pending"
  | "processing"
  | "indexed"
  | "failed"
  | "outdated";

export interface KnowledgeDocument {
  id: string;
  sourceId: string; // e.g. Archive ID or YouTube ID
  sourceType: KnowledgeSourceType;
  title: string;
  description?: string;
  url?: string;
  spaceId?: string | null;
  visibility: "public" | "space" | "admin" | "private";
  allowedRoles?: string[];
  status: KnowledgeIndexingStatus;
  contentHash: string;
  chunkCount: number;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  indexedAt?: string | null;
  errorMessage?: string | null;
}

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  tokenCount?: number;
  embedding?: number[];
  metadata: {
    sourceId: string;
    sourceType: KnowledgeSourceType;
    title: string;
    pageNumber?: number;
    timestampSeconds?: number;
    timestampFormatted?: string;
    sectionHeading?: string;
    spaceId?: string | null;
    visibility: "public" | "space" | "admin" | "private";
    allowedRoles?: string[];
    [key: string]: any;
  };
}

export interface RAGSupportingChunk {
  id: string;
  chunkIndex?: number;
  snippet: string;
  page?: number;
  timestamp?: number;
  timestampFormatted?: string;
  similarity: number;
}

export interface RAGSourceCitation {
  id: string; // Canonical source key (e.g. AIIC-2026-000002)
  documentId: string;
  sourceId: string;
  sourceType: KnowledgeSourceType;
  title: string;
  canonicalTitle: string;
  url?: string;
  session?: string;
  year?: number;
  category?: string;
  page?: number;
  timestamp?: number;
  timestampFormatted?: string;
  similarity: number;
  snippet: string;
  supportingChunksCount: number;
  supportingChunks?: RAGSupportingChunk[];
}

export interface RAGQueryContext {
  query: string;
  spaceId?: string | null;
  serverId?: string | null;
  channelId?: string | null;
  teamId?: string | null;
  projectId?: string | null;
  userId?: string;
  userRole?: string;
  allowedSpaces?: string[];
  limit?: number;
  threshold?: number;
}

export interface RAGDiagnostics {
  query: string;
  intent: string;
  retrievedCount: number;
  uniqueSourceCount: number;
  deduplicatedCount: number;
  selectedChunksCount: number;
  modelUsed: string;
}

export interface RAGAnswerResult {
  answer: string;
  thinking?: string;
  citations: RAGSourceCitation[]; // Unique institutional sources
  rawChunksRetrieved?: number;
  uniqueSourcesCount?: number;
  modelUsed: string;
  contextCount: number;
  diagnostics?: RAGDiagnostics;
}

