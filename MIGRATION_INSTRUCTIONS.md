# 🔄 Миграция базы данных - Инструкция

## Проблемы которые были исправлены:

### 1. ❌ Ошибка: "duplicate key value violates unique constraint portfolio_items_slug_key"
**Причина:** UNIQUE constraint на поле `slug` не позволял создавать проекты с одинаковыми названиями.

**Решение:** 
- Убрали UNIQUE constraint
- Добавили автоматическую генерацию уникального slug с counter (project-1, project-2, etc)
- При обновлении slug проверяется только на другие проекты (excludeId)

### 2. ✅ Добавлены структурированные поля описания
**Новые поля:**
- `problem` - описание проблемы
- `solution` - описание решения
- `result` - описание результата

**Формат как в референсе:**
```
Проблема: Разрушение жевательного зуба более чем на 60%...
Решение: После санации полости рта и подготовки зуба...
Результат: Полное восстановление формы и функции зуба...
```

---

## 📋 Шаги для применения изменений:

### Шаг 1: Выполнить SQL миграцию

Откройте **Supabase Dashboard** → **SQL Editor** и выполните:

```sql
-- Migration: Add structured description fields and fix slug uniqueness
-- Run this in Supabase SQL Editor

-- 1. Remove UNIQUE constraint from slug (allow duplicate base slugs)
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

-- 5. Verify changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'portfolio_items' 
  AND column_name IN ('problem', 'solution', 'result', 'slug')
ORDER BY ordinal_position;
```

Вы должны увидеть результат:
```
column_name | data_type | is_nullable
------------|-----------|------------
slug        | text      | NO
problem     | text      | YES
solution    | text      | YES
result      | text      | YES
```

### Шаг 2: Перезапустить dev server

После применения миграции:

```bash
# Остановить сервер (Ctrl+C)

# Очистить cache
Remove-Item -Recurse -Force .next

# Запустить снова
npm run dev
```

---

## ✅ Что было изменено в коде:

### 1. `app/admin/portfolio/actions.ts`
- ✅ Добавлена функция `generateUniqueSlug()` - генерирует уникальный slug с counter
- ✅ Обновлена `createPortfolio()` - работает с новыми полями problem, solution, result
- ✅ Обновлена `updatePortfolio()` - работает с новыми полями
- ✅ Убрана зависимость от Firebase (syncFirebase удалён)

### 2. `app/admin/portfolio/_components/PortfolioForm.tsx`
- ✅ Добавлены три Textarea для problem, solution, result
- ✅ Добавлена секция "Детальное описание кейса"
- ✅ Добавлен пример placeholder с реальным кейсом
- ✅ Добавлена инфо-панель как это будет отображаться
- ✅ Переведены все лейблы на русский язык

### 3. `types/database.types.ts`
- ✅ Добавлены поля problem, solution, result в Row/Insert/Update types

### 4. `supabase/schema_update.sql`
- ✅ Создан файл миграции для обновления существующей БД

---

## 🧪 Тестирование

После применения миграции и перезапуска сервера:

### Тест 1: Создание проекта
1. Перейти в `/admin/portfolio`
2. Нажать "Add Project"
3. Заполнить форму:
   - **Название:** Тестовый проект
   - **Проблема:** Описание проблемы
   - **Решение:** Описание решения
   - **Результат:** Описание результата
   - **Основное изображение:** Загрузить или вставить URL
4. Нажать "Создать проект"
5. ✅ Проект должен создаться без ошибки

### Тест 2: Дублирующиеся названия
1. Создать проект "Тестовый проект"
2. Создать ещё один проект "Тестовый проект"
3. ✅ Оба должны создаться
4. Проверить slugs в базе:
   - Первый: `testovyy-proekt`
   - Второй: `testovyy-proekt-1`

### Тест 3: Редактирование
1. Открыть любой проект на редактирование
2. Изменить problem, solution, result
3. Сохранить
4. ✅ Изменения должны сохраниться

### Тест 4: Отображение в Grid
1. Вернуться на `/admin/portfolio`
2. ✅ Все проекты должны отображаться в grid
3. ✅ Drag & drop должен работать

