# CMS Setup Instructions

## 📋 Шаг 1: Создать таблицы в Supabase

### 1.1 Открыть Supabase Dashboard

1. Перейти на https://app.supabase.com
2. Выбрать ваш проект
3. Перейти в **SQL Editor**

### 1.2 Выполнить SQL скрипт

1. Открыть файл `supabase/schema.sql`
2. Скопировать весь код
3. Вставить в SQL Editor
4. Нажать **Run**

Это создаст:
- 7 таблиц (pages, portfolio, services, pricing, testimonials, employees, settings)
- Row Level Security policies
- Triggers для auto-update
- Дефолтные settings

### 1.3 Проверить созданные таблицы

В Supabase Dashboard → **Table Editor** должны появиться:
- ✅ pages
- ✅ portfolio
- ✅ services
- ✅ pricing
- ✅ testimonials
- ✅ employees
- ✅ settings

## 🗄️ Шаг 2: Создать Storage Buckets (опционально)

Для загрузки изображений:

1. Перейти в **Storage**
2. Создать buckets:
   - `portfolio`
   - `employees`
   - `services`
   - `avatars`
   - `logos`
   - `media`

3. Настроить policies для каждого bucket:

```sql
-- Public read access
CREATE POLICY "Public can read" ON storage.objects
FOR SELECT USING (bucket_id = 'portfolio');

-- Authenticated users can upload
CREATE POLICY "Authenticated can upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'portfolio');

-- Authenticated users can delete
CREATE POLICY "Authenticated can delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'portfolio');
```

Повторить для всех buckets.

## 🚀 Шаг 3: Запустить проект

### 3.1 Проверить .env.local

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJxxx...
```

### 3.2 Установить зависимости (если нужно)

```bash
npm install
```

### 3.3 Запустить dev сервер

```bash
npm run dev
```

### 3.4 Открыть браузер

```
http://localhost:3000/admin/login
```

## ✅ Шаг 4: Проверить работу

### 4.1 Войти в систему

Используйте существующего пользователя Supabase:
- Email: `admin@example.com` (или ваш)
- Password: ваш пароль

### 4.2 Проверить Dashboard

После входа откроется Dashboard со статистикой.

### 4.3 Протестировать CRUD

**Portfolio:**
1. Перейти в **Portfolio**
2. Нажать **Add Project**
3. Заполнить форму:
   - Title: "Test Project"
   - Description: "Test description"
   - Category: "Web Development"
   - Technologies: "React, TypeScript"
   - Image URL: `https://picsum.photos/800/600`
4. Нажать **Create Project**
5. Проверить, что проект появился
6. Нажать **Edit** - изменить
7. Нажать **Delete** - удалить с подтверждением

**Pages:**
1. Перейти в **Pages**
2. Нажать **Add Page**
3. Заполнить:
   - Title: "About Us"
   - Slug: "about-us" (или оставить пустым для auto-generate)
   - Content: "About our company..."
   - SEO Title: "About Us - Company"
   - SEO Description: "Learn about our company"
4. Нажать **Create Page**
5. Проверить в списке
6. Попробовать Edit и Delete

**Testimonials:**
1. Перейти в **Testimonials**
2. Нажать **Add Testimonial**
3. Заполнить:
   - Name: "John Doe"
   - Position: "CEO at Company"
   - Text: "Great service!"
   - Rating: 5
   - Avatar: `https://i.pravatar.cc/150?img=1`
4. Создать и проверить

## 🐛 Шаг 5: Troubleshooting

### Ошибка "relation does not exist"

**Причина:** Таблицы не созданы в Supabase

**Решение:**
1. Проверить в Supabase Dashboard → Table Editor
2. Выполнить `supabase/schema.sql` ещё раз

### Ошибка "permission denied"

**Причина:** RLS policies не созданы

**Решение:**
1. Проверить policies в Supabase Dashboard → Authentication → Policies
2. Убедиться, что есть policies для authenticated users

### Не работает авторизация

**Причина:** Неверные ключи в .env.local

**Решение:**
1. Проверить Supabase Dashboard → Settings → API
2. Скопировать правильные URL и anon key
3. Перезапустить dev сервер

### Статистика показывает 0

**Причина:** Нет данных в таблицах

**Решение:**
1. Создать несколько записей через формы CMS
2. Обновить страницу

## 📊 Шаг 6: Проверить типы TypeScript

```bash
npx tsc --noEmit
```

Должно быть без ошибок.

## 🏗️ Шаг 7: Production Build

```bash
npm run build
```

Если ошибки:
1. Проверить все импорты
2. Проверить типы
3. Проверить Server Actions

## 📝 Что дальше?

### Доделать оставшиеся разделы:

1. **Services**
   - Скопировать структуру Portfolio
   - Адаптировать под services таблицу
   - Добавить icon field

2. **Pricing**
   - Таблица или cards view
   - Категории цен
   - CRUD

3. **Employees**
   - Карточки команды
   - Фото upload
   - Social links (JSON)

4. **Settings**
   - Single record edit
   - Logo upload
   - Contact info
   - Social links

5. **Media**
   - File upload в Supabase Storage
   - Галерея изображений
   - Copy URL функционал

### Добавить функционал:

- ✅ Image upload component
- ✅ Rich text editor (TipTap, Lexical)
- ✅ Drag & drop file upload
- ✅ Image cropper
- ✅ Pagination для списков
- ✅ Search/Filter
- ✅ Bulk operations
- ✅ Export data

### Интеграция с сайтом:

Все данные уже доступны через Supabase:

```typescript
// На фронтенде сайта
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// Получить портфолио
const { data: projects } = await supabase
  .from('portfolio')
  .select('*')
  .order('created_at', { ascending: false });

// Получить отзывы
const { data: testimonials } = await supabase
  .from('testimonials')
  .select('*')
  .eq('rating', 5); // только 5 звёзд

// Получить страницу по slug
const { data: page } = await supabase
  .from('pages')
  .select('*')
  .eq('slug', 'about-us')
  .single();
```

## ✨ Готово!

CMS готова к использованию. Можете:
1. Управлять контентом
2. Добавлять/редактировать/удалять записи
3. Интегрировать с основным сайтом

Все изменения в админке автоматически отображаются на сайте через Supabase.
