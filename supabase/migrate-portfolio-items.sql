-- REFERENCE ONLY (legacy): do not apply this file to production.
-- Its historical policies predate admin_users/public.is_admin() and are intentionally permissive.
-- Apply the canonical migration supabase/migrations/20260823000000_admin_hardening.sql instead.

-- ============================================================
-- MIGRATION: portfolio_items table + Storage
-- Применить в Supabase Dashboard > SQL Editor
-- https://supabase.com/dashboard/project/pjujhrfkykxgzcexyyti/sql
-- ============================================================

-- 1. Создать таблицу portfolio_items
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

-- 2. RLS
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;

-- 3. Policies для авторизованных
CREATE POLICY "Authenticated users can read portfolio_items"
  ON portfolio_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert portfolio_items"
  ON portfolio_items FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update portfolio_items"
  ON portfolio_items FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete portfolio_items"
  ON portfolio_items FOR DELETE TO authenticated USING (true);

-- 4. Public read для сайта
CREATE POLICY "Public users can read portfolio_items"
  ON portfolio_items FOR SELECT TO anon USING (true);

-- 5. Функция + Trigger для updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_portfolio_items_updated_at
  BEFORE UPDATE ON portfolio_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('portfolio', 'portfolio', true, 10485760, '{"image/*"}')
ON CONFLICT (id) DO NOTHING;

-- 7. Storage policies (пропустить если уже существуют)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload to portfolio'
  ) THEN
    CREATE POLICY "Authenticated users can upload to portfolio"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'portfolio');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can delete from portfolio'
  ) THEN
    CREATE POLICY "Authenticated users can delete from portfolio"
      ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'portfolio');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public users can read portfolio storage'
  ) THEN
    CREATE POLICY "Public users can read portfolio storage"
      ON storage.objects FOR SELECT TO anon
      USING (bucket_id = 'portfolio');
  END IF;
END $$;

-- 8. Тестовые данные (опционально)
INSERT INTO portfolio_items (title, slug, subtitle, description, category, image_url, before_image, after_image, col_span, tile_height, order_index, visible)
VALUES
  (
    'Smile Makeover',
    'smile-makeover',
    'Before & After',
    '<p>Complete smile transformation with porcelain veneers and whitening.</p><p><strong>Result:</strong> Natural-looking, bright smile.</p>',
    'Cosmetic',
    'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=800',
    'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=800',
    'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800',
    6,
    350,
    0,
    true
  ),
  (
    'Dental Implants',
    'dental-implants',
    'Full Arch Restoration',
    '<p>Full arch implant-supported restoration using All-on-4 technique.</p>',
    'Implants',
    'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800',
    null,
    null,
    6,
    350,
    1,
    true
  ),
  (
    'Teeth Whitening',
    'teeth-whitening',
    'Professional Whitening',
    '<p>In-office professional teeth whitening. <strong>6 shades brighter</strong> in one session.</p>',
    'Whitening',
    'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=800',
    'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=800',
    'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800',
    12,
    400,
    2,
    true
  )
ON CONFLICT (slug) DO NOTHING;
