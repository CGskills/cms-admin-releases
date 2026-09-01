import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pjujhrfkykxgzcexyyti.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
if (!SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');

const BUCKETS = ['portfolio', 'employees', 'services', 'avatars', 'logos', 'testimonials'];

async function checkStoragePolicies() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  console.log('🔍 Checking Storage Bucket Policies...\n');

  // Query storage.objects policies using SQL
  const { data, error } = await supabase.rpc('get_storage_policies', {});

  if (error && error.code !== '42883') {
    console.log('⚠️  Could not query policies directly:', error.message);
  }

  console.log('Checking bucket configuration...\n');

  for (const bucketName of BUCKETS) {
    const { data: bucket, error: bucketError } = await supabase
      .storage
      .getBucket(bucketName);

    if (bucketError) {
      console.log(`❌ ${bucketName}: Error - ${bucketError.message}`);
      continue;
    }

    console.log(`Bucket: ${bucketName}`);
    console.log(`  Public: ${bucket.public}`);
    console.log(`  File size limit: ${bucket.file_size_limit || 'default'}`);
    console.log(`  Allowed mime types: ${bucket.allowed_mime_types?.join(', ') || 'all'}`);
    console.log('');
  }

  console.log('\n💡 Storage policies are managed in Supabase Dashboard:');
  console.log('   Authentication > Policies > storage.objects\n');
  console.log('Expected policies for admin access:');
  console.log('  1. SELECT: authenticated users with public.is_admin()');
  console.log('  2. INSERT: authenticated users with public.is_admin()');
  console.log('  3. UPDATE: authenticated users with public.is_admin()');
  console.log('  4. DELETE: authenticated users with public.is_admin()');
}

checkStoragePolicies().catch(console.error);
