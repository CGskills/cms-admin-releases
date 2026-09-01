import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pjujhrfkykxgzcexyyti.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqdWpocmZreWt4Z3pjZXh5eXRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjY1NjExNywiZXhwIjoyMTAyMjMyMTE3fQ.HwpQuze5kwc2sDUZnvfWeiYuv5v7tI2RTFVy9l2xeXs';

async function fixRLSPolicies() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  console.log('🔧 Исправление RLS политик для code_blocks\n');

  // Проверим текущие политики
  console.log('1. Проверка текущих политик...');

  const { data: currentPolicies, error: checkError } = await supabase
    .rpc('exec_sql', {
      query: `
        SELECT policyname, cmd, roles, qual, with_check
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'code_blocks'
        ORDER BY policyname;
      `
    });

  if (checkError && !checkError.message.includes('does not exist')) {
    console.log('⚠️  Не могу проверить политики:', checkError.message);
  } else if (currentPolicies) {
    console.log(`   Найдено ${currentPolicies.length} политик:`);
    currentPolicies.forEach((p: any) => {
      console.log(`   - ${p.policyname} (${p.cmd}, roles: ${p.roles})`);
    });
  }

  // Удалим старые политики и создадим правильные
  console.log('\n2. Обновление политик...');

  const sql = `
-- Удаляем все существующие политики
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
  END LOOP;
END $$;

-- Создаем новую политику для администраторов (все операции)
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

  const { error: updateError } = await supabase.rpc('exec_sql', { query: sql });

  if (updateError) {
    console.log('❌ Ошибка обновления политик:', updateError.message);
    console.log('\n⚠️  exec_sql функция может быть недоступна.');
    console.log('📝 ВЫПОЛНИТЕ ЭТОТ SQL ВРУЧНУЮ В SUPABASE DASHBOARD:\n');
    console.log(sql);
    return;
  }

  console.log('✅ Политики успешно обновлены!');

  // Проверим результат
  console.log('\n3. Проверка новых политик...');

  const { data: newPolicies } = await supabase
    .rpc('exec_sql', {
      query: `
        SELECT policyname, cmd, roles
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'code_blocks'
        ORDER BY policyname;
      `
    });

  if (newPolicies) {
    console.log(`   Теперь установлено ${newPolicies.length} политик:`);
    newPolicies.forEach((p: any) => {
      console.log(`   - ${p.policyname} (${p.cmd}, roles: ${p.roles})`);
    });
  }

  console.log('\n✅ Готово! Теперь:');
  console.log('   1. Пользователь должен выйти и войти заново');
  console.log('   2. Code Library должен загружаться корректно');
}

fixRLSPolicies().catch(console.error);
