# Полный анализ проекта CMS Admin Panel

**Дата анализа:** 2026-08-30  
**Версия проекта:** 0.2.1  
**Технологический стек:** Next.js 16.3.1, React 19, TypeScript, Supabase, Electron 44

---

## Обзор проекта

CMS Admin Panel — это десктопное приложение на базе Electron, содержащее полноценный Next.js сервер для управления контентом сайта. Приложение использует Supabase для аутентификации и хранения данных, поддерживает автоматические обновления через GitHub releases.

**Основные модули:**
- Управление портфолио (portfolio)
- Управление ценами (pricing)
- Управление сотрудниками (employees)
- Управление отзывами (testimonials)
- Библиотека кода (code-library)
- Управление страницами (pages)
- Управление услугами (services)
- Медиа-хранилище (media)
- Настройки сайта (settings)

---

## 🐛 КРИТИЧЕСКИЕ БАГИ И УЯЗВИМОСТИ

### 1. **ВЫСОКИЙ ПРИОРИТЕТ: Отсутствие CSRF-защиты для Server Actions**

**Файл:** `lib/auth/policy.ts`, все `actions.ts` файлы

**Проблема:**
```typescript
export function isTrustedMutationOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false; // ❌ Запросы без Origin заголовка отклоняются
  // ...
}
```

Server Actions в Next.js могут быть вызваны через обычные POST-запросы. Функция `isTrustedMutationOrigin` проверяет origin, но:
- Не все браузеры отправляют Origin в POST-запросах
- В некоторых случаях Origin может отсутствовать легитимно
- **НО главное:** функция `requireTrustedMutationOrigin` определена в `lib/auth/server.ts`, но **нигде не используется** в actions!

**Последствия:**
- CSRF-атаки на все мутации (создание, обновление, удаление данных)
- Потенциальная возможность выполнения действий от имени аутентифицированного администратора

**Рекомендация:**
```typescript
// В каждом action-файле добавить:
export async function createPortfolioItem(formData: FormData) {
  requireTrustedMutationOrigin(request); // ❌ request не доступен в server actions
  // ...
}
```

**Проблема глубже:** В Server Actions Next.js нет прямого доступа к Request объекту. Нужно использовать middleware или Route Handlers для CSRF-защиты.

---

### 2. **ВЫСОКИЙ ПРИОРИТЕТ: Race condition в загрузке изображений**

**Файл:** `lib/storage/server.ts:114-147`, все actions с загрузкой изображений

**Проблема:**
```typescript
export async function uploadAdminImage({ bucket, folder, file, oldPath }: ...): Promise<...> {
  // ...
  const { data, error } = await storage.upload(path, file, {
    upsert: false, // ❌ Не перезаписывает существующие файлы
  });
  
  // oldPath намеренно игнорируется!
  void oldPath;
  
  return { path: data.path, url: urlData.publicUrl };
}
```

**Сценарий бага:**
1. Пользователь загружает фото A для сотрудника
2. Загружает фото B (замена)
3. Нажимает "Сохранить"
4. Если save() упадет с ошибкой, оба файла A и B остаются в storage
5. Повторные попытки создают все новые файлы (UUID имена)

**Файл:** `app/admin/employees/actions.ts:163-168`
```typescript
const persistedPath = toEmployeePath(photo_path);
await cleanupEmployeePaths(
  supabase,
  getManagedEmployeePaths(uploadedPaths).filter((path) => path !== persistedPath),
);
```

Очистка происходит **после успешного save**, но если пользователь:
- Загрузил 5 фото, выбирая "то самое"
- Закрыл форму без сохранения
- Все 5 файлов остаются в storage навсегда

**Последствия:**
- Утечка storage (бесконечный рост неиспользуемых файлов)
- Потенциальные проблемы с лимитами Supabase Storage

**Рекомендация:**
- Ввести TTL для uploaded файлов (например, cleanup после 24ч)
- Или сохранять временные загрузки в отдельный bucket с автоочисткой

---

### 3. **СРЕДНИЙ ПРИОРИТЕТ: Потенциальная DoS через большие reorder запросы**

**Файл:** `app/admin/pricing/actions.ts:20-36`

