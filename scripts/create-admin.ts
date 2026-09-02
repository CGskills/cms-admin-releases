import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing environment variables:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL');
    console.error('   SUPABASE_SERVICE_ROLE_KEY');
    console.error('\nSet them in .env.local');
    process.exit(1);
  }

  console.log('🔧 Admin User Creation Tool\n');

  const email = await question('Admin email: ');
  const password = await question('Password (min 6 chars): ');

  if (!email || !password) {
    console.error('❌ Email and password are required');
    process.exit(1);
  }

  if (password.length < 6) {
    console.error('❌ Password must be at least 6 characters');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('\n📝 Creating user...');

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    console.error('❌ Failed to create user:', error.message);
    process.exit(1);
  }

  console.log('✅ User created:', data.user?.email);
  console.log('\n📋 Next steps:');
  console.log('1. Add to .env.local:');
  console.log(`   ADMIN_EMAILS=${email}`);
  console.log('2. Restart the server');
  console.log('3. Login at http://localhost:3001/admin/login\n');

  rl.close();
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
