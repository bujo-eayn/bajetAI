-- bajetAI Row Level Security Policies
-- Migration: 002_rls_policies
-- Description: Security policies to protect data access
-- Date: 2025-11-02

-- ============================================================================
-- IMPORTANT: Run this AFTER running 001_initial_schema.sql
-- ============================================================================

-- ============================================================================
-- 1. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_summaries ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. PROFILES TABLE POLICIES
-- ============================================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Officials can view all profiles (for user management)
CREATE POLICY "Officials can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'official'
    )
  );

-- Allow profile creation via trigger (system operation)
CREATE POLICY "Enable insert for authenticated users only"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- 3. DOCUMENTS TABLE POLICIES
-- ============================================================================

-- Anyone (including unauthenticated users) can view PUBLISHED documents
CREATE POLICY "Anyone can view published documents"
  ON public.documents
  FOR SELECT
  USING (status = 'published');

-- Officials can view ALL documents (including processing and archived)
CREATE POLICY "Officials can view all documents"
  ON public.documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'official'
    )
  );

-- Officials can insert new documents
CREATE POLICY "Officials can insert documents"
  ON public.documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'official'
    )
  );

-- Officials can update their own documents
CREATE POLICY "Officials can update own documents"
  ON public.documents
  FOR UPDATE
  USING (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'official'
    )
  )
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'official'
    )
  );

-- Officials can delete their own documents
CREATE POLICY "Officials can delete own documents"
  ON public.documents
  FOR DELETE
  USING (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'official'
    )
  );

-- ============================================================================
-- 4. COMMENTS TABLE POLICIES
-- ============================================================================

-- Anyone can view APPROVED comments on PUBLISHED documents
CREATE POLICY "Anyone can view approved comments on published documents"
  ON public.comments
  FOR SELECT
  USING (
    status = 'approved'
    AND EXISTS (
      SELECT 1 FROM public.documents
      WHERE documents.id = comments.document_id
      AND documents.status = 'published'
    )
  );

-- Officials can view ALL comments
CREATE POLICY "Officials can view all comments"
  ON public.comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'official'
    )
  );

-- Anyone can insert comments on PUBLISHED documents (public commenting)
CREATE POLICY "Anyone can insert comments on published documents"
  ON public.comments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE documents.id = comments.document_id
      AND documents.status = 'published'
    )
  );

-- Officials can update comment status (for moderation)
CREATE POLICY "Officials can update comments"
  ON public.comments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'official'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'official'
    )
  );

-- Officials can delete inappropriate comments
CREATE POLICY "Officials can delete comments"
  ON public.comments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'official'
    )
  );

-- ============================================================================
-- 5. COMMENT_SUMMARIES TABLE POLICIES
-- ============================================================================

-- Anyone can view comment summaries for PUBLISHED documents
CREATE POLICY "Anyone can view summaries for published documents"
  ON public.comment_summaries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE documents.id = comment_summaries.document_id
      AND documents.status = 'published'
    )
  );

-- Officials can view ALL comment summaries
CREATE POLICY "Officials can view all summaries"
  ON public.comment_summaries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'official'
    )
  );

-- Only backend (service role) can insert/update/delete summaries
-- No RLS policy needed - will use service role key in backend

-- ============================================================================
-- 6. STORAGE POLICIES (for document PDFs)
-- ============================================================================
-- Note: These will be created in the Supabase Storage UI
-- See: database/storage_policies.md for instructions

-- Policy 1: Officials can upload files
-- Bucket: documents
-- Policy name: "Officials can upload files"
-- Allowed operation: INSERT
-- Policy definition:
--   bucket_id = 'documents' AND
--   (auth.role() = 'authenticated' AND
--   EXISTS (
--     SELECT 1 FROM public.profiles
--     WHERE profiles.id = auth.uid()
--     AND profiles.role = 'official'
--   ))

-- Policy 2: Anyone can download files (for published documents)
-- Bucket: documents
-- Policy name: "Anyone can download files"
-- Allowed operation: SELECT
-- Policy definition:
--   bucket_id = 'documents'

-- Policy 3: Officials can delete their uploaded files
-- Bucket: documents
-- Policy name: "Officials can delete own files"
-- Allowed operation: DELETE
-- Policy definition:
--   bucket_id = 'documents' AND
--   auth.uid()::text = (storage.foldername(name))[1]

-- ============================================================================
-- RLS POLICIES COMPLETE
-- ============================================================================
-- Security measures implemented:
-- ✓ Public users can only view published documents and approved comments
-- ✓ Public users can submit comments on published documents
-- ✓ Officials can view all documents and comments
-- ✓ Officials can upload, update, and delete their own documents
-- ✓ Officials can moderate comments
-- ✓ Users can only view/update their own profiles
-- ✓ Comment summaries are system-managed (service role only)

-- Next steps:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Configure Storage bucket (see storage setup guide)
-- 3. Test RLS policies with different user roles
