-- Migration: 010_add_notifications_table
-- Description: Create notifications table for coming soon area subscriptions
-- Date: 2025-12-03

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
-- Stores email subscriptions for coming soon participation areas

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  area TEXT NOT NULL CHECK (area IN ('planning', 'healthcare', 'education', 'transport')),
  subscribed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  notified BOOLEAN DEFAULT FALSE NOT NULL,
  notified_at TIMESTAMPTZ,
  UNIQUE(email, area)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_area ON public.notifications(area);
CREATE INDEX IF NOT EXISTS idx_notifications_notified ON public.notifications(notified);
CREATE INDEX IF NOT EXISTS idx_notifications_email ON public.notifications(email);

-- Comments
COMMENT ON TABLE public.notifications IS 'Email subscriptions for coming soon participation areas';
COMMENT ON COLUMN public.notifications.area IS 'Participation area: planning, healthcare, education, or transport';
COMMENT ON COLUMN public.notifications.notified IS 'Whether the subscriber has been notified of the area launch';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Public can subscribe (insert their own)
CREATE POLICY "Public can subscribe to notifications"
  ON public.notifications FOR INSERT
  TO public
  WITH CHECK (true);

-- Public can view all subscriptions (email is considered public info for this use case)
CREATE POLICY "Users can view subscriptions"
  ON public.notifications FOR SELECT
  TO public
  USING (true);

-- Officials can manage all notifications (update, delete)
CREATE POLICY "Officials can manage notifications"
  ON public.notifications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'official'
    )
  );
