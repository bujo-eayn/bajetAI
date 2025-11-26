-- =====================================================
-- Migration: 006_add_scanned_pdf_detection.sql
-- Description: Add fields to detect and handle scanned PDFs
-- Author: Claude Code
-- Date: 2025-11-25
-- Phase: Phase 5b - Sprint 1 - Scanned PDF Safeguards
-- =====================================================

-- Add scanned PDF detection fields to documents table
ALTER TABLE documents
  -- Warning message for extraction issues (e.g., scanned PDFs)
  ADD COLUMN IF NOT EXISTS extraction_warning TEXT,

  -- Update extraction_status to include 'completed_scanned' status
  DROP CONSTRAINT IF EXISTS documents_extraction_status_check;

-- Recreate extraction_status constraint with new value
ALTER TABLE documents
  ADD CONSTRAINT documents_extraction_status_check
  CHECK (extraction_status IN (
    'pending',
    'extracting',
    'completed',
    'completed_scanned',
    'failed'
  ));

-- Update summarization_status constraint to include 'skipped' status
ALTER TABLE documents
  DROP CONSTRAINT IF EXISTS documents_summarization_status_check;

ALTER TABLE documents
  ADD CONSTRAINT documents_summarization_status_check
  CHECK (summarization_status IN (
    'pending',
    'summarizing',
    'completed',
    'failed',
    'skipped'
  ));

-- Add comments to document fields
COMMENT ON COLUMN documents.extraction_warning IS 'Warning message for extraction issues (e.g., "Scanned PDF - No text extracted. Consider OCR processing.")';

-- Create index for documents with warnings
CREATE INDEX IF NOT EXISTS idx_documents_extraction_warning
  ON documents(extraction_warning)
  WHERE extraction_warning IS NOT NULL;

-- =====================================================
-- Verification Queries (for testing after migration)
-- =====================================================

-- Check that new columns exist
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'documents'
--   AND column_name IN ('extraction_warning')
-- ORDER BY ordinal_position;

-- Check constraint values
-- SELECT con.conname, pg_get_constraintdef(con.oid)
-- FROM pg_constraint con
-- JOIN pg_class rel ON rel.oid = con.conrelid
-- WHERE rel.relname = 'documents'
--   AND con.conname LIKE '%status%';

-- =====================================================
-- Migration Complete
-- =====================================================

-- Note to user: After running this migration, execute:
-- npm run db:types
-- This will regenerate TypeScript types to include new fields and enum values