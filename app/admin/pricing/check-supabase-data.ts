// Diagnostic script to check Supabase data
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('='.repeat(60));
  console.log('SUPABASE DATA DIAGNOSTIC');
  console.log('='.repeat(60));
  console.log('Project URL:', supabaseUrl);
  console.log('');

  // Check pricing
  console.log('--- PRICING TABLE ---');
  const { data: pricing, error: pricingError, count: pricingCount } = await supabase
    .from('pricing')
    .select('*', { count: 'exact' })
    .limit(5);

  if (pricingError) {
    console.log('❌ Error:', pricingError.message);
  } else {
    console.log(`✅ Found ${pricingCount} records`);
    if (pricing && pricing.length > 0) {
      console.log('Sample records:', pricing.map(p => ({ id: p.id, name: p.name, category: p.category })));
    }
  }
  console.log('');

  // Check testimonials
  console.log('--- TESTIMONIALS TABLE ---');
  const { data: testimonials, error: testimonialsError, count: testimonialsCount } = await supabase
    .from('testimonials')
    .select('*', { count: 'exact' })
    .limit(5);

  if (testimonialsError) {
    console.log('❌ Error:', testimonialsError.message);
  } else {
    console.log(`✅ Found ${testimonialsCount} records`);
    if (testimonials && testimonials.length > 0) {
      console.log('Sample records:', testimonials.map(t => ({ id: t.id, author: t.author })));
    }
  }
  console.log('');

  // Check employees
  console.log('--- EMPLOYEES TABLE ---');
  const { data: employees, error: employeesError, count: employeesCount } = await supabase
    .from('employees')
    .select('*', { count: 'exact' })
    .limit(5);

  if (employeesError) {
    console.log('❌ Error:', employeesError.message);
  } else {
    console.log(`✅ Found ${employeesCount} records`);
    if (employees && employees.length > 0) {
      console.log('Sample records:', employees.map(e => ({ id: e.id, name: e.name })));
    }
  }
  console.log('');

  // Check portfolio_items
  console.log('--- PORTFOLIO_ITEMS TABLE ---');
  const { data: portfolio, error: portfolioError, count: portfolioCount } = await supabase
    .from('portfolio_items')
    .select('*', { count: 'exact' })
    .limit(5);

  if (portfolioError) {
    console.log('❌ Error:', portfolioError.message);
  } else {
    console.log(`✅ Found ${portfolioCount} records`);
    if (portfolio && portfolio.length > 0) {
      console.log('Sample records:', portfolio.map(p => ({ id: p.id, title: p.title })));
    }
  }
  console.log('');

  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`ПРАЙС: ${pricingCount} записей ${pricingCount === 0 ? '❌' : '✅'}`);
  console.log(`ОТЗЫВЫ: ${testimonialsCount} записей ${testimonialsCount === 0 ? '❌' : '✅'}`);
  console.log(`СОТРУДНИКИ: ${employeesCount} записей ${employeesCount === 0 ? '❌' : '✅'}`);
  console.log(`ПОРТФОЛИО: ${portfolioCount} записей ${portfolioCount === 0 ? '❌' : '✅'}`);
  console.log('='.repeat(60));
}

checkData().catch(console.error);
