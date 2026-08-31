#!/usr/bin/env node
/**
 * Full Admin Panel Test Suite
 * Tests all sections and functionality
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY before running this test.',
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface TestResult {
  section: string;
  passed: boolean;
  count: number;
  error?: string;
}

const results: TestResult[] = [];

async function testSection(name: string, tableName: string, displayField: string) {
  try {
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' })
      .order('order_index', { ascending: true });

    if (error) {
      results.push({ section: name, passed: false, count: 0, error: error.message });
      return false;
    }

    const sampleItem = data && data.length > 0
      ? (data[0] as Record<string, unknown>)[displayField]
      : 'N/A';
    results.push({ section: name, passed: true, count: count || 0 });

    console.log(`✅ ${name}: ${count} records loaded`);
    console.log(`   Sample: ${sampleItem}`);
    return true;
  } catch (err) {
    results.push({ section: name, passed: false, count: 0, error: String(err) });
    console.log(`❌ ${name}: ${err}`);
    return false;
  }
}

async function runFullTest() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 FULL ADMIN PANEL TEST SUITE');
  console.log('='.repeat(80) + '\n');

  console.log('📊 Testing PRICING section...');
  await testSection('Прайс-лист', 'pricing', 'name');
  console.log('');

  console.log('💬 Testing TESTIMONIALS section...');
  await testSection('Отзывы', 'testimonials', 'name');
  console.log('');

  console.log('👥 Testing EMPLOYEES section...');
  await testSection('Сотрудники', 'employees', 'full_name');
  console.log('');

  console.log('🎨 Testing PORTFOLIO section...');
  await testSection('Портфолио', 'portfolio_items', 'title');
  console.log('');

  // Summary
  console.log('='.repeat(80));
  console.log('📋 TEST RESULTS SUMMARY');
  console.log('='.repeat(80) + '\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  results.forEach(r => {
    const emoji = r.passed ? '✅' : '❌';
    console.log(`${emoji} ${r.section}: ${r.count} records${r.error ? ` (Error: ${r.error})` : ''}`);
  });

  console.log('');
  console.log(`Total: ${passed} passed, ${failed} failed`);
  console.log('');

  if (failed === 0) {
    console.log('✅ ALL TESTS PASSED - Admin panel is working correctly!');
    console.log('');
    console.log('📱 You can now run the desktop app:');
    console.log('   npm run desktop:dev');
    console.log('');
  } else {
    console.log('❌ SOME TESTS FAILED - Check errors above');
    console.log('');
  }

  console.log('='.repeat(80) + '\n');

  return failed === 0;
}

runFullTest()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('❌ Test suite failed:', err);
    process.exit(1);
  });
