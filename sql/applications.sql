-- Job Applications System
-- Run this in Supabase SQL Editor

-- Storage bucket for CVs and photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('applications', 'applications', true)
ON CONFLICT DO NOTHING;

-- Allow anyone to upload to applications bucket
DROP POLICY IF EXISTS "Anyone can upload application files" ON storage.objects;
CREATE POLICY "Anyone can upload application files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'applications');

DROP POLICY IF EXISTS "Public can view application files" ON storage.objects;
CREATE POLICY "Public can view application files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'applications');

DROP POLICY IF EXISTS "Admin can delete application files" ON storage.objects;
CREATE POLICY "Admin can delete application files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'applications' AND auth.uid() IS NOT NULL);

-- Applications table
CREATE TABLE IF NOT EXISTS applications (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vorname        TEXT NOT NULL,
  nachname       TEXT NOT NULL,
  email          TEXT NOT NULL,
  telefon        TEXT DEFAULT '',
  geburtsdatum   DATE,
  wohnort        TEXT DEFAULT '',
  stelle         TEXT NOT NULL,
  verfuegbar     DATE,
  erfahrung      TEXT DEFAULT '',
  motivation     TEXT DEFAULT '',
  kommentar      TEXT DEFAULT '',
  cv_url         TEXT DEFAULT '',
  cv_name        TEXT DEFAULT '',
  foto_url       TEXT DEFAULT '',
  status         TEXT DEFAULT 'Neu',   -- Neu | Ausstehend | Eingeladen | Akzeptiert | Abgelehnt
  internal_note  TEXT DEFAULT '',
  handled_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications REPLICA IDENTITY FULL;

-- Anyone (anon) can INSERT
DROP POLICY IF EXISTS "Anyone can submit application" ON applications;
CREATE POLICY "Anyone can submit application" ON applications
  FOR INSERT WITH CHECK (true);

-- Only team/admin can SELECT
DROP POLICY IF EXISTS "Team can view applications" ON applications;
CREATE POLICY "Team can view applications" ON applications
  FOR SELECT USING (get_my_role() IN ('team', 'admin'));

-- Only admin can UPDATE
DROP POLICY IF EXISTS "Admin can update applications" ON applications;
CREATE POLICY "Admin can update applications" ON applications
  FOR UPDATE USING (get_my_role() = 'admin');

-- Only admin can DELETE
DROP POLICY IF EXISTS "Admin can delete applications" ON applications;
CREATE POLICY "Admin can delete applications" ON applications
  FOR DELETE USING (get_my_role() = 'admin');

-- Grant anon permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT INSERT ON applications TO anon;
GRANT EXECUTE ON FUNCTION uuid_generate_v4() TO anon;
