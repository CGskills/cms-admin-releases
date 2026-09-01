import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pjujhrfkykxgzcexyyti.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
if (!SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');

async function checkAdminAccess() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  console.log('🔍 Checking admin access configuration...\n');

  // Check all auth users
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

  if (usersError) {
    console.log('❌ Error fetching users:', usersError.message);
    return;
  }

  console.log(`Found ${users.users.length} user(s) in auth.users:\n`);

  for (const user of users.users) {
    console.log(`User: ${user.email}`);
    console.log(`  ID: ${user.id}`);
    console.log(`  app_metadata.role: ${user.app_metadata?.role || '(none)'}`);
    console.log(`  Created: ${user.created_at}`);
    console.log('');
  }

  // Check admin_users table
  const { data: adminUsers, error: adminError } = await supabase
    .from('admin_users')
    .select('*');

  if (adminError) {
    console.log('❌ Error checking admin_users table:', adminError.message);
    if (adminError.message.includes('does not exist')) {
      console.log('\n⚠️  The admin_users table does not exist.');
      console.log('   Run the migration: supabase/migrations/20260823000000_admin_hardening.sql');
    }
    return;
  }

  console.log(`\nFound ${adminUsers?.length || 0} admin(s) in admin_users table:\n`);

  if (adminUsers && adminUsers.length > 0) {
    for (const admin of adminUsers) {
      const user = users.users.find(u => u.id === admin.user_id);
      console.log(`Admin: ${user?.email || 'Unknown'}`);
      console.log(`  user_id: ${admin.user_id}`);
      console.log(`  is_active: ${admin.is_active}`);
      console.log(`  created_at: ${admin.created_at}`);
      console.log('');
    }
  } else {
    console.log('⚠️  No admins configured in admin_users table\n');
  }

  // Check if we need to add current users as admins
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
  console.log(`\nADMIN_EMAILS from .env.local: ${adminEmails.join(', ') || '(none)'}\n`);

  if (adminEmails.length > 0) {
    for (const email of adminEmails) {
      const user = users.users.find(u => u.email === email);
      if (!user) {
        console.log(`⚠️  ${email} - not found in auth.users`);
        continue;
      }

      const isInAdminTable = adminUsers?.some(a => a.user_id === user.id);
      const hasAdminRole = user.app_metadata?.role === 'admin';

      if (!isInAdminTable && !hasAdminRole) {
        console.log(`❌ ${email} - NOT an admin (missing from admin_users AND no app_metadata.role)`);
        console.log(`   → Add to admin_users with: INSERT INTO admin_users (user_id) VALUES ('${user.id}');`);
      } else if (isInAdminTable) {
        console.log(`✅ ${email} - is admin (in admin_users table)`);
      } else {
        console.log(`✅ ${email} - is admin (has app_metadata.role=admin)`);
      }
    }
  }
}

checkAdminAccess().catch(console.error);
