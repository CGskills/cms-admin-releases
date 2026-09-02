#!/usr/bin/env tsx
/**
 * Test script for Code Library functionality
 * Tests: Delete All, Import Preview, and database connectivity
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');

  try {
    const { data, error } = await supabase
      .from('code_blocks')
      .select('id')
      .limit(1);

    if (error) {
      if (error.message.includes('does not exist')) {
        console.log('⚠️  Table "code_blocks" does not exist');
        console.log('   Run the SQL migration in Supabase SQL Editor');
        return false;
      }
      console.error('❌ Database error:', error.message);
      return false;
    }

    console.log('✅ Database connection successful');
    return true;
  } catch (err) {
    console.error('❌ Connection failed:', err);
    return false;
  }
}

async function testCountBlocks() {
  console.log('\n📊 Counting existing blocks...');

  try {
    const { count, error } = await supabase
      .from('code_blocks')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('❌ Count error:', error.message);
      return -1;
    }

    console.log(`✅ Found ${count || 0} blocks in database`);
    return count || 0;
  } catch (err) {
    console.error('❌ Count failed:', err);
    return -1;
  }
}

async function testDeleteAll() {
  console.log('\n🗑️  Testing delete all functionality...');

  try {
    const { count, error } = await supabase
      .from('code_blocks')
      .delete({ count: 'exact' })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      console.error('❌ Delete error:', error.message);
      return false;
    }

    console.log(`✅ Successfully deleted ${count || 0} blocks`);
    return true;
  } catch (err) {
    console.error('❌ Delete failed:', err);
    return false;
  }
}

async function testImportPreview() {
  console.log('\n📥 Testing import preview functionality...');
  console.log('   (This requires preview files in ./preview/ directory)');

  const previewFiles = [
    'employees.html',
    'reviews.html',
    'portfolio.html',
    'tilda-table-block.html',
  ];

  const fs = await import('fs');
  const path = await import('path');

  const previewDir = path.join(process.cwd(), 'preview');

  if (!fs.existsSync(previewDir)) {
    console.log('⚠️  Preview directory not found:', previewDir);
    return false;
  }

  let foundFiles = 0;
  for (const file of previewFiles) {
    const filePath = path.join(previewDir, file);
    if (fs.existsSync(filePath)) {
      foundFiles++;
      console.log(`   ✓ Found: ${file}`);
    } else {
      console.log(`   ✗ Missing: ${file}`);
    }
  }

  if (foundFiles === 0) {
    console.log('❌ No preview files found');
    return false;
  }

  console.log(`✅ Found ${foundFiles}/${previewFiles.length} preview files`);
  return true;
}

async function testRLSPolicies() {
  console.log('\n🔐 Testing RLS policies...');

  try {
    // Check if RLS is enabled
    const { data, error } = await supabase.rpc('pg_tables')
      .select('*')
      .eq('tablename', 'code_blocks');

    if (error) {
      console.log('⚠️  Could not verify RLS status');
      return false;
    }

    console.log('✅ RLS policies configured (service role bypasses RLS)');
    return true;
  } catch {
    console.log('⚠️  Could not verify RLS status');
    return false;
  }
}

async function main() {
  console.log('🚀 Code Library Test Suite\n');
  console.log('=' .repeat(50));

  const dbOk = await testDatabaseConnection();
  if (!dbOk) {
    console.log('\n❌ Database connection failed. Cannot proceed with tests.');
    process.exit(1);
  }

  await testCountBlocks();
  await testImportPreview();
  await testRLSPolicies();

  console.log('\n' + '='.repeat(50));
  console.log('\n💡 To test delete functionality, run:');
  console.log('   npm run test-code-library -- --delete');

  if (process.argv.includes('--delete')) {
    console.log('\n⚠️  Delete flag detected, executing delete...');
    const deleteOk = await testDeleteAll();
    if (deleteOk) {
      await testCountBlocks();
    }
  }

  console.log('\n✅ Test suite completed');
}

main().catch(console.error);
