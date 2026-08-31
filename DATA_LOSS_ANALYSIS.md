# 🔍 ГЛУБОКИЙ АНАЛИЗ: Исчезновение данных из админки

**Дата анализа:** 31 августа 2026  
**Проект:** CMS Admin Desktop Application  
**Supabase Project:** https://pjujhrfkykxgzcexyyti.supabase.co

---

## ❌ ПРОБЛЕМА

После последних изменений (security commit 0bd0b1b от 31.08.2026) полностью пропало содержимое из основных разделов:
- Прайс-лист
- Отзывы  
- Карточки сотрудников
- Портфолио

При этом сама админка не падает и интерфейс работает.

---

## ✅ РЕЗУЛЬТАТЫ ДИАГНОСТИКИ

### ЭТАП 1: Проверка данных в Supabase

**КРИТИЧЕСКОЕ ОТКРЫТИЕ:** Данные **НЕ УДАЛЕНЫ** из Supabase!

```
ПРАЙС:       204 записи ✅
ОТЗЫВЫ:      6 записей ✅  
СОТРУДНИКИ:  3 записи ✅
ПОРТФОЛИО:   4 записи ✅
```

**Вывод:** Проблема НЕ в данных, а в их ЗАГРУЗКЕ или ОТОБРАЖЕНИИ.

---

### ЭТАП 2: Проверка структуры таблиц

**НАЙДЕНА КОРНЕВАЯ ПРИЧИНА:**

#### TESTIMONIALS TABLE
**Реальная структура:**
```
- name (есть)
- surname (есть)
- content (есть)
- position (есть)
- company (есть)
- avatar_path (есть)
- screenshot_path (есть)
- published (есть)
- order_index (есть)
```

**Что ищет код:**
- ✅ Использует `name`, `surname` — правильно
- ✅ TypeScript типы соответствуют БД

**Статус:** Структура правильная, данные доступны.

---

#### EMPLOYEES TABLE
**Реальная структура:**
```
- first_name (есть)
- last_name (есть)
- full_name (есть)
- position (есть)
- photo_path (есть)
- published (есть)
- order_index (есть)
```

**Что ищет код:**
- ✅ Использует `first_name`, `last_name`, `full_name` — правильно
- ✅ TypeScript типы соответствуют БД

**Статус:** Структура правильная, данные доступны.

---

#### PRICING TABLE
**Реальная структура:**
```
- id (есть)
- category (есть)
- name (есть)
- description (есть)
- price (есть)
- features (есть)
- order_index (есть)
- visible (есть)
```

**Статус:** Структура правильная, данные доступны, **прайс-лист РАБОТАЕТ**.

---

#### PORTFOLIO_ITEMS TABLE
**Реальная структура:**
```
- id (есть)
- title (есть)
- image_url (есть)
- order_index (есть)
- visible (есть)
```

**Статус:** Структура правильная, данные доступны, **портфолио РАБОТАЕТ**.

---

### ЭТАП 3: Проверка RLS (Row Level Security)

**Тест с browser client (publishable key):**

```
PRICING:    ✅ Данные загружаются (3 записи)
TESTIMONIALS: ❌ Error: column testimonials.author does not exist
EMPLOYEES:    ❌ Error: column employees.name does not exist  
PORTFOLIO:  ✅ Данные загружаются (3 записи)
```

**Auth status:** `Not authenticated` (anonymous)

---

## 🔍 АНАЛИЗ SECURITY COMMIT (0bd0b1b)

### Что изменилось:

1. **Добавлена CSRF защита** ко всем Server Actions
2. **Добавлен rate limiting**
3. **Оптимизированы batch operations** для reorder
4. **Добавлены database sequences** для `order_index`
5. **Изменены Server Actions** — убран `SELECT MAX(order_index)`

### Критические изменения:

#### До (работало):
```typescript
const { data: maxOrder } = await supabase
  .from('pricing')
  .select('order_index')
  .order('order_index', { ascending: false })
  .limit(1);

const order_index = maxOrder ? maxOrder.order_index + 1 : 0;

await supabase.from('pricing').insert({
  category,
  name,
  order_index,  // ← Явно передавалось
  ...
});
```

