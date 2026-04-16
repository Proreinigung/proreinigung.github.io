-- ============================================================
-- Fix team_chat realtime notifications
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Enable REPLICA IDENTITY FULL so realtime sends full row data
ALTER TABLE team_chat REPLICA IDENTITY FULL;

-- 2. Add SELECT policy for team/admin so realtime payload.new is populated
DROP POLICY IF EXISTS "team can select chat" ON team_chat;
CREATE POLICY "team can select chat"
  ON team_chat FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('team','admin')
    )
  );

-- 3. Make sure realtime is enabled for team_chat table
-- (Run in Supabase Dashboard → Database → Replication → team_chat checkbox)

-- 4. Grant SELECT to authenticated
GRANT SELECT ON team_chat TO authenticated;
