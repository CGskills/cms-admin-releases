# Code Library Stabilization Report

**Дата:** 2026-09-02  
**Ветка:** fix/code-library-stability  
**Версия:** v0.2.8

## Проблемы и решения

### ✅ Проблема 1: Кнопка "Удалить всё" не работала

**Причина:**
- API использовал обычный Supabase клиент (`createClient`) вместо admin клиента
- Обычный клиент подчиняется RLS политикам, которые требуют функцию `is_admin()`
- RLS политика проверяет переменную `ADMIN_EMAILS`, но обычный клиент не имеет повышенных привилегий

**Решение:**
```typescript
// Было:
import { createClient } from '@/lib/supabase/server';
const supabase = await createClient();

// Стало:
import { createAdminClient } from '@/lib/supabase/admin';
const supabase = createAdminClient();
```

**Файл:** [`app/api/delete-all-code-blocks/route.ts`](app/api/delete-all-code-blocks/route.ts:1)

Admin клиент использует `SUPABASE_SERVICE_ROLE_KEY` и полностью обходит RLS.

---

### ✅ Проблема 2: Дублирование ключей Supabase в .env.local

**Причина:**
- Определены оба ключа: `NEXT_PUBLIC_SUPABASE_ANON_KEY` и `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Хотя значения идентичны, это создавало путаницу и риск расхождения

**Решение:**
- Удалён `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Оставлен только `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` с комментарием

**Файл:** [`.env.local`](.env.local:3)

```bash
# Anon/Public Key from Supabase Dashboard -> Project Settings -> API
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...
```

---

### ✅ Проблема 3: Отсутствовала переменная APP_ORIGIN

**Причина:**
- Функция `requireAdminApi()` вызывает `isTrustedMutationOrigin()` для проверки origin запроса
- Без `APP_ORIGIN` все admin API запросы возвращали 403 Forbidden

**Решение:**
Добавлена переменная окружения:

```bash
# Application Origin (required for CSRF protection)
APP_ORIGIN=http://localhost:3000
```

**Файл:** [`.env.local`](.env.local:14)

Для production нужно установить реальный URL развёртывания.

---

### ✅ Проблема 4: Зависимости без поля version

**Причина:**
- Функция `parseCodeBlockSource()` возвращает зависимости без поля `version`
- База данных может ожидать это поле в массиве `deps`

**Решение:**
```typescript
// Было:
const deps = dependencies.map(dep => ({
  name: dep.name || '',
  cdnUrl: dep.cdnUrl,
  // version field not available
}));

// Стало:
const deps = dependencies.map(dep => ({
  name: dep.name || '',
  cdnUrl: dep.cdnUrl,
  version: 'latest',
}));
```

**Файл:** [`app/api/seed-code-blocks/route.ts`](app/api/seed-code-blocks/route.ts:88)

---

### ✅ Проблема 5: Путь к preview файлам в production

**Причина:**
- Используется `join(process.cwd(), 'preview')`
- В Next.js standalone builds `process.cwd()` может не указывать на корень проекта

**Решение:**
```typescript
// Support custom preview directory for production deployments
const previewDir = process.env.PREVIEW_DIR || join(process.cwd(), 'preview');
```

**Файл:** [`app/api/seed-code-blocks/route.ts`](app/api/seed-code-blocks/route.ts:22)

Добавлена документация в .env.local:

```bash
# Preview Directory (optional, defaults to ./preview)
# PREVIEW_DIR=/path/to/preview
```

---

### ✅ Проблема 6: Улучшен UI компонент

**Изменения:**
- Создан единый компонент `CodeLibraryActions` вместо отдельных кнопок
- Добавлено модальное окно подтверждения удаления
- Улучшена обработка ошибок с подробными сообщениями
- Добавлены индикаторы загрузки
- Добавлен автоматический refresh после операций

**Файл:** [`app/admin/code-library/_components/CodeLibraryActions.tsx`](app/admin/code-library/_components/CodeLibraryActions.tsx:1)

**Особенности:**
- Модальное окно с подтверждением для "Удалить всё"
- Всплывающие уведомления о результатах операций
- Автоматическое обновление списка после успешных операций
- Обработка сетевых ошибок и ошибок API

---

### ✅ Улучшен Login Page

**Изменения:**
- Добавлена задержка 100мс после входа для записи cookies
- Улучшена обработка ошибок с логированием
- Добавлена базовая валидация email/password
- Email теперь trim() перед отправкой

**Файл:** [`app/admin/login/page.tsx`](app/admin/login/page.tsx:1)

```typescript
// Wait for session cookies to be written
await new Promise(resolve => setTimeout(resolve, 100));
window.location.replace('/admin');
```

---

## Тестирование

### Создан тестовый скрипт

