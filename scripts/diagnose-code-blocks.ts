import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pjujhrfkykxgzcexyyti.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqdWpocmZreWt4Z3pjZXh5eXRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjY1NjExNywiZXhwIjoyMTAyMjMyMTE3fQ.HwpQuze5kwc2sDUZnvfWeiYuv5v7tI2RTFVy9l2xeXs';

async function diagnoseCodeBlocks() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  console.log('🔍 Диагностика Code Blocks...\n');

  // 1. Проверка данных в таблице
  console.log('1. Проверка данных в code_blocks...');
  const { data: blocks, error: selectError } = await supabase
    .from('code_blocks')
    .select('id, name, category, status, html, css, javascript')
    .order('created_at', { ascending: false });

  if (selectError) {
    console.log('❌ Ошибка чтения:', selectError.message);
    console.log('   Code:', selectError.code);
    console.log('   Details:', selectError.details);
    return;
  }

  console.log(`   ✅ Найдено ${blocks?.length || 0} записей\n`);

  if (blocks && blocks.length > 0) {
    for (const block of blocks) {
      console.log(`   - ${block.name} (${block.category})`);
      console.log(`     ID: ${block.id}`);
      console.log(`     Status: ${block.status}`);
      console.log(`     HTML: ${block.html?.length || 0} chars`);
      console.log(`     CSS: ${block.css?.length || 0} chars`);
      console.log(`     JS: ${block.javascript?.length || 0} chars`);
      console.log('');
    }
  }

  // 2. Проверка RLS политик
  console.log('\n2. Проверка RLS политик на code_blocks...');
  const { data: policies, error: policyError } = await supabase
    .rpc('exec_sql', {
      query: `
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
        WHERE schemaname = 'public'
          AND tablename = 'code_blocks'
        ORDER BY policyname;
      `
    });

  if (policyError) {
    console.log('   ⚠️  Не могу прочитать политики напрямую');
    console.log('   Проверю через metadata...\n');

    // Альтернативный способ - проверить через information_schema
    const { data: rls, error: rlsError } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT relrowsecurity
          FROM pg_class
          WHERE relname = 'code_blocks' AND relnamespace = 'public'::regnamespace;
        `
      });

    if (!rlsError && rls) {
      console.log('   RLS включен:', rls);
    }
  } else {
    console.log('   ✅ Политики найдены:');
    for (const policy of policies || []) {
      console.log(`      - ${policy.policyname}`);
      console.log(`        Command: ${policy.cmd}`);
      console.log(`        Roles: ${policy.roles}`);
      console.log('');
    }
  }

  // 3. Тест чтения через publishable key (как в браузере)
  console.log('\n3. Тест чтения через publishable key (симуляция браузера)...');

  const publicClient = createClient(
    'https://pjujhrfkykxgzcexyyti.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqdWpocmZreWt4Z3pjZXh5eXRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NTYxMTcsImV4cCI6MjEwMjIzMjExN30.3pN-9uqzP_3H30RDN_9LiCCQmS0D3_Vgo6w_b0IMDvk'
  );

  // Попытка без авторизации
  console.log('   Тест без авторизации (anon)...');
  const { data: anonData, error: anonError } = await publicClient
    .from('code_blocks')
    .select('id, name')
    .limit(1);

  if (anonError) {
    console.log('   ❌ Анонимный доступ запрещен (это правильно)');
    console.log('      Error:', anonError.message);
  } else {
    console.log('   ⚠️  Анонимный доступ разрешен (потенциальная проблема!)');
    console.log('      Прочитано записей:', anonData?.length || 0);
  }

  // Попытка с авторизацией
  console.log('\n   Тест с авторизацией (authenticated user)...');

  // Сначала нужно войти
  const { data: authData, error: signInError } = await publicClient.auth.signInWithPassword({
    email: 'admin@gmail.com',
    password: 'Admin123!'
  });

  if (signInError) {
    console.log('   ❌ Не удалось войти:', signInError.message);
    console.log('   (Нужен правильный пароль для полного теста)');
  } else {
    console.log('   ✅ Вход выполнен:', authData.user?.email);

    const { data: authBlocks, error: authError } = await publicClient
      .from('code_blocks')
      .select('id, name, category, html')
      .limit(3);

    if (authError) {
      console.log('   ❌ Ошибка чтения для authenticated:', authError.message);
      console.log('      Code:', authError.code);
      console.log('      Hint:', authError.hint);
    } else {
      console.log('   ✅ Прочитано записей:', authBlocks?.length || 0);
      if (authBlocks && authBlocks.length > 0) {
        authBlocks.forEach(b => {
          console.log(`      - ${b.name}: HTML ${b.html?.length || 0} chars`);
        });
      }
    }
  }

  console.log('\n\n📊 Резюме:');
  console.log('- Данные в таблице:', blocks?.length || 0, 'записей');
  console.log('- Service role доступ: ✅');
  console.log('- Authenticated доступ: тестируется...');
}

diagnoseCodeBlocks().catch(console.error);
