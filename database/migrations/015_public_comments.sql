-- bajetAI Public Commenting System
-- Migration: 015_public_comments
-- Description: Adds public user profiles, threaded comments, and reactions for document engagement
-- Date: 2026-02-18
-- Depends on: 001_initial_schema.sql, 003_fix_rls_recursion.sql, 014_add_document_embeddings.sql

-- ============================================================================
-- SECTION A: FIX handle_new_user TRIGGER (MUST RUN FIRST)
-- ============================================================================
-- The existing trigger fires for ALL auth.users inserts, including magic link
-- signups for public citizens. This fix makes it role-conditional so that
-- citizens signing up via OTP do NOT get rows in the admin `profiles` table.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create admin profiles for users with 'official' role in metadata
  -- Public citizens (magic link) will have their public_profile created
  -- via the auth callback API route after sign-in.
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'citizen') = 'official' THEN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'full_name',
      'official'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SECTION B: CREATE NEW TABLES
-- ============================================================================

-- Public user profiles (separate from admin profiles table)
CREATE TABLE IF NOT EXISTS public.public_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'citizen' CHECK (role IN ('citizen')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_public_profiles_username ON public.public_profiles(username);
CREATE INDEX IF NOT EXISTS idx_public_profiles_email ON public.public_profiles(email);

COMMENT ON TABLE public.public_profiles IS 'Anonymous public user profiles for citizens engaging with documents';
COMMENT ON COLUMN public.public_profiles.username IS 'Randomly assigned anonymous username (e.g. CuriousElephant342)';

-- Threaded comments on documents
CREATE TABLE IF NOT EXISTS public.document_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES public.public_profiles(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES public.document_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 500),
  is_admin_response BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_document_comments_document_id ON public.document_comments(document_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_parent_id ON public.document_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_author_id ON public.document_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_created_at ON public.document_comments(created_at ASC);

COMMENT ON TABLE public.document_comments IS 'Citizen comments on published budget documents, supports threading';
COMMENT ON COLUMN public.document_comments.parent_id IS 'NULL for top-level comments; set to parent comment id for replies (max 2 levels)';
COMMENT ON COLUMN public.document_comments.is_admin_response IS 'TRUE when posted by an official admin from the dashboard';

-- Reactions (thumbs up/down) on multiple target types
CREATE TABLE IF NOT EXISTS public.reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.public_profiles(id) ON DELETE CASCADE NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('document_summary', 'comment', 'chat_response')),
  target_id TEXT NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('thumbs_up', 'thumbs_down')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_reactions_target ON public.reactions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON public.reactions(user_id);

COMMENT ON TABLE public.reactions IS 'Thumbs up/down reactions on summaries, comments, and chat responses';
COMMENT ON COLUMN public.reactions.target_type IS 'What is being reacted to: document_summary, comment, or chat_response';
COMMENT ON COLUMN public.reactions.target_id IS 'The id of the target (document_id, comment_id, or ephemeral chat message id)';

-- ============================================================================
-- SECTION C: TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS update_document_comments_updated_at ON public.document_comments;
CREATE TRIGGER update_document_comments_updated_at
  BEFORE UPDATE ON public.document_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION D: HELPER FUNCTION (mirrors is_official() from migration 003)
-- ============================================================================
-- SECURITY DEFINER bypasses RLS to avoid infinite recursion when checking
-- public_profiles from within document_comments / reactions policies.

CREATE OR REPLACE FUNCTION public.is_citizen(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.public_profiles
    WHERE id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.is_citizen(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_citizen(UUID) TO anon;

COMMENT ON FUNCTION public.is_citizen IS 'Check if a user has a public citizen profile (bypasses RLS to avoid recursion)';

-- ============================================================================
-- SECTION E: ROW LEVEL SECURITY POLICIES
-- ============================================================================

ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- ---- public_profiles policies ----

CREATE POLICY "Public profiles are readable by everyone"
  ON public.public_profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own public profile"
  ON public.public_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own public profile"
  ON public.public_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ---- document_comments policies ----

-- Anyone can read comments on published documents
CREATE POLICY "Comments on published documents are readable by everyone"
  ON public.document_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE documents.id = document_comments.document_id
        AND documents.status = 'published'
    )
  );

-- Authenticated citizens can post new comments
CREATE POLICY "Citizens can post comments on published documents"
  ON public.document_comments FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND author_id = auth.uid()
    AND is_admin_response = FALSE
    AND public.is_citizen(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.documents
      WHERE documents.id = document_id
        AND documents.status = 'published'
    )
  );

-- Officials can post admin responses
CREATE POLICY "Officials can post admin responses to comments"
  ON public.document_comments FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND is_admin_response = TRUE
    AND public.is_official(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.documents
      WHERE documents.id = document_id
        AND documents.status = 'published'
    )
  );

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
  ON public.document_comments FOR DELETE
  USING (author_id = auth.uid());

-- Officials can delete any comment (moderation)
CREATE POLICY "Officials can delete any comment"
  ON public.document_comments FOR DELETE
  USING (public.is_official(auth.uid()));

-- ---- reactions policies ----

CREATE POLICY "Reactions are readable by everyone"
  ON public.reactions FOR SELECT
  USING (true);

CREATE POLICY "Citizens can insert reactions"
  ON public.reactions FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND public.is_citizen(auth.uid())
  );

CREATE POLICY "Citizens can delete their own reactions"
  ON public.reactions FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Summary:
-- ✅ Fixed handle_new_user trigger to be role-conditional (citizens excluded)
-- ✅ Created public_profiles table with unique anonymous usernames
-- ✅ Created document_comments table with threading support (parent_id)
-- ✅ Created reactions table with toggle semantics (UNIQUE constraint)
-- ✅ Created is_citizen() SECURITY DEFINER helper (mirrors is_official())
-- ✅ Enabled RLS on all three new tables with appropriate policies
--
-- Next steps after running this migration:
-- 1. Verify trigger fix: sign up a test user via OTP magic link and confirm
--    the `profiles` table does NOT get a new row for them.
-- 2. Verify is_citizen() works: SELECT public.is_citizen('<uuid>') after
--    inserting a test row in public_profiles.
-- 3. Run: npm run db:types to regenerate types/database.types.ts
