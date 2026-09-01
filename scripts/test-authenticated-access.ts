import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
if (!SUPABASE_URL) throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
if (!ANON_KEY) throw new Error('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required');

console.log('🔍 ТЕСТ AUTHENTICATED ДОСТУПА К CODE_BLOCKS\n');
console.log('='.repeat(60));

async function testAuthenticatedAccess() {
  const supabase = createClient(SUPABASE_URL, ANON_KEY);

  console.log('\n1. Попытка входа с admin@gmail.com...');

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@gmail.com',
    password: 'admin123',
  });

  if (authError) {
    console.log('❌ Вход не удался:', authError.message);
    console.log('\n⚠️  ПАРОЛЬ МОЖЕТ БЫТЬ НЕВЕРНЫМ.');
    console.log('   Используйте правильный пароль для admin@gmail.com');
    console.log('\n📝 Если пароль неизвестен, сбросьте его в Supabase Dashboard:');
    console.log('   1. Откройте https://supabase.com/dashboard/project/pjujhrfkykxgzcexyyti/auth/users');
    console.log('   2. Найдите admin@gmail.com');
    console.log('   3. Нажмите "..." → "Reset Password"');
    console.log('   4. Установите новый пароль');
    return;
  }

  console.log('✅ Вход успешен!');
  console.log(`   User ID: ${authData.user?.id}`);
  console.log(`   Email: ${authData.user?.email}`);

  console.log('\n2. Проверка is_admin() функции через RPC...');

  const { data: isAdminResult, error: isAdminError } = await supabase.rpc('is_admin');

  if (isAdminError) {
    console.log('❌ Ошибка вызова is_admin():', isAdminError.message);
  } else {
    console.log(`   is_admin() результат: ${isAdminResult}`);
    if (isAdminResult === true) {
      console.log('   ✅ Пользователь определен как admin!');
    } else {
      console.log('   ❌ is_admin() возвращает false!');
      console.log('\n   🔍 ДИАГНОСТИКА:');
      console.log('   Возможные причины:');
      console.log('   1. Пользователь НЕ в таблице admin_users');
      console.log('   2. is_active = false в admin_users');
      console.log('   3. user_id не совпадает');
    }
  }

  console.log('\n3. Попытка чтения code_blocks...');

  const { data: blocks, error: blocksError } = await supabase
    .from('code_blocks')
    .select('id, name, html')
    .limit(5);

  if (blocksError) {
    console.log('❌ Ошибка чтения code_blocks:', blocksError.message);
    console.log('   Код ошибки:', blocksError.code);
    console.log('   Детали:', blocksError.details);

    if (blocksError.code === 'PGRST301' || blocksError.message.includes('permission denied') || blocksError.message.includes('row-level security')) {
      console.log('\n   ⚠️  ПРОБЛЕМА: RLS политика блокирует доступ!');
      console.log('\n   Причина: is_admin() возвращает false для этой сессии.');
      console.log('\n   🔧 РЕШЕНИЕ:');
      console.log('   1. Полностью закройте приложение CMS Admin Panel');
      console.log('   2. Откройте приложение заново');
      console.log('   3. Войдите с admin@gmail.com');
      console.log('   4. Новая сессия будет иметь admin права');
    }
  } else if (!blocks || blocks.length === 0) {
    console.log('⚠️  Нет данных в code_blocks (таблица пустая)');
  } else {
    console.log(`✅ Успешно прочитано ${blocks.length} блоков:`);
    blocks.forEach((block, i) => {
      console.log(`   ${i + 1}. ${block.name} (HTML: ${block.html?.length || 0} символов)`);
    });
  }

  console.log('\n4. Попытка вставки тестовой записи...');

  const { data: insertData, error: insertError } = await supabase
    .from('code_blocks')
    .insert({
      name: 'TEST — Delete Me',
      description: 'Тестовая запись для проверки прав',
      category: 'other',
      html: '<div>Test</div>',
      css: '',
      javascript: '',
      version: '1.0.0',
      status: 'draft',
    })
    .select('id')
    .single();

  if (insertError) {
    console.log('❌ Вставка не удалась:', insertError.message);
    if (insertError.message.includes('permission denied') || insertError.message.includes('row-level security')) {
      console.log('   ⚠️  RLS политика блокирует запись (is_admin() = false)');
    }
  } else {
    console.log('✅ Тестовая запись создана:', insertData?.id);

    // Удаляем тестовую запись
    const { error: deleteError } = await supabase
      .from('code_blocks')
      .delete()
      .eq('id', insertData?.id);

    if (deleteError) {
      console.log('⚠️  Не удалось удалить тестовую запись:', deleteError.message);
    } else {
      console.log('   Тестовая запись удалена');
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 ИТОГОВАЯ ДИАГНОСТИКА:');
  console.log('='.repeat(60));

  if (!blocksError && blocks && blocks.length > 0) {
    console.log('\n🎉 ВСЁ РАБОТАЕТ!');
    console.log('   ✅ Авторизация работает');
    console.log('   ✅ is_admin() возвращает true');
    console.log('   ✅ Чтение code_blocks работает');
    console.log('   ✅ Запись работает');
    console.log('\n   Если в приложении всё равно ошибка:');
    console.log('   - Проверьте консоль браузера (F12)');
    console.log('   - Проверьте Network tab на ошибки API');
    console.log('   - Убедитесь, что используется тот же пользователь');
  } else if (authError) {
    console.log('\n❌ ВХОД НЕ УДАЛСЯ');
    console.log('   Проверьте пароль для admin@gmail.com');
  } else if (isAdminResult === false) {
    console.log('\n❌ is_admin() ВОЗВРАЩАЕТ FALSE');
    console.log('   Backend настроен правильно, но:');
    console.log('   1. Пользователь в базе: ✅');
    console.log('   2. is_admin() function: ✅');
    console.log('   3. Но сессия старая: ❌');
    console.log('\n   🔧 РЕШЕНИЕ: ПЕРЕЗАПУСТИТЕ ПРИЛОЖЕНИЕ');
  } else if (blocksError) {
    console.log('\n❌ ОШИБКА ДОСТУПА К CODE_BLOCKS');
    console.log('   RLS политика блокирует доступ');
    console.log('   is_admin() возвращает false');
    console.log('\n   🔧 РЕШЕНИЕ: ПЕРЕЗАПУСТИТЕ ПРИЛОЖЕНИЕ');
  }
}

testAuthenticatedAccess().catch((err) => {
  console.error('\n💥 Критическая ошибка:', err);
});
