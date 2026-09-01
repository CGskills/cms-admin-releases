import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pjujhrfkykxgzcexyyti.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
if (!SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');

async function checkPricingTable() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  console.log('🔍 Checking pricing table structure...\n');

  // Get first item to see structure
  const { data: items, error } = await supabase
    .from('pricing')
    .select('*')
    .limit(5);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  if (!items || items.length === 0) {
    console.log('⚠️  No pricing items found');
    return;
  }

  console.log(`✅ Found ${items.length} items\n`);

  console.log('📊 Table structure:');
  const firstItem = items[0];
  Object.keys(firstItem).forEach(key => {
    const value = firstItem[key];
    const type = typeof value;
    console.log(`   ${key}: ${type} = ${JSON.stringify(value).substring(0, 50)}...`);
  });

  console.log('\n📝 Sample items:');
  items.forEach((item, i) => {
    console.log(`\n${i + 1}. ${item.name}`);
    console.log(`   category: ${item.category}`);
    console.log(`   subsection: ${item.subsection || 'N/A'}`);
    console.log(`   price: ${item.price}`);
    console.log(`   duration: ${item.duration || 'N/A'}`);

    if (item.features) {
      const feat = typeof item.features === 'string' ? JSON.parse(item.features) : item.features;
      console.log(`   ✓ features:`);
      console.log(`     - meta: ${feat.meta || 'N/A'}`);
      console.log(`     - subtitle: ${feat.subtitle || 'N/A'}`);
      console.log(`     - subtitleTitle: ${feat.subtitleTitle || 'N/A'}`);
      console.log(`     - slideIndex: ${feat.slideIndex || 0}`);
    }
  });
}

checkPricingTable().catch(console.error);
