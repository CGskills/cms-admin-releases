# План исправления уязвимостей и багов

## Анализ текущего состояния

### Найденные проблемы:
1. ✅ **CSRF**: `requireTrustedMutationOrigin` существует в `lib/auth/server.ts`, но нигде не используется
2. ✅ **Storage race conditions**: `uploadAdminImage` игнорирует `oldPath`, нет механизма отслеживания временных загрузок
3. ✅ **DOS через reorder**: `persistPricingOrder` делает до 1000 последовательных UPDATE (с батчингом по 12)
4. ✅ **Слабая валидация npm**: `parseDependencies` не проверяет формат имен пакетов и semver
5. ✅ **DevTools в production**: строки 365, 384 в `desktop/main.cjs` - DevTools включены всегда
6. ✅ **Plaintext конфиги**: ADMIN_EMAILS в plaintext (из-за ограничений Electron будем использовать обфускацию)
7. ✅ **Слабая валидация URL**: `assertSafeUrl` не проверяет `@`, IP адреса, localhost
8. ❌ **Централизованная обработка ошибок**: отсутствует
9. ❌ **Дублирование кода**: логика upload/cleanup повторяется в каждом actions.ts
10. ⚠️ **Неоптимальные запросы**: используется SELECT MAX для order_index вместо sequences
11. ❌ **Pagination**: отсутствует
12. ❌ **Rate limiting**: отсутствует
13. ⚠️ **Тесты**: есть базовая структура (vitest.config.mjs, 2 теста), покрытие минимальное

### Существующая инфраструктура:
- ✅ TypeScript + Next.js 16
- ✅ Vitest настроен (vitest.config.mjs)
- ✅ Есть 2 теста: tests/auth.test.ts, tests/validation.test.ts
- ✅ Supabase для БД и Storage
- ✅ Electron desktop app
- ⚠️ Нет Supabase local dev setup

---

## ЭТАП 1: Критичные исправления (ДЕНЬ 1)

### 1.1. CSRF защита для Server Actions ⚡ КРИТИЧНО

**Файлы для создания:**
- `lib/auth/csrf.ts` - helper функция validateCSRF

**Файлы для изменения:**
- `app/admin/code-library/actions.ts`
- `app/admin/employees/actions.ts`
- `app/admin/media/actions.ts`
- `app/admin/pages/actions.ts`
- `app/admin/portfolio/actions.ts`
- `app/admin/pricing/actions.ts`
- `app/admin/services/actions.ts`
- `app/admin/settings/actions.ts`
- `app/admin/testimonials/actions.ts`

**Реализация:**
```typescript
// lib/auth/csrf.ts
import { headers } from 'next/headers';

export async function validateCSRF(): Promise<void> {
  const headersList = await headers();
  const origin = headersList.get('origin');
  const referer = headersList.get('referer');
  
  if (!origin && !referer) {
    throw new Error('Missing origin header');
  }
  
  const requestOrigin = origin || new URL(referer!).origin;
  
  // Проверяем APP_ORIGIN если задан, иначе NEXT_PUBLIC_SUPABASE_URL
  const expectedOrigin = process.env.APP_ORIGIN?.trim() || 
                         new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin;
  
  if (requestOrigin !== expectedOrigin) {
    throw new Error('Invalid request origin');
  }
}
```

**В каждом action добавить:**
```typescript
export async function createEmployee(formData: FormData) {
  await validateCSRF(); // ← ДОБАВИТЬ В НАЧАЛО
  const { supabase } = await requireAdminServerContext();
  // ... остальной код
}
```

**Тесты:**
- `tests/csrf.test.ts` - проверка блокировки запросов с неправильным Origin

---

### 1.2. DevTools в production ⚡ КРИТИЧНО

**Файлы для изменения:**
- `desktop/main.cjs` (строки 365, 384)

**Реализация:**
```javascript
// Строка 365
devTools: !app.isPackaged || process.env.ENABLE_DEVTOOLS === '1',

// Строка 384
mainWindow.once('ready-to-show', () => {
  mainWindow.show();
  // Открываем DevTools только в dev mode
  if (!app.isPackaged || process.env.ENABLE_DEVTOOLS === '1') {
    mainWindow.webContents.openDevTools();
  }
});
```

**Документация:**
- Обновить README.md с инструкцией включения DevTools для отладки production

**Тесты:**
- Ручная проверка production build

---

### 1.3. Race conditions в Storage ⚡ КРИТИЧНО

**Подход:** Вместо таблицы temp_uploads используем optimistic cleanup + TTL логику

**Файлы для создания:**
- `lib/storage/cleanup.ts` - логика cleanup временных файлов

**Файлы для изменения:**
- `lib/storage/server.ts` - добавить метаданные к uploads

**Реализация:**

