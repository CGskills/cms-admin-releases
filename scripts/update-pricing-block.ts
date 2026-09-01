import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = 'https://pjujhrfkykxgzcexyyti.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
if (!SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');

async function updatePricingBlock() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  console.log('🔄 Updating pricing block...\n');

  // Read the updated file
  const filePath = join(process.cwd(), 'preview', 'tilda-table-block.html');
  const content = readFileSync(filePath, 'utf-8');

  // Find the pricing block
  const { data: block, error: findError } = await supabase
    .from('code_blocks')
    .select('id, name, version')
    .eq('category', 'custom_ui')
    .eq('name', 'Прайс-лист — Таблица')
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
    console.log(`   Change: Now displays 'meta' field from features object`);
    console.log(`   Fixed: r.duration → feat.meta || r.duration`);
  }
}

updatePricingBlock().catch(console.error);
