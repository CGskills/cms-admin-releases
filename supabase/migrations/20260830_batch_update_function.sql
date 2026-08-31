-- Batch update function for reorder operations
-- This function performs multiple order_index updates in a single transaction
-- reducing the overhead of individual UPDATE queries

CREATE OR REPLACE FUNCTION batch_update_order(
  table_name TEXT,
  updates JSONB
) RETURNS void AS $$
DECLARE
  item JSONB;
  update_count INTEGER := 0;
BEGIN
  -- Validate table name to prevent SQL injection
  IF table_name NOT IN ('employees', 'pricing', 'portfolio_items', 'testimonials') THEN
    RAISE EXCEPTION 'Invalid table name: %', table_name;
  END IF;

  -- Validate updates array
  IF jsonb_typeof(updates) != 'array' THEN
    RAISE EXCEPTION 'Updates must be a JSON array';
  END IF;

  -- Perform batch update
  FOR item IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    -- Validate item structure
    IF NOT (item ? 'id' AND item ? 'order_index') THEN
      RAISE EXCEPTION 'Each item must have id and order_index';
    END IF;

    -- Execute update
    EXECUTE format(
      'UPDATE %I SET order_index = $1, updated_at = NOW() WHERE id = $2',
      table_name
    ) USING (item->>'order_index')::INTEGER, (item->>'id')::UUID;

    update_count := update_count + 1;
  END LOOP;

  -- Log for debugging (optional)
  RAISE NOTICE 'Updated % rows in %', update_count, table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
-- Adjust this based on your RLS policies
GRANT EXECUTE ON FUNCTION batch_update_order(TEXT, JSONB) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION batch_update_order IS 'Batch update order_index for drag-and-drop reordering. Used by admin panel to efficiently update multiple rows in a single transaction.';
