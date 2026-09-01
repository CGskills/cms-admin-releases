import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pjujhrfkykxgzcexyyti.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqdWpocmZreWt4Z3pjZXh5eXRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjY1NjExNywiZXhwIjoyMTAyMjMyMTE3fQ.HwpQuze5kwc2sDUZnvfWeiYuv5v7tI2RTFVy9l2xeXs';

async function executeSql(sql: string) {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Используем REST API для выполнения SQL
  const projectRef = 'pjujhrfkykxgzcexyyti';
  const url = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SQL execution failed: ${error}`);
  }

  return response.json();
}

async function fixPoliciesDirectly() {
  console.log('🔧 ИСПРАВЛЕНИЕ RLS ПОЛИТИК НАПРЯМУЮ\n');

  const sql = `
-- Удаляем все существующие политики на code_blocks
DO $$
DECLARE
  policy_row record;
BEGIN
  FOR policy_row IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'code_blocks'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.code_blocks', policy_row.policyname);
    RAISE NOTICE 'Удалена политика: %', policy_row.policyname;
  END LOOP;
END $$;

-- Создаем новую политику для администраторов
CREATE POLICY "CMS administrators full access"
  ON public.code_blocks
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Анонимный доступ запрещен
CREATE POLICY "No anonymous access"
  ON public.code_blocks
  FOR ALL
  TO anon
  USING (false);
  `;

  try {
    await executeSql(sql);
    console.log('✅ SQL выполнен успешно!\n');
    console.log('Политики обновлены:');
    console.log('  1. "CMS administrators full access" - для authenticated');
    console.log('  2. "No anonymous access" - для anon');
  } catch (error) {
    console.log('❌ Не удалось выполнить через API\n');
    console.log('📋 СКОПИРУЙТЕ И ВЫПОЛНИТЕ ВРУЧНУЮ В SUPABASE:\n');
    console.log('Откройте: https://supabase.com/dashboard/project/pjujhrfkykxgzcexyyti/sql/new\n');
    console.log(sql);
    console.log('\n⚠️  После выполнения SQL:');
    console.log('   1. Пользователь должен выйти и войти заново');
    console.log('   2. Code Library начнет работать');
  }
}

fixPoliciesDirectly().catch(console.error);
