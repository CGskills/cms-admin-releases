-- REFERENCE ONLY (legacy): do not apply this file to production.
-- Its historical policies predate admin_users/public.is_admin() and are intentionally permissive.
-- Apply the canonical migration supabase/migrations/20260823000000_admin_hardening.sql instead.

-- ============================================================
-- TESTIMONIALS ENHANCEMENT MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================================

-- Drop existing testimonials table and recreate with enhanced schema
DROP TABLE IF EXISTS testimonials CASCADE;

-- Create enhanced testimonials table
CREATE TABLE IF NOT EXISTS testimonials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  surname TEXT,
  position TEXT,
  company TEXT,
  location TEXT,
  content TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  avatar_path TEXT,
  screenshot_path TEXT,
  source_url TEXT,
  published BOOLEAN DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create testimonial_media table for additional images
CREATE TABLE IF NOT EXISTS testimonial_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  testimonial_id UUID NOT NULL REFERENCES testimonials(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'avatar', 'screenshot', 'gallery'
  alt TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonial_media ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TESTIMONIALS RLS POLICIES
-- ============================================================

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
  USING (true);

-- Authenticated users can delete testimonials
CREATE POLICY "Authenticated users can delete testimonials"
  ON testimonials FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- TESTIMONIAL_MEDIA RLS POLICIES
-- ============================================================

-- Public read media from published testimonials
CREATE POLICY "Public users can read media from published testimonials"
  ON testimonial_media FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM testimonials
      WHERE testimonials.id = testimonial_media.testimonial_id
      AND testimonials.published = true
    )
  );

-- Authenticated users can read all media
CREATE POLICY "Authenticated users can read all media"
  ON testimonial_media FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert media
CREATE POLICY "Authenticated users can insert media"
  ON testimonial_media FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update media
CREATE POLICY "Authenticated users can update media"
  ON testimonial_media FOR UPDATE
  TO authenticated
  USING (true);

-- Authenticated users can delete media
CREATE POLICY "Authenticated users can delete media"
  ON testimonial_media FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- STORAGE BUCKET FOR TESTIMONIALS
-- ============================================================

-- Create testimonials storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('testimonials', 'testimonials', true, 10485760, '{"image/*"}')
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for authenticated users
DO $$ BEGIN
  DROP POLICY IF EXISTS "Authenticated users can upload to testimonials" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can delete from testimonials" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated upload testimonials" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated delete testimonials" ON storage.objects;
  DROP POLICY IF EXISTS "Public users can read testimonials storage" ON storage.objects;
  DROP POLICY IF EXISTS "Public read testimonials" ON storage.objects;
END $$;

CREATE POLICY "Authenticated users can upload to testimonials"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'testimonials');

CREATE POLICY "Authenticated users can delete from testimonials"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'testimonials');

-- Public read access for testimonials storage
CREATE POLICY "Public users can read testimonials storage"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'testimonials');

-- ============================================================
-- TRIGGER FOR UPDATED_AT
-- ============================================================

-- Create trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for testimonials
DROP TRIGGER IF EXISTS update_testimonials_updated_at ON testimonials;
CREATE TRIGGER update_testimonials_updated_at BEFORE UPDATE ON testimonials
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_testimonials_published ON testimonials(published);
CREATE INDEX IF NOT EXISTS idx_testimonials_order ON testimonials(order_index);
CREATE INDEX IF NOT EXISTS idx_testimonial_media_testimonial_id ON testimonial_media(testimonial_id);
CREATE INDEX IF NOT EXISTS idx_testimonial_media_type ON testimonial_media(file_type);
