-- REFERENCE ONLY (legacy): do not apply this file to production.
-- Its historical policies predate admin_users/public.is_admin() and are intentionally permissive.
-- Apply the canonical migration supabase/migrations/20260823000000_admin_hardening.sql instead.

-- Row Level Security Policies for Pricing Module

-- Enable RLS on pricing table (if not already enabled)
ALTER TABLE pricing ENABLE ROW LEVEL SECURITY;

-- Enable RLS on settings table (if not already enabled)
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ===== PRICING TABLE POLICIES =====

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public read access to visible pricing" ON pricing;
DROP POLICY IF EXISTS "Authenticated users can manage pricing" ON pricing;

-- Public users can SELECT only visible pricing items
CREATE POLICY "Public read access to visible pricing"
  ON pricing
  FOR SELECT
  USING (visible = true);

-- Authenticated users (admin) can do everything
CREATE POLICY "Authenticated users can manage pricing"
  ON pricing
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ===== SETTINGS TABLE POLICIES =====

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public read access to settings" ON settings;
DROP POLICY IF EXISTS "Authenticated users can manage settings" ON settings;

-- Public users can SELECT settings (including pricing_settings)
CREATE POLICY "Public read access to settings"
  ON settings
  FOR SELECT
  USING (true);

-- Authenticated users (admin) can UPDATE settings
CREATE POLICY "Authenticated users can manage settings"
  ON settings
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Add comments
COMMENT ON POLICY "Public read access to visible pricing" ON pricing IS 'Allows public website to fetch visible pricing items';
COMMENT ON POLICY "Authenticated users can manage pricing" ON pricing IS 'Allows admin panel to create, update, delete pricing items';
COMMENT ON POLICY "Public read access to settings" ON settings IS 'Allows public website to fetch pricing settings for display';
COMMENT ON POLICY "Authenticated users can manage settings" ON settings IS 'Allows admin panel to update pricing settings';
