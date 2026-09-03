-- REFERENCE ONLY (legacy): do not apply this file to production.
-- Its historical policies predate admin_users/public.is_admin() and are intentionally permissive.
-- Apply the canonical migration supabase/migrations/20260823000000_admin_hardening.sql instead.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create pages table
CREATE TABLE IF NOT EXISTS pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  seo_title TEXT,
  seo_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create portfolio_items table (visual grid builder)
CREATE TABLE IF NOT EXISTS portfolio_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  subtitle TEXT DEFAULT '',
  description TEXT DEFAULT '',
  category TEXT,
  technologies TEXT[] DEFAULT '{}',
  client TEXT,
  project_date DATE,
  project_url TEXT,
  image_url TEXT DEFAULT '',
  before_image TEXT,
  after_image TEXT,
  gallery TEXT[] DEFAULT '{}',
  col_span INTEGER NOT NULL DEFAULT 6 CHECK (col_span >= 1 AND col_span <= 12),
  tile_height INTEGER NOT NULL DEFAULT 280 CHECK (tile_height >= 80 AND tile_height <= 1200),
  cover_x REAL DEFAULT 50 CHECK (cover_x >= 0 AND cover_x <= 100),
  cover_y REAL DEFAULT 50 CHECK (cover_y >= 0 AND cover_y <= 100),
  cover_zoom REAL DEFAULT 1 CHECK (cover_zoom >= 1 AND cover_zoom <= 2.5),
  order_index INTEGER NOT NULL DEFAULT 0,
  visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create pricing table
CREATE TABLE IF NOT EXISTS pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create testimonials table
CREATE TABLE IF NOT EXISTS testimonials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  avatar TEXT,
  text TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  photo TEXT,
  description TEXT NOT NULL,
  social_links JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_name TEXT NOT NULL,
  logo TEXT,
  email TEXT,
  phone TEXT,
  social_links JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users

-- Pages policies
CREATE POLICY "Authenticated users can read pages"
  ON pages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert pages"
  ON pages FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update pages"
  ON pages FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete pages"
  ON pages FOR DELETE
  TO authenticated
  USING (true);

-- Portfolio items policies
CREATE POLICY "Authenticated users can read portfolio_items"
  ON portfolio_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert portfolio_items"
  ON portfolio_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update portfolio_items"
  ON portfolio_items FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete portfolio_items"
  ON portfolio_items FOR DELETE
  TO authenticated
  USING (true);

-- Services policies
CREATE POLICY "Authenticated users can read services"
  ON services FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert services"
  ON services FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update services"
  ON services FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete services"
  ON services FOR DELETE
  TO authenticated
  USING (true);

-- Pricing policies
CREATE POLICY "Authenticated users can read pricing"
  ON pricing FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert pricing"
  ON pricing FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update pricing"
  ON pricing FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete pricing"
  ON pricing FOR DELETE
  TO authenticated
  USING (true);

-- Testimonials policies
CREATE POLICY "Authenticated users can read testimonials"
  ON testimonials FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert testimonials"
  ON testimonials FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update testimonials"
  ON testimonials FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete testimonials"
  ON testimonials FOR DELETE
  TO authenticated
  USING (true);

-- Employees policies
CREATE POLICY "Authenticated users can read employees"
  ON employees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete employees"
  ON employees FOR DELETE
  TO authenticated
  USING (true);

-- Settings policies
CREATE POLICY "Authenticated users can read settings"
  ON settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert settings"
  ON settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update settings"
  ON settings FOR UPDATE
  TO authenticated
  USING (true);

-- Public read policies (для отображения на сайте)
CREATE POLICY "Public users can read pages"
  ON pages FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public users can read portfolio_items"
  ON portfolio_items FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public users can read services"
  ON services FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public users can read pricing"
  ON pricing FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public users can read testimonials"
  ON testimonials FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public users can read employees"
  ON employees FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public users can read settings"
  ON settings FOR SELECT
  TO anon
  USING (true);

-- Create update trigger for pages
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pages_updated_at BEFORE UPDATE ON pages
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolio_items_updated_at BEFORE UPDATE ON portfolio_items
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pricing_updated_at BEFORE UPDATE ON pricing
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings
INSERT INTO settings (site_name, email, phone)
VALUES ('CMS Admin', 'admin@example.com', '+1234567890')
ON CONFLICT DO NOTHING;

-- ============================================================
-- STORAGE BUCKETS
-- Run this in Supabase Dashboard > Storage > New Bucket
-- or via SQL editor with service_role key
-- ============================================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('portfolio', 'portfolio', true, 10485760, '{"image/*"}'),
  ('employees', 'employees', true, 10485760, '{"image/*"}'),
  ('services', 'services', true, 10485760, '{"image/*"}'),
  ('avatars', 'avatars', true, 5242880, '{"image/*"}'),
  ('logos', 'logos', true, 5242880, '{"image/*"}'),
  ('testimonials', 'testimonials', true, 10485760, '{"image/*"}')
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for authenticated users
CREATE POLICY "Authenticated users can upload to portfolio"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'portfolio');

CREATE POLICY "Authenticated users can delete from portfolio"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'portfolio');

CREATE POLICY "Authenticated users can upload to employees"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'employees');

CREATE POLICY "Authenticated users can delete from employees"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'employees');

CREATE POLICY "Authenticated users can upload to services"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'services');

CREATE POLICY "Authenticated users can delete from services"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'services');

CREATE POLICY "Authenticated users can upload to avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can delete from avatars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload to logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'logos');

CREATE POLICY "Authenticated users can delete from logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'logos');

CREATE POLICY "Authenticated users can upload to testimonials"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'testimonials');

CREATE POLICY "Authenticated users can delete from testimonials"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'testimonials');

-- Public read access for all storage buckets
CREATE POLICY "Public users can read portfolio storage"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'portfolio');

CREATE POLICY "Public users can read employees storage"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'employees');

CREATE POLICY "Public users can read services storage"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'services');

CREATE POLICY "Public users can read avatars storage"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "Public users can read logos storage"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'logos');

CREATE POLICY "Public users can read testimonials storage"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'testimonials');