Supabase Storage позволяет добавлять metadata при upload. Будем использовать:
```typescript
// При upload добавляем metadata
const { data, error } = await storage.upload(path, file, {
  cacheControl: '3600',
  upsert: false,
  contentType: file.type,
  metadata: {
    uploaded_at: new Date().toISOString(),
    temp: 'true', // помечаем как временный
  }
});
```

Создадим cron job для cleanup:
```typescript
// app/api/cron/cleanup-storage/route.ts
// Удаляет файлы старше 24 часов с metadata.temp = 'true'
```

После успешного сохранения в БД:
```typescript
// Обновляем metadata, убираем temp flag
await storage.update(path, file, {
  metadata: { temp: 'false' }
});
```

**Альтернатива:** Если Supabase Storage не поддерживает update metadata, используем отдельную таблицу:
```sql
CREATE TABLE temp_uploads (
  path TEXT PRIMARY KEY,
  bucket TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE INDEX idx_temp_uploads_expires ON temp_uploads(expires_at);
```

**Тесты:**
- `tests/storage-cleanup.test.ts`

---

## ЭТАП 2: Высокий приоритет (ДЕНЬ 2)

### 2.1. Валидация npm зависимостей

**Файлы для изменения:**
- `lib/validation/input.ts` - добавить assertNpmPackageName, assertSemver
- `app/admin/code-library/actions.ts` - использовать новые валидаторы

**Реализация:**
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

**Тесты:**
- `tests/npm-validation.test.ts`

---

### 2.2. Улучшенная валидация URL

**Файлы для изменения:**
- `lib/validation/input.ts` - улучшить assertSafeUrl

**Реализация:**
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
  const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '169.254.169.254'];
  if (blockedHosts.some(h => parsed.hostname.toLowerCase().includes(h))) {
    throw new Error(`Invalid ${field} hostname`);
  }
}
```

**Тесты:**
- `tests/url-validation.test.ts`

---

### 2.3. Централизованная обработка ошибок

**Файлы для создания:**
- `lib/errors/app-error.ts` - классы ошибок
- `lib/errors/handler.ts` - handleActionError
- `lib/errors/index.ts` - экспорты

**Реализация:**
```typescript
// lib/errors/app-error.ts
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

export class CSRFError extends AppError {
  constructor(message = 'Invalid request origin') {
    super(message, 'CSRF_ERROR', 403);
  }
}
```

**Интеграция:**
Обернуть все actions в try-catch с handleActionError

**Тесты:**
- `tests/errors.test.ts`

---

## ЭТАП 3: Средний приоритет (ДЕНЬ 3)

### 3.1. Оптимизация массовых reorder операций

**Подход:** PostgreSQL функция для batch update

**Файлы для создания:**
- `lib/database/batch-operations.ts`
- `supabase/migrations/YYYYMMDD_batch_update_function.sql`

**SQL миграция:**
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
      'UPDATE %I SET order_index = $1, updated_at = NOW() WHERE id = $2',
      table_name
    ) USING (item->>'order_index')::INTEGER, (item->>'id')::UUID;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**TypeScript wrapper:**
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

**Файлы для изменения:**
- `app/admin/pricing/actions.ts` - заменить persistPricingOrder
- `app/admin/employees/actions.ts` - заменить reorderEmployees
- `app/admin/portfolio/actions.ts` - аналогично

**Тесты:**
- `tests/batch-operations.test.ts`

---

### 3.2. Рефакторинг дублирующейся логики

**Файлы для создания:**
- `lib/storage/transaction.ts` - withImageUploadTransaction

**Реализация:**
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
    const managed = uploadedPaths
      .map(p => getManagedUploadPath(bucket, p))
      .filter(Boolean);
    const obsolete = managed.filter(p => !persisted.includes(p));
    
    if (obsolete.length > 0) {
      await removeAdminStorageObjects(bucket, obsolete, supabase);
    }
    
    return result;
  } catch (error) {
    // Rollback uploads при ошибке
    if (!committed) {
      const managed = uploadedPaths
        .map(p => getManagedUploadPath(bucket, p))
        .filter(Boolean);
      if (managed.length > 0) {
        await removeAdminStorageObjects(bucket, managed, supabase);
      }
    }
    throw error;
  }
}
```

**Файлы для рефакторинга:**
- `app/admin/employees/actions.ts`
- `app/admin/portfolio/actions.ts`
- `app/admin/testimonials/actions.ts`

---

### 3.3. Оптимизация БД - Sequences для order_index

**SQL миграция:**
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

**Файлы для изменения:**
Удалить код получения MAX order_index из всех actions

---

### 3.4. Rate Limiting

**Подход:** In-memory rate limiting (не требует Redis)

**Файлы для создания:**
- `lib/rate-limit/middleware.ts`

**Реализация:**
```typescript
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
  const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 
             headersList.get('x-real-ip') || 
             'unknown';
  
  const allowed = await checkRateLimit(ip, maxRequests, windowMs);
  if (!allowed) {
    throw new AppError('Too many requests', 'RATE_LIMIT', 429);
  }
}
```

