import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pjujhrfkykxgzcexyyti.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqdWpocmZreWt4Z3pjZXh5eXRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjY1NjExNywiZXhwIjoyMTAyMjMyMTE3fQ.HwpQuze5kwc2sDUZnvfWeiYuv5v7tI2RTFVy9l2xeXs';

async function testSupabaseConnection() {
  console.log('Testing Supabase connection...\n');
  console.log('URL:', SUPABASE_URL);
  console.log('Key prefix:', SUPABASE_KEY.substring(0, 20) + '...\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Test 1: List storage buckets
  console.log('📦 Testing storage buckets...');
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

  if (bucketsError) {
    console.error('❌ Error listing buckets:', bucketsError);
  } else {
    console.log('✅ Buckets found:', buckets?.map(b => b.name).join(', ') || 'none');
  }

  // Test 2: Check employees table
  console.log('\n👥 Testing employees table...');
  const { data: employees, error: employeesError } = await supabase
    .from('employees')
    .select('id, full_name, photo_path')
    .limit(5);

  if (employeesError) {
    console.error('❌ Error fetching employees:', employeesError);
  } else {
    console.log('✅ Employees found:', employees?.length || 0);
    employees?.forEach(emp => {
      console.log(`  - ${emp.full_name}: ${emp.photo_path || 'no photo'}`);
    });
  }

  // Test 3: Check employees bucket files
  console.log('\n📁 Testing employees bucket files...');
  const { data: files, error: filesError } = await supabase.storage
    .from('employees')
    .list('', { limit: 10 });

  if (filesError) {
    console.error('❌ Error listing files:', filesError);
  } else {
    console.log('✅ Files in employees bucket:', files?.length || 0);
    files?.forEach(file => {
      console.log(`  - ${file.name}`);
    });
  }

  // Test 4: Check portfolio bucket
  console.log('\n🖼️  Testing portfolio bucket files...');
  const { data: portfolioFiles, error: portfolioError } = await supabase.storage
    .from('portfolio')
    .list('', { limit: 10 });

  if (portfolioError) {
    console.error('❌ Error listing portfolio files:', portfolioError);
  } else {
    console.log('✅ Files in portfolio bucket:', portfolioFiles?.length || 0);
    portfolioFiles?.forEach(file => {
      console.log(`  - ${file.name}`);
    });
  }

  // Test 5: Test public URL generation
  if (files && files.length > 0) {
    console.log('\n🔗 Testing public URL generation...');
    const testFile = files[0];
    const { data: urlData } = supabase.storage
      .from('employees')
      .getPublicUrl(testFile.name);
    console.log('✅ Public URL example:', urlData.publicUrl);
  }
}

testSupabaseConnection().catch(console.error);
