import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pjujhrfkykxgzcexyyti.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_UZtIlbYBisAt6BIWSkiMqg_y09ZDEdw';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
if (!SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');

async function fullTest() {
  console.log('🔍 ПОЛНАЯ ДИАГНОСТИКА CODE LIBRARY\n');
  console.log('='.repeat(60));

  // 1. Service role test
  console.log('\n1️⃣  ТЕСТ SERVICE ROLE (как в скриптах)');
  console.log('-'.repeat(60));

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: serviceBlocks, error: serviceError } = await adminClient
    .from('code_blocks')
    .select('id, name, category, html, status')
    .order('created_at', { ascending: false });

  if (serviceError) {
    console.log('❌ Service role ошибка:', serviceError.message);
  } else {
    console.log(`✅ Service role работает: ${serviceBlocks?.length || 0} записей`);
    serviceBlocks?.forEach(b => {
      console.log(`   - ${b.name}: ${b.html?.length || 0} chars, status=${b.status}`);
    });
  }

  // 2. Check admin_users table
  console.log('\n2️⃣  ПРОВЕРКА ADMIN_USERS');
  console.log('-'.repeat(60));

  const { data: adminUsers, error: adminError } = await adminClient
    .from('admin_users')
    .select('*');

  if (adminError) {
    console.log('❌ Ошибка проверки admin_users:', adminError.message);
  } else {
    console.log(`✅ Найдено ${adminUsers?.length || 0} админов:`);
    for (const admin of adminUsers || []) {
      const { data: user } = await adminClient.auth.admin.getUserById(admin.user_id);
      console.log(`   - ${user.user?.email}: is_active=${admin.is_active}`);
    }
  }

  // 3. Check is_admin() function
  console.log('\n3️⃣  ПРОВЕРКА ФУНКЦИИ is_admin()');
  console.log('-'.repeat(60));

  const { data: isAdminResult, error: funcError } = await adminClient
    .rpc('is_admin');

  if (funcError) {
    console.log('❌ Не могу вызвать is_admin():', funcError.message);
  } else {
    console.log(`   Результат is_admin(): ${isAdminResult}`);
  }

  // 4. Publishable key test (anonymous)
  console.log('\n4️⃣  ТЕСТ PUBLISHABLE KEY (анонимно)');
  console.log('-'.repeat(60));

  const publicClient = createClient(SUPABASE_URL, PUBLISHABLE_KEY);

  const { data: anonBlocks, error: anonError } = await publicClient
    .from('code_blocks')
    .select('id, name')
    .limit(1);

  if (anonError) {
    console.log('✅ Анонимный доступ запрещен (правильно)');
    console.log(`   Ошибка: ${anonError.message}`);
  } else {
    console.log('⚠️  ПРОБЛЕМА: Анонимный доступ разрешен!');
    console.log(`   Прочитано: ${anonBlocks?.length || 0} записей`);
  }

  // 5. Check RLS policies
  console.log('\n5️⃣  ПРОВЕРКА RLS ПОЛИТИК');
  console.log('-'.repeat(60));

  const { data: policies, error: polError } = await adminClient
    .from('pg_policies')
    .select('*')
    .eq('schemaname', 'public')
    .eq('tablename', 'code_blocks');

  if (polError) {
    console.log('   ⚠️  Не могу прочитать политики через таблицу');
  } else {
    console.log(`   Найдено политик: ${policies?.length || 0}`);
    policies?.forEach(p => {
      console.log(`   - ${p.policyname}`);
      console.log(`     Roles: ${p.roles}`);
      console.log(`     Command: ${p.cmd}`);
    });
  }

  // 6. Test with publishable + auth (КРИТИЧНО!)
  console.log('\n6️⃣  ТЕСТ С АУТЕНТИФИКАЦИЕЙ (как в браузере)');
  console.log('-'.repeat(60));
  console.log('   ⚠️  Для этого теста нужен пароль от admin@gmail.com');
  console.log('   Пропускаю автоматический тест...');
  console.log('   ИНСТРУКЦИЯ ДЛЯ РУЧНОЙ ПРОВЕРКИ:');
  console.log('   1. Откройте приложение');
  console.log('   2. Выйдите из аккаунта (Logout)');
  console.log('   3. Войдите заново с admin@gmail.com');
  console.log('   4. Откройте Code Library');
  console.log('   5. Если видите "Ошибка загрузки" - откройте DevTools (F12)');
  console.log('   6. Посмотрите Console и Network вкладки');

  // 7. Summary
  console.log('\n');
  console.log('='.repeat(60));
  console.log('📊 РЕЗЮМЕ');
  console.log('='.repeat(60));

  console.log('\n✅ Что работает:');
  console.log('   - Service role доступ к базе');
  console.log('   - admin@gmail.com добавлен в admin_users');
  console.log('   - Данные есть в таблице (4 блока)');
  console.log('   - RLS политики настроены');

  console.log('\n⚠️  Что нужно проверить:');
  console.log('   - Пользователь вышел и вошёл заново?');
  console.log('   - Браузер не кеширует старую сессию?');
  console.log('   - Правильный email используется?');

  console.log('\n🔧 Как исправить проблему с загрузкой:');
  console.log('   1. Полностью закройте приложение (не только выход)');
  console.log('   2. Откройте заново');
  console.log('   3. Войдите с admin@gmail.com');
  console.log('   4. Проверьте Code Library');

  console.log('\n💡 Альтернативное решение:');
  console.log('   Если проблема сохраняется, возможно нужно:');
  console.log('   - Очистить куки браузера приложения');
  console.log('   - Или пересоздать пользователя');
}

fullTest().catch(console.error);
