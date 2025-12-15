-- Migration: Rename comments tables to feedback
-- Description: Rename "comments" and "comment_summaries" tables to "feedback" and "feedback_summaries"
--              to better reflect that the platform collects public feedback rather than just comments.
-- Date: 2025-12-15

-- ============================================================================
-- STEP 1: RENAME TABLES
-- ============================================================================

-- Rename comments table to feedback
ALTER TABLE IF EXISTS public.comments RENAME TO feedback;

-- Rename comment_summaries table to feedback_summaries
ALTER TABLE IF EXISTS public.comment_summaries RENAME TO feedback_summaries;

-- ============================================================================
-- STEP 2: RENAME INDEXES
-- ============================================================================

-- Rename indexes for feedback table
ALTER INDEX IF EXISTS idx_comments_document_id RENAME TO idx_feedback_document_id;
ALTER INDEX IF EXISTS idx_comments_status RENAME TO idx_feedback_status;
ALTER INDEX IF EXISTS idx_comments_created_at RENAME TO idx_feedback_created_at;
ALTER INDEX IF EXISTS idx_comments_category RENAME TO idx_feedback_category;

-- Rename indexes for feedback_summaries table
ALTER INDEX IF EXISTS idx_comment_summaries_document_id RENAME TO idx_feedback_summaries_document_id;
ALTER INDEX IF EXISTS idx_comment_summaries_category RENAME TO idx_feedback_summaries_category;

-- ============================================================================
-- STEP 3: UPDATE TABLE COMMENTS (METADATA)
-- ============================================================================

COMMENT ON TABLE public.feedback IS 'Public feedback on budget documents';
COMMENT ON COLUMN public.feedback.category IS 'AI-detected category (e.g., Education, Healthcare)';
COMMENT ON COLUMN public.feedback.sentiment IS 'Optional sentiment analysis result';
COMMENT ON COLUMN public.feedback.status IS 'Moderation status: pending, approved, or rejected';

COMMENT ON TABLE public.feedback_summaries IS 'AI-generated summaries of feedback grouped by category';
COMMENT ON COLUMN public.feedback_summaries.category IS 'Category name (e.g., Education, Healthcare)';
COMMENT ON COLUMN public.feedback_summaries.summary IS 'AI-generated summary of all feedback in this category';

-- ============================================================================
-- STEP 4: RENAME COLUMN IN FEEDBACK_SUMMARIES
-- ============================================================================

-- Rename comment_count to feedback_count for consistency
ALTER TABLE public.feedback_summaries
  RENAME COLUMN comment_count TO feedback_count;

-- ============================================================================
-- STEP 5: UPDATE RLS POLICIES
-- ============================================================================

-- Drop old policies (they reference old table names)
DROP POLICY IF EXISTS "Anyone can view approved comments on published documents" ON public.feedback;
DROP POLICY IF EXISTS "Officials can view all comments" ON public.feedback;
DROP POLICY IF EXISTS "Anyone can insert comments on published documents" ON public.feedback;
DROP POLICY IF EXISTS "Officials can update comments" ON public.feedback;
DROP POLICY IF EXISTS "Officials can delete comments" ON public.feedback;
DROP POLICY IF EXISTS "Anyone can view summaries for published documents" ON public.feedback_summaries;
DROP POLICY IF EXISTS "Officials can view all summaries" ON public.feedback_summaries;

-- Create new policies with updated names
-- Public can view APPROVED feedback on PUBLISHED documents
CREATE POLICY "Anyone can view approved feedback on published documents"
  ON public.feedback
  FOR SELECT
  USING (
    status = 'approved' AND
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = feedback.document_id
        AND documents.status = 'published'
    )
  );

-- Officials can view ALL feedback (using helper function to avoid RLS recursion)
CREATE POLICY "Officials can view all feedback"
  ON public.feedback
  FOR SELECT
  USING (is_official(auth.uid()));

-- Anyone can insert feedback on PUBLISHED documents
CREATE POLICY "Anyone can insert feedback on published documents"
  ON public.feedback
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = feedback.document_id
        AND documents.status = 'published'
    )
  );

-- Officials can update feedback (for moderation)
CREATE POLICY "Officials can update feedback"
  ON public.feedback
  FOR UPDATE
  USING (is_official(auth.uid()));

-- Officials can delete feedback
CREATE POLICY "Officials can delete feedback"
  ON public.feedback
  FOR DELETE
  USING (is_official(auth.uid()));

-- Public can view feedback summaries for PUBLISHED documents
CREATE POLICY "Anyone can view feedback summaries for published documents"
  ON public.feedback_summaries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = feedback_summaries.document_id
        AND documents.status = 'published'
    )
  );

-- Officials can view ALL feedback summaries
CREATE POLICY "Officials can view all feedback summaries"
  ON public.feedback_summaries
  FOR SELECT
  USING (is_official(auth.uid()));

-- ============================================================================
-- NOTES
-- ============================================================================
-- This migration renames:
-- - comments → feedback
-- - comment_summaries → feedback_summaries
-- - comment_count → feedback_count
--
-- All data is preserved. Indexes, constraints, and RLS policies are updated.
-- Applications must update their queries to use the new table names.
--
-- To rollback:
-- ALTER TABLE public.feedback RENAME TO comments;
-- ALTER TABLE public.feedback_summaries RENAME TO comment_summaries;
-- ALTER TABLE public.feedback_summaries RENAME COLUMN feedback_count TO comment_count;
-- (Also recreate old policies and rename indexes)
-- ============================================================================
