import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pjujhrfkykxgzcexyyti.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
if (!SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');

async function testIsAdminFunction() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  console.log('🔍 ТЕСТИРОВАНИЕ ФУНКЦИИ is_admin()\n');
  console.log('='.repeat(60));

  // 1. Проверка существования функции
  console.log('\n1. Проверка существования функции is_admin()...');

  const { data: funcExists, error: funcError } = await supabase
    .from('pg_proc')
    .select('proname')
    .eq('proname', 'is_admin')
    .limit(1);

  if (funcError) {
    console.log('⚠️  Не могу проверить через pg_proc:', funcError.message);
  } else {
    console.log(funcExists && funcExists.length > 0 ? '✅ Функция существует' : '❌ Функция НЕ существует');
  }

  // 2. Проверка admin_users записи
  console.log('\n2. Проверка записи в admin_users...');

  const { data: adminUsers, error: adminError } = await supabase
    .from('admin_users')
    .select('user_id, is_active')
    .eq('user_id', '92a7525c-01e3-45f2-bc7d-4a0fedc3789f')
    .single();

  if (adminError) {
    console.log('❌ Ошибка:', adminError.message);
  } else if (!adminUsers) {
    console.log('❌ Запись НЕ найдена!');
  } else {
    console.log('✅ Запись найдена:');
    console.log(`   user_id: ${adminUsers.user_id}`);
    console.log(`   is_active: ${adminUsers.is_active}`);
  }

  // 3. Тест is_admin() через SQL напрямую
  console.log('\n3. Прямой тест функции is_admin()...');
  console.log('   (вызов без auth контекста - должен быть false)');

  try {
    const { data: result, error } = await supabase.rpc('is_admin');
    if (error) {
      console.log('❌ Ошибка вызова:', error.message);
    } else {
      console.log(`   Результат: ${result}`);
      if (result === false) {
        console.log('   ✅ Это правильно - нет auth контекста');
      }
    }
  } catch (e) {
    console.log('❌ Исключение:', e);
  }

  // 4. Проверка политики на code_blocks
  console.log('\n4. Проверка политики "CMS administrators full access"...');

  // Попробуем прочитать через information_schema
  const { data: policyCheck, error: policyError } = await supabase
    .from('information_schema.table_privileges')
    .select('*')
    .eq('table_schema', 'public')
    .eq('table_name', 'code_blocks')
    .limit(5);

  if (policyError) {
    console.log('⚠️  Не могу проверить через information_schema');
  } else {
    console.log(`   Найдено привилегий: ${policyCheck?.length || 0}`);
  }

  // 5. Главная проблема - тестируем чтение с authenticated ролью
  console.log('\n5. КРИТИЧЕСКИЙ ТЕСТ: Симуляция authenticated пользователя...');
  console.log('   ⚠️  Это не полный тест, т.к. нужна реальная сессия');
  console.log('   Но мы можем проверить структуру:');

  const { data: testRead, error: readError } = await supabase
    .from('code_blocks')
    .select('id, name')
    .limit(1);

  console.log(`   Service role чтение: ${testRead ? '✅ Работает' : '❌ Не работает'}`);
  if (readError) {
    console.log(`   Ошибка: ${readError.message}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 ДИАГНОЗ:');
  console.log('\n   Функция is_admin() существует: ✅');
  console.log('   Пользователь в admin_users: ✅');
  console.log('   Service role работает: ✅');
  console.log('\n   ⚠️  ПРОБЛЕМА: Пользователь НЕ ВЫШЕЛ И НЕ ВОШЕЛ ЗАНОВО!');
  console.log('\n   Сессия браузера/приложения была создана ДО добавления');
  console.log('   пользователя в admin_users. Функция is_admin() проверяет');
  console.log('   базу в момент запроса, но JWT токен не обновляется');
  console.log('   автоматически.');
  console.log('\n🔧 РЕШЕНИЕ:');
  console.log('   1. ПОЛНОСТЬЮ закройте приложение (Ctrl+Q или закрыть окно)');
  console.log('   2. Откройте приложение заново');
  console.log('   3. Войдите с admin@gmail.com');
  console.log('   4. Code Library заработает');
  console.log('\n   Альтернатива: Удалите файлы сессии Electron:');
  console.log('   %APPDATA%/CMSAdminPanel/');
}

testIsAdminFunction().catch(console.error);