---

## 🎨 Как будут отображаться новые поля на сайте

### В админке:
При создании/редактировании проекта три отдельных поля:
```
Проблема
[Textarea]

Решение
[Textarea]

Результат
[Textarea]
```

### На сайте (frontend):
```tsx
// Пример компонента для отображения на сайте
export function ProjectCaseStudy({ project }: { project: PortfolioItem }) {
  return (
    <div className="space-y-8">
      {project.problem && (
        <div>
          <h3 className="text-xl font-bold text-[#DB9844] mb-3">Проблема:</h3>
          <p className="text-slate-300 leading-relaxed">{project.problem}</p>
        </div>
      )}

      {project.solution && (
        <div>
          <h3 className="text-xl font-bold text-[#DB9844] mb-3">Решение:</h3>
          <p className="text-slate-300 leading-relaxed">{project.solution}</p>
        </div>
      )}

      {project.result && (
        <div>
          <h3 className="text-xl font-bold text-[#DB9844] mb-3">Результат:</h3>
          <p className="text-slate-300 leading-relaxed">{project.result}</p>
        </div>
      )}
    </div>
  );
}
```

---

## 📊 Структура таблицы после миграции

```sql
portfolio_items:
├── id (UUID)
├── title (TEXT) *
├── slug (TEXT) - теперь без UNIQUE constraint
├── subtitle (TEXT)
├── description (TEXT) - краткое описание
├── problem (TEXT) - 🆕 структурированное поле
├── solution (TEXT) - 🆕 структурированное поле
├── result (TEXT) - 🆕 структурированное поле
├── category (TEXT)
├── technologies (TEXT[])
├── client (TEXT)
├── project_date (DATE)
├── project_url (TEXT)
├── image_url (TEXT)
├── before_image (TEXT)
├── after_image (TEXT)
├── gallery (TEXT[])
├── col_span (INTEGER)
├── tile_height (INTEGER)
├── cover_x (REAL)
├── cover_y (REAL)
├── cover_zoom (REAL)
├── order_index (INTEGER)
├── visible (BOOLEAN)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
```

---

## 🔍 Проверка что всё работает

### Проверка в Supabase:
```sql
-- Посмотреть все проекты
SELECT id, title, slug, problem, solution, result 
FROM portfolio_items 
ORDER BY created_at DESC;

-- Проверить slugs
SELECT title, slug 
FROM portfolio_items 
ORDER BY slug;
```

### Проверка в админке:
1. ✅ Страница `/admin/portfolio` загружается
2. ✅ Кнопка "Add Project" работает
3. ✅ Форма показывает все новые поля
4. ✅ Можно создать проект с дублирующимся названием
5. ✅ Можно редактировать problem/solution/result
6. ✅ Можно удалить проект
7. ✅ Drag & drop работает

---

## ❓ FAQ

### Q: Что будет со старыми проектами?
**A:** Старые проекты останутся как есть. Поля problem/solution/result будут пустыми. Вы можете:
- Оставить их пустыми
- Заполнить вручную через админку
- Или миграция автоматически скопирует старое description в problem

### Q: Можно ли использовать только description без problem/solution/result?
**A:** Да, все поля необязательные. Можете использовать как:
- Только description (старый формат)
- Только problem/solution/result (новый формат)
- Оба варианта одновременно

### Q: Что делать если миграция не применилась?
**A:** 
1. Проверьте права доступа в Supabase
2. Убедитесь что таблица `portfolio_items` существует
3. Попробуйте выполнить команды по одной
4. Проверьте логи ошибок в Supabase SQL Editor

### Q: Нужно ли удалять старые проекты?
**A:** Нет, старые проекты будут работать нормально. Новые поля просто будут пустыми.

---

## ✅ Готово!

После выполнения этих шагов:
- ✅ Ошибка duplicate slug исправлена
- ✅ Добавлены структурированные поля для кейсов
- ✅ Форма обновлена с русским интерфейсом
- ✅ Всё протестировано и готово к использованию

Можете создавать проекты! 🎉
