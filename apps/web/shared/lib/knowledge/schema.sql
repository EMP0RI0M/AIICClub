-- =========================================================================
-- AIIC INSTITUTIONAL KNOWLEDGE ENGINE (RAG) SCHEMA - COMPLETE & SYNCHRONIZED
-- Uses HALFVEC(2048) + HNSW halfvec_cosine_ops for 2048-dim Nemotron embeddings
-- Strictly permission-scoped with server-side requesting_user_id & context filters
-- =========================================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Knowledge Documents Table (Manifest & Source Cross-Reference)
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Source Reference & Classification
    source_type TEXT NOT NULL, -- archive_document, youtube_lecture, repository, repository_file, channel_message, channel_document, project, announcement, event, official_record
    source_id TEXT NOT NULL,   -- e.g. "AIIC-2026-000001", YouTube ID, or Repo Identifier
    
    -- Relationships to existing AIIC entities (All TEXT keys matching live schema)
    server_id TEXT REFERENCES public.servers(id) ON DELETE CASCADE,
    archive_id TEXT,
    channel_id TEXT REFERENCES public.channels(id) ON DELETE SET NULL,
    project_id TEXT REFERENCES public.projects(id) ON DELETE SET NULL,
    team_id TEXT,
    
    -- Document Details
    title TEXT NOT NULL,
    description TEXT,
    url TEXT,
    
    -- Extended Visibility Hierarchy
    visibility TEXT NOT NULL DEFAULT 'public' 
        CHECK (visibility IN ('public', 'member', 'server', 'team', 'channel', 'project', 'private', 'admin')),
    allowed_roles TEXT[] DEFAULT '{}',
    allowed_users TEXT[] DEFAULT '{}',
    allowed_team_ids TEXT[] DEFAULT '{}',
    
    -- Processing Lifecycle
    status TEXT NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'processing', 'indexed', 'failed', 'outdated')),
    content_hash TEXT NOT NULL,
    chunk_count INT NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    indexed_at TIMESTAMPTZ,
    
    CONSTRAINT uq_knowledge_doc_source UNIQUE (source_type, source_id)
);

-- 3. Knowledge Processing Queue (Asynchronous Reliability)
CREATE TABLE IF NOT EXISTS public.knowledge_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL, -- 'embed', 'reindex', 'extract'
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- 4. Knowledge Chunks Table (HALFVEC Store for 2048 dimensions)
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    chunk_index INT NOT NULL,
    token_count INT,
    embedding HALFVEC(2048),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. High-Performance Indexes
CREATE INDEX IF NOT EXISTS idx_kdocs_source ON public.knowledge_documents (source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_kdocs_server_vis ON public.knowledge_documents (server_id, visibility);
CREATE INDEX IF NOT EXISTS idx_kdocs_channel_id ON public.knowledge_documents (channel_id);
CREATE INDEX IF NOT EXISTS idx_kdocs_project_id ON public.knowledge_documents (project_id);
CREATE INDEX IF NOT EXISTS idx_kdocs_team_id ON public.knowledge_documents (team_id);
CREATE INDEX IF NOT EXISTS idx_kdocs_archive_id ON public.knowledge_documents (archive_id);
CREATE INDEX IF NOT EXISTS idx_kdocs_status ON public.knowledge_documents (status);

CREATE INDEX IF NOT EXISTS idx_kjobs_status ON public.knowledge_jobs (status, created_at);
CREATE INDEX IF NOT EXISTS idx_kchunks_doc_id ON public.knowledge_chunks (document_id);
CREATE INDEX IF NOT EXISTS idx_kchunks_metadata ON public.knowledge_chunks USING GIN (metadata);

-- HNSW Index on HALFVEC(2048) using halfvec_cosine_ops
CREATE INDEX IF NOT EXISTS idx_kchunks_embedding_hnsw 
ON public.knowledge_chunks 
USING hnsw (embedding halfvec_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 6. Hybrid Full-Text Search Column & GIN Index
ALTER TABLE public.knowledge_chunks ADD COLUMN IF NOT EXISTS fts_content TSVECTOR 
GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

CREATE INDEX IF NOT EXISTS idx_kchunks_fts ON public.knowledge_chunks USING GIN (fts_content);

-- 7. Document Access Verification Function
CREATE OR REPLACE FUNCTION public.can_access_knowledge_document(
    doc_id UUID,
    req_user_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    doc RECORD;
    is_admin BOOLEAN := FALSE;
BEGIN
    SELECT * INTO doc FROM public.knowledge_documents WHERE id = doc_id;
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Public visibility is open to all
    IF doc.visibility = 'public' THEN
        RETURN TRUE;
    END IF;

    -- Unauthenticated users cannot view non-public knowledge
    IF req_user_id IS NULL OR req_user_id = '' THEN
        RETURN FALSE;
    END IF;

    -- Creator always has access
    IF doc.created_by = req_user_id THEN
        RETURN TRUE;
    END IF;

    -- Check if user is an elevated admin
    SELECT EXISTS (
        SELECT 1 FROM public.organization_role_assignments ora
        JOIN public.organization_roles r ON r.id = ora.role_id
        WHERE ora.user_id = req_user_id
          AND ora.is_active = TRUE
          AND LOWER(r.key) IN ('president_admin', 'admin', 'president', 'vice_president', 'teacher', 'staff', 'owner')
    ) INTO is_admin;

    IF is_admin THEN
        RETURN TRUE;
    END IF;

    -- Admin-only document
    IF doc.visibility = 'admin' THEN
        RETURN is_admin;
    END IF;

    -- Explicitly allowed users
    IF req_user_id = ANY(doc.allowed_users) THEN
        RETURN TRUE;
    END IF;

    -- Member visibility: any registered user
    IF doc.visibility = 'member' THEN
        RETURN TRUE;
    END IF;

    -- Server visibility: check server membership
    IF doc.visibility = 'server' AND doc.server_id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM public.server_members WHERE server_id = doc.server_id AND user_id = req_user_id) THEN
            RETURN TRUE;
        END IF;
    END IF;

    -- Channel visibility
    IF doc.visibility = 'channel' AND doc.channel_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM public.channels c
            JOIN public.server_members sm ON sm.server_id = c.server_id
            WHERE c.id = doc.channel_id AND sm.user_id = req_user_id
        ) THEN
            RETURN TRUE;
        END IF;
    END IF;

    -- Team visibility: check team_members table
    IF doc.visibility = 'team' THEN
        IF doc.team_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.team_members WHERE team_id = doc.team_id AND user_id = req_user_id
        ) THEN
            RETURN TRUE;
        END IF;
        IF doc.allowed_team_ids IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.team_members WHERE team_id = ANY(doc.allowed_team_ids) AND user_id = req_user_id
        ) THEN
            RETURN TRUE;
        END IF;
    END IF;

    -- Project visibility: check project_members table
    IF doc.visibility = 'project' AND doc.project_id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM public.project_members WHERE project_id = doc.project_id AND user_id = req_user_id) THEN
            RETURN TRUE;
        END IF;
    END IF;

    RETURN FALSE;
