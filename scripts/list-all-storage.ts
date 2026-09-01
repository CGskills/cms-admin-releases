import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pjujhrfkykxgzcexyyti.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
if (!SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');

async function listAllFiles(bucket: string, folder: string = '', depth: number = 0, maxDepth: number = 5): Promise<void> {
  if (depth > maxDepth) return;

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const indent = '  '.repeat(depth);

  const { data: items, error } = await supabase.storage
    .from(bucket)
    .list(folder, { limit: 100 });

  if (error) {
    console.log(`${indent}❌ Error: ${error.message}`);
    return;
  }

  if (!items || items.length === 0) {
    console.log(`${indent}(empty)`);
    return;
  }

  for (const item of items) {
    const fullPath = folder ? `${folder}/${item.name}` : item.name;
    const isFolder = item.id === null;

    if (isFolder) {
      console.log(`${indent}📁 ${item.name}/`);
      await listAllFiles(bucket, fullPath, depth + 1, maxDepth);
    } else {
      const size = item.metadata?.size || 0;
      const sizeStr = size > 1024 * 1024
        ? `${(size / 1024 / 1024).toFixed(2)} MB`
        : size > 1024
        ? `${(size / 1024).toFixed(2)} KB`
        : `${size} bytes`;
      console.log(`${indent}📄 ${item.name} (${sizeStr})`);
    }
  }
}

async function main() {
  console.log('📂 Full Storage Structure\n');

  const buckets = ['employees', 'portfolio', 'testimonials'];

  for (const bucket of buckets) {
    console.log(`\n🪣 ${bucket.toUpperCase()}`);
    console.log('─'.repeat(60));
    await listAllFiles(bucket);
  }

  console.log('\n\n✅ Complete!\n');
}

main().catch(console.error);
