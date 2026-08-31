// Check RLS policies and access
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLS() {
  console.log('='.repeat(60));
  console.log('RLS POLICIES DIAGNOSTIC');
  console.log('='.repeat(60));
  console.log('');

  // Check if we can read pricing with browser client
  console.log('--- BROWSER CLIENT (publishable key) ---');

  const { data: pricing, error: pricingError } = await supabase
    .from('pricing')
    .select('id, name, category')
    .limit(3);

  console.log('Pricing query result:');
  console.log('  Error:', pricingError?.message || 'No error');
  console.log('  Data count:', pricing?.length || 0);
  console.log('');

  const { data: testimonials, error: testimonialsError } = await supabase
    .from('testimonials')
    .select('id, author, content')
    .limit(3);

  console.log('Testimonials query result:');
  console.log('  Error:', testimonialsError?.message || 'No error');
  console.log('  Data count:', testimonials?.length || 0);
  console.log('');

  const { data: employees, error: employeesError } = await supabase
    .from('employees')
    .select('id, name, position')
    .limit(3);

  console.log('Employees query result:');
  console.log('  Error:', employeesError?.message || 'No error');
  console.log('  Data count:', employees?.length || 0);
  console.log('');

  const { data: portfolio, error: portfolioError } = await supabase
    .from('portfolio_items')
    .select('id, title')
    .limit(3);

  console.log('Portfolio query result:');
  console.log('  Error:', portfolioError?.message || 'No error');
  console.log('  Data count:', portfolio?.length || 0);
  console.log('');

  console.log('='.repeat(60));
  console.log('AUTH STATUS');
  console.log('='.repeat(60));

  const { data: { user } } = await supabase.auth.getUser();
  console.log('Current user:', user?.email || 'Not authenticated');
  console.log('User role:', user?.role || 'anonymous');
  console.log('');
}

checkRLS().catch(console.error);
