-- Migration: 014_add_document_embeddings.sql
-- Purpose: Add vector embeddings support for RAG-powered document chat
-- Date: 2026-01-23

-- =============================================================================
-- ENABLE PGVECTOR EXTENSION
-- =============================================================================

-- Enable the pgvector extension for vector similarity search
-- This must be enabled by a superuser or through Supabase dashboard
CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================================================
-- DOCUMENT EMBEDDINGS TABLE
-- =============================================================================

-- Store document chunks with their vector embeddings
CREATE TABLE IF NOT EXISTS document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

  -- Chunk identification
  chunk_index INTEGER NOT NULL,

  -- Content
  chunk_text TEXT NOT NULL,

  -- Vector embedding (1536 dimensions for text-embedding-3-small)
  embedding vector(1536) NOT NULL,

  -- Section metadata (from documentPreprocessor)
  section_name TEXT,
  section_priority TEXT CHECK (section_priority IN ('critical', 'high', 'medium', 'low')),

  -- Location metadata
  page_number INTEGER,
  start_char INTEGER NOT NULL DEFAULT 0,
  end_char INTEGER NOT NULL DEFAULT 0,

  -- Token count for cost tracking
  token_count INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure no duplicate chunks per document
  UNIQUE(document_id, chunk_index)
);

-- Comment on table
COMMENT ON TABLE document_embeddings IS 'Stores vector embeddings for document chunks to enable RAG-based chat';

-- =============================================================================
-- INDEXES FOR DOCUMENT EMBEDDINGS
-- =============================================================================

-- HNSW index for fast approximate nearest neighbor search
-- m = 16: Maximum number of connections per layer (default 16)
-- ef_construction = 64: Size of dynamic candidate list for construction (higher = better quality, slower build)
CREATE INDEX IF NOT EXISTS idx_embeddings_hnsw
ON document_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Index for filtering by document (critical for single-document scoped queries)
CREATE INDEX IF NOT EXISTS idx_embeddings_document_id
ON document_embeddings(document_id);

-- Index for section priority (enables priority-weighted retrieval)
CREATE INDEX IF NOT EXISTS idx_embeddings_section_priority
ON document_embeddings(document_id, section_priority);

-- =============================================================================
-- CHAT ANALYTICS TABLE
-- =============================================================================

-- Track chat usage for analytics (no conversation content stored)
CREATE TABLE IF NOT EXISTS chat_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

  -- Session tracking (client-generated UUID)
  session_id TEXT NOT NULL,

  -- Usage metrics
  query_count INTEGER DEFAULT 0,

  -- Language detection
  detected_language TEXT CHECK (detected_language IN ('en', 'sw')),

  -- Timestamps
  first_query_at TIMESTAMPTZ DEFAULT NOW(),
  last_query_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comment on table
COMMENT ON TABLE chat_analytics IS 'Tracks chat session metrics for analytics without storing conversation content';

-- =============================================================================
-- INDEXES FOR CHAT ANALYTICS
-- =============================================================================

-- Index for querying analytics by document
CREATE INDEX IF NOT EXISTS idx_chat_analytics_document_id
ON chat_analytics(document_id);

-- Index for time-based analytics queries
CREATE INDEX IF NOT EXISTS idx_chat_analytics_created_at
ON chat_analytics(created_at);

-- Unique constraint on session_id per document (upsert support)
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_analytics_session
ON chat_analytics(document_id, session_id);

-- =============================================================================
-- ADD COLUMNS TO DOCUMENTS TABLE
-- =============================================================================

-- Add embedding status tracking
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS embedding_status TEXT DEFAULT 'pending'
CHECK (embedding_status IN ('pending', 'processing', 'completed', 'failed', 'skipped'));

-- Add embedding metadata
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS embedding_chunk_count INTEGER;

ALTER TABLE documents
ADD COLUMN IF NOT EXISTS embedding_started_at TIMESTAMPTZ;

ALTER TABLE documents
ADD COLUMN IF NOT EXISTS embedding_completed_at TIMESTAMPTZ;

ALTER TABLE documents
ADD COLUMN IF NOT EXISTS embedding_duration_ms INTEGER;

ALTER TABLE documents
ADD COLUMN IF NOT EXISTS embedding_error TEXT;

ALTER TABLE documents
ADD COLUMN IF NOT EXISTS embedding_error_type TEXT;

-- Add chat enabled flag (set to true when embeddings are complete)
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS chat_enabled BOOLEAN DEFAULT FALSE;

-- Add aggregate chat query count for quick stats
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS chat_query_count INTEGER DEFAULT 0;

-- Index for finding chat-enabled documents
CREATE INDEX IF NOT EXISTS idx_documents_chat_enabled
ON documents(chat_enabled)
WHERE chat_enabled = TRUE;

-- Index for embedding status (for monitoring and retry logic)
CREATE INDEX IF NOT EXISTS idx_documents_embedding_status
ON documents(embedding_status);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on document_embeddings
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;

-- Public users can read embeddings only for published documents
CREATE POLICY "Public can read embeddings for published documents"
ON document_embeddings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = document_embeddings.document_id
    AND documents.status = 'published'
  )
);

-- Service role can manage all embeddings (for Inngest background jobs)
CREATE POLICY "Service role can manage embeddings"
ON document_embeddings FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Enable RLS on chat_analytics
ALTER TABLE chat_analytics ENABLE ROW LEVEL SECURITY;

-- Service role can manage analytics (for API writes)
CREATE POLICY "Service role can manage chat analytics"
ON chat_analytics FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Officials can view analytics for their documents
CREATE POLICY "Officials can view chat analytics"
ON chat_analytics FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM documents d
    JOIN profiles p ON d.uploaded_by = p.id
    WHERE d.id = chat_analytics.document_id
    AND p.id = auth.uid()
    AND p.role = 'official'
  )
);

-- =============================================================================
-- HELPER FUNCTION: Vector Similarity Search
-- =============================================================================

-- Function to search for similar embeddings within a specific document
CREATE OR REPLACE FUNCTION match_document_embeddings(
  query_embedding vector(1536),
  target_document_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  chunk_index INTEGER,
  chunk_text TEXT,
  section_name TEXT,
  section_priority TEXT,
  page_number INTEGER,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    de.id,
    de.chunk_index,
    de.chunk_text,
    de.section_name,
    de.section_priority,
    de.page_number,
    1 - (de.embedding <=> query_embedding) AS similarity
  FROM document_embeddings de
  WHERE de.document_id = target_document_id
    AND 1 - (de.embedding <=> query_embedding) > match_threshold
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Comment on function
COMMENT ON FUNCTION match_document_embeddings IS 'Performs vector similarity search within a specific document for RAG retrieval';

-- =============================================================================
-- HELPER FUNCTION: Increment Chat Query Count
-- =============================================================================

-- Function to atomically increment chat query count on documents table
CREATE OR REPLACE FUNCTION increment_chat_query_count(doc_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE documents
  SET chat_query_count = COALESCE(chat_query_count, 0) + 1
  WHERE id = doc_id;
END;
$$;

-- Comment on function
COMMENT ON FUNCTION increment_chat_query_count IS 'Atomically increments the chat query count for a document';
