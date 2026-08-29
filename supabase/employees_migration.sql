-- REFERENCE ONLY (legacy): do not apply this file to production.
-- Its historical policies predate admin_users/public.is_admin() and are intentionally permissive.
-- Apply the canonical migration supabase/migrations/20260823000000_admin_hardening.sql instead.

-- ============================================================
-- EMPLOYEES MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================================

-- Drop existing employees table if it exists (old basic version)
DROP TABLE IF EXISTS employees CASCADE;

-- Create enhanced employees table
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  position TEXT NOT NULL,
  specialization TEXT,
  short_description TEXT,
  description TEXT NOT NULL,
  experience_years INTEGER NOT NULL DEFAULT 0,
  happy_patients TEXT,
  courses_count INTEGER NOT NULL DEFAULT 0,
  certificates_count INTEGER NOT NULL DEFAULT 0,
  education TEXT,
  qualification TEXT,
  achievements TEXT,
  photo_path TEXT,
  published BOOLEAN DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- EMPLOYEES RLS POLICIES
-- ============================================================

-- Public read only published employees
CREATE POLICY "Public users can read published employees"
  ON employees FOR SELECT
  TO anon
  USING (published = true);

-- Authenticated users can read all employees
CREATE POLICY "Authenticated users can read all employees"
  ON employees FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert employees
CREATE POLICY "Authenticated users can insert employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update employees
CREATE POLICY "Authenticated users can update employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (true);

-- Authenticated users can delete employees
CREATE POLICY "Authenticated users can delete employees"
  ON employees FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- STORAGE BUCKET FOR EMPLOYEES
-- ============================================================

-- Create employees storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('employees', 'employees', true, 10485760, '{"image/*"}')
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for authenticated users
CREATE POLICY "Authenticated users can upload to employees"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'employees');

CREATE POLICY "Authenticated users can delete from employees"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'employees');

-- Public read access for employees storage
CREATE POLICY "Public users can read employees storage"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'employees');

-- ============================================================
-- TRIGGER FOR UPDATED_AT
-- ============================================================

-- Create trigger for employees (function already exists from testimonials)
DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_employees_published ON employees(published);
CREATE INDEX IF NOT EXISTS idx_employees_order ON employees(order_index);
