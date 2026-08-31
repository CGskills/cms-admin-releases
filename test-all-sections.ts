// Comprehensive API test for all admin sections
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pjujhrfkykxgzcexyyti.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_UZtIlbYBisAt6BIWSkiMqg_y09ZDEdw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAllSections() {
  console.log('\n' + '='.repeat(80));
  console.log('COMPREHENSIVE ADMIN SECTIONS TEST');
  console.log('='.repeat(80) + '\n');

  const results = {
    pricing: { success: false, count: 0, error: null as string | null },
    testimonials: { success: false, count: 0, error: null as string | null },
    employees: { success: false, count: 0, error: null as string | null },
    portfolio: { success: false, count: 0, error: null as string | null }
  };

  // Test PRICING
  console.log('🔍 Testing PRICING...');
  try {
    const { data, error, count } = await supabase
      .from('pricing')
      .select('*', { count: 'exact' })
      .order('order_index', { ascending: true });

    if (error) throw error;

    results.pricing.success = true;
    results.pricing.count = count || 0;
    console.log(`✅ PRICING: ${count} records loaded`);

    if (data && data.length > 0) {
      console.log(`   Sample: ${data[0].name} - ${data[0].category}`);
    }
  } catch (error) {
    results.pricing.error = error instanceof Error ? error.message : String(error);
    console.log(`❌ PRICING Error: ${results.pricing.error}`);
  }
  console.log('');

  // Test TESTIMONIALS
  console.log('🔍 Testing TESTIMONIALS...');
  try {
    const { data, error, count } = await supabase
      .from('testimonials')
      .select('*', { count: 'exact' })
      .order('order_index', { ascending: true });

    if (error) throw error;

    results.testimonials.success = true;
    results.testimonials.count = count || 0;
    console.log(`✅ TESTIMONIALS: ${count} records loaded`);

    if (data && data.length > 0) {
      const fullName = data[0].surname ? `${data[0].name} ${data[0].surname}` : data[0].name;
      console.log(`   Sample: ${fullName} - Rating: ${data[0].rating}/5`);
    }
  } catch (error) {
    results.testimonials.error = error instanceof Error ? error.message : String(error);
    console.log(`❌ TESTIMONIALS Error: ${results.testimonials.error}`);
  }
  console.log('');

  // Test EMPLOYEES
  console.log('🔍 Testing EMPLOYEES...');
  try {
    const { data, error, count } = await supabase
      .from('employees')
      .select('*', { count: 'exact' })
      .order('order_index', { ascending: true });

    if (error) throw error;

    results.employees.success = true;
    results.employees.count = count || 0;
    console.log(`✅ EMPLOYEES: ${count} records loaded`);

    if (data && data.length > 0) {
      console.log(`   Sample: ${data[0].full_name} - ${data[0].position}`);
    }
  } catch (error) {
    results.employees.error = error instanceof Error ? error.message : String(error);
    console.log(`❌ EMPLOYEES Error: ${results.employees.error}`);
  }
  console.log('');

  // Test PORTFOLIO
  console.log('🔍 Testing PORTFOLIO...');
  try {
    const { data, error, count } = await supabase
      .from('portfolio_items')
      .select('*', { count: 'exact' })
      .order('order_index', { ascending: true });

    if (error) throw error;

    results.portfolio.success = true;
    results.portfolio.count = count || 0;
    console.log(`✅ PORTFOLIO: ${count} records loaded`);

    if (data && data.length > 0) {
      console.log(`   Sample: ${data[0].title}`);
    }
  } catch (error) {
    results.portfolio.error = error instanceof Error ? error.message : String(error);
    console.log(`❌ PORTFOLIO Error: ${results.portfolio.error}`);
  }
  console.log('');

  // Summary
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80) + '\n');

  const emoji = (success: boolean) => success ? '✅' : '❌';

  console.log(`${emoji(results.pricing.success)} ПРАЙС-ЛИСТ:     ${results.pricing.count} записей`);
  if (results.pricing.error) console.log(`   Error: ${results.pricing.error}`);

  console.log(`${emoji(results.testimonials.success)} ОТЗЫВЫ:         ${results.testimonials.count} записей`);
  if (results.testimonials.error) console.log(`   Error: ${results.testimonials.error}`);

  console.log(`${emoji(results.employees.success)} СОТРУДНИКИ:     ${results.employees.count} записей`);
  if (results.employees.error) console.log(`   Error: ${results.employees.error}`);

  console.log(`${emoji(results.portfolio.success)} ПОРТФОЛИО:      ${results.portfolio.count} записей`);
  if (results.portfolio.error) console.log(`   Error: ${results.portfolio.error}`);

  console.log('\n' + '='.repeat(80));

  const allSuccess = results.pricing.success && results.testimonials.success &&
                     results.employees.success && results.portfolio.success;

  if (allSuccess) {
    console.log('✅ ALL SECTIONS WORKING CORRECTLY');
  } else {
    console.log('❌ SOME SECTIONS HAVE ISSUES - SEE ABOVE');
  }

  console.log('='.repeat(80) + '\n');

  return results;
}

testAllSections().catch(console.error);
