-- Migration: Multi-Provider Support
-- Created: 2025-11-26
-- Description: Add provider tracking, token usage, and length metrics for OpenAI migration
-- Phase: OpenAI Migration - Phase 6

-- ============================================================================
-- Add Provider Tracking
-- ============================================================================

-- Add summary_provider field to track which AI provider generated the summary
ALTER TABLE documents
ADD COLUMN summary_provider TEXT;

-- Add CHECK constraint for valid provider names
ALTER TABLE documents
ADD CONSTRAINT summary_provider_check
CHECK (summary_provider IN ('openai', 'huggingface', 'extractive', 'unknown', NULL));

-- Comment describing provider values
COMMENT ON COLUMN documents.summary_provider IS 'AI provider that generated the summary: openai, huggingface, extractive, or unknown';

-- ============================================================================
-- Add Token Usage Tracking
-- ============================================================================

-- Add summary_tokens_used JSONB field for detailed token tracking
ALTER TABLE documents
ADD COLUMN summary_tokens_used JSONB;

-- Comment describing JSON structure
COMMENT ON COLUMN documents.summary_tokens_used IS 'Token usage statistics from AI provider: {input: number, output: number, total: number, model: string}';

-- ============================================================================
-- Add Length Tracking
-- ============================================================================

-- Add summary_target_length for calculated target (10% rule)
ALTER TABLE documents
ADD COLUMN summary_target_length INTEGER;

COMMENT ON COLUMN documents.summary_target_length IS 'Calculated target summary length in words (10% of document)';

-- Add summary_actual_length for actual word count
ALTER TABLE documents
ADD COLUMN summary_actual_length INTEGER;

COMMENT ON COLUMN documents.summary_actual_length IS 'Actual summary length in words';

-- Add summary_coverage_percent for coverage metric
ALTER TABLE documents
ADD COLUMN summary_coverage_percent NUMERIC(5, 2);

COMMENT ON COLUMN documents.summary_coverage_percent IS 'Coverage percentage (actual/target * 100)';

-- ============================================================================
-- Migrate Existing Data
-- ============================================================================

-- Infer provider from existing summary_model_version
UPDATE documents
SET summary_provider = CASE
  WHEN summary_model_version LIKE 'gpt%' THEN 'openai'
  WHEN summary_model_version LIKE 'facebook/bart%' THEN 'huggingface'
  WHEN summary_model_version = 'extractive-v1' THEN 'extractive'
  ELSE 'unknown'
END
WHERE summarization_status = 'completed'
AND summary_provider IS NULL;

-- Calculate actual length for existing summaries (word count approximation)
UPDATE documents
SET summary_actual_length = COALESCE(
  array_length(regexp_split_to_array(trim(summary_en), '\s+'), 1),
  0
)
WHERE summarization_status = 'completed'
AND summary_en IS NOT NULL
AND summary_actual_length IS NULL;

-- ============================================================================
-- Create Indexes
-- ============================================================================

-- Index for provider-specific queries
CREATE INDEX IF NOT EXISTS idx_documents_summary_provider
ON documents(summary_provider)
WHERE summary_provider IS NOT NULL;

-- GIN index for JSONB token usage queries
CREATE INDEX IF NOT EXISTS idx_documents_summary_tokens
ON documents USING GIN(summary_tokens_used)
WHERE summary_tokens_used IS NOT NULL;

-- Index for length-based queries
CREATE INDEX IF NOT EXISTS idx_documents_summary_lengths
ON documents(summary_target_length, summary_actual_length)
WHERE summary_target_length IS NOT NULL;

-- ============================================================================
-- Verification
-- ============================================================================

-- Verify migration succeeded
DO $$
DECLARE
  provider_count INTEGER;
  tokens_count INTEGER;
  length_count INTEGER;
BEGIN
  -- Count documents with provider set
  SELECT COUNT(*) INTO provider_count
  FROM documents
  WHERE summary_provider IS NOT NULL;

  -- Count documents with actual length calculated
  SELECT COUNT(*) INTO length_count
  FROM documents
  WHERE summary_actual_length IS NOT NULL;

  -- Log results
  RAISE NOTICE '✅ Migration 008 completed successfully';
  RAISE NOTICE '   - Documents with provider: %', provider_count;
  RAISE NOTICE '   - Documents with length calculated: %', length_count;
  RAISE NOTICE '   - New columns: summary_provider, summary_tokens_used, summary_target_length, summary_actual_length, summary_coverage_percent';
  RAISE NOTICE '   - New indexes: idx_documents_summary_provider, idx_documents_summary_tokens, idx_documents_summary_lengths';
END $$;
