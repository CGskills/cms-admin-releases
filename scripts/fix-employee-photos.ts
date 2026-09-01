import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pjujhrfkykxgzcexyyti.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqdWpocmZreWt4Z3pjZXh5eXRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjY1NjExNywiZXhwIjoyMTAyMjMyMTE3fQ.HwpQuze5kwc2sDUZnvfWeiYuv5v7tI2RTFVy9l2xeXs';

async function fixEmployeePhotos() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  console.log('🔧 Fixing Employee Photos...\n');

  // Get all employees with photo_path
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id, full_name, photo_path')
    .not('photo_path', 'is', null);

  if (empError) {
    console.error('❌ Error fetching employees:', empError.message);
    return;
  }

  console.log(`Found ${employees?.length || 0} employees with photos\n`);

  // Check each photo
  for (const emp of employees || []) {
    console.log(`\n👤 ${emp.full_name}`);
    console.log(`   Current path: ${emp.photo_path}`);

    const pathParts = emp.photo_path.split('/');
    const folder = pathParts.slice(0, -1).join('/');
    const fileName = pathParts[pathParts.length - 1];

    // Check if file exists
    const { data: fileList } = await supabase.storage
      .from('employees')
      .list(folder, { limit: 100 });

    const fileExists = fileList?.some(f => f.name === fileName);

    if (fileExists) {
      console.log(`   ✅ Photo exists`);
    } else {
      console.log(`   ❌ Photo NOT found in ${folder}/`);

      // Try to find the file in avatars root
      const { data: avatarsFiles } = await supabase.storage
        .from('employees')
        .list('avatars', { limit: 100 });

      console.log(`   🔍 Searching in avatars/ root...`);

      // Look for similar filename patterns
      const possibleMatches = avatarsFiles?.filter(f =>
        !f.id && f.name !== '.emptyFolderPlaceholder' ||
        f.name.includes(emp.id) ||
        f.name.toLowerCase().includes(emp.full_name.toLowerCase().split(' ')[0].substring(0, 3))
      );

      if (possibleMatches && possibleMatches.length > 0) {
        console.log(`   Found ${possibleMatches.length} possible matches:`);
        for (const match of possibleMatches) {
          console.log(`      - avatars/${match.name}`);
        }

        // If there's exactly one image file in avatars root, suggest using it
        const imageFiles = avatarsFiles?.filter(f =>
          f.id !== null && /\.(jpg|jpeg|png|webp|gif)$/i.test(f.name)
        );

        if (imageFiles && imageFiles.length === 1) {
          const newPath = `avatars/${imageFiles[0].name}`;
          console.log(`   💡 Suggestion: Update to ${newPath}`);
          console.log(`   Run this SQL to fix:`);
          console.log(`   UPDATE employees SET photo_path = '${newPath}' WHERE id = '${emp.id}';`);
        }
      }
    }
  }

  console.log('\n\n✅ Check complete!\n');
}

fixEmployeePhotos().catch(console.error);
