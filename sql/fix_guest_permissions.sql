-- Fix: Allow anonymous users to submit guest requests
-- Run this in Supabase SQL Editor

-- Grant schema usage to anon
GRANT USAGE ON SCHEMA public TO anon;

-- Grant INSERT on guest_requests to anon (needed for unauthenticated submissions)
GRANT INSERT ON guest_requests TO anon;

-- Also grant SELECT so the policies can be evaluated properly
-- (RLS still restricts what anon can see — only team/admin can SELECT)
GRANT SELECT ON guest_requests TO anon;

-- Make sure uuid_generate_v4 is usable
GRANT EXECUTE ON FUNCTION uuid_generate_v4() TO anon;

-- Verify the policy exists (re-create if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'guest_requests'
    AND policyname = 'Anyone can create guest request'
  ) THEN
    CREATE POLICY "Anyone can create guest request" ON guest_requests
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;
