-- bajetAI Database Schema
-- Migration: 001_initial_schema
-- Description: Initial database schema with profiles, documents, comments, and comment_summaries tables
-- Date: 2025-11-02

-- ============================================================================
-- 1. PROFILES TABLE
-- ============================================================================
-- Extends auth.users with additional profile information

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'public' CHECK (role IN ('official', 'public')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for faster role-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Comments
COMMENT ON TABLE public.profiles IS 'User profiles with role-based access control';
COMMENT ON COLUMN public.profiles.role IS 'User role: official (can upload docs) or public (can comment)';

-- ============================================================================
-- 2. DOCUMENTS TABLE
-- ============================================================================
-- Stores budget document metadata and AI-generated summaries

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'published', 'archived')) NOT NULL,
  extracted_text TEXT,
  summary_en TEXT,
  summary_sw TEXT,
  processed BOOLEAN DEFAULT FALSE NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON public.documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_processed ON public.documents(processed);

-- Comments
COMMENT ON TABLE public.documents IS 'Budget documents with AI-generated summaries and translations';
COMMENT ON COLUMN public.documents.status IS 'Document status: processing, published, or archived';
COMMENT ON COLUMN public.documents.extracted_text IS 'Raw text extracted from PDF';
COMMENT ON COLUMN public.documents.summary_en IS 'AI-generated English summary';
COMMENT ON COLUMN public.documents.summary_sw IS 'AI-generated Swahili translation';

-- ============================================================================
-- 3. COMMENTS TABLE
-- ============================================================================
-- Stores citizen comments on budget documents

CREATE TABLE IF NOT EXISTS public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  user_name TEXT NOT NULL,
  user_email TEXT,
  content TEXT NOT NULL,
  category TEXT,
  sentiment TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_document_id ON public.comments(document_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON public.comments(status);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_category ON public.comments(category);

-- Comments
COMMENT ON TABLE public.comments IS 'Citizen comments on budget documents';
COMMENT ON COLUMN public.comments.category IS 'AI-detected category (e.g., Education, Healthcare)';
COMMENT ON COLUMN public.comments.sentiment IS 'Optional sentiment analysis result';
COMMENT ON COLUMN public.comments.status IS 'Moderation status: pending, approved, or rejected';

-- ============================================================================
-- 4. COMMENT_SUMMARIES TABLE
-- ============================================================================
-- Stores AI-generated summaries of comments grouped by category

CREATE TABLE IF NOT EXISTS public.comment_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  summary TEXT NOT NULL,
  comment_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_comment_summaries_document_id ON public.comment_summaries(document_id);
CREATE INDEX IF NOT EXISTS idx_comment_summaries_category ON public.comment_summaries(category);

-- Comments
COMMENT ON TABLE public.comment_summaries IS 'AI-generated summaries of comments grouped by category';
COMMENT ON COLUMN public.comment_summaries.category IS 'Category name (e.g., Education, Healthcare)';
COMMENT ON COLUMN public.comment_summaries.summary IS 'AI-generated summary of all comments in this category';

-- ============================================================================
-- 5. TRIGGERS
-- ============================================================================
-- Automatically update updated_at timestamp

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for profiles table
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for documents table
DROP TRIGGER IF EXISTS update_documents_updated_at ON public.documents;
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. FUNCTION: Create profile on signup
-- ============================================================================
-- Automatically create a profile when a user signs up

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'public')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Next steps:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Apply RLS policies (see 002_rls_policies.sql)
-- 3. Configure Storage bucket for document uploads
