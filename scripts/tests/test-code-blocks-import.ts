import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = 'https://pjujhrfkykxgzcexyyti.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
if (!SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');

async function testImport() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  console.log('🔍 Testing Code Blocks Import...\n');

  // Check if table exists and current records
  console.log('1. Checking existing records...');
  const { data: existing, error: checkError } = await supabase
    .from('code_blocks')
    .select('id, name, category, version')
    .order('created_at', { ascending: false });

  if (checkError) {
    console.log('❌ Error checking table:', checkError.message);
    return;
  }

  console.log(`   Found ${existing?.length || 0} existing records`);
  if (existing && existing.length > 0) {
    existing.forEach(r => console.log(`   - ${r.name} (${r.category}) v${r.version}`));
  }

  console.log('\n2. Testing file import...');
  const previewDir = join(process.cwd(), 'preview');

  const blocks = [
    { name: 'Сотрудники — Карусель', category: 'team', file: 'employees.html' },
    { name: 'Отзывы — Карусель с QR', category: 'reviews', file: 'reviews.html' },
    { name: 'Портфолио — До/После', category: 'before_after', file: 'portfolio.html' },
    { name: 'Прайс-лист — Таблица', category: 'custom_ui', file: 'tilda-table-block.html' },
  ];

  const results = [];

  for (const block of blocks) {
    try {
      const filePath = join(previewDir, block.file);
      const rawContent = readFileSync(filePath, 'utf-8');

      console.log(`\n   Testing ${block.name}...`);
      console.log(`   - File size: ${rawContent.length} bytes`);

      // Try inserting
      const { data: inserted, error } = await supabase
        .from('code_blocks')
        .insert({
          name: block.name,
          description: `Test import ${block.name}`,
          category: block.category,
          html: rawContent,
          css: '',
          javascript: '',
          version: '1.0.0',
          status: 'ready',
          dependencies: [],
        })
        .select('id, html')
        .single();

      if (error) {
        console.log(`   ❌ Error: ${error.message}`);
        console.log(`   Error code: ${error.code}`);
        console.log(`   Error details:`, error.details);
        results.push({ name: block.name, error: error.message, code: error.code });
      } else {
        const storedLen = (inserted?.html || '').length;
        console.log(`   ✅ Success! Stored ${storedLen} chars`);
        results.push({ name: block.name, success: true, id: inserted.id });

        // Clean up test record
        await supabase.from('code_blocks').delete().eq('id', inserted.id);
        console.log(`   🧹 Cleaned up test record`);
      }
    } catch (e) {
      console.log(`   ❌ Exception: ${e instanceof Error ? e.message : String(e)}`);
      results.push({ name: block.name, error: e instanceof Error ? e.message : 'Unknown error' });
    }
  }

  console.log('\n📊 Summary:');
  console.log('Successes:', results.filter(r => r.success).length);
  console.log('Errors:', results.filter(r => r.error).length);

  if (results.some(r => r.error)) {
    console.log('\n⚠️  Errors encountered:');
    results.filter(r => r.error).forEach(r => {
      console.log(`   - ${r.name}: ${r.error} ${r.code ? `(${r.code})` : ''}`);
    });
  }
}

testImport().catch(console.error);
