-- ============================================================
-- PROREINIGUNG — Schema Update v2
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add address field to profiles (for client management)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS adresse TEXT DEFAULT '';

-- Add file support + private messages to team_chat
ALTER TABLE team_chat
  ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS file_url     TEXT,
  ADD COLUMN IF NOT EXISTS file_type    TEXT,
  ADD COLUMN IF NOT EXISTS file_name    TEXT,
  ADD COLUMN IF NOT EXISTS is_private   BOOLEAN DEFAULT FALSE;

-- Add price field to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS preis_agreed TEXT DEFAULT '';

-- Add umsatz tracking to invoices
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Profile views (so anyone can view team profiles)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Anyone authenticated can view profiles"
  ON profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Team chat: allow reading own private messages
DROP POLICY IF EXISTS "Team/Admin can read chat" ON team_chat;
CREATE POLICY "Team can read chat"
  ON team_chat FOR SELECT
  USING (
    get_my_role() IN ('team','admin') AND (
      is_private = FALSE OR
      sender_id = auth.uid() OR
      recipient_id = auth.uid()
    )
  );

-- Allow team to send private messages
DROP POLICY IF EXISTS "Team/Admin can send chat" ON team_chat;
CREATE POLICY "Team can send chat"
  ON team_chat FOR INSERT
  WITH CHECK (get_my_role() IN ('team','admin'));

-- Storage bucket for chat files
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-files', 'chat-files', true)
ON CONFLICT DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Team can upload chat files" ON storage.objects;
CREATE POLICY "Team can upload chat files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'chat-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Public can view chat files"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('chat-files', 'avatars'));

CREATE POLICY "Users can upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update avatars"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

-- Realtime for team_chat (skip if already added)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE team_chat;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
