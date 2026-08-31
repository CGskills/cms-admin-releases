-- Create sequences for automatic order_index generation
-- This eliminates the need for SELECT MAX queries when creating new records

-- Sequence for employees table
CREATE SEQUENCE IF NOT EXISTS employees_order_seq;

-- Set initial value based on existing data
SELECT setval(
  'employees_order_seq',
  COALESCE((SELECT MAX(order_index) FROM employees), 0) + 1,
  false
);

-- Set as default for order_index column
ALTER TABLE employees
  ALTER COLUMN order_index SET DEFAULT nextval('employees_order_seq');

-- Sequence for pricing table
CREATE SEQUENCE IF NOT EXISTS pricing_order_seq;

SELECT setval(
  'pricing_order_seq',
  COALESCE((SELECT MAX(order_index) FROM pricing), 0) + 1,
  false
);

ALTER TABLE pricing
  ALTER COLUMN order_index SET DEFAULT nextval('pricing_order_seq');

-- Sequence for portfolio_items table
CREATE SEQUENCE IF NOT EXISTS portfolio_order_seq;

SELECT setval(
  'portfolio_order_seq',
  COALESCE((SELECT MAX(order_index) FROM portfolio_items), 0) + 1,
  false
);

ALTER TABLE portfolio_items
  ALTER COLUMN order_index SET DEFAULT nextval('portfolio_order_seq');

-- Sequence for testimonials table
CREATE SEQUENCE IF NOT EXISTS testimonials_order_seq;

SELECT setval(
  'testimonials_order_seq',
  COALESCE((SELECT MAX(order_index) FROM testimonials), 0) + 1,
  false
);

ALTER TABLE testimonials
  ALTER COLUMN order_index SET DEFAULT nextval('testimonials_order_seq');

-- Add comments for documentation
COMMENT ON SEQUENCE employees_order_seq IS 'Auto-incrementing sequence for employee order_index';
COMMENT ON SEQUENCE pricing_order_seq IS 'Auto-incrementing sequence for pricing order_index';
COMMENT ON SEQUENCE portfolio_order_seq IS 'Auto-incrementing sequence for portfolio_items order_index';
COMMENT ON SEQUENCE testimonials_order_seq IS 'Auto-incrementing sequence for testimonials order_index';
