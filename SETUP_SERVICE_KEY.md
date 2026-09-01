# Настройка Service Role Key для импорта Code Library

## Проблема

Импорт preview-файлов через `/api/seed-code-blocks` требует **service role key** для обхода RLS (Row Level Security) политик Supabase.

## Решение

### 1. Получите Service Role Key из Supabase Dashboard

1. Откройте https://supabase.com/dashboard/project/pjujhrfkykxgzcexyyti
2. Перейдите в **Project Settings** → **API**
3. Скопируйте **service_role key** (раздел "Project API keys")

⚠️ **ВАЖНО:** Этот ключ даёт полный доступ к базе данных. Никогда не коммитьте его в Git!

### 2. Добавьте ключ в .env.local

Откройте файл `.env.local` и замените строку:

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

на:

```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Перезапустите dev-сервер

```bash
npm run dev
```

### 4. Проверьте импорт

Откройте http://localhost:3000/test-import.html и нажмите **"Импортировать preview-файлы"**.

Если всё настроено правильно, вы увидите:

```
✓ Блоков не удаляются (до: 4, после: 4)
✓ HTML: 9551 символ
✓ CSS: 10931 символ
✓ JS: 11000 символов
```

## Что исправлено

### До исправления

API использовал `publishable key` (требует авторизацию пользователя):

```typescript
const supabase = createClient(); // ❌ использует anon key
await supabase.from('code_blocks').upsert(...); // ❌ блокируется RLS
```

### После исправления

API использует `service role key` (обходит RLS):

```typescript
const supabase = createAdminClient(); // ✅ использует service role
await supabase.from('code_blocks').upsert(...); // ✅ успешно сохраняет
```

## Безопасность

✅ `.env.local` включён в `.gitignore` (строка 38)
✅ Service key используется только на сервере (не отправляется клиенту)
✅ `.env.example` содержит placeholder вместо реального ключа

## Troubleshooting

### Ошибка: "new row violates row-level security policy"

**Причина:** Service role key не настроен или неверный.

**Решение:** Проверьте, что:
1. `SUPABASE_SERVICE_ROLE_KEY` установлена в `.env.local`
2. Ключ скопирован полностью (начинается с `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
3. Dev-сервер перезапущен после изменения `.env.local`

### После импорта блоки пустые (HTML/CSS/JS = 0)

**Причина:** Это была старая проблема, исправленная в предыдущем коммите.

**Решение:** Убедитесь, что вы используете версию после коммита `fix(code-library): restore html css js separation`.
