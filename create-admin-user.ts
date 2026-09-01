// Create test admin user in Supabase Auth
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pjujhrfkykxgzcexyyti.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
if (!SERVICE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestAdmin() {
  console.log('\n' + '='.repeat(80));
  console.log('CREATING TEST ADMIN USER');
  console.log('='.repeat(80) + '\n');

  const testEmail = 'admin@gmail.com';
  const testPassword = 'admin123456';

  console.log(`📧 Email: ${testEmail}`);
  console.log(`🔑 Password: ${testPassword}`);
  console.log('');

  try {
    // Check if user already exists
    console.log('🔍 Checking if user exists...');
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.log(`❌ Error listing users: ${listError.message}`);
      return;
    }

    const existingUser = existingUsers.users.find(u => u.email === testEmail);

    if (existingUser) {
      console.log(`✅ User ${testEmail} already exists!`);
      console.log(`   User ID: ${existingUser.id}`);
      console.log(`   Created: ${existingUser.created_at}`);
      console.log('');
      console.log('You can login with:');
      console.log(`   Email: ${testEmail}`);
      console.log(`   Password: ${testPassword} (if it was set to this)`);
      return;
    }

    // Create new user
    console.log(`📝 Creating new admin user...`);
    const { data, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        role: 'admin'
      }
    });

    if (error) {
      console.log(`❌ Error creating user: ${error.message}`);
      return;
    }

    console.log(`✅ Admin user created successfully!`);
    console.log(`   User ID: ${data.user.id}`);
    console.log(`   Email: ${data.user.email}`);
    console.log('');
    console.log('🎉 You can now login to the admin panel with:');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}`);
    console.log('');

  } catch (err) {
    console.log(`❌ Exception: ${err}`);
  }

  console.log('='.repeat(80) + '\n');
}

createTestAdmin().catch(console.error);
