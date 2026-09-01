import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pjujhrfkykxgzcexyyti.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
if (!SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');

async function updateEmployeePhoto() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  console.log('🔧 Updating Ekaterina photo path...\n');

  const employeeId = 'd8a56d14-f806-4c22-9c1d-54e31244efaa';
  const newPhotoPath = 'avatars/8e5e12bf-f42a-4ed9-8a8a-0ff0fc27a29e.jpg';

  // Verify file exists first
  const { data: fileCheck } = await supabase.storage
    .from('employees')
    .list('avatars', { limit: 100 });

  const fileExists = fileCheck?.some(f => f.name === '8e5e12bf-f42a-4ed9-8a8a-0ff0fc27a29e.jpg');

  if (!fileExists) {
    console.log('❌ Target file does not exist!');
    return;
  }

  console.log('✅ Target file exists');

  // Update database
  const { error } = await supabase
    .from('employees')
    .update({ photo_path: newPhotoPath })
    .eq('id', employeeId);

  if (error) {
    console.log(`❌ Update failed: ${error.message}`);
  } else {
    console.log(`✅ Updated successfully!`);
    console.log(`   Employee ID: ${employeeId}`);
    console.log(`   New path: ${newPhotoPath}`);
    console.log(`   URL: ${SUPABASE_URL}/storage/v1/object/public/employees/${newPhotoPath}`);
  }

  // Verify update
  const { data: employee } = await supabase
    .from('employees')
    .select('full_name, photo_path')
    .eq('id', employeeId)
    .single();

  if (employee) {
    console.log(`\n✅ Verification:`);
    console.log(`   Name: ${employee.full_name}`);
    console.log(`   Photo: ${employee.photo_path}`);
  }

  console.log('\n✅ Fix complete!\n');
}

updateEmployeePhoto().catch(console.error);
