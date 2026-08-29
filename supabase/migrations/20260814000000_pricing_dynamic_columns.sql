-- Pricing Dynamic Columns Migration
-- This migration extends the pricing_settings JSON structure to support dynamic columns

-- The pricing_settings field in settings table already exists as JSONB
-- This migration documents the expected structure and adds helpful comments

COMMENT ON COLUMN settings.pricing_settings IS 'Pricing table configuration including currency, columns schema, and labels. Structure: { currency, currencyPosition, showDuration, showDescription, tableStyle, accentColor, columns: [{ id, key, label, type, width, visible, order, editable, required }], labels: { tableName, tableTitle, tableSubtitle, addButtonText, categoryLabel } }';

-- Add custom_fields to pricing table to store dynamic column values
ALTER TABLE pricing ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN pricing.custom_fields IS 'Storage for dynamic column values not in the base schema. Key-value pairs where key matches PricingColumn.key';

-- Create index for better performance on custom_fields queries
CREATE INDEX IF NOT EXISTS idx_pricing_custom_fields ON pricing USING gin(custom_fields);

-- Update updated_at on settings when pricing_settings changes
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS settings_updated_at_trigger ON settings;
CREATE TRIGGER settings_updated_at_trigger
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_settings_updated_at();

-- Example default pricing_settings structure (for reference)
-- {
--   "currency": "₽",
--   "currencyPosition": "after",
--   "showDuration": true,
--   "showDescription": true,
--   "tableStyle": "default",
--   "accentColor": "#DB9844",
--   "columns": [
--     {
--       "id": "name",
--       "key": "name",
--       "label": "Название услуги",
--       "type": "text",
--       "visible": true,
--       "order": 0,
--       "editable": true,
--       "required": true
--     },
--     {
--       "id": "description",
--       "key": "description",
--       "label": "Описание",
--       "type": "textarea",
--       "visible": true,
--       "order": 1,
--       "editable": true
--     },
--     {
--       "id": "price",
--       "key": "price",
--       "label": "Цена",
--       "type": "price",
--       "visible": true,
--       "order": 2,
--       "editable": true,
--       "required": true
--     },
--     {
--       "id": "duration",
--       "key": "duration",
--       "label": "Срок",
--       "type": "duration",
--       "visible": true,
--       "order": 3,
--       "editable": true
--     }
--   ],
--   "labels": {
--     "tableName": "Прайс-лист",
--     "tableTitle": "Наши услуги и цены",
--     "tableSubtitle": "Актуальные цены на все услуги",
--     "addButtonText": "Добавить услугу",
--     "categoryLabel": "Категория"
--   }
-- }
