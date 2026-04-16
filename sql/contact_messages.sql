-- Contact Messages System
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS contact_messages (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name           TEXT NOT NULL,
  email          TEXT NOT NULL,
  telefon        TEXT DEFAULT '',
  betreff        TEXT NOT NULL,
  nachricht      TEXT NOT NULL,
  status         TEXT DEFAULT 'Neu',           -- Neu | Bearbeitung | Beantwortet | Abgelehnt
  handled_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- wer bearbeitet
  beantwortet_von UUID REFERENCES profiles(id) ON DELETE SET NULL, -- wer geantwortet hat
  beantwortet_at  TIMESTAMPTZ,
  internal_note  TEXT DEFAULT '',              -- interne Notizen (nur Team sichtbar)
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages REPLICA IDENTITY FULL;

-- Anyone (incl. anon) can INSERT
DROP POLICY IF EXISTS "Anyone can send contact message" ON contact_messages;
CREATE POLICY "Anyone can send contact message" ON contact_messages
  FOR INSERT WITH CHECK (true);

-- Only team/admin can SELECT
DROP POLICY IF EXISTS "Team can view contact messages" ON contact_messages;
CREATE POLICY "Team can view contact messages" ON contact_messages
  FOR SELECT USING (get_my_role() IN ('team','admin'));

-- Only team/admin can UPDATE
DROP POLICY IF EXISTS "Team can update contact messages" ON contact_messages;
CREATE POLICY "Team can update contact messages" ON contact_messages
  FOR UPDATE USING (get_my_role() IN ('team','admin'));

-- Only admin can DELETE
DROP POLICY IF EXISTS "Admin can delete contact messages" ON contact_messages;
CREATE POLICY "Admin can delete contact messages" ON contact_messages
  FOR DELETE USING (get_my_role() = 'admin');

-- Grant anon INSERT permission
GRANT USAGE ON SCHEMA public TO anon;
GRANT INSERT ON contact_messages TO anon;
GRANT EXECUTE ON FUNCTION uuid_generate_v4() TO anon;
