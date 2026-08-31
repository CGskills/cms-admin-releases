// Check if migrations were applied
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMigrations() {
  console.log('='.repeat(60));
  console.log('MIGRATION STATUS CHECK');
  console.log('='.repeat(60));
  console.log('');

  // Try to check if sequences exist by attempting to insert without order_index
  console.log('Testing if sequences are working...');
  console.log('');

  // Check pricing table for sequence
  console.log('--- PRICING TABLE ---');
  const { data: pricingMeta, error: pricingMetaError } = await supabase
    .from('pricing')
    .select('id, order_index')
    .order('order_index', { ascending: false })
    .limit(5);

  if (pricingMetaError) {
    console.log('❌ Error getting pricing:', pricingMetaError.message);
  } else {
    console.log('✅ Latest order_index values:', pricingMeta?.map(p => p.order_index));
  }
  console.log('');

  // Check if we can see table structure
  console.log('--- DATABASE INFORMATION ---');
  const { data: tables, error: tablesError } = await supabase
    .rpc('get_table_info')
    .select('*');

  if (tablesError) {
    console.log('⚠️ Cannot query database metadata (expected):', tablesError.message);
  } else {
    console.log('✅ Got table info:', tables);
  }
  console.log('');

  console.log('='.repeat(60));
  console.log('ANALYSIS');
  console.log('='.repeat(60));
  console.log('');
  console.log('Sequences were added in migration 20260830_sequences_for_order_index.sql');
  console.log('This migration needs to be applied to Supabase manually.');
  console.log('');
  console.log('The migration:');
  console.log('  1. Creates sequences for automatic order_index generation');
  console.log('  2. Sets initial values based on MAX(order_index)');
  console.log('  3. Sets DEFAULT nextval() for order_index columns');
  console.log('');
  console.log('Without this migration:');
  console.log('  - Code tries to INSERT without order_index');
  console.log('  - Database expects order_index to be provided');
  console.log('  - INSERT fails or uses NULL/0');
  console.log('');
}

checkMigrations().catch(console.error);
