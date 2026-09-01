import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = 'https://pjujhrfkykxgzcexyyti.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqdWpocmZreWt4Z3pjZXh5eXRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjY1NjExNywiZXhwIjoyMTAyMjMyMTE3fQ.HwpQuze5kwc2sDUZnvfWeiYuv5v7tI2RTFVy9l2xeXs';

async function updateEmployeesBlock() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  console.log('🔄 Updating employees block...\n');

  // Read the updated file
  const filePath = join(process.cwd(), 'preview', 'employees.html');
  const content = readFileSync(filePath, 'utf-8');

  // Find the employees block
  const { data: block, error: findError } = await supabase
    .from('code_blocks')
    .select('id, name, version')
    .eq('category', 'team')
    .eq('name', 'Сотрудники — Карусель')
    .single();

  if (findError || !block) {
    console.log('❌ Block not found:', findError?.message);
    return;
  }

  console.log(`Found block: ${block.name} (v${block.version})`);

  // Update the block
  const { error: updateError } = await supabase
    .from('code_blocks')
    .update({
      html: content,
      updated_at: new Date().toISOString()
    })
    .eq('id', block.id);

  if (updateError) {
    console.log('❌ Update failed:', updateError.message);
  } else {
    console.log('✅ Block updated successfully!');
    console.log(`   Changes:`);
    console.log(`   - "курсов повышения квалификации" → "Повышения квалификации"`);
    console.log(`   - Labels centered and aligned`);
  }
}

updateEmployeesBlock().catch(console.error);
