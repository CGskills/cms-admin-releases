-- REFERENCE ONLY (legacy): do not apply this file to production.
-- Its policies predate admin_users/public.is_admin() and are intentionally permissive.
-- Apply the canonical migration supabase/migrations/20260823000000_admin_hardening.sql instead.

-- Fix RLS policies for testimonials
-- Run this if you're getting permission errors

-- Drop existing policies
DROP POLICY IF EXISTS "Public users can read published testimonials" ON testimonials;
DROP POLICY IF EXISTS "Authenticated users can read all testimonials" ON testimonials;
DROP POLICY IF EXISTS "Authenticated users can insert testimonials" ON testimonials;
DROP POLICY IF EXISTS "Authenticated users can update testimonials" ON testimonials;
DROP POLICY IF EXISTS "Authenticated users can delete testimonials" ON testimonials;

-- Recreate policies with correct settings
-- Public read only published testimonials
CREATE POLICY "Public users can read published testimonials"
  ON testimonials FOR SELECT
  TO anon
  USING (published = true);

-- Authenticated users can read all testimonials
CREATE POLICY "Authenticated users can read all testimonials"
  ON testimonials FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert testimonials
CREATE POLICY "Authenticated users can insert testimonials"
  ON testimonials FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update testimonials
CREATE POLICY "Authenticated users can update testimonials"
  ON testimonials FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Authenticated users can delete testimonials
CREATE POLICY "Authenticated users can delete testimonials"
  ON testimonials FOR DELETE
  TO authenticated
  USING (true);

-- Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'testimonials';
