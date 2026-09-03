import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function resetPassword() {
  const email = 'admin@gmail.com';
  const newPassword = 'admin123456';

  console.log('🔄 Resetting password for:', email);

  // Update the user's password
  const { data, error } = await supabase.auth.admin.updateUserById(
    '92a7525c-01e3-45f2-bc7d-4a0fedc3789f',
    { password: newPassword }
  );

  if (error) {
    console.error('❌ Failed to reset password:', error.message);
    process.exit(1);
  }

  console.log('✅ Password reset successfully!');
  console.log('\nYou can now login with:');
  console.log('   Email:', email);
  console.log('   Password:', newPassword);
}

resetPassword().catch(console.error);
