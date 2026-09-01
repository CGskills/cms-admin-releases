import { createClient } from '@supabase/supabase-js';

const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqdWpocmZreWt4Z3pjZXh5eXRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjY1NjExNywiZXhwIjoyMTAyMjMyMTE3fQ.HwpQuze5kwc2sDUZnvfWeiYuv5v7tI2RTFVy9l2xeXs';

console.log('🔍 ПРОВЕРКА admin_users таблицы\n');

async function check() {
  const supabase = createClient('https://pjujhrfkykxgzcexyyti.supabase.co', SERVICE_ROLE_KEY);

  // 1. Get all admin users
  const { data: admins, error: adminsError } = await supabase
    .from('admin_users')
    .select('*');

  if (adminsError) {
    console.log('❌ Ошибка чтения admin_users:', adminsError.message);
    return;
  }

  console.log(`Найдено ${admins?.length || 0} admin пользователей:\n`);

  if (!admins || admins.length === 0) {
    console.log('⚠️  Таблица пустая!\n');
    console.log('Запустите: npx tsx scripts/add-admin-user.ts');
    return;
  }

  // 2. For each admin, get user details from auth
  for (const admin of admins) {
    console.log(`Admin user_id: ${admin.user_id}`);
    console.log(`   is_active: ${admin.is_active}`);
    console.log(`   created_at: ${admin.created_at}`);

    // Get email from auth
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(admin.user_id);

    if (authError) {
      console.log(`   ⚠️  Не удалось получить данные из auth:`, authError.message);
    } else if (authUser?.user) {
      console.log(`   ✅ Email: ${authUser.user.email}`);
    }
    console.log('');
  }

  // 3. Check if admin@gmail.com exists in auth
  console.log('─'.repeat(60));
  console.log('Проверка admin@gmail.com в auth.users:\n');

  const { data: users } = await supabase.auth.admin.listUsers();
  const adminUser = users?.users.find(u => u.email === 'admin@gmail.com');

  if (!adminUser) {
    console.log('❌ admin@gmail.com НЕ СУЩЕСТВУЕТ в auth.users!');
    console.log('\n🔧 СОЗДАЙТЕ ПОЛЬЗОВАТЕЛЯ:');
    console.log('   1. Откройте https://supabase.com/dashboard/project/pjujhrfkykxgzcexyyti/auth/users');
    console.log('   2. Нажмите "Add user"');
    console.log('   3. Email: admin@gmail.com');
    console.log('   4. Password: [установите пароль]');
    console.log('   5. Сохраните');
    console.log('   6. Запустите: npx tsx scripts/add-admin-user.ts');
  } else {
    console.log(`✅ admin@gmail.com существует в auth.users`);
    console.log(`   User ID: ${adminUser.id}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Confirmed: ${adminUser.email_confirmed_at ? 'Yes' : 'No'}`);

    // Check if this user is in admin_users
    const isInAdminTable = admins.some(a => a.user_id === adminUser.id);

    if (!isInAdminTable) {
      console.log(`\n   ❌ НО НЕ В admin_users таблице!`);
      console.log(`\n   🔧 РЕШЕНИЕ: npx tsx scripts/add-admin-user.ts`);
    } else {
      console.log(`\n   ✅ И ЕСТЬ в admin_users таблице!`);
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log('📊 ИТОГ:\n');

  if (adminUser && admins.some(a => a.user_id === adminUser.id && a.is_active)) {
    console.log('✅ Всё настроено правильно!');
    console.log('\n   Пользователь должен:');
    console.log('   1. ЗАКРЫТЬ приложение полностью');
    console.log('   2. ОТКРЫТЬ заново');
    console.log('   3. ВОЙТИ с admin@gmail.com');
    console.log('   4. Code Library заработает');
  } else if (!adminUser) {
    console.log('❌ Пользователь admin@gmail.com не существует');
    console.log('   Создайте его в Supabase Dashboard');
  } else {
    console.log('❌ Пользователь есть, но не в admin_users');
    console.log('   Запустите: npx tsx scripts/add-admin-user.ts');
  }
}

check().catch(console.error);