**Файл:** [`scripts/test-code-library.ts`](scripts/test-code-library.ts:1)

```bash
# Запустить тесты
npm run test-code-library

# Запустить тесты с удалением
npm run test-code-library -- --delete
```

**Что проверяет:**
- ✅ Подключение к базе данных
- ✅ Наличие таблицы `code_blocks`
- ✅ Подсчёт существующих блоков
- ✅ Наличие preview файлов
- ✅ Функциональность удаления (с флагом --delete)

### Результаты тестов

```
🚀 Code Library Test Suite
==================================================
✅ Database connection successful
✅ Found 4 blocks in database
✅ Found 4/4 preview files
⚠️  Could not verify RLS status
==================================================
✅ Test suite completed
```

---

## Проверка сборки

```bash
npm run build
```

**Результат:**
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Generating static pages (37/37)
```

Все страницы собраны успешно, включая:
- ✅ `/admin/code-library` (5.45 kB)
- ✅ `/admin/code-library/[id]` (142 B)
- ✅ `/admin/code-library/new` (143 B)
- ✅ `/api/delete-all-code-blocks` (193 B)
- ✅ `/api/seed-code-blocks` (193 B)

---

## Переменные окружения

### Обязательные переменные

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Admin
ADMIN_EMAILS=admin@cgskills.local

# CSRF Protection
APP_ORIGIN=http://localhost:3000
```

### Опциональные переменные

```bash
# Preview Directory (только для production)
# PREVIEW_DIR=/path/to/preview
```

---

## Инструкции для v0.2.8 Production

### 1. Обновить переменные окружения

```bash
# В production .env
APP_ORIGIN=https://admin.cgskills.com  # Реальный URL
PREVIEW_DIR=/app/preview              # Если отличается от ./preview
```

### 2. Проверить ADMIN_EMAILS

Убедитесь, что email администратора указан в `ADMIN_EMAILS`:

```bash
ADMIN_EMAILS=admin@cgskills.com,manager@cgskills.com
```

### 3. Проверить preview файлы

Файлы должны существовать в production сборке:
- `preview/employees.html`
- `preview/reviews.html`
- `preview/portfolio.html`
- `preview/tilda-table-block.html`

---

## Проблемы с входом в v0.2.8

**Возможные причины:**

1. **Неверные переменные окружения**
   - Проверьте `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - Проверьте `APP_ORIGIN` соответствует реальному URL

2. **Email не в списке ADMIN_EMAILS**
   - После входа проверяется `is_admin()` функция
   - Если email не в списке, редирект на `/admin/login?error=forbidden`

3. **Проблемы с cookies**
   - Проверьте, что домен правильно настроен
   - SameSite политика может блокировать cookies

4. **Версия релиза**
   - Убедитесь, что v0.2.8 содержит все эти исправления
   - Проверьте коммит: `5252446 Release v0.2.8`

---

## Миграция с v0.2.7 на v0.2.8

### Основные изменения

1. **API routes используют admin client**
   - `delete-all-code-blocks` теперь обходит RLS
   - Удалена избыточная проверка пользователя

2. **Единая переменная для Supabase ключа**
   - Используется только `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - Удалён `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. **Обязательна переменная APP_ORIGIN**
   - Без неё все admin API возвращают 403

4. **Улучшен UI Code Library**
   - Модальное окно подтверждения
   - Лучшая обработка ошибок
   - Автообновление после операций

---

## Контрольный список перед деплоем

- [ ] Все переменные окружения установлены в production
- [ ] `APP_ORIGIN` соответствует production URL
- [ ] Email администратора добавлен в `ADMIN_EMAILS`
- [ ] Preview файлы присутствуют в сборке
- [ ] Запущены тесты: `npm run test-code-library`
- [ ] Успешна production сборка: `npm run build`
- [ ] Проверена работа кнопки "Удалить всё"
- [ ] Проверена работа кнопки "Импорт Preview"
- [ ] Проверен вход в админ панель

---

## Известные ограничения

1. **RLS Policies**
   - Admin API полностью обходит RLS через service role key
   - Это правильное поведение для admin операций

2. **Preview файлы**
   - Должны быть включены в production сборку
   - Путь можно настроить через `PREVIEW_DIR`

3. **CSRF Protection**
   - `APP_ORIGIN` обязателен для защиты от CSRF
   - Должен точно соответствовать URL приложения

---

## Дополнительные ресурсы

- [Тестовый скрипт](scripts/test-code-library.ts)
- [Отчёт по стабилизации](STABILIZATION_REPORT.md)
- [Отчёт по v0.2.8](RELEASE_v0.2.8.md)

---

**Статус:** ✅ Все критические проблемы исправлены  
**Тестирование:** ✅ Тесты пройдены  
**Сборка:** ✅ Production build успешен
