-- Migration: Add PDF Extraction Fields
-- Created: 2025-11-18
-- Purpose: Add fields to track PDF text extraction status, results, and metadata
-- This migration supports Phase 4: PDF Text Extraction feature

-- Add extraction tracking columns to documents table
ALTER TABLE documents
ADD COLUMN extraction_status TEXT DEFAULT 'pending',
ADD COLUMN extraction_error TEXT,
ADD COLUMN extraction_error_type TEXT,
ADD COLUMN extracted_text_url TEXT,
ADD COLUMN extraction_page_count INTEGER,
ADD COLUMN extraction_char_count INTEGER,
ADD COLUMN extraction_started_at TIMESTAMPTZ,
ADD COLUMN extraction_completed_at TIMESTAMPTZ,
ADD COLUMN extraction_duration_ms INTEGER;

-- Add CHECK constraint for extraction_status
ALTER TABLE documents
ADD CONSTRAINT documents_extraction_status_check
CHECK (extraction_status IN ('pending', 'extracting', 'completed', 'failed'));

-- Add CHECK constraint for extraction_error_type
ALTER TABLE documents
ADD CONSTRAINT documents_extraction_error_type_check
CHECK (extraction_error_type IN (
  'corrupt_file',
  'encrypted',
  'empty',
  'timeout',
  'memory_error',
  'download_failed',
  'parsing_error',
  'unknown',
  NULL
));

-- Create index on extraction_status for filtering
CREATE INDEX idx_documents_extraction_status ON documents(extraction_status);

-- Create index on extraction_error_type for analytics (only non-null values)
CREATE INDEX idx_documents_extraction_error_type ON documents(extraction_error_type)
WHERE extraction_error_type IS NOT NULL;

-- Add column comments for documentation
COMMENT ON COLUMN documents.extraction_status IS 'Current status of PDF text extraction: pending (not started), extracting (in progress), completed (success), failed (error)';
COMMENT ON COLUMN documents.extraction_error IS 'Human-readable error message if extraction failed';
COMMENT ON COLUMN documents.extraction_error_type IS 'Error category for classification: corrupt_file, encrypted, empty, timeout, memory_error, download_failed, parsing_error, unknown';
COMMENT ON COLUMN documents.extracted_text_url IS 'Path to extracted text file in Supabase Storage (e.g., extracted-text/123.txt). Text stored in Storage, not DB.';
COMMENT ON COLUMN documents.extraction_page_count IS 'Number of pages processed during extraction';
COMMENT ON COLUMN documents.extraction_char_count IS 'Character count of extracted text (for UI display)';
COMMENT ON COLUMN documents.extraction_started_at IS 'Timestamp when extraction began';
COMMENT ON COLUMN documents.extraction_completed_at IS 'Timestamp when extraction finished (success or failure)';
COMMENT ON COLUMN documents.extraction_duration_ms IS 'Processing time in milliseconds (for performance monitoring)';

-- Update existing documents to have pending extraction status
UPDATE documents
SET extraction_status = 'pending'
WHERE extraction_status IS NULL;

-- Migration complete
-- Next steps (USER ACTIONS):
-- 1. Run this migration in Supabase SQL Editor
-- 2. Verify new columns exist in documents table
-- 3. Run: npm run db:types to regenerate TypeScript types
