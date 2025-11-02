-- bajetAI RLS Policy Fix
-- Migration: 003_fix_rls_recursion
-- Description: Fix infinite recursion in RLS policies by using a helper function
-- Date: 2025-11-02
-- Issue: RLS policies were checking profiles table from within profiles policies, causing infinite recursion

-- ============================================================================
-- IMPORTANT: Run this AFTER running 001_initial_schema.sql and 002_rls_policies.sql
-- This migration DROPS and RECREATES all RLS policies with the fix
-- ============================================================================

-- ============================================================================
-- 1. CREATE HELPER FUNCTION (SECURITY DEFINER bypasses RLS)
-- ============================================================================

-- This function runs with owner privileges, bypassing RLS
-- It safely checks if a user has the 'official' role
CREATE OR REPLACE FUNCTION public.is_official(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'official'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_official(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_official(UUID) TO anon;

COMMENT ON FUNCTION public.is_official IS 'Check if a user has the official role (bypasses RLS)';

-- ============================================================================
-- 2. DROP ALL EXISTING POLICIES
-- ============================================================================

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Officials can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;

-- Documents policies
DROP POLICY IF EXISTS "Anyone can view published documents" ON public.documents;
DROP POLICY IF EXISTS "Officials can view all documents" ON public.documents;
DROP POLICY IF EXISTS "Officials can insert documents" ON public.documents;
DROP POLICY IF EXISTS "Officials can update own documents" ON public.documents;
DROP POLICY IF EXISTS "Officials can delete own documents" ON public.documents;

-- Comments policies
DROP POLICY IF EXISTS "Anyone can view approved comments on published documents" ON public.comments;
DROP POLICY IF EXISTS "Officials can view all comments" ON public.comments;
DROP POLICY IF EXISTS "Anyone can insert comments on published documents" ON public.comments;
DROP POLICY IF EXISTS "Officials can update comments" ON public.comments;
DROP POLICY IF EXISTS "Officials can delete comments" ON public.comments;

-- Comment summaries policies
DROP POLICY IF EXISTS "Anyone can view summaries for published documents" ON public.comment_summaries;
DROP POLICY IF EXISTS "Officials can view all summaries" ON public.comment_summaries;

-- ============================================================================
-- 3. RECREATE PROFILES POLICIES (FIXED)
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

-- Officials can view all profiles (FIXED: uses helper function)
CREATE POLICY "Officials can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (public.is_official(auth.uid()));

-- Allow profile creation via trigger
CREATE POLICY "Enable insert for authenticated users only"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- 4. RECREATE DOCUMENTS POLICIES (FIXED)
-- ============================================================================

-- Anyone can view PUBLISHED documents
CREATE POLICY "Anyone can view published documents"
  ON public.documents
  FOR SELECT
  USING (status = 'published');

-- Officials can view ALL documents (FIXED: uses helper function)
CREATE POLICY "Officials can view all documents"
  ON public.documents
  FOR SELECT
  USING (public.is_official(auth.uid()));

-- Officials can insert new documents (FIXED: uses helper function)
CREATE POLICY "Officials can insert documents"
  ON public.documents
  FOR INSERT
  WITH CHECK (public.is_official(auth.uid()));

-- Officials can update their own documents (FIXED: uses helper function)
CREATE POLICY "Officials can update own documents"
  ON public.documents
  FOR UPDATE
  USING (
    uploaded_by = auth.uid()
    AND public.is_official(auth.uid())
  )
  WITH CHECK (
    uploaded_by = auth.uid()
    AND public.is_official(auth.uid())
  );

-- Officials can delete their own documents (FIXED: uses helper function)
CREATE POLICY "Officials can delete own documents"
  ON public.documents
  FOR DELETE
  USING (
    uploaded_by = auth.uid()
    AND public.is_official(auth.uid())
  );

-- ============================================================================
-- 5. RECREATE COMMENTS POLICIES (FIXED)
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

-- Officials can view ALL comments (FIXED: uses helper function)
CREATE POLICY "Officials can view all comments"
  ON public.comments
  FOR SELECT
  USING (public.is_official(auth.uid()));

-- Anyone can insert comments on PUBLISHED documents
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

-- Officials can update comments (FIXED: uses helper function)
CREATE POLICY "Officials can update comments"
  ON public.comments
  FOR UPDATE
  USING (public.is_official(auth.uid()))
  WITH CHECK (public.is_official(auth.uid()));

-- Officials can delete comments (FIXED: uses helper function)
CREATE POLICY "Officials can delete comments"
  ON public.comments
  FOR DELETE
  USING (public.is_official(auth.uid()));

-- ============================================================================
-- 6. RECREATE COMMENT_SUMMARIES POLICIES (FIXED)
-- ============================================================================

-- Anyone can view summaries for PUBLISHED documents
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

-- Officials can view ALL summaries (FIXED: uses helper function)
CREATE POLICY "Officials can view all summaries"
  ON public.comment_summaries
  FOR SELECT
  USING (public.is_official(auth.uid()));

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary of changes:
-- ✅ Created is_official() helper function with SECURITY DEFINER
-- ✅ Dropped all existing RLS policies
-- ✅ Recreated all policies using the helper function
-- ✅ No more infinite recursion - policies now work correctly

-- Next steps:
-- 1. Test /api/health endpoint - should return "ok" now
-- 2. Verify RLS policies work for different user roles
-- 3. Continue with Phase 2: Authentication

-- Test the fix:
-- SELECT public.is_official(auth.uid());  -- Returns true/false based on your role
