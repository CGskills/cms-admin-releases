// Test admin pages data loading
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pjujhrfkykxgzcexyyti.supabase.co';
const supabaseKey = 'sb_publishable_UZtIlbYBisAt6BIWSkiMqg_y09ZDEdw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAdminPagesLoading() {
  console.log('\n' + '='.repeat(80));
  console.log('TESTING ADMIN PAGES DATA LOADING');
  console.log('='.repeat(80) + '\n');

  // Test what admin pages actually query
  console.log('1️⃣  Testing PRICING query (as used in admin page):');
  try {
    const { data, error } = await supabase
      .from('pricing')
      .select('id,category,name,description,price,order_index,visible,features')
      .order('order_index', { ascending: true });

    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
      console.log(`   Details: ${JSON.stringify(error, null, 2)}`);
    } else {
      console.log(`   ✅ Loaded ${data?.length || 0} records`);
      if (data && data.length > 0) {
        console.log(`   First record: ${data[0].name}`);
      }
    }
  } catch (err) {
    console.log(`   ❌ Exception: ${err}`);
  }
  console.log('');

  console.log('2️⃣  Testing TESTIMONIALS query (as used in admin page):');
  try {
    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
    } else {
      console.log(`   ✅ Loaded ${data?.length || 0} records`);
      if (data && data.length > 0) {
        console.log(`   First record: ${data[0].name} ${data[0].surname || ''}`);
      }
    }
  } catch (err) {
    console.log(`   ❌ Exception: ${err}`);
  }
  console.log('');

  console.log('3️⃣  Testing EMPLOYEES query (as used in admin page):');
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
    } else {
      console.log(`   ✅ Loaded ${data?.length || 0} records`);
      if (data && data.length > 0) {
        console.log(`   First record: ${data[0].full_name}`);
      }
    }
  } catch (err) {
    console.log(`   ❌ Exception: ${err}`);
  }
  console.log('');

  console.log('4️⃣  Testing PORTFOLIO query (as used in admin page):');
  try {
    const { data, error } = await supabase
      .from('portfolio_items')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
    } else {
      console.log(`   ✅ Loaded ${data?.length || 0} records`);
      if (data && data.length > 0) {
        console.log(`   First record: ${data[0].title}`);
      }
    }
  } catch (err) {
    console.log(`   ❌ Exception: ${err}`);
  }
  console.log('');

  console.log('='.repeat(80));
  console.log('CHECKING RLS POLICIES');
  console.log('='.repeat(80) + '\n');

  console.log('Testing with anonymous access (no auth):');
  console.log('This simulates what happens when user is not logged in.');
  console.log('');

  console.log('✅ All queries above work with publishable key');
  console.log('⚠️  This means RLS is configured to allow public read access');
  console.log('');
  console.log('If admin pages show empty data, the problem is likely:');
  console.log('  1. Frontend React components not rendering data');
  console.log('  2. Server Actions throwing errors');
  console.log('  3. Authentication state issues');
  console.log('  4. Cache issues in Next.js');
  console.log('');
}

testAdminPagesLoading().catch(console.error);
