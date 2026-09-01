import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = 'https://pjujhrfkykxgzcexyyti.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqdWpocmZreWt4Z3pjZXh5eXRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjY1NjExNywiZXhwIjoyMTAyMjMyMTE3fQ.HwpQuze5kwc2sDUZnvfWeiYuv5v7tI2RTFVy9l2xeXs';

// Create a minimal 1x1 PNG image
const MINIMAL_PNG = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
  0x0D, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x62, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
]);

const BUCKETS = ['portfolio', 'employees', 'testimonials'];

async function testImageUpload() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  console.log('🔍 Testing Image Upload with Service Role...\n');

  for (const bucketName of BUCKETS) {
    const testPath = `test-${Date.now()}.png`;

    console.log(`Testing ${bucketName}...`);

    const { data, error: uploadError } = await supabase
      .storage
      .from(bucketName)
      .upload(testPath, MINIMAL_PNG, {
        contentType: 'image/png',
        cacheControl: '3600',
      });

    if (uploadError) {
      console.log(`  ❌ Upload failed: ${uploadError.message}`);
    } else {
      console.log(`  ✅ Upload success: ${data.path}`);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(data.path);

      console.log(`  🔗 Public URL: ${urlData.publicUrl}`);

      // Clean up
      await supabase.storage.from(bucketName).remove([testPath]);
      console.log(`  🧹 Cleaned up`);
    }
    console.log('');
  }

  console.log('\n🔍 Testing Image Upload with Authenticated User (admin@gmail.com)...\n');

  // Sign in as admin
  const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'admin@gmail.com',
    password: 'Admin123!',
  });

  if (signInError) {
    console.log('❌ Sign in failed:', signInError.message);
    return;
  }

  console.log(`✅ Signed in as: ${authData.user?.email}\n`);

  for (const bucketName of BUCKETS) {
    const testPath = `test-user-${Date.now()}.png`;

    console.log(`Testing ${bucketName} as authenticated user...`);

    const { data, error: uploadError } = await supabase
      .storage
      .from(bucketName)
      .upload(testPath, MINIMAL_PNG, {
        contentType: 'image/png',
        cacheControl: '3600',
      });

    if (uploadError) {
      console.log(`  ❌ Upload failed: ${uploadError.message}`);
      console.log(`     Code: ${uploadError.name || 'N/A'}`);
    } else {
      console.log(`  ✅ Upload success: ${data.path}`);

      // Clean up
      await supabase.storage.from(bucketName).remove([testPath]);
      console.log(`  🧹 Cleaned up`);
    }
    console.log('');
  }
}

testImageUpload().catch(console.error);
