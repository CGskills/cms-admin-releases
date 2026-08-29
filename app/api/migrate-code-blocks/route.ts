import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/api';

export async function POST(request: Request) {
  const denied = await requireAdminApi(request); if (denied) return denied;
  const supabase = await createClient();

  // Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Try to query the table to check if it exists
  const { error: checkError } = await supabase
    .from('code_blocks')
    .select('id')
    .limit(1);

  if (!checkError) {
    return NextResponse.json({ message: 'Table code_blocks already exists', success: true });
  }

  if (checkError.message.includes('does not exist') || checkError.message.includes('Could not find the table')) {
    return NextResponse.json(
      {
        error: 'Table does not exist. Please run the SQL migration in Supabase SQL Editor.',
        sql: `CREATE TABLE IF NOT EXISTS code_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'other',
  html TEXT DEFAULT '',
  css TEXT DEFAULT '',
  javascript TEXT DEFAULT '',
  version TEXT NOT NULL DEFAULT '1.0.0',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'archived')),
  responsive_status TEXT DEFAULT 'unchecked' CHECK (responsive_status IN ('unchecked', 'pass', 'warning', 'error')),
  validation_status TEXT DEFAULT 'unchecked' CHECK (validation_status IN ('unchecked', 'pass', 'warning', 'error')),
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
  ON code_blocks FOR ALL TO anon USING (false);`,
      },
      { status: 200 }
    );
  }

  return NextResponse.json({ error: checkError.message }, { status: 500 });
}