```typescript
async function persistPricingOrder(
  items: PricingOrderItem[],
  update: (item: PricingOrderItem) => Promise<PricingOrderResponse>,
): Promise<void> {
  for (let start = 0; start < items.length; start += PRICING_REORDER_CONCURRENCY) {
    const batch = items.slice(start, start + PRICING_REORDER_CONCURRENCY);
    const results = await Promise.allSettled(batch.map(update));
    // ...
  }
}
```

**Проблема:**
- `assertOrderedItems` проверяет `items.length > 1_000`, но это все равно 1000 запросов
- Батчинг по 12 запросов означает ~84 последовательных батча
- При медленном соединении или проблемах с БД операция может тянуться минутами

**Последствия:**
- Таймауты Server Actions (Next.js имеет лимиты на выполнение)
- Блокировка UI на стороне клиента
- Потенциальная блокировка БД при массовых UPDATE

**Рекомендация:**
- Использовать SQL транзакцию с batch UPDATE
- Или использовать Supabase batch update API

---

### 4. **СРЕДНИЙ ПРИОРИТЕТ: Недостаточная валидация версий зависимостей**

**Файл:** `app/admin/code-library/actions.ts:36-68`

```typescript
function parseDependencies(value: FormDataEntryValue | null): CodeBlockDependency[] {
  // ...
  return parsed.map((entry) => {
    if (!isPlainRecord(entry) || typeof entry.name !== 'string') 
      throw new Error('Invalid dependency');
    const name = entry.name.trim();
    if (!name || name.length > 200) throw new Error('Invalid dependency name');

    let version: string | undefined;
    if (entry.version !== undefined && entry.version !== null) {
      if (typeof entry.version !== 'string' || entry.version.length > 100) 
        throw new Error('Invalid dependency version');
      version = entry.version.trim() || undefined;
    }
    // ❌ Нет валидации формата version (может быть "asdfgh" вместо "1.0.0")
    // ❌ Нет валидации name (может быть XSS payload)
```

**Последствия:**
- Возможность сохранения невалидных версий зависимостей
- Потенциальные XSS если эти данные выводятся на фронтенде без экранирования

**Рекомендация:**
```typescript
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(-[a-z0-9.-]+)?$/i;
const NPM_NAME_PATTERN = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
```

---

### 5. **НИЗКИЙ ПРИОРИТЕТ: Отсутствие rate limiting**

**Проблема:** Нет ограничений на количество запросов к Server Actions

**Последствия:**
- Потенциальный брутфорс логина (хотя защита есть на уровне Supabase)
- Спам-запросы к БД

**Рекомендация:**
- Использовать middleware для rate limiting
- Или полагаться на Supabase rate limits

---

## 🔒 ПРОБЛЕМЫ БЕЗОПАСНОСТИ

### 1. **Хранение чувствительных данных в открытом виде**

**Файл:** `desktop/main.cjs:145-178`

```javascript
async function loadRuntimeEnvironment(serverRoot) {
  const packagedEnvironment = await readJson(path.join(serverRoot, 'runtime-env.json'));
  const userConfigPath = path.join(app.getPath('userData'), 'config.json');
  const userEnvironment = await readJson(userConfigPath);
  // ❌ Supabase ключи хранятся в plaintext JSON
```

**Проблема:**
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — это публичный ключ, OK
- Но `ADMIN_EMAILS` в plaintext может быть проблемой при утечке config файла

**Рекомендация:**
- Использовать OS-level keychain (Windows Credential Manager, macOS Keychain)
- Или хотя бы обфусцировать конфиг

---

### 2. **DevTools включены в production**

**Файл:** `desktop/main.cjs:365, 384`

```javascript
webPreferences: {
  devTools: true, // ❌ TEMPORARY: Always enable DevTools for diagnostic
},
// ...
mainWindow.webContents.openDevTools(); // ❌ TEMPORARY: Auto-open DevTools
```

**Проблема:**
- DevTools дают доступ к console, network, storage
- Можно увидеть API ключи, токены, запросы

**Рекомендация:**
```javascript
devTools: !app.isPackaged || process.env.ENABLE_DEVTOOLS === '1',
```

---

### 3. **Слабая валидация URL**

**Файл:** `lib/validation/input.ts:59-67`

```typescript
export function assertSafeUrl(value: string, field = 'url'): void {
  if (!value) return; // ❌ Пустая строка = валидно
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('invalid');
  } catch {
    throw new Error(`Invalid ${field}`);
  }
}
```

