-- Migration: Translation Tracking
-- Created: 2025-12-01
-- Description: Add translation tracking fields for Swahili translations
-- Phase: 6 - Translation

-- ============================================================================
-- Add Translation Status Tracking
-- ============================================================================

-- Add translation_status field
ALTER TABLE documents
ADD COLUMN translation_status TEXT DEFAULT 'pending'
CHECK (translation_status IN ('pending', 'translating', 'completed', 'failed', 'skipped'));

COMMENT ON COLUMN documents.translation_status IS 'Translation status: pending, translating, completed, failed, or skipped';

-- Add translation timestamps
ALTER TABLE documents
ADD COLUMN translation_started_at TIMESTAMPTZ;

ALTER TABLE documents
ADD COLUMN translation_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN documents.translation_started_at IS 'When translation started';
COMMENT ON COLUMN documents.translation_completed_at IS 'When translation completed';

-- ============================================================================
-- Add Translation Metadata
-- ============================================================================

-- Add translation duration tracking
ALTER TABLE documents
ADD COLUMN translation_duration_ms INTEGER;

COMMENT ON COLUMN documents.translation_duration_ms IS 'Translation processing time in milliseconds';

-- Add translation error tracking
ALTER TABLE documents
ADD COLUMN translation_error TEXT;

ALTER TABLE documents
ADD COLUMN translation_error_type TEXT
CHECK (translation_error_type IN (
  'timeout',
  'api_error',
  'rate_limited',
  'invalid_text',
  'empty_content',
  'connection_error',
  'unknown',
  NULL
));

COMMENT ON COLUMN documents.translation_error IS 'Translation error message if failed';
COMMENT ON COLUMN documents.translation_error_type IS 'Classified translation error type for debugging';

-- ============================================================================
-- Add Translation Quality Metrics
-- ============================================================================

-- Add translation confidence score
ALTER TABLE documents
ADD COLUMN translation_confidence NUMERIC(3, 2)
CHECK (translation_confidence >= 0.0 AND translation_confidence <= 1.0);

COMMENT ON COLUMN documents.translation_confidence IS 'Translation quality confidence score (0.0 to 1.0)';

-- Add translation character counts
ALTER TABLE documents
ADD COLUMN translation_source_chars INTEGER;

ALTER TABLE documents
ADD COLUMN translation_output_chars INTEGER;

COMMENT ON COLUMN documents.translation_source_chars IS 'Source text character count (English summary)';
COMMENT ON COLUMN documents.translation_output_chars IS 'Translated text character count (Swahili summary)';

-- Add translation word counts
ALTER TABLE documents
ADD COLUMN translation_source_words INTEGER;

ALTER TABLE documents
ADD COLUMN translation_output_words INTEGER;

COMMENT ON COLUMN documents.translation_source_words IS 'Source text word count';
COMMENT ON COLUMN documents.translation_output_words IS 'Translated text word count';

-- Add translation model version
ALTER TABLE documents
ADD COLUMN translation_model_version TEXT;

COMMENT ON COLUMN documents.translation_model_version IS 'OpenAI model used for translation (e.g., gpt-3.5-turbo)';

-- Add translation provider (future-proofing for multiple providers)
ALTER TABLE documents
ADD COLUMN translation_provider TEXT DEFAULT 'openai'
CHECK (translation_provider IN ('openai', 'google', 'azure', 'manual', NULL));

COMMENT ON COLUMN documents.translation_provider IS 'Translation provider: openai, google, azure, or manual';

-- ============================================================================
-- Add Translation Token Usage (Cost Tracking)
-- ============================================================================

-- Add translation_tokens_used JSONB field for detailed token tracking
ALTER TABLE documents
ADD COLUMN translation_tokens_used JSONB;

COMMENT ON COLUMN documents.translation_tokens_used IS 'Token usage from translation: {input: number, output: number, total: number, cost: number}';

-- ============================================================================
-- Create Indexes for Performance
-- ============================================================================

