# Supabase Migrations for Pricing Module

> **Production security notice:** The SQL files in this directory are retained as
> historical/reference material. Do not apply the legacy pricing RLS policies to
> a production project. Apply `supabase/migrations/20260823000000_admin_hardening.sql`
> after the schema migrations; it removes legacy policies and restricts CMS
> reads/writes and Storage mutations to trusted administrators.

## Overview

This directory contains SQL migrations for the enhanced Pricing module with dynamic columns support.

## Migrations

### 20260814000000_pricing_dynamic_columns.sql

Adds support for dynamic columns in the pricing table:

- Adds `custom_fields` JSONB column to `pricing` table for storing values of custom columns
- Adds GIN index on `custom_fields` for better query performance
- Documents the expected structure of `pricing_settings` JSON
- Adds trigger to auto-update `updated_at` timestamp on settings changes

### 20260814000001_pricing_rls_policies.sql

Configures Row Level Security policies:

- **Public access**: SELECT visible pricing items and settings (read-only)
- **Authenticated access**: Full CRUD operations on pricing and settings
- Ensures public website can fetch data while admin panel has full control

## How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the content of each migration file
4. Paste and run them in order:
   - First: `20260814000000_pricing_dynamic_columns.sql`
   - Second: `20260814000001_pricing_rls_policies.sql` (reference only; do not run
     this legacy policy migration in production)
   - Finally: `20260823000000_admin_hardening.sql`

### Option 2: Supabase CLI

If you have Supabase CLI installed:

```bash
supabase db push
```

### Option 3: Manual SQL

Connect to your database and run:

```sql
-- Run first migration
\i supabase/migrations/20260814000000_pricing_dynamic_columns.sql

-- Run second migration
\i supabase/migrations/20260814000001_pricing_rls_policies.sql
```

## Database Schema After Migration

### `pricing` table

```
- id: uuid (primary key)
- category: text
- name: text
- description: text
- price: text
- duration: text
- features: text[]
- order_index: integer
- visible: boolean
- custom_fields: jsonb  ← NEW
- created_at: timestamp
```

### `settings` table

```
- id: uuid (primary key)
- site_name: text
- logo: text
- email: text
- phone: text
- social_links: jsonb
- pricing_settings: jsonb  ← Extended structure
- updated_at: timestamp
```

## pricing_settings Structure

```json
{
  "currency": "₽",
  "currencyPosition": "after",
  "showDuration": true,
  "showDescription": true,
  "tableStyle": "default",
  "accentColor": "#DB9844",
  "columns": [
    {
      "id": "name",
      "key": "name",
      "label": "Название услуги",
      "type": "text",
      "visible": true,
      "order": 0,
      "editable": true,
      "required": true
    }
  ],
  "labels": {
    "tableName": "Прайс-лист",
    "tableTitle": "Наши услуги и цены",
    "tableSubtitle": "Актуальные цены на все услуги",
    "addButtonText": "Добавить услугу",
    "categoryLabel": "Категория"
  }
}
```

## RLS Policies

### Pricing Table

- **SELECT**: Public can read `visible = true` items
- **INSERT/UPDATE/DELETE**: Only authenticated users

### Settings Table

- **SELECT**: Public can read all settings
- **INSERT/UPDATE/DELETE**: Only authenticated users

## Rollback

If you need to rollback these changes:

```sql
-- Remove custom_fields column
ALTER TABLE pricing DROP COLUMN IF EXISTS custom_fields;

-- Drop policies
DROP POLICY IF EXISTS "Public read access to visible pricing" ON pricing;
DROP POLICY IF EXISTS "Authenticated users can manage pricing" ON pricing;
DROP POLICY IF EXISTS "Public read access to settings" ON settings;
DROP POLICY IF EXISTS "Authenticated users can manage settings" ON settings;
```

## Verification

After applying migrations, verify with:

```sql
-- Check custom_fields column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pricing' AND column_name = 'custom_fields';

-- Check policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('pricing', 'settings');

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'pricing';
```
