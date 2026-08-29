-- REFERENCE ONLY (legacy): do not apply this file to production.
-- Its historical policies predate admin_users/public.is_admin() and are intentionally permissive.
-- Apply the canonical migration supabase/migrations/20260823000000_admin_hardening.sql instead.

-- ============================================
-- ПОЛНАЯ МИГРАЦИЯ: Все таблицы + Pricing Builder
-- Выполните в Supabase Dashboard → SQL Editor
-- ============================================

-- Включить UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ТАБЛИЦЫ
-- ============================================

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
  col_span INTEGER NOT NULL DEFAULT 6,
  tile_height INTEGER NOT NULL DEFAULT 280,
  cover_x REAL DEFAULT 50,
  cover_y REAL DEFAULT 50,
  cover_zoom REAL DEFAULT 1,
  order_index INTEGER NOT NULL DEFAULT 0,
  visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  price TEXT DEFAULT '',
  order_index INTEGER DEFAULT 0,
  visible BOOLEAN DEFAULT true,
  duration TEXT DEFAULT '',
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS testimonials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  avatar TEXT,
  text TEXT NOT NULL,
  rating INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  photo TEXT,
  description TEXT NOT NULL,
  social_links JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_name TEXT NOT NULL DEFAULT 'CMS',
  logo TEXT,
  email TEXT,
  phone TEXT,
  social_links JSONB,
  pricing_settings JSONB DEFAULT '{"currency":"₽","currencyPosition":"after","showDuration":true,"showDescription":true,"tableStyle":"default","accentColor":"#DB9844"}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ BEGIN
  DROP TRIGGER IF EXISTS update_pages_updated_at ON pages;
  CREATE TRIGGER update_pages_updated_at BEFORE UPDATE ON pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  DROP TRIGGER IF EXISTS update_portfolio_items_updated_at ON portfolio_items;
  CREATE TRIGGER update_portfolio_items_updated_at BEFORE UPDATE ON portfolio_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
  CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END $$;

-- ============================================
-- RLS
-- ============================================

ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Удалить старые политики если есть
DO $$ BEGIN
  -- Pricing
  DROP POLICY IF EXISTS "Public can read visible pricing" ON pricing;
  DROP POLICY IF EXISTS "Authenticated can manage pricing" ON pricing;
  DROP POLICY IF EXISTS "Authenticated users can read pricing" ON pricing;
  DROP POLICY IF EXISTS "Authenticated users can insert pricing" ON pricing;
  DROP POLICY IF EXISTS "Authenticated users can update pricing" ON pricing;
  DROP POLICY IF EXISTS "Authenticated users can delete pricing" ON pricing;
  DROP POLICY IF EXISTS "Public users can read pricing" ON pricing;

  -- Settings
  DROP POLICY IF EXISTS "Public can read settings" ON settings;
  DROP POLICY IF EXISTS "Authenticated can manage settings" ON settings;
  DROP POLICY IF EXISTS "Authenticated users can read settings" ON settings;
  DROP POLICY IF EXISTS "Authenticated users can insert settings" ON settings;
  DROP POLICY IF EXISTS "Authenticated users can update settings" ON settings;
  DROP POLICY IF EXISTS "Public users can read settings" ON settings;

  -- Pages
  DROP POLICY IF EXISTS "Authenticated users can read pages" ON pages;
  DROP POLICY IF EXISTS "Authenticated users can insert pages" ON pages;
  DROP POLICY IF EXISTS "Authenticated users can update pages" ON pages;
  DROP POLICY IF EXISTS "Authenticated users can delete pages" ON pages;
  DROP POLICY IF EXISTS "Public users can read pages" ON pages;

  -- Portfolio
  DROP POLICY IF EXISTS "Authenticated users can read portfolio_items" ON portfolio_items;
  DROP POLICY IF EXISTS "Authenticated users can insert portfolio_items" ON portfolio_items;
  DROP POLICY IF EXISTS "Authenticated users can update portfolio_items" ON portfolio_items;
  DROP POLICY IF EXISTS "Authenticated users can delete portfolio_items" ON portfolio_items;
  DROP POLICY IF EXISTS "Public users can read portfolio_items" ON portfolio_items;

  -- Services
  DROP POLICY IF EXISTS "Authenticated users can read services" ON services;
  DROP POLICY IF EXISTS "Authenticated users can insert services" ON services;
  DROP POLICY IF EXISTS "Authenticated users can update services" ON services;
  DROP POLICY IF EXISTS "Authenticated users can delete services" ON services;
  DROP POLICY IF EXISTS "Public users can read services" ON services;

  -- Testimonials
  DROP POLICY IF EXISTS "Authenticated users can read testimonials" ON testimonials;
  DROP POLICY IF EXISTS "Authenticated users can insert testimonials" ON testimonials;
  DROP POLICY IF EXISTS "Authenticated users can update testimonials" ON testimonials;
  DROP POLICY IF EXISTS "Authenticated users can delete testimonials" ON testimonials;
  DROP POLICY IF EXISTS "Public users can read testimonials" ON testimonials;

  -- Employees
  DROP POLICY IF EXISTS "Authenticated users can read employees" ON employees;
  DROP POLICY IF EXISTS "Authenticated users can insert employees" ON employees;
  DROP POLICY IF EXISTS "Authenticated users can update employees" ON employees;
  DROP POLICY IF EXISTS "Authenticated users can delete employees" ON employees;
  DROP POLICY IF EXISTS "Public users can read employees" ON employees;
