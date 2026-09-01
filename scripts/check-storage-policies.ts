import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pjujhrfkykxgzcexyyti.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqdWpocmZreWt4Z3pjZXh5eXRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjY1NjExNywiZXhwIjoyMTAyMjMyMTE3fQ.HwpQuze5kwc2sDUZnvfWeiYuv5v7tI2RTFVy9l2xeXs';

async function checkStoragePolicies() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  console.log('🔒 Checking Storage Bucket Policies...\n');

  const buckets = ['employees', 'portfolio', 'testimonials', 'services', 'avatars'];

  for (const bucketName of buckets) {
    console.log(`\n📦 Bucket: ${bucketName}`);
    console.log('─'.repeat(50));

    // Check bucket info
    const { data: bucket, error: bucketError } = await supabase.storage.getBucket(bucketName);

    if (bucketError) {
      console.log(`❌ Error getting bucket: ${bucketError.message}`);
      continue;
    }

    console.log(`✅ Bucket exists`);
    console.log(`   Public: ${bucket.public ? 'Yes' : 'No'}`);
    console.log(`   File size limit: ${bucket.file_size_limit ? bucket.file_size_limit + ' bytes' : 'default'}`);
    console.log(`   Allowed MIME types: ${bucket.allowed_mime_types?.join(', ') || 'all'}`);

    // Try to list files
    const { data: files, error: listError } = await supabase.storage
      .from(bucketName)
      .list('', { limit: 5 });

    if (listError) {
      console.log(`   ⚠️  List files error: ${listError.message}`);
    } else {
      console.log(`   ✅ Can list files: ${files?.length || 0} items`);
    }

    // Try to get a public URL (if bucket is public)
    if (bucket.public && files && files.length > 0) {
      const testFile = files[0];
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(testFile.name);
      console.log(`   ✅ Public URL works: ${urlData.publicUrl.substring(0, 80)}...`);
    }
  }

  // Check if we can create a test upload
  console.log('\n\n🧪 Testing Upload Permissions...\n');

  const testBucket = 'employees';
  const testPath = `test-uploads/test-${Date.now()}.txt`;
  const testContent = new Blob(['Test upload'], { type: 'text/plain' });

  console.log(`Attempting test upload to ${testBucket}/${testPath}...`);

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(testBucket)
    .upload(testPath, testContent);

  if (uploadError) {
    console.log(`❌ Upload failed: ${uploadError.message}`);
  } else {
    console.log(`✅ Upload successful: ${uploadData.path}`);

    // Clean up test file
    const { error: deleteError } = await supabase.storage
      .from(testBucket)
      .remove([testPath]);

    if (deleteError) {
      console.log(`⚠️  Cleanup warning: ${deleteError.message}`);
    } else {
      console.log(`✅ Cleanup successful`);
    }
  }

  // Check employees photos specifically
  console.log('\n\n📸 Checking Employees Photos...\n');

  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id, full_name, photo_path')
    .limit(10);

  if (empError) {
    console.log(`❌ Error fetching employees: ${empError.message}`);
  } else {
    console.log(`Found ${employees?.length || 0} employees:`);
    for (const emp of employees || []) {
      if (emp.photo_path) {
        const photoUrl = `${SUPABASE_URL}/storage/v1/object/public/employees/${emp.photo_path}`;
        console.log(`  ✅ ${emp.full_name}`);
        console.log(`     Path: ${emp.photo_path}`);
        console.log(`     URL: ${photoUrl}`);

        // Try to check if file exists
        const pathParts = emp.photo_path.split('/');
        const folder = pathParts.slice(0, -1).join('/');
        const fileName = pathParts[pathParts.length - 1];

        const { data: fileList } = await supabase.storage
          .from('employees')
          .list(folder, { limit: 100 });

        const fileExists = fileList?.some(f => f.name === fileName);
        if (fileExists) {
          console.log(`     Status: File exists ✅`);
        } else {
          console.log(`     Status: File NOT found ❌`);
        }
      } else {
        console.log(`  ⚪ ${emp.full_name} - no photo`);
      }
    }
  }

  console.log('\n\n✅ Storage policy check complete!\n');
}

checkStoragePolicies().catch(console.error);
