import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pjujhrfkykxgzcexyyti.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqdWpocmZreWt4Z3pjZXh5eXRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjY1NjExNywiZXhwIjoyMTAyMjMyMTE3fQ.HwpQuze5kwc2sDUZnvfWeiYuv5v7tI2RTFVy9l2xeXs';

async function addAdminUser() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  console.log('🔧 Adding admin@gmail.com to admin_users table...\n');

  // Get the user
  const { data: users } = await supabase.auth.admin.listUsers();
  const adminUser = users?.users.find(u => u.email === 'admin@gmail.com');

  if (!adminUser) {
    console.log('❌ User admin@gmail.com not found');
    return;
  }

  console.log(`Found user: ${adminUser.email} (${adminUser.id})\n`);

  // Insert into admin_users
  const { data, error } = await supabase
    .from('admin_users')
    .insert({
      user_id: adminUser.id,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      console.log('✅ User is already in admin_users table');

      // Update to ensure is_active=true
      const { error: updateError } = await supabase
        .from('admin_users')
        .update({ is_active: true })
        .eq('user_id', adminUser.id);

      if (updateError) {
        console.log('❌ Error updating admin status:', updateError.message);
      } else {
        console.log('✅ Updated admin status to active');
      }
    } else {
      console.log('❌ Error adding admin:', error.message);
      console.log('   Code:', error.code);
      console.log('   Details:', error.details);
    }
    return;
  }

  console.log('✅ Successfully added admin@gmail.com to admin_users table');
  console.log('   User ID:', data.user_id);
  console.log('   Is Active:', data.is_active);
  console.log('   Created:', data.created_at);
  console.log('\n🎉 Admin access granted! The user can now import code blocks.');
}

addAdminUser().catch(console.error);