END;
$$;

-- 8. Synchronized match_knowledge_chunks RPC (Vector + Permission Scoped)
CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
    query_embedding HALFVEC(2048),
    requesting_user_id TEXT DEFAULT NULL,
    match_threshold FLOAT DEFAULT 0.22,
    match_count INT DEFAULT 8,
    filter_server_id TEXT DEFAULT NULL,
    filter_channel_id TEXT DEFAULT NULL,
    filter_team_id TEXT DEFAULT NULL,
    filter_project_id TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    document_id UUID,
    content TEXT,
    chunk_index INT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    RETURN QUERY
    SELECT
        kc.id,
        kc.document_id,
        kc.content,
        kc.chunk_index,
        kc.metadata,
        (1 - (kc.embedding <=> query_embedding))::FLOAT AS similarity
    FROM public.knowledge_chunks kc
    JOIN public.knowledge_documents kd ON kd.id = kc.document_id
    WHERE kd.status = 'indexed'
      AND (filter_server_id IS NULL OR kd.server_id = filter_server_id)
      AND (filter_channel_id IS NULL OR kd.channel_id = filter_channel_id)
      AND (filter_team_id IS NULL OR kd.team_id = filter_team_id OR kd.allowed_team_ids && ARRAY[filter_team_id])
      AND (filter_project_id IS NULL OR kd.project_id = filter_project_id)
      AND public.can_access_knowledge_document(kd.id, requesting_user_id)
      AND (1 - (kc.embedding <=> query_embedding)) > match_threshold
    ORDER BY kc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 9. Full-Text Search RPC for Hybrid Retrieval
CREATE OR REPLACE FUNCTION public.search_knowledge_keyword(
    search_query TEXT,
    requesting_user_id TEXT DEFAULT NULL,
    match_count INT DEFAULT 8,
    filter_server_id TEXT DEFAULT NULL,
    filter_channel_id TEXT DEFAULT NULL,
    filter_team_id TEXT DEFAULT NULL,
    filter_project_id TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    document_id UUID,
    content TEXT,
    chunk_index INT,
    metadata JSONB,
    rank FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    RETURN QUERY
    SELECT
        kc.id,
        kc.document_id,
        kc.content,
        kc.chunk_index,
        kc.metadata,
        ts_rank_cd(kc.fts_content, plainto_tsquery('english', search_query))::FLOAT AS rank
    FROM public.knowledge_chunks kc
    JOIN public.knowledge_documents kd ON kd.id = kc.document_id
    WHERE kd.status = 'indexed'
      AND kc.fts_content @@ plainto_tsquery('english', search_query)
      AND (filter_server_id IS NULL OR kd.server_id = filter_server_id)
      AND (filter_channel_id IS NULL OR kd.channel_id = filter_channel_id)
      AND (filter_team_id IS NULL OR kd.team_id = filter_team_id OR kd.allowed_team_ids && ARRAY[filter_team_id])
      AND (filter_project_id IS NULL OR kd.project_id = filter_project_id)
      AND public.can_access_knowledge_document(kd.id, requesting_user_id)
    ORDER BY rank DESC
    LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_access_knowledge_document TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.match_knowledge_chunks TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_knowledge_keyword TO authenticated, service_role;