**Проблема:**
- Пропускает URLs вида `https://evil.com@good.com` (phishing)
- Не проверяет IP адреса (SSRF риск, если URL используется для fetch)
- Пустая строка считается валидной

**Рекомендация:**
```typescript
// Запретить @ в hostname, IP адреса, localhost
if (parsed.hostname.includes('@') || 
    /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(parsed.hostname) ||
    parsed.hostname === 'localhost') {
  throw new Error('Invalid hostname');
}
```

---

## ⚠️ АРХИТЕКТУРНЫЕ ПРОБЛЕМЫ

### 1. **Отсутствие централизованной обработки ошибок**

**Проблема:** В каждом action повторяется одинаковый паттерн:
```typescript
try {
  // ... логика
} catch (error: unknown) {
  throw error; // ❌ Просто пробрасывается дальше
}
```

**Последствия:**
- Стек-трейсы утекают на клиент (информация о структуре кода)
- Нет единого логирования ошибок
- Нет различия между user errors и system errors

**Рекомендация:**
```typescript
class AppError extends Error {
  constructor(
    message: string, 
    public readonly code: string, 
    public readonly statusCode: number = 400
  ) { super(message); }
}

// В actions:
try {
  // ...
} catch (error) {
  if (error instanceof AppError) throw error;
  console.error('Unexpected error:', error);
  throw new AppError('Internal server error', 'INTERNAL_ERROR', 500);
}
```

---

### 2. **Дублирование кода в actions**

**Проблема:** Паттерны загрузки изображений, cleanup, rollback повторяются в:
- `employees/actions.ts`
- `portfolio/actions.ts`
- `testimonials/actions.ts`

**Строк дублированного кода:** ~200-300 строк

**Рекомендация:**
```typescript
// lib/storage/helpers.ts
export async function withImageUploadTransaction<T>(
  bucket: string,
  uploadedPaths: string[],
  mutation: () => Promise<T>,
  getPersistentPaths: (result: T) => string[]
): Promise<T> {
  // Единая логика rollback + cleanup
}
```

---

### 3. **Смешивание бизнес-логики и данных**

**Файл:** Все `actions.ts`

**Проблема:**
```typescript
export async function createEmployee(formData: FormData) {
  const { supabase } = await requireAdminServerContext();
  
  // ❌ Парсинг, валидация, бизнес-логика, БД - все в одной функции
  const first_name = requireFormText(formData, 'first_name', 120);
  // ... 20 полей
  const { data: maxOrder } = await supabase.from('employees').select('order_index')...
  const { error } = await supabase.from('employees').insert({...});
  await logActivity(...);
  revalidatePath('/admin/employees');
  redirect('/admin/employees');
}
```

**Последствия:**
- Невозможность unit-тестирования бизнес-логики
- Дублирование валидаций в create/update
- Сложность переиспользования логики

**Рекомендация:**
Разделить на слои:
```typescript
// domain/employees/validation.ts
export function validateEmployeeData(data: unknown): EmployeeData { ... }

// domain/employees/repository.ts
export class EmployeeRepository {
  async create(data: EmployeeData): Promise<Employee> { ... }
}

// app/admin/employees/actions.ts
export async function createEmployee(formData: FormData) {
  const data = validateEmployeeData(Object.fromEntries(formData));
  const employee = await employeeRepo.create(data);
  // ...
}
```

---

### 4. **Неэффективные запросы к БД**

**Файл:** `app/admin/employees/actions.ts:130-136`

```typescript
const { data: maxOrder } = await supabase
  .from('employees')
  .select('order_index')
  .order('order_index', { ascending: false })
  .limit(1)
  .single();

const order_index = (maxOrder?.order_index ?? -1) + 1;
```

**Проблема:**
- При каждом создании делается запрос для получения max order_index
- В PostgreSQL можно использовать DEFAULT nextval('sequence')
- Или использовать row_number() в одном INSERT

**Аналогичные проблемы:**
- `pricing/actions.ts:54-62`
- `portfolio/actions.ts` (не показано, но предположительно там же)

**Рекомендация:**
```sql
-- В миграции:
CREATE SEQUENCE employees_order_seq;
ALTER TABLE employees 
  ALTER COLUMN order_index 
  SET DEFAULT nextval('employees_order_seq');
```

