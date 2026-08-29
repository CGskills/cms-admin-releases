-- REFERENCE ONLY (legacy): do not apply this file to production.
-- Its historical policies predate admin_users/public.is_admin() and are intentionally permissive.
-- Apply the canonical migration supabase/migrations/20260823000000_admin_hardening.sql instead.

-- Code Library: code_blocks table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS code_blocks (
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_code_blocks_category ON code_blocks(category);
CREATE INDEX IF NOT EXISTS idx_code_blocks_status ON code_blocks(status);
CREATE INDEX IF NOT EXISTS idx_code_blocks_created_at ON code_blocks(created_at DESC);

-- Auto-update updated_at trigger
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

-- RLS
ALTER TABLE code_blocks ENABLE ROW LEVEL SECURITY;

-- Authenticated users (admin) can do everything
DROP POLICY IF EXISTS "Authenticated code_blocks full access" ON code_blocks;
CREATE POLICY "Authenticated code_blocks full access"
  ON code_blocks
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Anonymous users have no access (code blocks are admin-only)
DROP POLICY IF EXISTS "No anonymous code_blocks access" ON code_blocks;
CREATE POLICY "No anonymous code_blocks access"
  ON code_blocks
  FOR ALL
  TO anon
  USING (false);