-- Index for translation status queries
CREATE INDEX IF NOT EXISTS idx_documents_translation_status
ON documents(translation_status)
WHERE translation_status IS NOT NULL;

-- Index for translation error type analysis
CREATE INDEX IF NOT EXISTS idx_documents_translation_error_type
ON documents(translation_error_type)
WHERE translation_error_type IS NOT NULL;

-- Index for translation completed documents
CREATE INDEX IF NOT EXISTS idx_documents_translation_completed
ON documents(translation_completed_at DESC)
WHERE translation_status = 'completed';

-- Index for translation provider tracking
CREATE INDEX IF NOT EXISTS idx_documents_translation_provider
ON documents(translation_provider)
WHERE translation_provider IS NOT NULL;

-- GIN index for JSONB token usage queries
CREATE INDEX IF NOT EXISTS idx_documents_translation_tokens
ON documents USING GIN(translation_tokens_used)
WHERE translation_tokens_used IS NOT NULL;

-- ============================================================================
-- Migrate Existing Data
-- ============================================================================

-- Mark documents with existing Swahili summaries as completed
UPDATE documents
SET
  translation_status = 'completed',
  translation_provider = 'openai',
  translation_model_version = 'gpt-3.5-turbo',
  translation_confidence = 0.85
WHERE
  summary_sw IS NOT NULL
  AND summary_sw <> ''
  AND translation_status = 'pending';

-- Mark documents with English summaries but no Swahili as pending
UPDATE documents
SET translation_status = 'pending'
WHERE
  summary_en IS NOT NULL
  AND summary_en <> ''
  AND (summary_sw IS NULL OR summary_sw = '')
  AND summarization_status = 'completed'
  AND translation_status = 'pending';

-- Mark documents without summaries as skipped
UPDATE documents
SET translation_status = 'skipped'
WHERE
  summarization_status IN ('pending', 'failed', 'skipped')
  AND translation_status = 'pending';

-- ============================================================================
-- Verification
-- ============================================================================

-- Verify migration succeeded
DO $$
DECLARE
  pending_count INTEGER;
  completed_count INTEGER;
  failed_count INTEGER;
  skipped_count INTEGER;
BEGIN
  -- Count translation statuses
  SELECT COUNT(*) INTO pending_count
  FROM documents
  WHERE translation_status = 'pending';

  SELECT COUNT(*) INTO completed_count
  FROM documents
  WHERE translation_status = 'completed';

  SELECT COUNT(*) INTO failed_count
  FROM documents
  WHERE translation_status = 'failed';

  SELECT COUNT(*) INTO skipped_count
  FROM documents
  WHERE translation_status = 'skipped';

  -- Log results
  RAISE NOTICE '✅ Migration 009 completed successfully';
  RAISE NOTICE '   Translation Status Distribution:';
  RAISE NOTICE '   - Pending:   %', pending_count;
  RAISE NOTICE '   - Completed: %', completed_count;
  RAISE NOTICE '   - Failed:    %', failed_count;
  RAISE NOTICE '   - Skipped:   %', skipped_count;
  RAISE NOTICE '   ';
  RAISE NOTICE '   New columns added:';
  RAISE NOTICE '   - translation_status, translation_started_at, translation_completed_at';
  RAISE NOTICE '   - translation_duration_ms, translation_error, translation_error_type';
  RAISE NOTICE '   - translation_confidence, translation_source_chars, translation_output_chars';
  RAISE NOTICE '   - translation_source_words, translation_output_words';
  RAISE NOTICE '   - translation_model_version, translation_provider, translation_tokens_used';
  RAISE NOTICE '   ';
  RAISE NOTICE '   New indexes created:';
  RAISE NOTICE '   - idx_documents_translation_status';
  RAISE NOTICE '   - idx_documents_translation_error_type';
  RAISE NOTICE '   - idx_documents_translation_completed';
  RAISE NOTICE '   - idx_documents_translation_provider';
  RAISE NOTICE '   - idx_documents_translation_tokens';
END $$;
