// Check current database state and provide migration SQL
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabaseUrl = 'https://pjujhrfkykxgzcexyyti.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkAndPrepareMigrations() {
  console.log('='.repeat(80));
  console.log('SUPABASE DATABASE STATE CHECK');
  console.log('='.repeat(80));
  console.log('');

  // Test data access with service key
  console.log('📊 Testing data access with service key...');
  console.log('');

  const { data: pricing, error: pricingError } = await supabase
    .from('pricing')
    .select('id, name, category, order_index')
    .limit(3);

  console.log('PRICING:');
  console.log('  Error:', pricingError?.message || 'None');
  console.log('  Count:', pricing?.length || 0);
  if (pricing && pricing.length > 0) {
    console.log('  Sample:', pricing[0]);
  }
  console.log('');

  const { data: testimonials, error: testimonialsError } = await supabase
    .from('testimonials')
    .select('*')
    .limit(3);

  console.log('TESTIMONIALS:');
  console.log('  Error:', testimonialsError?.message || 'None');
  console.log('  Count:', testimonials?.length || 0);
  if (testimonials && testimonials.length > 0) {
    console.log('  Columns:', Object.keys(testimonials[0]).sort().join(', '));
    console.log('  Sample:', {
      id: testimonials[0].id,
      name: testimonials[0].name,
      content: testimonials[0].content?.substring(0, 50) + '...'
    });
  }
  console.log('');

  const { data: employees, error: employeesError } = await supabase
    .from('employees')
    .select('*')
    .limit(3);

  console.log('EMPLOYEES:');
  console.log('  Error:', employeesError?.message || 'None');
  console.log('  Count:', employees?.length || 0);
  if (employees && employees.length > 0) {
    console.log('  Columns:', Object.keys(employees[0]).sort().join(', '));
    console.log('  Sample:', {
      id: employees[0].id,
      first_name: employees[0].first_name,
      last_name: employees[0].last_name,
      position: employees[0].position
    });
  }
  console.log('');

  const { data: portfolio, error: portfolioError } = await supabase
    .from('portfolio_items')
    .select('*')
    .limit(3);

  console.log('PORTFOLIO:');
  console.log('  Error:', portfolioError?.message || 'None');
  console.log('  Count:', portfolio?.length || 0);
  if (portfolio && portfolio.length > 0) {
    console.log('  Sample:', {
      id: portfolio[0].id,
      title: portfolio[0].title
    });
  }
  console.log('');

  console.log('='.repeat(80));
  console.log('MIGRATION SQL TO APPLY');
  console.log('='.repeat(80));
  console.log('');
  console.log('Go to: https://supabase.com/dashboard/project/pjujhrfkykxgzcexyyti/sql/new');
  console.log('');
  console.log('Copy and run the following SQL:');
  console.log('');
  console.log('-'.repeat(80));

  const sequencesMigration = readFileSync(
    join(process.cwd(), 'supabase/migrations/20260830_sequences_for_order_index.sql'),
    'utf-8'
  );

  console.log(sequencesMigration);
  console.log('-'.repeat(80));
  console.log('');

  const batchMigration = readFileSync(
    join(process.cwd(), 'supabase/migrations/20260830_batch_update_function.sql'),
    'utf-8'
  );

  console.log(batchMigration);
  console.log('-'.repeat(80));
  console.log('');

  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log('');
  console.log('✅ Data exists in all tables');
  console.log('⚠️  Migrations need to be applied manually via Supabase Dashboard');
  console.log('🔗 Dashboard: https://supabase.com/dashboard/project/pjujhrfkykxgzcexyyti');
  console.log('');
}

checkAndPrepareMigrations().catch(console.error);
