import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/api';

export async function POST(request: Request) {
  const denied = await requireAdminApi(request); if (denied) return denied;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: string[] = [];

  // Check if pricing table exists
  const { error: checkError } = await supabase
    .from('pricing')
    .select('id')
    .limit(1);

  if (checkError && checkError.message.includes('does not exist')) {
    // Table doesn't exist - we can't create it via JS client
    // We need to tell the user to create it manually
    return NextResponse.json({
      status: 'needs_manual_sql',
      message: 'Таблица pricing не существует. Выполните SQL в Supabase Dashboard.',
      sql: SQL_MIGRATION,
    });
  }

  // Table exists, try to add missing columns
  // We can check by trying to select the new columns
  const { error: colError } = await supabase
    .from('pricing')
    .select('order_index, visible, duration, features')
    .limit(1);

  if (colError && colError.message.includes('column')) {
    results.push('Нужно добавить колонки. Выполните SQL миграцию.');
  } else {
    results.push('Колонки pricing уже существуют.');
  }

  // Check settings table for pricing_settings
  const { error: settingsError } = await supabase
    .from('settings')
    .select('pricing_settings')
    .limit(1);

  if (settingsError && settingsError.message.includes('column')) {
    results.push('Нужно добавить pricing_settings в settings.');
  } else {
    results.push('pricing_settings уже существует.');
  }

  return NextResponse.json({ status: 'ok', results });
}

const SQL_MIGRATION = `
-- ============================================
-- Pricing Builder: Migration
-- Выполните этот SQL в Supabase Dashboard → SQL Editor
-- ============================================

-- 1. Создать таблицу pricing (если не существует)
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

-- 2. Добавить колонки (если таблица уже существует без них)
ALTER TABLE pricing ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0;
ALTER TABLE pricing ADD COLUMN IF NOT EXISTS visible boolean DEFAULT true;
ALTER TABLE pricing ADD COLUMN IF NOT EXISTS duration text DEFAULT '';
ALTER TABLE pricing ADD COLUMN IF NOT EXISTS features jsonb DEFAULT '[]'::jsonb;

-- 3. Добавить pricing_settings в settings
ALTER TABLE settings ADD COLUMN IF NOT EXISTS pricing_settings jsonb DEFAULT '{"currency":"₽","currencyPosition":"after","showDuration":true,"showDescription":true,"tableStyle":"default","accentColor":"#DB9844"}'::jsonb;

-- 4. Backfill order_index
UPDATE pricing SET order_index = sub.row_num - 1
FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS row_num FROM pricing) AS sub
WHERE pricing.id = sub.id;

-- 5. RLS
ALTER TABLE pricing ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read visible pricing' AND tablename = 'pricing') THEN
    CREATE POLICY "Public can read visible pricing" ON pricing
      FOR SELECT USING (visible = true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated can manage pricing' AND tablename = 'pricing') THEN
    CREATE POLICY "Authenticated can manage pricing" ON pricing
      FOR ALL TO authenticated
      USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END $$;
`;
