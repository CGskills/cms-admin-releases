/**
 * Verification script to check code blocks in database
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyCodeBlocks() {
  console.log('=== CODE BLOCKS VERIFICATION ===\n');

  // Fetch all code blocks
  const { data: blocks, error } = await supabase
    .from('code_blocks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching code blocks:', error);
    return;
  }

  if (!blocks || blocks.length === 0) {
    console.log('❌ No code blocks found in database\n');
    return;
  }

  console.log(`✅ Found ${blocks.length} code blocks\n`);

  // Verify each block
  for (const block of blocks) {
    console.log(`\n--- ${block.name} ---`);
    console.log(`ID: ${block.id}`);
    console.log(`Category: ${block.category}`);
    console.log(`Status: ${block.status}`);
    console.log(`Version: ${block.version}`);

    // Check HTML
    const htmlLength = (block.html || '').length;
    console.log(`HTML: ${htmlLength > 0 ? `✅ ${htmlLength} chars` : '❌ EMPTY'}`);

    // Check CSS
    const cssLength = (block.css || '').length;
    console.log(`CSS: ${cssLength > 0 ? `✅ ${cssLength} chars` : '❌ EMPTY'}`);

    // Check JavaScript
    const jsLength = (block.javascript || '').length;
    console.log(`JavaScript: ${jsLength > 0 ? `✅ ${jsLength} chars` : '❌ EMPTY'}`);

    // Check Dependencies
    const depsCount = (block.dependencies || []).length;
    console.log(`Dependencies: ${depsCount > 0 ? `✅ ${depsCount} items` : '⚠️  NONE'}`);

    if (depsCount > 0) {
      console.log('  Dependencies list:');
      for (const dep of block.dependencies || []) {
        console.log(`    - ${dep.name}: ${dep.cdnUrl || 'NO URL'}`);
      }
    }

    // Verify that HTML doesn't contain <style> or <script> tags
    const hasStyleTags = /<style[^>]*>/i.test(block.html || '');
    const hasScriptTags = /<script(?![^>]*\bsrc=)[^>]*>/i.test(block.html || '');

    if (hasStyleTags) {
      console.log('⚠️  WARNING: HTML still contains <style> tags');
    }

    if (hasScriptTags) {
      console.log('⚠️  WARNING: HTML still contains inline <script> tags');
    }

    // Overall status
    const isValid = htmlLength > 0 && cssLength > 0 && jsLength > 0 && !hasStyleTags && !hasScriptTags;
    console.log(`\nOverall: ${isValid ? '✅ VALID' : '❌ NEEDS FIX'}`);
  }

  console.log('\n\n=== SUMMARY ===');
  const validBlocks = blocks.filter(b => {
    const htmlLength = (b.html || '').length;
    const cssLength = (b.css || '').length;
    const jsLength = (b.javascript || '').length;
    const hasStyleTags = /<style[^>]*>/i.test(b.html || '');
    const hasScriptTags = /<script(?![^>]*\bsrc=)[^>]*>/i.test(b.html || '');
    return htmlLength > 0 && cssLength > 0 && jsLength > 0 && !hasStyleTags && !hasScriptTags;
  });

  console.log(`Total blocks: ${blocks.length}`);
  console.log(`Valid blocks: ${validBlocks.length}`);
  console.log(`Invalid blocks: ${blocks.length - validBlocks.length}`);

  if (validBlocks.length === blocks.length) {
    console.log('\n🎉 All code blocks are correctly parsed and stored!');
  } else {
    console.log('\n⚠️  Some code blocks need attention');
  }
}

verifyCodeBlocks().catch(console.error);
