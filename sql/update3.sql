-- ============================================================
-- PROREINIGUNG — Schema Update v3
-- Run this in Supabase SQL Editor
-- ============================================================

-- Guest requests table (Anfragen without account)
CREATE TABLE IF NOT EXISTS guest_requests (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  telefon     TEXT DEFAULT '',
  firma       TEXT DEFAULT '',
  service     TEXT NOT NULL,
  adresse     TEXT DEFAULT '',
  datum       DATE,
  flaeche     TEXT DEFAULT '',
  frequenz    TEXT DEFAULT '',
  budget      TEXT DEFAULT '',
  kommentar   TEXT DEFAULT '',
  status      TEXT DEFAULT 'Neu',
  handled_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE guest_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create guest request"
  ON guest_requests FOR INSERT WITH CHECK (true);

CREATE POLICY "Team can view guest requests"
  ON guest_requests FOR SELECT
  USING (get_my_role() IN ('team','admin'));

CREATE POLICY "Team can update guest requests"
  ON guest_requests FOR UPDATE
  USING (get_my_role() IN ('team','admin'));

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE guest_requests;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add adresse to profiles if not exists (already in update2 but safe)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS adresse TEXT DEFAULT '';

-- REPLICA IDENTITY FULL for realtime to send all columns
ALTER TABLE team_chat     REPLICA IDENTITY FULL;
ALTER TABLE orders        REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER TABLE guest_requests REPLICA IDENTITY FULL;
