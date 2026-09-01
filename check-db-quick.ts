import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

async function checkDatabase() {
  const envContent = readFileSync(join(process.cwd(), '.env.local'), 'utf-8');
  const SUPABASE_URL = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim() || '';
  const PUBLISHABLE_KEY = envContent.match(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=(.+)/)?.[1]?.trim() || '';

  const supabase = createClient(SUPABASE_URL, PUBLISHABLE_KEY);

  console.log('🔍 Checking code_blocks with anon access...\n');
  console.log('URL:', SUPABASE_URL);
  console.log('');

  const { data, error, count } = await supabase
    .from('code_blocks')
    .select('id, name, category, status, html, css, javascript', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.log('❌ Error:', error.message);
    console.log('   Code:', error.code);
    console.log('   Details:', error.details || 'none');
    console.log('   Hint:', error.hint || 'none');
  } else {
    console.log(`✅ Found ${count} blocks\n`);
    if (data && data.length > 0) {
      data.forEach(block => {
        const htmlLen = block.html?.length || 0;
        const cssLen = block.css?.length || 0;
        const jsLen = block.javascript?.length || 0;
        const hasContent = htmlLen > 100;

        console.log(`${hasContent ? '✅' : '❌'} ${block.name} (${block.category})`);
        console.log(`   Status: ${block.status}`);
        console.log(`   HTML: ${htmlLen.toLocaleString()} chars`);
        console.log(`   CSS: ${cssLen.toLocaleString()} chars`);
        console.log(`   JS: ${jsLen.toLocaleString()} chars`);
        console.log('');
      });
    }
  }
}

checkDatabase().catch(console.error);
