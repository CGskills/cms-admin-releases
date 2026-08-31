# 🔧 ИНСТРУКЦИЯ ПО ВОССТАНОВЛЕНИЮ АДМИНКИ

## ❌ ПРОБЛЕМА
После security commit (0bd0b1b) код изменился, но миграции не были применены к Supabase.

## ✅ РЕШЕНИЕ
Есть два пути:

### ВАРИАНТ 1: Применить миграции (РЕКОМЕНДУЕТСЯ)
### ВАРИАНТ 2: Откатить код к рабочему состоянию

---

## ВАРИАНТ 1: ПРИМЕНИТЬ МИГРАЦИИ ✅

### Шаг 1: Получить правильный Service Role Key

1. Откройте https://supabase.com/dashboard/project/pjujhrfkykxgzcexyyti/settings/api
2. Найдите **service_role key** (НЕ anon key!)
3. Скопируйте его

**Примечание:** Используйте service_role key из Supabase Dashboard.

### Шаг 2: Применить SQL миграции

1. Откройте https://supabase.com/dashboard/project/pjujhrfkykxgzcexyyti/sql/new

2. Скопируйте и выполните **ПЕРВУЮ** миграцию:

```sql
-- Create sequences for automatic order_index generation
CREATE SEQUENCE IF NOT EXISTS employees_order_seq;
SELECT setval('employees_order_seq', COALESCE((SELECT MAX(order_index) FROM employees), 0) + 1, false);
ALTER TABLE employees ALTER COLUMN order_index SET DEFAULT nextval('employees_order_seq');

CREATE SEQUENCE IF NOT EXISTS pricing_order_seq;
SELECT setval('pricing_order_seq', COALESCE((SELECT MAX(order_index) FROM pricing), 0) + 1, false);
ALTER TABLE pricing ALTER COLUMN order_index SET DEFAULT nextval('pricing_order_seq');

CREATE SEQUENCE IF NOT EXISTS portfolio_order_seq;
SELECT setval('portfolio_order_seq', COALESCE((SELECT MAX(order_index) FROM portfolio_items), 0) + 1, false);
ALTER TABLE portfolio_items ALTER COLUMN order_index SET DEFAULT nextval('portfolio_order_seq');

CREATE SEQUENCE IF NOT EXISTS testimonials_order_seq;
SELECT setval('testimonials_order_seq', COALESCE((SELECT MAX(order_index) FROM testimonials), 0) + 1, false);
ALTER TABLE testimonials ALTER COLUMN order_index SET DEFAULT nextval('testimonials_order_seq');
```

3. Нажмите **RUN**

4. Скопируйте и выполните **ВТОРУЮ** миграцию:

```sql
-- Batch update function
CREATE OR REPLACE FUNCTION batch_update_order(
  table_name TEXT,
  updates JSONB
) RETURNS void AS $$
DECLARE
  item JSONB;
  update_count INTEGER := 0;
BEGIN
  IF table_name NOT IN ('employees', 'pricing', 'portfolio_items', 'testimonials') THEN
    RAISE EXCEPTION 'Invalid table name: %', table_name;
  END IF;

  IF jsonb_typeof(updates) != 'array' THEN
    RAISE EXCEPTION 'Updates must be a JSON array';
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    IF NOT (item ? 'id' AND item ? 'order_index') THEN
      RAISE EXCEPTION 'Each item must have id and order_index';
    END IF;

    EXECUTE format(
      'UPDATE %I SET order_index = $1, updated_at = NOW() WHERE id = $2',
      table_name
    ) USING (item->>'order_index')::INTEGER, (item->>'id')::UUID;

    update_count := update_count + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION batch_update_order(TEXT, JSONB) TO authenticated;
```

5. Нажмите **RUN**

### Шаг 3: Перезапустить приложение

```bash
npm run desktop:dev
```

### Шаг 4: Протестировать все разделы

- ✅ Прайс-лист
- ✅ Отзывы
- ✅ Сотрудники
- ✅ Портфолио

---

## ВАРИАНТ 2: ОТКАТИТЬ КОД (ВРЕМЕННОЕ РЕШЕНИЕ)

Если миграции применить не получается, я откачу код к рабочему состоянию.

**Минусы:**
- Медленнее (SELECT MAX вместо sequences)
- Временное решение
- Миграции всё равно нужно будет применить

**Плюсы:**
- Заработает сразу
- Не требует доступа к Supabase Dashboard

---

## ЧТО ДЕЛАТЬ ДАЛЬШЕ?

**Вариант 1:** Предоставьте правильный service_role ключ от Supabase
**Вариант 2:** Я откачу код к рабочему состоянию

Какой вариант выбираете?