**Добавить в критичные actions:**
- createEmployee, updateEmployee
- createPricing, updatePricing
- uploadAdminImage

**Тесты:**
- `tests/rate-limit.test.ts`

---

## ЭТАП 4: Низкий приоритет (ДЕНЬ 4)

### 4.1. Безопасные конфиги (упрощенный подход)

**Проблема:** keytar требует native compilation и может не работать с Electron

**Альтернативное решение:** Обфускация с machine-specific ключом

**Файлы для создания:**
- `desktop/secure-config.cjs`

**Реализация:**
```javascript
const crypto = require('crypto');
const os = require('os');
const fs = require('fs');
const path = require('path');

function getMachineId() {
  // Используем комбинацию hostname + platform + arch
  const data = `${os.hostname()}-${os.platform()}-${os.arch()}`;
  return crypto.createHash('sha256').update(data).digest('hex').slice(0, 32);
}

function encrypt(text) {
  const key = getMachineId();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const key = getMachineId();
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = { encrypt, decrypt };
```

**Примечание:** Это не идеальная защита, но лучше чем plaintext

---

### 4.2. Pagination

**Файлы для создания:**
- `lib/pagination/cursor.ts`

**Реализация:**
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

**Применить к:**
- `lib/storage/server.ts` - listAdminStorageFiles

---

## ЭТАП 5: Тесты (ДЕНЬ 5)

### 5.1. Структура тестов

```
tests/
  auth.test.ts (существует)
  validation.test.ts (существует)
  csrf.test.ts (новый)
  storage-cleanup.test.ts (новый)
  npm-validation.test.ts (новый)
  url-validation.test.ts (новый)
  batch-operations.test.ts (новый)
  rate-limit.test.ts (новый)
  errors.test.ts (новый)
  actions/
    employees.test.ts (новый)
    pricing.test.ts (новый)
    code-library.test.ts (новый)
```

### 5.2. Mock Supabase для тестов

**Файлы для создания:**
- `tests/mocks/supabase.ts`

**Реализация:**
```typescript
export function createMockSupabase() {
  return {
    from: (table: string) => ({
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      select: vi.fn(),
    }),
    storage: {
      from: (bucket: string) => ({
        upload: vi.fn(),
        remove: vi.fn(),
        list: vi.fn(),
      }),
    },
    rpc: vi.fn(),
  };
}
```

### 5.3. Целевое покрытие

- `lib/validation/input.ts` - 100%
- `lib/storage/upload.ts` - 90%
- `lib/storage/server.ts` - 80%
- `lib/auth/csrf.ts` - 100%
- Actions - 60%

---

## Финальная проверка

### Чеклист перед завершением:

1. ✅ Все тесты проходят: `npm test`
2. ✅ Линтер без ошибок: `npm run lint`
3. ✅ TypeScript компилируется: `npm run build`
4. ✅ Production build собирается: `npm run desktop:dist:win`
5. ✅ Приложение запускается и работает
6. ✅ DevTools отключены в production
7. ✅ Все Server Actions защищены CSRF
8. ✅ Storage cleanup работает
9. ✅ Rate limiting блокирует spam
10. ✅ Test coverage ≥ 60%

### Документация:

**Обновить:**
- `README.md` - новые требования, инструкции
- Создать `CHANGELOG.md` - список исправлений
- Создать `SECURITY.md` - security best practices

**Создать миграции:**
- `supabase/migrations/YYYYMMDD_batch_update_function.sql`
- `supabase/migrations/YYYYMMDD_sequences_for_order_index.sql`
- `supabase/migrations/YYYYMMDD_temp_uploads_table.sql` (если используем)

---

## Оценка времени и ресурсов

- **Этап 1** (Критично): 6-8 часов
- **Этап 2** (Высокий): 6-8 часов
- **Этап 3** (Средний): 8-10 часов
- **Этап 4** (Низкий): 4-6 часов
- **Этап 5** (Тесты): 8-10 часов

**Итого:** 32-42 часа (~5 рабочих дней)

---

## Риски и митигация

### Риск 1: Нет Supabase local для тестов
**Митигация:** Использовать моки для unit-тестов, добавить инструкцию по setup Supabase local

### Риск 2: Миграции БД могут сломать production
**Митигация:** Все миграции должны быть идемпотентными (IF NOT EXISTS), проверять на staging

### Риск 3: CSRF может сломать существующие интеграции
**Митигация:** Добавлять validateCSRF постепенно, тестировать каждый action

### Риск 4: Rate limiting может блокировать легитимных пользователей
**Митигация:** Начать с мягких лимитов (10 req/min), мониторить, настроить

---

## Следующие шаги после одобрения плана

1. Создать feature branch: `git checkout -b security-fixes`
2. Начать с Этапа 1 (критичные исправления)
3. После каждого пункта - commit с описанием изменений
4. Запускать тесты после каждого этапа
5. После всех этапов - полная проверка по чеклисту
6. Создать PR с подробным описанием изменений
