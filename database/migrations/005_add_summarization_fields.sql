-- =====================================================
-- Migration: 005_add_summarization_fields.sql
-- Description: Add fields to track AI summarization process
-- Author: Claude Code
-- Date: 2025-11-19
-- Phase: Phase 5 - AI Summarization
-- =====================================================

-- Add summarization tracking fields to documents table
ALTER TABLE documents
  -- Summarization processing status
  ADD COLUMN IF NOT EXISTS summarization_status TEXT DEFAULT 'pending'
    CHECK (summarization_status IN ('pending', 'summarizing', 'completed', 'failed')),

  -- Timestamps for summarization process
  ADD COLUMN IF NOT EXISTS summary_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS summary_completed_at TIMESTAMPTZ,

  -- Processing metrics
  ADD COLUMN IF NOT EXISTS summary_duration_ms INTEGER,
  ADD COLUMN IF NOT EXISTS summary_char_count INTEGER,

  -- Quality and versioning
  ADD COLUMN IF NOT EXISTS summary_confidence NUMERIC(3, 2)
    CHECK (summary_confidence >= 0.0 AND summary_confidence <= 1.0),
  ADD COLUMN IF NOT EXISTS summary_model_version TEXT,

  -- Error tracking
  ADD COLUMN IF NOT EXISTS summary_error TEXT,
  ADD COLUMN IF NOT EXISTS summary_error_type TEXT
    CHECK (summary_error_type IN (
      'rate_limited',
      'timeout',
      'empty_content',
      'api_error',
      'invalid_response',
      'parsing_error',
      'model_error',
      'connection_error',
      'invalid_text',
      'unknown'
    ));

-- Add comments to document fields
COMMENT ON COLUMN documents.summarization_status IS 'Current status of AI summarization process';
COMMENT ON COLUMN documents.summary_started_at IS 'Timestamp when summarization started';
COMMENT ON COLUMN documents.summary_completed_at IS 'Timestamp when summarization completed';
COMMENT ON COLUMN documents.summary_duration_ms IS 'Time taken to generate summary in milliseconds';
COMMENT ON COLUMN documents.summary_char_count IS 'Character count of generated summary';
COMMENT ON COLUMN documents.summary_confidence IS 'Confidence score of summary quality (0.0-1.0). 1.0 = AI, 0.3 = fallback';
COMMENT ON COLUMN documents.summary_model_version IS 'Model version used (e.g., facebook/bart-large-cnn or fallback-v1)';
COMMENT ON COLUMN documents.summary_error IS 'Human-readable error message if summarization failed';
COMMENT ON COLUMN documents.summary_error_type IS 'Classified error type for retry logic and debugging';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_documents_summarization_status
  ON documents(summarization_status)
  WHERE summarization_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_summary_error_type
  ON documents(summary_error_type)
  WHERE summary_error_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_summarization_completed_at
  ON documents(summary_completed_at DESC)
  WHERE summary_completed_at IS NOT NULL;

-- =====================================================
-- Verification Queries (for testing after migration)
-- =====================================================

-- Check that new columns exist
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'documents'
--   AND column_name LIKE 'summar%'
-- ORDER BY ordinal_position;

-- Check that indexes were created
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'documents'
--   AND indexname LIKE '%summar%';

-- =====================================================
-- Migration Complete
-- =====================================================

-- Note to user: After running this migration, execute:
-- npm run db:types
-- This will regenerate TypeScript types to include new fields
