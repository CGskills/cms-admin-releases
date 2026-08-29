-- Migration: Add structured description fields and fix slug uniqueness
-- Run this in Supabase SQL Editor

-- 1. Remove UNIQUE constraint from slug (allow duplicate slugs with different timestamps)
ALTER TABLE portfolio_items DROP CONSTRAINT IF EXISTS portfolio_items_slug_key;

-- 2. Add new structured description fields
ALTER TABLE portfolio_items 
ADD COLUMN IF NOT EXISTS problem TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS solution TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS result TEXT DEFAULT '';

-- 3. Create index on slug for faster queries (but not unique)
CREATE INDEX IF NOT EXISTS idx_portfolio_items_slug ON portfolio_items(slug);

-- 4. Migrate existing description data (optional - only if you have existing data)
-- This copies old description to problem field if problem is empty
UPDATE portfolio_items 
SET problem = description 
WHERE problem = '' AND description != '';

-- 5. Create updated_at trigger if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_portfolio_items_updated_at ON portfolio_items;
CREATE TRIGGER update_portfolio_items_updated_at BEFORE UPDATE ON portfolio_items
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verify changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'portfolio_items' 
  AND column_name IN ('problem', 'solution', 'result')
ORDER BY ordinal_position;
