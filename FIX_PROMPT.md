# Промт для исправления всех найденных ошибок в проекте CMS Admin Panel

Проанализируй проект и исправь все найденные баги и уязвимости согласно списку ниже. Для каждого исправления создавай тесты, проверяй работоспособность, не ломай существующий функционал.

---

## 1. CSRF-ЗАЩИТА ДЛЯ SERVER ACTIONS

**Задача:** Добавить защиту от CSRF-атак для всех Server Actions

**Что исправить:**
- В `lib/auth/server.ts` функция `requireTrustedMutationOrigin` существует, но нигде не используется
- Все файлы `app/admin/*/actions.ts` выполняют мутации без проверки origin

**Решение:**
1. Создай middleware `app/admin/middleware.ts` для проверки Origin всех POST-запросов к /admin/*
2. Добавь проверку в начало каждой Server Action через `headers()`:
   ```typescript
   import { headers } from 'next/headers';
   
   export async function createEmployee(formData: FormData) {
     const headersList = await headers();
     const origin = headersList.get('origin');
     const referer = headersList.get('referer');
     
     if (!origin && !referer) {
       throw new Error('Missing origin header');
     }
     
     const requestOrigin = origin || new URL(referer!).origin;
     const expectedOrigin = process.env.APP_ORIGIN || new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin;
     
     if (requestOrigin !== expectedOrigin) {
       throw new Error('Invalid request origin');
     }
     
     // остальной код action...
   }
   ```
3. Создай helper функцию `lib/auth/csrf.ts`:
   ```typescript
   export async function validateCSRF(): Promise<void> {
     // логика проверки origin
   }
   ```
4. Вызывай `await validateCSRF()` в начале КАЖДОГО action в файлах:
   - `app/admin/code-library/actions.ts`
   - `app/admin/employees/actions.ts`
   - `app/admin/media/actions.ts`
   - `app/admin/pages/actions.ts`
   - `app/admin/portfolio/actions.ts`
   - `app/admin/pricing/actions.ts`
   - `app/admin/services/actions.ts`
   - `app/admin/settings/actions.ts`
   - `app/admin/testimonials/actions.ts`

**Тестирование:**
- Создай тест `tests/csrf.test.ts` с проверкой:
  - Запрос с правильным Origin проходит
  - Запрос без Origin блокируется
  - Запрос с чужим Origin блокируется
- Проверь что все существующие формы работают после изменений

---

## 2. RACE CONDITION В ЗАГРУЗКЕ ИЗОБРАЖЕНИЙ

**Задача:** Исправить утечку storage при отмене форм и ошибках сохранения

**Что исправить:**
- `lib/storage/server.ts` — функция `uploadAdminImage` игнорирует `oldPath`
- При загрузке нескольких файлов и отмене формы все файлы остаются в storage навсегда

**Решение:**
1. Создай таблицу в Supabase для отслеживания временных загрузок:
   ```sql
   CREATE TABLE temp_uploads (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     bucket TEXT NOT NULL,
     path TEXT NOT NULL,
     uploaded_at TIMESTAMPTZ DEFAULT NOW(),
     expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
   );
   
   CREATE INDEX idx_temp_uploads_expires ON temp_uploads(expires_at);
   ```

2. Модифицируй `lib/storage/server.ts`:
   - В `uploadAdminImage` после успешной загрузки записывай путь в `temp_uploads`
   - Создай функцию `markUploadAsPermanent(path: string)` которая удаляет запись из `temp_uploads`
   - Создай функцию `cleanupExpiredUploads()` для удаления просроченных файлов

3. В каждом action после успешного `.insert()` или `.update()`:
   ```typescript
   if (error) throw new Error(error.message);
   committed = true;
   
   // Помечаем загрузку как постоянную
   if (photo_path) {
     await markUploadAsPermanent(photo_path);
   }
   ```

4. Создай cron job или scheduled task:
   - В `app/api/cron/cleanup-storage/route.ts` (защищенный API route)
   - Вызывает `cleanupExpiredUploads()` каждый час
   - Удаляет файлы из storage где `expires_at < NOW()`

**Тестирование:**
- Создай тест `tests/storage-cleanup.test.ts`:
  - Загрузи файл, не сохраняй форму, проверь что через 24ч файл удалился
  - Загрузи файл, сохрани форму, проверь что файл НЕ удалился
- Проверь что rollback работает при ошибках сохранения

---

## 3. DOS ЧЕРЕЗ МАССОВЫЕ REORDER

**Задача:** Оптимизировать массовые update операций для предотвращения таймаутов

**Что исправить:**
- `app/admin/pricing/actions.ts` функция `persistPricingOrder` делает до 1000 последовательных UPDATE
- Аналогичные проблемы в `employees/actions.ts`, `portfolio/actions.ts`

**Решение:**
1. Создай PostgreSQL функцию для batch update в одной транзакции:
   ```sql
   CREATE OR REPLACE FUNCTION batch_update_order(
     table_name TEXT,
     updates JSONB
   ) RETURNS void AS $$
   DECLARE
     item JSONB;
   BEGIN
     FOR item IN SELECT * FROM jsonb_array_elements(updates)
     LOOP
       EXECUTE format(
         'UPDATE %I SET order_index = $1 WHERE id = $2',
         table_name
       ) USING (item->>'order_index')::INTEGER, (item->>'id')::UUID;
     END LOOP;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```

2. Создай helper `lib/database/batch-operations.ts`:
   ```typescript
   export async function batchUpdateOrder(
     supabase: SupabaseClient,
     table: string,
     items: { id: string; order_index: number }[]
   ): Promise<void> {
     const { error } = await supabase.rpc('batch_update_order', {
       table_name: table,
       updates: items
     });
     if (error) throw new Error(error.message);
   }
   ```

3. Замени все `persistPricingOrder`, `reorderEmployees`, `reorderPortfolio` на вызовы `batchUpdateOrder`

4. Добавь лимит на количество элементов (оставь 1000, но оптимизируй выполнение)

**Тестирование:**
- Создай тест `tests/batch-operations.test.ts`:
  - Reorder 100 элементов, проверь что все order_index обновились
  - Reorder 1000 элементов, проверь что операция завершилась за <5 секунд
  - Попытка reorder 1001 элемента отклоняется

---

## 4. ВАЛИДАЦИЯ ЗАВИСИМОСТЕЙ

**Задача:** Добавить строгую валидацию версий и имен npm-пакетов

**Что исправить:**
- `app/admin/code-library/actions.ts` функция `parseDependencies` не проверяет формат version и name

**Решение:**
1. В `lib/validation/input.ts` добавь:
   ```typescript
   const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
   const NPM_NAME_PATTERN = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
   
   export function assertNpmPackageName(name: string): void {
     if (!NPM_NAME_PATTERN.test(name) || name.length > 214) {
       throw new Error('Invalid package name');
     }
   }
   
   export function assertSemver(version: string): void {
     if (!SEMVER_PATTERN.test(version)) {
       throw new Error('Invalid semver version');
     }
   }
   ```

2. В `app/admin/code-library/actions.ts` в `parseDependencies`:
   ```typescript
   const name = entry.name.trim();
   assertNpmPackageName(name);
   
   if (version) {
     assertSemver(version);
   }
   ```

**Тестирование:**
- Создай тест `tests/npm-validation.test.ts`:
  - `react` — валидно
  - `@types/node` — валидно
  - `../../../etc/passwd` — невалидно
  - `<script>alert(1)</script>` — невалидно
  - Версия `1.0.0` — валидно
  - Версия `asdfgh` — невалидно

---

## 5. DEVTOOLS В PRODUCTION

**Задача:** Отключить DevTools в production билде

**Что исправить:**
- `desktop/main.cjs` строки 365, 384 — DevTools включены всегда

**Решение:**
1. Измени `desktop/main.cjs`:
   ```javascript
   webPreferences: {
     preload: path.join(__dirname, 'preload.cjs'),
     contextIsolation: true,
     nodeIntegration: false,
     sandbox: true,
     devTools: !app.isPackaged || process.env.ENABLE_DEVTOOLS === '1',
   },
   
   mainWindow.once('ready-to-show', () => {
     mainWindow.show();
     
     // Открываем DevTools только в dev mode или если явно включено
     if (!app.isPackaged || process.env.ENABLE_DEVTOOLS === '1') {
       mainWindow.webContents.openDevTools();
     }
   });
   ```

2. Обнови документацию `README.md` с инструкцией как включить DevTools для отладки:
   ```
   Для включения DevTools в production:
   1. Создай файл config.json в userData
   2. Добавь переменную окружения через системные настройки
   ```

**Тестирование:**
- Собери production build: `npm run desktop:dist:win`
- Запусти приложение, проверь что DevTools НЕ открываются автоматически
- Установи `ENABLE_DEVTOOLS=1`, проверь что DevTools открываются

---

## 6. PLAINTEXT КОНФИГИ

**Задача:** Защитить чувствительные данные в config.json

**Что исправить:**
- `desktop/main.cjs` — `ADMIN_EMAILS` и другие данные в plaintext

**Решение:**
1. Установи `npm install keytar` (Node.js native addon для OS keychain)

2. Создай `desktop/secure-config.cjs`:
   ```javascript
   const keytar = require('keytar');
   const SERVICE_NAME = 'CMS-Admin-Panel';
   
   async function setSecureValue(key, value) {
     await keytar.setPassword(SERVICE_NAME, key, value);
   }
   
   async function getSecureValue(key) {
     return await keytar.getPassword(SERVICE_NAME, key);
   }
   
   module.exports = { setSecureValue, getSecureValue };
   ```

3. В `desktop/main.cjs` замени чтение `ADMIN_EMAILS` из JSON на keytar:
   ```javascript
   const { getSecureValue } = require('./secure-config.cjs');
   
   const adminEmails = await getSecureValue('ADMIN_EMAILS') || 
                       userEnvironment['ADMIN_EMAILS'] || 
                       packagedEnvironment['ADMIN_EMAILS'];
   ```

4. Создай UI в настройках приложения для безопасного ввода ADMIN_EMAILS

**Примечание:** Если keytar несовместим с текущим Electron, используй fallback на обфусцированный JSON:
- Шифруй значения с помощью `crypto.createCipher` с machine-specific ключом
- Храни зашифрованные значения в config.json

**Тестирование:**
- Проверь что конфиг сохраняется в keychain (Windows Credential Manager / macOS Keychain)
- После перезапуска приложения значения читаются корректно
- При удалении из keychain используется fallback на JSON

---

## 7. УЛУЧШЕННАЯ ВАЛИДАЦИЯ URL

**Задача:** Защитить от phishing и SSRF атак через URL поля

**Что исправить:**
- `lib/validation/input.ts` функция `assertSafeUrl` пропускает опасные URL

**Решение:**
1. Улучши `assertSafeUrl` в `lib/validation/input.ts`:
   ```typescript
   export function assertSafeUrl(value: string, field = 'url'): void {
     if (!value?.trim()) {
       throw new Error(`${field} is required`);
     }
     
     let parsed: URL;
     try {
       parsed = new URL(value.trim());
     } catch {
       throw new Error(`Invalid ${field}`);
     }
     
     // Только HTTP/HTTPS
     if (!['http:', 'https:'].includes(parsed.protocol)) {
       throw new Error(`Invalid ${field} protocol`);
     }
     
     // Блокируем @ в hostname (phishing)
     if (parsed.hostname.includes('@')) {
       throw new Error(`Invalid ${field} hostname`);
     }
     
     // Блокируем IP адреса (SSRF protection)
     const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
     const ipv6Pattern = /^([0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}$/i;
     if (ipv4Pattern.test(parsed.hostname) || ipv6Pattern.test(parsed.hostname)) {
       throw new Error(`IP addresses not allowed in ${field}`);
     }
     
     // Блокируем localhost и internal hosts
     const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
     if (blockedHosts.includes(parsed.hostname.toLowerCase())) {
       throw new Error(`Invalid ${field} hostname`);
     }
   }
   ```

**Тестирование:**
- Создай тест `tests/url-validation.test.ts`:
  - `https://example.com` — валидно
  - `https://evil.com@good.com` — невалидно
  - `https://192.168.1.1` — невалидно
  - `https://localhost:3000` — невалидно
  - `javascript:alert(1)` — невалидно

---

## 8. ЦЕНТРАЛИЗОВАННАЯ ОБРАБОТКА ОШИБОК

**Задача:** Создать единый механизм обработки ошибок с правильными сообщениями для пользователя

**Решение:**
1. Создай `lib/errors/app-error.ts`:
   ```typescript
   export class AppError extends Error {
     constructor(
       message: string,
       public readonly code: string,
       public readonly statusCode: number = 400,
       public readonly details?: Record<string, unknown>
     ) {
       super(message);
       this.name = 'AppError';
     }
     
     toJSON() {
       return {
         error: this.message,
         code: this.code,
         details: this.details,
       };
     }
   }
   
   export class ValidationError extends AppError {
     constructor(message: string, field?: string) {
       super(message, 'VALIDATION_ERROR', 400, { field });
     }
   }
   
   export class AuthenticationError extends AppError {
     constructor(message = 'Authentication required') {
       super(message, 'AUTH_ERROR', 401);
     }
   }
   
   export class AuthorizationError extends AppError {
     constructor(message = 'Insufficient permissions') {
       super(message, 'FORBIDDEN', 403);
     }
   }
   
   export class NotFoundError extends AppError {
     constructor(resource: string) {
       super(`${resource} not found`, 'NOT_FOUND', 404);
     }
   }
   ```

2. Создай `lib/errors/handler.ts`:
   ```typescript
   import { AppError } from './app-error';
   
   export function handleActionError(error: unknown): never {
     if (error instanceof AppError) {
       throw error;
     }
     
     // Логируем неожиданные ошибки
     console.error('[ACTION ERROR]', error);
     
     // Не показываем пользователю внутренние детали
     throw new AppError(
       'An unexpected error occurred',
       'INTERNAL_ERROR',
       500
     );
   }
   ```

3. Оберни все actions в try-catch:
   ```typescript
   export async function createEmployee(formData: FormData) {
     try {
       await validateCSRF();
       const { supabase } = await requireAdminServerContext();
       // ... логика
     } catch (error) {
       handleActionError(error);
     }
   }
   ```

4. На клиенте обрабатывай ошибки:
   ```typescript
   try {
     await createEmployee(formData);
   } catch (error) {
     if (error.code === 'VALIDATION_ERROR') {
       setFieldError(error.details.field, error.message);
     } else {
       setGeneralError(error.message);
     }
   }
   ```

**Тестирование:**
- Проверь что ValidationError показывает понятные сообщения пользователю
- Проверь что внутренние ошибки не утекают на клиент
- Проверь что все ошибки логируются в console

---

## 9. РЕФАКТОРИНГ ДУБЛИРУЮЩЕЙСЯ ЛОГИКИ

**Задача:** Вынести повторяющийся код upload/cleanup в переиспользуемые функции

**Решение:**
1. Создай `lib/storage/transaction.ts`:
   ```typescript
   export async function withImageUploadTransaction<T>(
     bucket: string,
     uploadedPaths: string[],
     mutation: () => Promise<T>,
     getPersistedPaths: (result: T) => string[]
   ): Promise<T> {
     const { supabase } = await requireAdminServerContext();
     let committed = false;
     
     try {
       const result = await mutation();
       committed = true;
       
       // Cleanup неиспользованных uploads
       const persisted = getPersistedPaths(result);
       const managed = managedUploadPaths(uploadedPaths);
       const obsolete = managed.filter(p => !persisted.includes(p));
       
       if (obsolete.length > 0) {
         await removeAdminStorageObjects(bucket, obsolete, supabase);
       }
       
       return result;
     } catch (error) {
       // Rollback uploads при ошибке
       if (!committed) {
         const managed = managedUploadPaths(uploadedPaths);
         if (managed.length > 0) {
           await removeAdminStorageObjects(bucket, managed, supabase);
         }
       }
       throw error;
     }
   }
   ```

2. Рефактори `app/admin/employees/actions.ts`:
   ```typescript
   export async function createEmployee(formData: FormData) {
     await validateCSRF();
     const uploadedPaths = getUploadedPaths(formData);
     
     return withImageUploadTransaction(
       'employees',
       uploadedPaths,
       async () => {
         const { supabase } = await requireAdminServerContext();
         // ... вся логика создания
         return { photo_path };
       },
       (result) => [result.photo_path].filter(Boolean)
     );
   }
   ```

3. Примени аналогично для `portfolio/actions.ts`, `testimonials/actions.ts`

**Тестирование:**
- Проверь что все CRUD операции с изображениями работают
- Проверь что cleanup происходит после успешного save
- Проверь что rollback происходит при ошибке save

---

## 10. ОПТИМИЗАЦИЯ ЗАПРОСОВ К БД

**Задача:** Использовать sequences вместо SELECT MAX для order_index

**Решение:**
1. Создай миграцию Supabase:
   ```sql
   -- Для employees
   CREATE SEQUENCE IF NOT EXISTS employees_order_seq;
   SELECT setval('employees_order_seq', COALESCE((SELECT MAX(order_index) FROM employees), 0) + 1);
   ALTER TABLE employees ALTER COLUMN order_index SET DEFAULT nextval('employees_order_seq');
   
   -- Для pricing
   CREATE SEQUENCE IF NOT EXISTS pricing_order_seq;
   SELECT setval('pricing_order_seq', COALESCE((SELECT MAX(order_index) FROM pricing), 0) + 1);
   ALTER TABLE pricing ALTER COLUMN order_index SET DEFAULT nextval('pricing_order_seq');
   
   -- Для portfolio_items
   CREATE SEQUENCE IF NOT EXISTS portfolio_order_seq;
   SELECT setval('portfolio_order_seq', COALESCE((SELECT MAX(order_index) FROM portfolio_items), 0) + 1);
   ALTER TABLE portfolio_items ALTER COLUMN order_index SET DEFAULT nextval('portfolio_order_seq');
   ```

2. Удали код получения MAX order_index из actions:
   ```typescript
   // ❌ Удалить:
   const { data: maxOrder } = await supabase
     .from('employees')
     .select('order_index')
     .order('order_index', { ascending: false })
     .limit(1)
     .single();
   const order_index = (maxOrder?.order_index ?? -1) + 1;
   
   // ✅ Теперь просто:
   const { error } = await supabase.from('employees').insert({
     // ... без order_index, БД присвоит автоматически
   });
   ```

**Тестирование:**
- Создай несколько записей подряд, проверь что order_index инкрементируется
- Проверь что после reorder создание новых записей не ломает порядок

---

## 11. ДОБАВИТЬ PAGINATION

**Задача:** Реализовать cursor-based pagination для больших списков

**Решение:**
1. Создай `lib/pagination/cursor.ts`:
   ```typescript
   export interface PaginationParams {
     limit?: number;
     cursor?: string;
   }
   
   export interface PaginatedResponse<T> {
     data: T[];
     nextCursor: string | null;
     hasMore: boolean;
   }
   
   export async function paginateQuery<T>(
     query: any,
     params: PaginationParams,
     cursorField = 'created_at'
   ): Promise<PaginatedResponse<T>> {
     const limit = Math.min(params.limit || 50, 100);
     
     let q = query.order(cursorField, { ascending: false }).limit(limit + 1);
     
     if (params.cursor) {
       q = q.lt(cursorField, params.cursor);
     }
     
     const { data, error } = await q;
     if (error) throw error;
     
     const hasMore = data.length > limit;
     const items = hasMore ? data.slice(0, limit) : data;
     const nextCursor = hasMore ? items[items.length - 1][cursorField] : null;
     
     return { data: items, nextCursor, hasMore };
   }
   ```

2. Создай paginated версии функций чтения:
   ```typescript
   // lib/storage/server.ts
   export async function listAdminStorageFilesPaginated(
     bucket: string,
     params: PaginationParams
   ): Promise<PaginatedResponse<AdminStorageFile>> {
     // ... реализация с cursor pagination
   }
   ```

3. На клиенте используй infinite scroll или кнопку "Load More"

**Тестирование:**
- Создай 200 записей, проверь что первая страница загружает 50
- Проверь что cursor корректно переходит на следующую страницу
- Проверь что hasMore = false на последней странице

---

## 12. RATE LIMITING

**Задача:** Добавить защиту от spam-запросов

**Решение:**
1. Установи `npm install @upstash/ratelimit @upstash/redis` или используй in-memory решение

2. Создай `lib/rate-limit/middleware.ts`:
   ```typescript
   import { headers } from 'next/headers';
   
   const limits = new Map<string, { count: number; resetAt: number }>();
   
   export async function checkRateLimit(
     identifier: string,
     maxRequests: number,
     windowMs: number
   ): Promise<boolean> {
     const now = Date.now();
     const limit = limits.get(identifier);
     
     if (!limit || limit.resetAt < now) {
       limits.set(identifier, { count: 1, resetAt: now + windowMs });
       return true;
     }
     
     if (limit.count >= maxRequests) {
       return false;
     }
     
     limit.count++;
     return true;
   }
   
   export async function requireRateLimit(maxRequests = 10, windowMs = 60000) {
     const headersList = await headers();
     const ip = headersList.get('x-forwarded-for') || 'unknown';
     
     const allowed = await checkRateLimit(ip, maxRequests, windowMs);
     if (!allowed) {
       throw new AppError('Too many requests', 'RATE_LIMIT', 429);
     }
   }
   ```

3. Добавь в критичные actions:
   ```typescript
   export async function createEmployee(formData: FormData) {
     await requireRateLimit(5, 60000); // 5 req/min
     await validateCSRF();
     // ...
   }
   ```

**Тестирование:**
- Отправь 6 запросов за минуту, проверь что 6-й блокируется
- Подожди минуту, проверь что лимит сбросился

---

## 13. ДОБАВИТЬ ТЕСТЫ

**Задача:** Увеличить покрытие тестами до 60%+

**Решение:**
1. Создай `tests/actions/*.test.ts` для каждого модуля:
   ```typescript
   // tests/actions/employees.test.ts
   import { describe, it, expect, beforeEach, afterEach } from 'vitest';
   import { createEmployee, updateEmployee, deleteEmployee } from '@/app/admin/employees/actions';
   
   describe('Employee Actions', () => {
     beforeEach(async () => {
       // Setup test database
     });
     
     afterEach(async () => {
       // Cleanup
     });
     
     it('should create employee with valid data', async () => {
       const formData = new FormData();
       formData.append('first_name', 'John');
       formData.append('full_name', 'John Doe');
       // ...
       
       await expect(createEmployee(formData)).resolves.not.toThrow();
     });
     
     it('should reject employee without required fields', async () => {
       const formData = new FormData();
       await expect(createEmployee(formData)).rejects.toThrow('Field first_name is required');
     });
   });
   ```

2. Настрой Supabase local для тестов:
   - `supabase init`
   - `supabase start`
   - В `vitest.config.mjs` укажи test database URL

3. Создай тесты для:
   - CRUD операции всех модулей
   - Upload/cleanup изображений
   - Reorder операции
   - Валидация
   - Rate limiting
   - CSRF защита

**Минимальное покрытие:**
- `lib/validation/input.ts` — 100%
- `lib/storage/upload.ts` — 90%
- `lib/storage/server.ts` — 80%
- Actions — 60%

**Тестирование:**
- Запусти `npm test`
- Проверь coverage report: `npm test -- --coverage`
- Все тесты должны проходить

---

## ПОРЯДОК ВЫПОЛНЕНИЯ

1. **Критичное (сделать первым):**
   - Пункт 1: CSRF защита
   - Пункт 5: DevTools в production
   - Пункт 2: Race conditions в storage

2. **Высокий приоритет:**
   - Пункт 4: Валидация зависимостей
   - Пункт 7: Валидация URL
   - Пункт 8: Централизованная обработка ошибок

3. **Средний приоритет:**
   - Пункт 3: DOS через reorder
   - Пункт 9: Рефакторинг дублирования
   - Пункт 10: Оптимизация БД
   - Пункт 12: Rate limiting

4. **Низкий приоритет:**
   - Пункт 6: Безопасные конфиги
   - Пункт 11: Pagination

5. **Финальный шаг:**
   - Пункт 13: Добавить тесты для ВСЕГО

---

## ТРЕБОВАНИЯ К ВЫПОЛНЕНИЮ

✅ **Для каждого исправления:**
- Создай тесты ДО написания кода (TDD approach)
- Запусти все существующие тесты — ничего не должно сломаться
- Проверь что исправление решает проблему из отчета
- Добавь комментарии к неочевидным решениям
- Обнови типы TypeScript если нужно

✅ **После всех исправлений:**
- Запусти полный test suite: `npm test`
- Запусти линтер: `npm run lint`
- Собери production build: `npm run desktop:dist:win`
- Проверь что приложение запускается и все функции работают
- Создай миграции для БД если нужно

✅ **Документация:**
- Обнови README.md с новыми требованиями (keytar, migrations)
- Создай CHANGELOG.md с описанием исправлений
- Добавь комментарии в код где логика неочевидна

---

## ПРОВЕРКА РЕЗУЛЬТАТА

После выполнения всех пунктов:
1. ✅ Нет критичных уязвимостей безопасности
2. ✅ Нет race conditions в storage
3. ✅ Все Server Actions защищены от CSRF
4. ✅ Валидация данных полная и строгая
5. ✅ DevTools отключены в production
6. ✅ Централизованная обработка ошибок
7. ✅ Test coverage ≥ 60%
8. ✅ Все существующие функции работают
9. ✅ Production build собирается без ошибок
10. ✅ Нет регрессий в функционале

Если все пункты выполнены — проект готов к production deployment.
