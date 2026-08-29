-- Выполните в Supabase SQL Editor для создания функции очистки
CREATE OR REPLACE FUNCTION truncate_pricing()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  TRUNCATE TABLE pricing RESTART IDENTITY;
END;
$$;
