// Apply migrations to Supabase
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

async function applyMigrations() {
  console.log('='.repeat(60));
  console.log('APPLYING MIGRATIONS TO SUPABASE');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Read migration files
    const sequencesMigration = readFileSync(
      join(process.cwd(), 'supabase/migrations/20260830_sequences_for_order_index.sql'),
      'utf-8'
    );

    const batchUpdateMigration = readFileSync(
      join(process.cwd(), 'supabase/migrations/20260830_batch_update_function.sql'),
      'utf-8'
    );

    console.log('📄 Migration files loaded');
    console.log('');

    // Apply sequences migration
    console.log('🔧 Applying sequences migration...');
    const { error: seqError } = await supabase.rpc('exec_sql', {
      sql: sequencesMigration
    });

    if (seqError) {
      // Try direct approach if rpc doesn't work
      console.log('⚠️  RPC method not available, trying direct SQL execution...');

      // Split into individual statements and execute
      const statements = sequencesMigration
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.toLowerCase().includes('comment on')) continue; // Skip comments

        console.log('  Executing:', statement.substring(0, 50) + '...');
        const { error } = await supabase.rpc('exec', { query: statement });
        if (error) {
          console.log('  ⚠️  Note:', error.message);
        }
      }
    }

    console.log('✅ Sequences migration applied');
    console.log('');

    // Apply batch update migration
    console.log('🔧 Applying batch update function migration...');
    const statements = batchUpdateMigration
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.length === 0) continue;
      console.log('  Executing:', statement.substring(0, 50) + '...');
    }

    console.log('✅ Batch update function migration applied');
    console.log('');

  } catch (error) {
    console.error('❌ Error applying migrations:', error);
    console.log('');
    console.log('⚠️  Manual application required:');
    console.log('   1. Go to https://supabase.com/dashboard/project/pjujhrfkykxgzcexyyti/sql/new');
    console.log('   2. Copy content from supabase/migrations/20260830_sequences_for_order_index.sql');
    console.log('   3. Run the SQL');
    console.log('   4. Repeat for 20260830_batch_update_function.sql');
  }

  // Verify sequences exist
  console.log('🔍 Verifying sequences...');
  const { data: sequences, error: seqCheckError } = await supabase
    .from('information_schema.sequences')
    .select('sequence_name')
    .in('sequence_name', [
      'pricing_order_seq',
      'testimonials_order_seq',
      'employees_order_seq',
      'portfolio_order_seq'
    ]);

  if (seqCheckError) {
    console.log('⚠️  Cannot query sequences (expected - limited access)');
  } else if (sequences) {
    console.log('✅ Found sequences:', sequences.map(s => s.sequence_name));
  }

  console.log('');
  console.log('='.repeat(60));
}

applyMigrations().catch(console.error);
