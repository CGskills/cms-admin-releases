/**
 * Test Save → Reload cycle for code blocks
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSaveReload() {
  console.log('=== TESTING SAVE → RELOAD CYCLE ===\n');

  // Step 1: Get a code block
  const { data: blocks } = await supabase
    .from('code_blocks')
    .select('*')
    .limit(1);

  if (!blocks || blocks.length === 0) {
    console.log('❌ No blocks to test');
    return;
  }

  const originalBlock = blocks[0];
  console.log(`Testing block: ${originalBlock.name}`);
  console.log(`Original HTML length: ${(originalBlock.html || '').length}`);
  console.log(`Original CSS length: ${(originalBlock.css || '').length}`);
  console.log(`Original JS length: ${(originalBlock.javascript || '').length}\n`);

  // Step 2: Modify the block
  const modifiedHtml = originalBlock.html + '\n<!-- TEST MODIFICATION -->';
  const modifiedCss = originalBlock.css + '\n/* TEST MODIFICATION */';
  const modifiedJs = originalBlock.javascript + '\n// TEST MODIFICATION';

  console.log('Saving modified block...');
  const { error: updateError } = await supabase
    .from('code_blocks')
    .update({
      html: modifiedHtml,
      css: modifiedCss,
      javascript: modifiedJs,
    })
    .eq('id', originalBlock.id);

  if (updateError) {
    console.log('❌ Save failed:', updateError);
    return;
  }

  console.log('✅ Save successful\n');

  // Step 3: Reload the block
  console.log('Reloading block...');
  const { data: reloadedBlocks, error: reloadError } = await supabase
    .from('code_blocks')
    .select('*')
    .eq('id', originalBlock.id);

  if (reloadError || !reloadedBlocks || reloadedBlocks.length === 0) {
    console.log('❌ Reload failed:', reloadError);
    return;
  }

  const reloadedBlock = reloadedBlocks[0];
  console.log('✅ Reload successful\n');

  // Step 4: Verify modifications persisted
  console.log('Verifying modifications...');

  const htmlMatch = reloadedBlock.html === modifiedHtml;
  const cssMatch = reloadedBlock.css === modifiedCss;
  const jsMatch = reloadedBlock.javascript === modifiedJs;

  console.log(`HTML preserved: ${htmlMatch ? '✅' : '❌'}`);
  console.log(`CSS preserved: ${cssMatch ? '✅' : '❌'}`);
  console.log(`JavaScript preserved: ${jsMatch ? '✅' : '❌'}\n`);

  // Step 5: Restore original
  console.log('Restoring original...');
  await supabase
    .from('code_blocks')
    .update({
      html: originalBlock.html,
      css: originalBlock.css,
      javascript: originalBlock.javascript,
    })
    .eq('id', originalBlock.id);

  console.log('✅ Restored\n');

  // Final result
  if (htmlMatch && cssMatch && jsMatch) {
    console.log('🎉 SAVE → RELOAD TEST PASSED');
    console.log('All modifications persisted correctly!');
  } else {
    console.log('❌ SAVE → RELOAD TEST FAILED');
    console.log('Some modifications were lost!');
  }
}

testSaveReload().catch(console.error);
