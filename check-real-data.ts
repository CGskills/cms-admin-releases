// Check actual data in Supabase with service_role key
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pjujhrfkykxgzcexyyti.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqdWpocmZreWt4Z3pjZXh5eXRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjY1NjExNywiZXhwIjoyMTAyMjMyMTE3fQ.HwpQuze5kwc2sDUZnvfWeiYuv5v7tI2RTFVy9l2xeXs';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRealData() {
  console.log('='.repeat(80));
  console.log('CHECKING REAL DATA WITH SERVICE_ROLE KEY');
  console.log('='.repeat(80));
  console.log('');

  // Check PRICING
  console.log('📊 PRICING:');
  const { data: pricing, error: pricingError, count: pricingCount } = await supabase
    .from('pricing')
    .select('*', { count: 'exact' })
    .order('order_index', { ascending: true });

  if (pricingError) {
    console.log('  ❌ Error:', pricingError.message);
  } else {
    console.log(`  ✅ Total: ${pricingCount} records`);
    console.log(`  ✅ Loaded: ${pricing?.length} records`);
    if (pricing && pricing.length > 0) {
      console.log('  First 3:', pricing.slice(0, 3).map(p => `${p.name} (${p.category})`));
    }
  }
  console.log('');

  // Check TESTIMONIALS
  console.log('💬 TESTIMONIALS:');
  const { data: testimonials, error: testimonialsError, count: testimonialsCount } = await supabase
    .from('testimonials')
    .select('*', { count: 'exact' })
    .order('order_index', { ascending: true });

  if (testimonialsError) {
    console.log('  ❌ Error:', testimonialsError.message);
  } else {
    console.log(`  ✅ Total: ${testimonialsCount} records`);
    console.log(`  ✅ Loaded: ${testimonials?.length} records`);
    if (testimonials && testimonials.length > 0) {
      console.log('  First 3:', testimonials.slice(0, 3).map(t => `${t.name} ${t.surname || ''} (${t.rating}⭐)`));
    }
  }
  console.log('');

  // Check EMPLOYEES
  console.log('👥 EMPLOYEES:');
  const { data: employees, error: employeesError, count: employeesCount } = await supabase
    .from('employees')
    .select('*', { count: 'exact' })
    .order('order_index', { ascending: true });

  if (employeesError) {
    console.log('  ❌ Error:', employeesError.message);
  } else {
    console.log(`  ✅ Total: ${employeesCount} records`);
    console.log(`  ✅ Loaded: ${employees?.length} records`);
    if (employees && employees.length > 0) {
      console.log('  All employees:', employees.map(e => `${e.full_name} (${e.position})`));
    }
  }
  console.log('');

  // Check PORTFOLIO
  console.log('🎨 PORTFOLIO:');
  const { data: portfolio, error: portfolioError, count: portfolioCount } = await supabase
    .from('portfolio_items')
    .select('*', { count: 'exact' })
    .order('order_index', { ascending: true });

  if (portfolioError) {
    console.log('  ❌ Error:', portfolioError.message);
  } else {
    console.log(`  ✅ Total: ${portfolioCount} records`);
    console.log(`  ✅ Loaded: ${portfolio?.length} records`);
    if (portfolio && portfolio.length > 0) {
      console.log('  All items:', portfolio.map(p => p.title));
    }
  }
  console.log('');

  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`PRICING: ${pricingCount || 0} records`);
  console.log(`TESTIMONIALS: ${testimonialsCount || 0} records`);
  console.log(`EMPLOYEES: ${employeesCount || 0} records`);
  console.log(`PORTFOLIO: ${portfolioCount || 0} records`);
  console.log('='.repeat(80));
}

checkRealData().catch(console.error);
