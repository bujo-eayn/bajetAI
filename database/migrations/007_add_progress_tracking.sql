-- =====================================================
-- Migration: 007_add_progress_tracking.sql
-- Description: Add fields to track real-time progress for extraction and summarization
-- Author: Claude Code
-- Date: 2025-11-25
-- Phase: Phase 5b - Sprint 1 - Background Job Progress Indicators
-- =====================================================

-- Add progress tracking fields to documents table
ALTER TABLE documents
  -- Current progress status (human-readable text shown in UI)
  ADD COLUMN IF NOT EXISTS progress_status TEXT,

  -- Progress percentage (0-100)
  ADD COLUMN IF NOT EXISTS progress_percent INTEGER DEFAULT 0
    CHECK (progress_percent >= 0 AND progress_percent <= 100);

-- Add comments to document fields
COMMENT ON COLUMN documents.progress_status IS 'Current processing step shown to users (e.g., "Extracting page 5/20", "Summarizing chunk 3/15")';
COMMENT ON COLUMN documents.progress_percent IS 'Progress percentage for progress bars (0-100)';

-- Create index for documents with active progress
CREATE INDEX IF NOT EXISTS idx_documents_progress_status
  ON documents(progress_status)
  WHERE progress_status IS NOT NULL;

-- =====================================================
-- Verification Queries (for testing after migration)
-- =====================================================

-- Check that new columns exist
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'documents'
--   AND column_name IN ('progress_status', 'progress_percent')
-- ORDER BY ordinal_position;

-- =====================================================
-- Migration Complete
-- =====================================================

-- Note to user: After running this migration, execute:
-- npm run db:types
-- This will regenerate TypeScript types to include new fields
