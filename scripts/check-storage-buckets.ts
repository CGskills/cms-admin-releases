import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pjujhrfkykxgzcexyyti.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
if (!SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');

const BUCKETS = ['portfolio', 'employees', 'services', 'avatars', 'logos', 'testimonials'];

async function checkStorageBuckets() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  console.log('🔍 Checking Storage Buckets...\n');

  // List all buckets
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

  if (bucketsError) {
    console.log('❌ Error listing buckets:', bucketsError.message);
    return;
  }

  console.log(`Found ${buckets?.length || 0} bucket(s):\n`);

  for (const bucket of buckets || []) {
    console.log(`Bucket: ${bucket.name}`);
    console.log(`  ID: ${bucket.id}`);
    console.log(`  Public: ${bucket.public}`);
    console.log(`  Created: ${bucket.created_at}`);
    console.log('');
  }

  // Check if required buckets exist
  console.log('\nRequired buckets for media manager:\n');

  for (const bucketName of BUCKETS) {
    const exists = buckets?.some(b => b.name === bucketName);
    if (exists) {
      console.log(`✅ ${bucketName} - exists`);

      // Try to list files
      const { data: files, error: listError } = await supabase
        .storage
        .from(bucketName)
        .list('', { limit: 5 });

      if (listError) {
        console.log(`   ⚠️  Error listing files: ${listError.message}`);
      } else {
        console.log(`   📁 ${files?.length || 0} file(s)`);
      }
    } else {
      console.log(`❌ ${bucketName} - MISSING`);
    }
  }

  // Test upload permission for each bucket
  console.log('\n\nTesting upload permissions (with service role):\n');

  for (const bucketName of BUCKETS) {
    const exists = buckets?.some(b => b.name === bucketName);
    if (!exists) continue;

    const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    const testPath = `test-${Date.now()}.txt`;

    const { error: uploadError } = await supabase
      .storage
      .from(bucketName)
      .upload(testPath, testFile);

    if (uploadError) {
      console.log(`❌ ${bucketName}: Upload failed - ${uploadError.message}`);
    } else {
      console.log(`✅ ${bucketName}: Upload works`);

      // Clean up
      await supabase.storage.from(bucketName).remove([testPath]);
    }
  }
}

checkStorageBuckets().catch(console.error);