---

## 🎯 СЛАБЫЕ СТОРОНЫ

### 1. **Отсутствие кэширования**

- Нет ISR (Incremental Static Regeneration) для публичных страниц
- `revalidatePath` вызывается после каждой мутации, но нет SWR на клиенте
- Каждый запрос идет в БД, даже для статичных данных

**Влияние на производительность:** Высокое при большом трафике

---

### 2. **Отсутствие оптимистичных обновлений**

Все формы работают синхронно:
1. Submit
2. Ждем ответа сервера
3. Redirect или показываем ошибку

**Проблема:** UX страдает при медленном соединении

**Рекомендация:** React Query + optimistic updates

---

### 3. **Нет pagination для больших списков**

**Файл:** `lib/storage/server.ts:190-248`

```typescript
export async function listAdminStorageFiles(...): Promise<AdminStorageFile[]> {
  const maxFiles = 5_000; // ❌ Загружаем все сразу
  // ...
  while (files.length < maxFiles) {
    const { data, error } = await storage.list(prefix, {
      limit: 100,
      offset,
    });
    // ...
  }
}
```

**Проблема:**
- При 5000 файлах = 50 запросов к Supabase
- Весь массив передается на клиент
- UI зависнет при рендере

**Аналогично для:**
- Список сотрудников (если их >100)
- Список портфолио
- Библиотека кода

**Рекомендация:**
- Cursor-based pagination
- Виртуализация списков (react-window)

---

### 4. **Отсутствие транзакций**

Supabase JS клиент не поддерживает транзакции напрямую, но можно использовать RPC:

**Пример проблемы:** `employees/actions.ts:139-157`
```typescript
const { error } = await supabase.from('employees').insert({...});

if (error) throw new Error(error.message);
committed = true;

await cleanupEmployeePaths(...); // ❌ Может упасть, но INSERT уже прошел
await logActivity(...); // ❌ Может упасть, но INSERT уже прошел
```

**Последствия:**
- Несогласованное состояние (запись есть, но логов нет)
- Мусорные файлы в storage

**Рекомендация:**
```sql
CREATE FUNCTION create_employee_with_cleanup(...) RETURNS void AS $$
BEGIN
  -- INSERT
  -- Cleanup
  -- Log
  -- Все в одной транзакции
END;
$$ LANGUAGE plpgsql;
```

---

### 5. **Неполное тестирование**

**Файлы:** `tests/auth.test.ts`, `tests/validation.test.ts`

**Что покрыто тестами:**
- Базовая валидация (UUID, URL, JSON)
- Нормализация email
- Проверка trusted origin

**Что НЕ покрыто:**
- ❌ Actions (0% coverage)
- ❌ Storage операции
- ❌ Image upload/cleanup
- ❌ Reorder логика
- ❌ Version bumping
- ❌ Slug generation

**Текущее покрытие:** ~5% от критичного кода

**Рекомендация:**
- Добавить интеграционные тесты для actions
- Использовать Supabase local dev для тестов
- CI/CD с обязательными тестами

---

## ✅ СИЛЬНЫЕ СТОРОНЫ

### 1. **Продуманная валидация входных данных**

**Файл:** `lib/validation/input.ts`

✅ Хорошо реализовано:
- UUID validation с regex
- Bounded integers/numbers (защита от overflow)
- Length limits для всех строк
- JSON schema validation
- Duplicate detection в массивах
- Path traversal protection

```typescript
export function assertUuid(value: string, field = 'id'): void {
  if (!UUID_PATTERN.test(value)) {
    throw new Error(`Invalid ${field}`);
  }
}
```

---

### 2. **Безопасная загрузка файлов**

**Файл:** `lib/storage/upload.ts:104-141`

✅ Проверка binary signature изображений:
```typescript
export async function validateImageFileContent(file: File): Promise<...> {
  // ...
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  
  const isJpeg = startsWith(0xff, 0xd8, 0xff);
  const isPng = startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  // ... проверка magic bytes
}
```

✅ UUID имена файлов (защита от path traversal)
✅ Canonical extensions по MIME type
✅ Ограничение размера (10MB)

---

### 3. **Правильная архитектура Electron приложения**

