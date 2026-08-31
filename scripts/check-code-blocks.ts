import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pjujhrfkykxgzcexyyti.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqdWpocmZreWt4Z3pjZXh5eXRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjY1NjExNywiZXhwIjoyMTAyMjMyMTE3fQ.HwpQuze5kwc2sDUZnvfWeiYuv5v7tI2RTFVy9l2xeXs';

async function checkCodeBlocks() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  console.log('🔍 Checking code_blocks table...\n');

  // Check if table exists
  const { data: blocks, error } = await supabase
    .from('code_blocks')
    .select('*')
    .limit(5);

  if (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📝 The table may not exist or RLS is blocking access.');
    console.log('Creating the table...\n');

    // Try to create the table
    const createTableSQL = `
CREATE TABLE IF NOT EXISTS code_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'other',
  html TEXT DEFAULT '',
  css TEXT DEFAULT '',
  javascript TEXT DEFAULT '',
  version TEXT NOT NULL DEFAULT '1.0.0',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'ready', 'archived')),
  responsive_status TEXT DEFAULT 'unchecked'
    CHECK (responsive_status IN ('unchecked', 'pass', 'warning', 'error')),
  validation_status TEXT DEFAULT 'unchecked'
    CHECK (validation_status IN ('unchecked', 'pass', 'warning', 'error')),
  dependencies JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_code_blocks_category ON code_blocks(category);
CREATE INDEX IF NOT EXISTS idx_code_blocks_status ON code_blocks(status);
CREATE INDEX IF NOT EXISTS idx_code_blocks_created_at ON code_blocks(created_at DESC);

CREATE OR REPLACE FUNCTION update_code_blocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_code_blocks_updated_at ON code_blocks;
CREATE TRIGGER trigger_code_blocks_updated_at
  BEFORE UPDATE ON code_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_code_blocks_updated_at();

ALTER TABLE code_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated code_blocks full access" ON code_blocks;
CREATE POLICY "Authenticated code_blocks full access"
  ON code_blocks FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "No anonymous code_blocks access" ON code_blocks;
CREATE POLICY "No anonymous code_blocks access"
  ON code_blocks FOR ALL TO anon
  USING (false);
`;

    console.log('SQL to execute:');
    console.log(createTableSQL);

  } else {
    console.log('✅ code_blocks table exists!');
    console.log(`   Found ${blocks?.length || 0} blocks\n`);

    if (blocks && blocks.length > 0) {
      blocks.forEach(block => {
        console.log(`   - ${block.name} (${block.category}) - ${block.status}`);
      });
    }
  }
}

checkCodeBlocks().catch(console.error);