END $$;

-- Создать политики заново
-- Authenticated: полный доступ
CREATE POLICY "Authenticated access" ON pages FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated access" ON portfolio_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated access" ON services FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated access" ON pricing FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated access" ON testimonials FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated access" ON employees FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated access" ON settings FOR ALL USING (auth.role() = 'authenticated');

-- Public: чтение
CREATE POLICY "Public read" ON pages FOR SELECT USING (true);
CREATE POLICY "Public read" ON portfolio_items FOR SELECT USING (true);
CREATE POLICY "Public read" ON services FOR SELECT USING (true);
CREATE POLICY "Public read visible" ON pricing FOR SELECT USING (visible = true);
CREATE POLICY "Public read" ON testimonials FOR SELECT USING (true);
CREATE POLICY "Public read" ON employees FOR SELECT USING (true);
CREATE POLICY "Public read" ON settings FOR SELECT USING (true);

-- ============================================
-- ДАННЫЕ ПО УМОЛЧАНИЮ
-- ============================================

INSERT INTO settings (site_name, email, phone)
VALUES ('CMS Admin', 'admin@example.com', '+1234567890')
ON CONFLICT DO NOTHING;

-- ============================================
-- STORAGE
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('portfolio', 'portfolio', true, 10485760, '{"image/*"}'),
  ('employees', 'employees', true, 10485760, '{"image/*"}'),
  ('services', 'services', true, 10485760, '{"image/*"}'),
  ('avatars', 'avatars', true, 5242880, '{"image/*"}'),
  ('logos', 'logos', true, 5242880, '{"image/*"}'),
  ('testimonials', 'testimonials', true, 10485760, '{"image/*"}')
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Authenticated upload portfolio" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated delete portfolio" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated upload employees" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated delete employees" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated upload services" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated delete services" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated upload avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated delete avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated upload logos" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated delete logos" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated upload testimonials" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated delete testimonials" ON storage.objects;
  DROP POLICY IF EXISTS "Public read portfolio" ON storage.objects;
  DROP POLICY IF EXISTS "Public read employees" ON storage.objects;
  DROP POLICY IF EXISTS "Public read services" ON storage.objects;
  DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Public read logos" ON storage.objects;
  DROP POLICY IF EXISTS "Public read testimonials" ON storage.objects;
END $$;

CREATE POLICY "Authenticated upload portfolio" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'portfolio');
CREATE POLICY "Authenticated delete portfolio" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'portfolio');
CREATE POLICY "Authenticated upload employees" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'employees');
CREATE POLICY "Authenticated delete employees" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'employees');
CREATE POLICY "Authenticated upload services" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'services');
CREATE POLICY "Authenticated delete services" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'services');
CREATE POLICY "Authenticated upload avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Authenticated delete avatars" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars');
CREATE POLICY "Authenticated upload logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'logos');
CREATE POLICY "Authenticated delete logos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'logos');
CREATE POLICY "Authenticated upload testimonials" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'testimonials');
CREATE POLICY "Authenticated delete testimonials" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'testimonials');

CREATE POLICY "Public read portfolio" ON storage.objects FOR SELECT USING (bucket_id = 'portfolio');
CREATE POLICY "Public read employees" ON storage.objects FOR SELECT USING (bucket_id = 'employees');
CREATE POLICY "Public read services" ON storage.objects FOR SELECT USING (bucket_id = 'services');
CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Public read logos" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY "Public read testimonials" ON storage.objects FOR SELECT USING (bucket_id = 'testimonials');