**Файл:** `desktop/main.cjs`

✅ Хорошо:
- Sandboxed renderer (security)
- Context isolation
- No Node integration в renderer
- Правильная обработка `window-open` и `will-navigate`
- Single instance lock
- Graceful shutdown с cleanup

```javascript
webPreferences: {
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true, // ✅ Renderer изолирован
}
```

---

### 4. **Автоматические обновления**

✅ Полноценная интеграция с electron-updater:
- Check for updates
- Download progress
- Install on quit
- IPC handlers для контроля процесса

---

### 5. **Activity logging**

✅ Централизованное логирование всех действий:
- Кто, что, когда изменил
- Аудит trail для compliance

```typescript
await logActivity({
  action: 'delete',
  entityType: 'employees',
  entityId: id,
  entityName: employee.full_name,
});
```

---

### 6. **Type safety**

✅ Полная типизация:
- TypeScript strict mode
- Supabase типы из БД схемы
- Нет `any` (только `unknown` где нужно)

---

### 7. **Separation of concerns в auth**

**Файл:** `lib/auth/server.ts`

✅ Четкое разделение:
- `getAuthenticatedServerContext()` — проверка сессии
- `requireAdminServerContext()` — проверка прав админа
- `normalizeAdminEmails()` — парсинг allowlist

---

## 📊 СТАТИСТИКА ПРОЕКТА

- **Всего файлов TypeScript/TSX:** ~93
- **Строк кода (lib + app/admin):** ~3,123
- **Модулей/фич:** 9
- **Тестов:** 2 файла, ~30 assertions
- **Dependencies:** 13
- **DevDependencies:** 11
- **ESLint игнорирований:** 3 (минимум, хорошо)

---

## 🎨 КАЧЕСТВО КОДА

### Положительное:
- ✅ Consistent naming conventions
- ✅ Хорошая структура папок (feature-based)
- ✅ Комментарии в критичных местах
- ✅ No TODO/FIXME/HACK комментариев (нашел 0)
- ✅ Minimal eslint-disable (только 3)

### Отрицательное:
- ❌ Длинные функции (200+ строк в некоторых actions)
- ❌ Дублирование логики
- ❌ Смешивание concerns (validation + business + data)

---

## 🚀 РЕКОМЕНДАЦИИ ПО ПРИОРИТЕТАМ

### Критический приоритет (исправить немедленно):
1. ❗ Добавить CSRF-защиту или использовать Next.js middleware
2. ❗ Отключить DevTools в production build
3. ❗ Решить проблему с утечкой storage (TTL или cleanup job)

### Высокий приоритет (в течение месяца):
4. Рефакторинг actions (DRY, разделение слоев)
5. Добавить централизованную обработку ошибок
6. Улучшить валидацию (semver, npm names, URLs)
7. Добавить rate limiting

### Средний приоритет (в течение квартала):
8. Pagination для больших списков
9. Оптимистичные обновления в UI
10. Увеличить test coverage до 60%+
11. Использовать PostgreSQL транзакции через RPC

### Низкий приоритет (технический долг):
12. Кэширование (ISR, SWR)
13. Мониторинг и алерты (Sentry, LogRocket)
14. Performance optimization (lazy loading, code splitting)

---

## 📝 ЗАКЛЮЧЕНИЕ

### Общая оценка: **7/10**

**Сильные стороны:**
- Современный стек технологий
- Хорошая архитектура Electron приложения
- Продуманная валидация и безопасность загрузки файлов
- Type safety и структура проекта

**Критические проблемы:**
- Отсутствие CSRF-защиты для Server Actions
- Race conditions в upload/cleanup логике
- DevTools в production
- Недостаточное тестирование

**Вердикт:**
Проект находится в хорошем состоянии для MVP/early stage, но требует серьезных доработок перед production deployment с большой нагрузкой. Основные риски — безопасность (CSRF) и утечка storage. Остальное — технический долг, который можно погашать постепенно.

**Рекомендуемые действия:**
1. Security audit по пунктам из раздела "Критический приоритет"
2. Code review с фокусом на authentication/authorization
3. Load testing для выявления bottlenecks
4. Настройка мониторинга (errors, performance)

---

**Анализ выполнен автоматически. Для уточнений и детальной проверки конкретных участков кода, запросите дополнительный анализ.**