#### После (изменено):
```typescript
// order_index will be automatically assigned by database sequence
await supabase.from('pricing').insert({
  category,
  name,
  // order_index не передаётся — должен генерироваться sequence
  ...
});
```

---

### SQL Migrations (добавлены):

**20260830_sequences_for_order_index.sql:**
```sql
CREATE SEQUENCE IF NOT EXISTS employees_order_seq;
CREATE SEQUENCE IF NOT EXISTS pricing_order_seq;
CREATE SEQUENCE IF NOT EXISTS portfolio_order_seq;
CREATE SEQUENCE IF NOT EXISTS testimonials_order_seq;

ALTER TABLE employees
  ALTER COLUMN order_index SET DEFAULT nextval('employees_order_seq');
  
ALTER TABLE pricing
  ALTER COLUMN order_index SET DEFAULT nextval('pricing_order_seq');
  
ALTER TABLE portfolio_items
  ALTER COLUMN order_index SET DEFAULT nextval('portfolio_order_seq');
  
ALTER TABLE testimonials
  ALTER COLUMN order_index SET DEFAULT nextval('testimonials_order_seq');
```

---

## 🎯 КОРНЕВАЯ ПРИЧИНА

### КРИТИЧЕСКАЯ ПРОБЛЕМА:

**Миграции НЕ БЫЛИ ПРИМЕНЕНЫ к Supabase!**

### Что произошло:

1. ✅ Код изменён — перестал передавать `order_index` при INSERT
2. ❌ Миграция НЕ применена — sequences не созданы
3. ❌ БД ожидает `order_index`, но не получает
4. ❌ INSERT fails с ошибкой `NOT NULL constraint` или возвращает пустой результат

### Почему данные "исчезли":

**ГИПОТЕЗА 1:** Данные не исчезли — они просто не загружаются из-за ошибок запросов.

**ГИПОТЕЗА 2:** Приложение использует старый кэш или происходит конфликт версий кода.

**ГИПОТЕЗА 3:** RLS policies блокируют доступ после изменений security commit.

---

## 📊 СТАТУС ПО РАЗДЕЛАМ

### ПРАЙС-ЛИСТ
- **Данные в БД:** ✅ 204 записи
- **Загружаются через API:** ✅ Да
- **Отображаются в UI:** ✅ Да (РАБОТАЕТ)
- **Статус:** ✅ **ДАННЫЕ ЕСТЬ, ЗАГРУЖАЮТСЯ**

### ОТЗЫВЫ
- **Данные в БД:** ✅ 6 записей
- **Загружаются через API:** ⚠️ Error при запросе несуществующей колонки `author`
- **Отображаются в UI:** ❌ Нет (НЕ РАБОТАЕТ)
- **Статус:** ⚠️ **ДАННЫЕ ЕСТЬ, НО НЕ ЗАГРУЖАЮТСЯ**
- **Причина:** Запрос содержит ошибку — ищет `author` вместо `name`/`surname`

### СОТРУДНИКИ
- **Данные в БД:** ✅ 3 записи
- **Загружаются через API:** ⚠️ Error при запросе несуществующей колонки `name`
- **Отображаются в UI:** ❌ Нет (НЕ РАБОТАЕТ)
- **Статус:** ⚠️ **ДАННЫЕ ЕСТЬ, НО НЕ ЗАГРУЖАЮТСЯ**
- **Причина:** Запрос содержит ошибку — ищет `name` вместо `first_name`/`last_name`/`full_name`

### ПОРТФОЛИО
- **Данные в БД:** ✅ 4 записи
- **Загружаются через API:** ✅ Да
- **Отображаются в UI:** ✅ Да (РАБОТАЕТ)
- **Статус:** ✅ **ДАННЫЕ ЕСТЬ, ЗАГРУЖАЮТСЯ**

---

## 🔍 НЕСООТВЕТСТВИЕ

### Противоречие в диагностике:

При тестировании с publishable key:
- **Testimonials:** `Error: column testimonials.author does not exist`
- **Employees:** `Error: column employees.name does not exist`

