-- REFERENCE ONLY (legacy): do not apply this file to production.
-- Its historical policies predate admin_users/public.is_admin() and are intentionally permissive.
-- Apply the canonical migration supabase/migrations/20260823000000_admin_hardening.sql instead.

-- ============================================================
-- ACTIVITY LOG MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can read activity logs
CREATE POLICY "Authenticated users can read activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (true);

-- Only authenticated users can insert activity logs
CREATE POLICY "Authenticated users can insert activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON activity_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
