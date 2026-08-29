-- URGENT FIX: Add missing columns to portfolio_items
-- Run this IMMEDIATELY in Supabase SQL Editor

-- 1. Check if columns exist and add them if not
DO $$ 
BEGIN
    -- Add problem column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'portfolio_items' AND column_name = 'problem'
    ) THEN
        ALTER TABLE portfolio_items ADD COLUMN problem TEXT DEFAULT '';
        RAISE NOTICE 'Added column: problem';
    ELSE
        RAISE NOTICE 'Column already exists: problem';
    END IF;

    -- Add solution column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'portfolio_items' AND column_name = 'solution'
    ) THEN
        ALTER TABLE portfolio_items ADD COLUMN solution TEXT DEFAULT '';
        RAISE NOTICE 'Added column: solution';
    ELSE
        RAISE NOTICE 'Column already exists: solution';
    END IF;

    -- Add result column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'portfolio_items' AND column_name = 'result'
    ) THEN
        ALTER TABLE portfolio_items ADD COLUMN result TEXT DEFAULT '';
        RAISE NOTICE 'Added column: result';
    ELSE
        RAISE NOTICE 'Column already exists: result';
    END IF;
END $$;

-- 2. Remove UNIQUE constraint from slug if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'portfolio_items_slug_key'
    ) THEN
        ALTER TABLE portfolio_items DROP CONSTRAINT portfolio_items_slug_key;
        RAISE NOTICE 'Dropped UNIQUE constraint on slug';
    ELSE
        RAISE NOTICE 'UNIQUE constraint on slug does not exist';
    END IF;
END $$;

-- 3. Create non-unique index on slug for performance
CREATE INDEX IF NOT EXISTS idx_portfolio_items_slug ON portfolio_items(slug);

-- 4. Verify changes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'portfolio_items'
    AND column_name IN ('problem', 'solution', 'result', 'slug')
ORDER BY ordinal_position;

-- Expected output:
-- column_name | data_type | is_nullable | column_default
-- ------------|-----------|-------------|---------------
-- slug        | text      | NO          | NULL
-- problem     | text      | YES         | ''::text
-- solution    | text      | YES         | ''::text
-- result      | text      | YES         | ''::text

-- If you see all 4 columns listed above, the migration is successful!
