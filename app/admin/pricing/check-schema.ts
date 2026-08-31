// Check actual table schema
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('='.repeat(60));
  console.log('TABLE SCHEMA DIAGNOSTIC');
  console.log('='.repeat(60));
  console.log('');

  // Get actual columns by selecting first record
  console.log('--- PRICING TABLE ---');
  const { data: pricing } = await supabase
    .from('pricing')
    .select('*')
    .limit(1);
  if (pricing && pricing[0]) {
    console.log('Columns:', Object.keys(pricing[0]).sort());
  }
  console.log('');

  console.log('--- TESTIMONIALS TABLE ---');
  const { data: testimonials } = await supabase
    .from('testimonials')
    .select('*')
    .limit(1);
  if (testimonials && testimonials[0]) {
    console.log('Columns:', Object.keys(testimonials[0]).sort());
  }
  console.log('');

  console.log('--- EMPLOYEES TABLE ---');
  const { data: employees } = await supabase
    .from('employees')
    .select('*')
    .limit(1);
  if (employees && employees[0]) {
    console.log('Columns:', Object.keys(employees[0]).sort());
  }
  console.log('');

  console.log('--- PORTFOLIO_ITEMS TABLE ---');
  const { data: portfolio } = await supabase
    .from('portfolio_items')
    .select('*')
    .limit(1);
  if (portfolio && portfolio[0]) {
    console.log('Columns:', Object.keys(portfolio[0]).sort());
  }
  console.log('');
}

checkSchema().catch(console.error);
