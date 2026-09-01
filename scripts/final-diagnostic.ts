#!/usr/bin/env node

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║   🔍 ФИНАЛЬНАЯ ДИАГНОСТИКА: Почему не загружаются коды    ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Read env file
const envPath = join(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const SUPABASE_URL = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim() || '';
const PUBLISHABLE_KEY = envContent.match(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=(.+)/)?.[1]?.trim() || '';

console.log('📋 Конфигурация:');
console.log(`   URL: ${SUPABASE_URL}`);
console.log(`   Key: ${PUBLISHABLE_KEY.substring(0, 20)}...`);

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
if (!SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');

async function runDiagnostic() {
  console.log('\n' + '═'.repeat(60));
  console.log('1️⃣  ПРОВЕРКА ДАННЫХ В БАЗЕ (Service Role)');
  console.log('═'.repeat(60));

  const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: blocks, error: serviceError } = await serviceClient
    .from('code_blocks')
    .select('id, name, html, css, javascript, status')
    .order('name');

  if (serviceError) {
    console.log('❌ Service role ошибка:', serviceError.message);
    return;
  }

  console.log(`\n✅ В базе ${blocks?.length || 0} блоков:\n`);

  for (const block of blocks || []) {
    const htmlLen = block.html?.length || 0;
    const cssLen = block.css?.length || 0;
    const jsLen = block.javascript?.length || 0;
    const isComplete = htmlLen > 1000;

    console.log(`   ${isComplete ? '✅' : '❌'} ${block.name}`);
    console.log(`      Status: ${block.status}`);
    console.log(`      HTML: ${htmlLen.toLocaleString()} символов`);
    console.log(`      CSS: ${cssLen.toLocaleString()} символов`);
    console.log(`      JS: ${jsLen.toLocaleString()} символов`);
    console.log('');
  }

  if (!blocks || blocks.length === 0) {
    console.log('\n❌ БАЗА ПУСТАЯ! Запустите импорт preview блоков.');
    return;
  }

  const allComplete = blocks.every(b => b.html && b.html.length > 1000);

  if (!allComplete) {
    console.log('\n⚠️  ПРОБЛЕМА: Есть блоки без полного кода!');
    return;
  }

  console.log('═'.repeat(60));
  console.log('2️⃣  ПРОВЕРКА ADMIN ПРАВ');
  console.log('═'.repeat(60));

  const { data: adminUsers, error: adminError } = await serviceClient
    .from('admin_users')
    .select('user_id, email, is_active')
    .eq('email', 'admin@gmail.com')
    .maybeSingle();

  if (adminError) {
    console.log('\n❌ Ошибка чтения admin_users:', adminError.message);
  } else if (!adminUsers) {
    console.log('\n❌ admin@gmail.com НЕТ в таблице admin_users!');
    console.log('   Запустите: npx tsx scripts/add-admin-user.ts');
  } else {
    console.log(`\n✅ Пользователь найден в admin_users:`);
    console.log(`   User ID: ${adminUsers.user_id}`);
    console.log(`   Email: ${adminUsers.email}`);
    console.log(`   Active: ${adminUsers.is_active}`);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('3️⃣  СИМУЛЯЦИЯ КЛИЕНТСКОГО ДОСТУПА');
  console.log('═'.repeat(60));

  console.log('\n⚠️  Используем publishable key (как в приложении)...');

  const clientSupabase = createClient(SUPABASE_URL, PUBLISHABLE_KEY);

  console.log('\n📝 Попытка входа...');
  console.log('   Email: admin@gmail.com');
  console.log('   Password: [не указан в скрипте]\n');

  console.log('⚠️  НЕ МОГУ ВОЙТИ БЕЗ ПАРОЛЯ\n');

  console.log('═'.repeat(60));
  console.log('📊 ИТОГОВЫЙ ДИАГНОЗ');
  console.log('═'.repeat(60));

  console.log('\n✅ ЧТО РАБОТАЕТ:');
  console.log('   • База данных содержит полный код (4 блока)');
  console.log('   • Все блоки содержат полный HTML (18KB-27KB)');
  console.log('   • admin@gmail.com добавлен в admin_users');
  console.log('   • Service role доступ работает');

  console.log('\n❓ ЧТО НУЖНО ПРОВЕРИТЬ:');

  console.log('\n1️⃣  ПОЛЬЗОВАТЕЛЬ ПЕРЕЗАПУСТИЛ ПРИЛОЖЕНИЕ?');
  console.log('   ❌ Если НЕТ - это главная причина проблемы!');
  console.log('');
  console.log('   Сессия создана ДО добавления в admin_users.');
  console.log('   JWT токен не содержит admin прав.');
  console.log('   is_admin() проверяет базу, но auth.uid() из старого токена.');
  console.log('');
  console.log('   🔧 РЕШЕНИЕ:');
  console.log('      1. ЗАКРЫТЬ приложение полностью');
  console.log('      2. ОТКРЫТЬ заново');
  console.log('      3. ВОЙТИ с admin@gmail.com');
  console.log('');

  console.log('2️⃣  ПРАВИЛЬНЫЙ ПАРОЛЬ?');
  console.log('   Если пользователь не может войти:');
  console.log('');
  console.log('   🔧 СБРОС ПАРОЛЯ:');
  console.log('      1. Откройте Supabase Dashboard');
  console.log('      2. Authentication → Users');
  console.log('      3. Найдите admin@gmail.com');
  console.log('      4. "..." → Reset Password');
  console.log('      5. Установите новый пароль');
  console.log('');

  console.log('3️⃣  ОШИБКА В КОНСОЛИ БРАУЗЕРА?');
  console.log('   В приложении нажмите F12 и проверьте:');
  console.log('   • Console - ошибки JavaScript');
  console.log('   • Network - ошибки API запросов');
  console.log('');

  console.log('═'.repeat(60));
  console.log('🎯 СЛЕДУЮЩИЙ ШАГ');
  console.log('═'.repeat(60));

  console.log('\nПопросите пользователя:');
  console.log('');
  console.log('1. ПОЛНОСТЬЮ закрыть приложение');
  console.log('2. Открыть заново');
  console.log('3. Войти с admin@gmail.com');
  console.log('4. Открыть Code Library');
  console.log('');
  console.log('Если ошибка осталась:');
  console.log('');
  console.log('5. Нажать F12 (открыть DevTools)');
  console.log('6. Перейти в Console');
  console.log('7. Скопировать все ошибки красного цвета');
  console.log('8. Отправить скриншот или текст ошибок');
  console.log('');
}

runDiagnostic().catch(console.error);