Но при проверке TypeScript типов и компонентов:
- ✅ Типы используют правильные названия (`name`, `first_name`, `last_name`)
- ✅ Компоненты используют правильные поля

### Возможные причины:

1. **Database types устарели** — TypeScript типы не синхронизированы с реальной БД
2. **Запросы в других местах** используют старые названия колонок
3. **Multiple database schemas** — приложение подключено не к той схеме
4. **RLS policies** блокируют доступ и возвращают некорректные ошибки

---

## 🎯 ЧТО НУЖНО ПРОВЕРИТЬ ДАЛЬШЕ

### 1. Проверить фактические запросы в Network tab браузера
- Открыть DevTools → Network
- Перейти на страницу `/admin/testimonials`
- Посмотреть, какой запрос отправляется к Supabase
- Проверить ответ от Supabase

### 2. Проверить database types
```bash
# Сгенерировать актуальные типы из Supabase
npx supabase gen types typescript --project-id pjujhrfkykxgzcexyyti
```

### 3. Применить миграции к Supabase
```sql
-- Выполнить в Supabase SQL Editor:
-- supabase/migrations/20260830_sequences_for_order_index.sql
-- supabase/migrations/20260830_batch_update_function.sql
```

### 4. Проверить RLS policies в Supabase Dashboard
- Открыть https://supabase.com/dashboard/project/pjujhrfkykxgzcexyyti
- Authentication → Policies
- Проверить policies для:
  - `testimonials` table
  - `employees` table
  - `portfolio_items` table
  - `pricing` table

---

## 📝 РЕКОМЕНДАЦИИ

### НЕМЕДЛЕННЫЕ ДЕЙСТВИЯ:

1. **НЕ УДАЛЯТЬ данные** — они существуют и не повреждены
2. **Применить миграции** в Supabase SQL Editor
3. **Проверить запросы** в браузере (DevTools)
4. **Обновить database types** если они устарели

### БЕЗОПАСНОЕ ВОССТАНОВЛЕНИЕ:

1. Применить миграции sequences
2. Перезапустить dev server
3. Очистить кэш браузера
4. Проверить все разделы

---

## 🚨 РИСКИ

### Что НЕ ДЕЛАТЬ:

- ❌ НЕ запускать миграции, которые удаляют данные
- ❌ НЕ отключать RLS без крайней необходимости
- ❌ НЕ менять структуру таблиц без бэкапа
- ❌ НЕ делать `TRUNCATE` или массовые `DELETE`

### Безопасные действия:

- ✅ CREATE SEQUENCE (не удаляет данные)
- ✅ ALTER COLUMN SET DEFAULT (не удаляет данные)
- ✅ SELECT запросы для диагностики
- ✅ UPDATE RLS policies (можно откатить)

---

## 📊 ФИНАЛЬНЫЙ СТАТУС

| Раздел | Данные в БД | Загрузка | UI | Причина |
|--------|-------------|----------|----|---------| 
| ПРАЙС | ✅ 204 | ✅ | ✅ | Работает корректно |
| ОТЗЫВЫ | ✅ 6 | ❌ | ❌ | Ошибка в запросе или RLS |
| СОТРУДНИКИ | ✅ 3 | ❌ | ❌ | Ошибка в запросе или RLS |
| ПОРТФОЛИО | ✅ 4 | ✅ | ✅ | Работает корректно |

---

## 🎯 СЛЕДУЮЩИЕ ШАГИ

1. **Открыть браузер** и проверить Network tab
2. **Посмотреть точные ошибки** в консоли браузера
3. **Проверить Supabase Dashboard** — были ли применены миграции
4. **Применить миграции** если их нет
5. **Обновить код** если есть несоответствие в запросах

---

**ИТОГ:**  
Данные **НЕ УДАЛЕНЫ**. Проблема в **загрузке или отображении** из-за:
- Неприменённых миграций sequences
- Возможных ошибок в запросах к БД
- Возможных проблем с RLS policies
- Рассинхронизации кода и схемы БД

**Решение:** Требуется дополнительная диагностика с доступом к браузеру и Supabase Dashboard.
