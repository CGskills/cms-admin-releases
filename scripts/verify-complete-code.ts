import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pjujhrfkykxgzcexyyti.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
if (!SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

console.log('🔍 ПРОВЕРКА ПОЛНОТЫ КОДА В БАЗЕ ДАННЫХ\n');
console.log('='.repeat(60));

async function verifyCodeCompleteness() {
  const { data: blocks, error } = await supabase
    .from('code_blocks')
    .select('id, name, category, html, css, javascript')
    .order('name');

  if (error) {
    console.log('❌ Ошибка чтения:', error.message);
    return;
  }

  console.log(`\n✅ Найдено ${blocks?.length || 0} блоков\n`);

  for (const block of blocks || []) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📦 ${block.name} (${block.category})`);
    console.log(`   ID: ${block.id}`);
    console.log(`${'='.repeat(60)}\n`);

    // HTML проверка
    const htmlLength = block.html?.length || 0;
    console.log(`HTML: ${htmlLength} символов`);

    if (htmlLength === 0) {
      console.log('❌ HTML ПУСТОЙ!');
    } else if (htmlLength < 1000) {
      console.log('⚠️  HTML слишком короткий (меньше 1000 символов)');
    } else {
      console.log('✅ HTML присутствует');

      // Проверка структуры HTML
      const html = block.html || '';
      const hasDoctype = html.includes('<!DOCTYPE') || html.includes('<!doctype');
      const hasHtml = html.includes('<html');
      const hasHead = html.includes('<head');
      const hasBody = html.includes('<body');
      const hasStyle = html.includes('<style') || html.includes('style=');
      const hasScript = html.includes('<script');

      console.log('\nСтруктура HTML:');
      console.log(`   <!DOCTYPE>: ${hasDoctype ? '✅' : '❌'}`);
      console.log(`   <html>: ${hasHtml ? '✅' : '❌'}`);
      console.log(`   <head>: ${hasHead ? '✅' : '❌'}`);
      console.log(`   <body>: ${hasBody ? '✅' : '❌'}`);
      console.log(`   <style>: ${hasStyle ? '✅' : '⚠️'}`);
      console.log(`   <script>: ${hasScript ? '✅' : '⚠️'}`);

      // Показать первые 200 символов
      console.log('\n📝 Начало HTML:');
      console.log(html.substring(0, 200).replace(/\n/g, ' '));

      // Показать последние 200 символов
      console.log('\n📝 Конец HTML:');
      console.log(html.substring(html.length - 200).replace(/\n/g, ' '));
    }

    // CSS проверка
    const cssLength = block.css?.length || 0;
    console.log(`\nCSS: ${cssLength} символов`);
    if (cssLength > 0) {
      console.log('✅ CSS присутствует');
    } else {
      console.log('⚠️  CSS пустой (может быть в HTML)');
    }

    // JS проверка
    const jsLength = block.javascript?.length || 0;
    console.log(`\nJS: ${jsLength} символов`);
    if (jsLength > 0) {
      console.log('✅ JS присутствует');
    } else {
      console.log('⚠️  JS пустой (может быть в HTML)');
    }
  }

  console.log(`\n\n${'='.repeat(60)}`);
  console.log('📊 ИТОГОВАЯ ДИАГНОСТИКА');
  console.log('='.repeat(60));

  const emptyBlocks = blocks?.filter(b => !b.html || b.html.length < 1000) || [];
  const completeBlocks = blocks?.filter(b => b.html && b.html.length >= 1000) || [];

  console.log(`\n✅ Полные блоки: ${completeBlocks.length}`);
  console.log(`❌ Неполные блоки: ${emptyBlocks.length}`);

  if (emptyBlocks.length > 0) {
    console.log('\n⚠️  ПРОБЛЕМНЫЕ БЛОКИ:');
    emptyBlocks.forEach(b => {
      console.log(`   - ${b.name}: ${b.html?.length || 0} символов`);
    });
  }

  if (completeBlocks.length === blocks?.length) {
    console.log('\n🎉 ВСЕ БЛОКИ СОДЕРЖАТ ПОЛНЫЙ КОД!');
  } else {
    console.log('\n❌ ЕСТЬ БЛОКИ БЕЗ ПОЛНОГО КОДА - ТРЕБУЕТСЯ ИСПРАВЛЕНИЕ');
  }
}

verifyCodeCompleteness().catch(console.error);
