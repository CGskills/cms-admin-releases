#!/usr/bin/env node
/**
 * Automated CMS Admin Health Check
 * Tests all critical functions of the admin panel
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pjujhrfkykxgzcexyyti.supabase.co';
const SUPABASE_KEY = 'sb_publishable_UZtIlbYBisAt6BIWSkiMqg_y09ZDEdw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  count?: number;
}

const results: TestResult[] = [];

function addResult(name: string, status: 'pass' | 'fail' | 'warn', message: string, count?: number) {
  results.push({ name, status, message, count });
}

function printResults() {
  console.log('\n' + '='.repeat(80));
  console.log(' HEALTH CHECK RESULTS');
  console.log('='.repeat(80) + '\n');

  let passed = 0;
  let failed = 0;
  let warnings = 0;

  for (const result of results) {
    const emoji = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
    const countStr = result.count !== undefined ? ` (${result.count} records)` : '';
    console.log(`${emoji} ${result.name}${countStr}`);
    console.log(`   ${result.message}`);
    console.log('');

    if (result.status === 'pass') passed++;
    else if (result.status === 'fail') failed++;
    else warnings++;
  }

  console.log('='.repeat(80));
  console.log(`SUMMARY: ${passed} passed, ${failed} failed, ${warnings} warnings`);
  console.log('='.repeat(80) + '\n');

  if (failed === 0) {
    console.log('✅ ALL SYSTEMS OPERATIONAL\n');
    process.exit(0);
  } else {
    console.log('❌ SOME SYSTEMS NEED ATTENTION\n');
    process.exit(1);
  }
}

async function testPricing() {
  try {
    const { data, error, count } = await supabase
      .from('pricing')
      .select('*', { count: 'exact' })
      .order('order_index', { ascending: true })
      .limit(1);

    if (error) throw error;
    if (!count || count === 0) throw new Error('No pricing records found');

    addResult('Pricing Table', 'pass', `Successfully loaded pricing data`, count);
  } catch (error) {
    addResult('Pricing Table', 'fail', `Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function testTestimonials() {
  try {
    const { data, error, count } = await supabase
      .from('testimonials')
      .select('*', { count: 'exact' })
      .order('order_index', { ascending: true })
      .limit(1);

    if (error) throw error;
    if (!count || count === 0) throw new Error('No testimonials found');

    addResult('Testimonials Table', 'pass', `Successfully loaded testimonials data`, count);
  } catch (error) {
    addResult('Testimonials Table', 'fail', `Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function testEmployees() {
  try {
    const { data, error, count } = await supabase
      .from('employees')
      .select('*', { count: 'exact' })
      .order('order_index', { ascending: true })
      .limit(1);

    if (error) throw error;
    if (!count || count === 0) throw new Error('No employees found');

    addResult('Employees Table', 'pass', `Successfully loaded employees data`, count);
  } catch (error) {
    addResult('Employees Table', 'fail', `Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function testPortfolio() {
  try {
    const { data, error, count } = await supabase
      .from('portfolio_items')
      .select('*', { count: 'exact' })
      .order('order_index', { ascending: true })
      .limit(1);

    if (error) throw error;
    if (!count || count === 0) throw new Error('No portfolio items found');

    addResult('Portfolio Table', 'pass', `Successfully loaded portfolio data`, count);
  } catch (error) {
    addResult('Portfolio Table', 'fail', `Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('pricing')
      .select('id')
      .limit(1);

    if (error) throw error;

    addResult('Supabase Connection', 'pass', 'Successfully connected to Supabase');
  } catch (error) {
    addResult('Supabase Connection', 'fail', `Connection failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function runHealthCheck() {
  console.log('\n🔍 Starting CMS Admin Health Check...\n');

  await testConnection();
  await testPricing();
  await testTestimonials();
  await testEmployees();
  await testPortfolio();

  printResults();
}

runHealthCheck().catch((error) => {
  console.error('❌ Health check failed:', error);
  process.exit(1);
});
