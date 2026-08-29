-- REFERENCE ONLY (legacy): do not apply this file to production.
-- Its historical policies predate admin_users/public.is_admin() and are intentionally permissive.
-- Apply the canonical migration supabase/migrations/20260823000000_admin_hardening.sql instead.

-- ============================================
-- Pricing Builder: Migration
-- Выполните в Supabase Dashboard → SQL Editor
-- ============================================

-- 1. Таблица pricing
CREATE TABLE IF NOT EXISTS pricing (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT '',
  description text DEFAULT '',
  price text DEFAULT '',
  order_index integer DEFAULT 0,
  visible boolean DEFAULT true,
  duration text DEFAULT '',
  features jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- 2. Таблица settings
CREATE TABLE IF NOT EXISTS settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  site_name text NOT NULL DEFAULT 'CMS',
  logo text,
  email text,
  phone text,
  social_links jsonb,
  pricing_settings jsonb DEFAULT '{"currency":"₽","currencyPosition":"after","showDuration":true,"showDescription":true,"tableStyle":"default","accentColor":"#DB9844"}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

-- 3. RLS для pricing
ALTER TABLE pricing ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read visible pricing' AND tablename = 'pricing') THEN
    CREATE POLICY "Public can read visible pricing" ON pricing FOR SELECT USING (visible = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated can manage pricing' AND tablename = 'pricing') THEN
    CREATE POLICY "Authenticated can manage pricing" ON pricing FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- 4. RLS для settings
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read settings' AND tablename = 'settings') THEN
    CREATE POLICY "Public can read settings" ON settings FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated can manage settings' AND tablename = 'settings') THEN
    CREATE POLICY "Authenticated can manage settings" ON settings FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;
