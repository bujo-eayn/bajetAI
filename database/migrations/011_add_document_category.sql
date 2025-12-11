-- Migration: Add category field to documents table
-- This allows documents to be categorized by participation area

-- Add category column to documents table
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS category TEXT;

-- Add check constraint to ensure only valid categories
ALTER TABLE documents
ADD CONSTRAINT documents_category_check
CHECK (category IN ('budgeting', 'planning', 'healthcare', 'education', 'transport'));

-- Add index for faster filtering by category
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);

-- Update existing documents to have 'budgeting' as default category
UPDATE documents
SET category = 'budgeting'
WHERE category IS NULL;

-- Add comment to the column
COMMENT ON COLUMN documents.category IS 'Participation area category: budgeting, planning, healthcare, education, or transport';
