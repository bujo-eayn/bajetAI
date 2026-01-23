-- Migration: Add document type and preprocessing metadata
-- This enables intelligent document preprocessing based on document type (CBROP, CFSP, ADP)

-- Add document_type column for budget document classification
-- This is different from 'category' which is for participation areas
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS document_type TEXT;

-- Add check constraint to ensure only valid document types
-- CBROP = County Budget Review and Outlook Paper
-- CFSP = County Fiscal Strategy Paper (also known as CSFP)
-- ADP = Annual Development Plan
ALTER TABLE documents
ADD CONSTRAINT documents_document_type_check
CHECK (document_type IS NULL OR document_type IN ('CBROP', 'CFSP', 'ADP'));

-- Add index for faster filtering by document type
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type);

-- Add preprocessing metadata columns
-- These track the results of the intelligent document preprocessing

-- Whether TOC was successfully parsed from the document
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS preprocessing_toc_success BOOLEAN;

-- Percentage of text filtered out during preprocessing
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS preprocessing_reduction_percent REAL;

-- List of section names that were kept after preprocessing
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS preprocessing_sections_kept TEXT[];

-- List of section names that were removed during preprocessing
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS preprocessing_sections_removed TEXT[];

-- List of TOC entries that couldn't be matched to headers in text
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS preprocessing_unmatched_entries TEXT[];

-- Timestamp when preprocessing was completed
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS preprocessing_completed_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN documents.document_type IS 'Budget document type: CBROP (Budget Review), CFSP (Fiscal Strategy), or ADP (Development Plan)';
COMMENT ON COLUMN documents.preprocessing_toc_success IS 'Whether Table of Contents was successfully parsed from the document';
COMMENT ON COLUMN documents.preprocessing_reduction_percent IS 'Percentage of original text that was filtered out during preprocessing';
COMMENT ON COLUMN documents.preprocessing_sections_kept IS 'List of section names that were kept after preprocessing';
COMMENT ON COLUMN documents.preprocessing_sections_removed IS 'List of section names that were removed during preprocessing';
COMMENT ON COLUMN documents.preprocessing_unmatched_entries IS 'TOC entries that could not be matched to headers in the document text';
COMMENT ON COLUMN documents.preprocessing_completed_at IS 'Timestamp when document preprocessing was completed';
