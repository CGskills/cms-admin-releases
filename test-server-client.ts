// Test server-side Supabase client
import { createClient as createServerClient } from '@/lib/supabase/server';

async function testServerClient() {
  console.log('='.repeat(60));
  console.log('SERVER CLIENT TEST (same as app uses)');
  console.log('='.repeat(60));
  console.log('');

  const supabase = await createServerClient();

  // Test pricing - this works
  console.log('--- PRICING (works in app) ---');
  const { data: pricing, error: pricingError } = await supabase
    .from('pricing')
    .select('*')
    .order('order_index', { ascending: true });

  console.log('Error:', pricingError?.message || 'No error');
  console.log('Count:', pricing?.length || 0);
  console.log('');

  // Test testimonials - this might fail
  console.log('--- TESTIMONIALS (broken in app) ---');
  const { data: testimonials, error: testimonialsError } = await supabase
    .from('testimonials')
    .select('*')
    .order('order_index', { ascending: true });

  console.log('Error:', testimonialsError?.message || 'No error');
  console.log('Count:', testimonials?.length || 0);
  if (testimonials && testimonials.length > 0) {
    console.log('First record fields:', Object.keys(testimonials[0]).sort());
  }
  console.log('');

  // Test employees - this might fail
  console.log('--- EMPLOYEES (broken in app) ---');
  const { data: employees, error: employeesError } = await supabase
    .from('employees')
    .select('*')
    .order('order_index', { ascending: true });

  console.log('Error:', employeesError?.message || 'No error');
  console.log('Count:', employees?.length || 0);
  if (employees && employees.length > 0) {
    console.log('First record fields:', Object.keys(employees[0]).sort());
  }
  console.log('');

  // Test portfolio_items - this works
  console.log('--- PORTFOLIO_ITEMS (works in app) ---');
  const { data: portfolio, error: portfolioError } = await supabase
    .from('portfolio_items')
    .select('*')
    .order('order_index', { ascending: true });

  console.log('Error:', portfolioError?.message || 'No error');
  console.log('Count:', portfolio?.length || 0);
  console.log('');
}

testServerClient().catch(console.error);
