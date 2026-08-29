# Настройка Supabase для CMS Admin

## Шаг 1: Настройка Redirect URLs

В Supabase Dashboard:

1. Перейдите в **Authentication** → **URL Configuration**
2. Добавьте следующие URLs в **Redirect URLs**:

**Development:**
```
http://localhost:3000/admin
http://localhost:3000/admin/login
```

**Production (замените на ваш домен):**
```
https://yourdomain.com/admin
https://yourdomain.com/admin/login
```

3. **Site URL** установите:
   - Development: `http://localhost:3000`
   - Production: `https://yourdomain.com`

## Шаг 2: Настройка Email Authentication

### Опция A: С подтверждением email (рекомендуется для production)

В **Authentication** → **Providers** → **Email**:
- ✅ Enable Email provider
- ✅ Confirm email

Пользователи получат письмо с подтверждением при регистрации.

### Опция B: Без подтверждения email (для development)

В **Authentication** → **Providers** → **Email**:
- ✅ Enable Email provider
- ❌ Confirm email (отключить)

Пользователи смогут входить сразу после создания.

## Шаг 3: Создание первого админ-пользователя

### Через Dashboard:

1. Перейдите в **Authentication** → **Users**
2. Нажмите **Add user** → **Create new user**
3. Заполните:
   - Email: `admin@yourdomain.com`
   - Password: `your_secure_password`
   - ✅ Auto Confirm User (если нужно)
4. Нажмите **Create user**

### Через SQL Editor:

Откройте **SQL Editor** и выполните:

```sql
-- Создание пользователя (замените на свои данные)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@example.com',
  crypt('your_password', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);
```

**Важно:** Замените `admin@example.com` и `your_password` на реальные данные.

## Шаг 4: Настройка Email Templates (опционально)

Настройте шаблоны писем в **Authentication** → **Email Templates**:

### Confirm signup
Письмо для подтверждения email при регистрации.

### Magic Link
Письмо для входа по ссылке (если используете magic links).

### Change Email Address
Письмо при изменении email.

### Reset Password
Письмо для сброса пароля.

## Шаг 5: Безопасность

### Rate Limiting

В **Authentication** → **Rate Limits** настройте:
- Email signups: 10 в час (по умолчанию)
- Password signins: 10 в час (по умолчанию)
- Password recovery: 5 в час (по умолчанию)

### Password Requirements

В **Authentication** → **Policies**:
- Минимальная длина пароля: 8 символов
- Требовать сложный пароль (рекомендуется)

## Шаг 6: RLS Policies (Row Level Security)

Если создаёте таблицы для CMS контента:

```sql
-- Пример: защита таблицы pages
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

-- Политика: только авторизованные пользователи могут читать
CREATE POLICY "Authenticated users can read pages"
ON pages FOR SELECT
TO authenticated
USING (true);

-- Политика: только авторизованные пользователи могут создавать
CREATE POLICY "Authenticated users can create pages"
ON pages FOR INSERT
TO authenticated
WITH CHECK (true);

-- Политика: только авторизованные пользователи могут обновлять
CREATE POLICY "Authenticated users can update pages"
ON pages FOR UPDATE
TO authenticated
USING (true);

-- Политика: только авторизованные пользователи могут удалять
CREATE POLICY "Authenticated users can delete pages"
ON pages FOR DELETE
TO authenticated
USING (true);
```

## Шаг 7: Проверка настроек

Проверьте `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJxxx...
```

**НЕ используйте:**
- `SUPABASE_SERVICE_ROLE_KEY` на клиенте
- Секретные ключи в коде

## Тестирование

1. Запустите проект:
```bash
npm run dev
```

2. Откройте http://localhost:3000/admin/login

3. Войдите с созданными credentials:
   - Email: `admin@example.com`
   - Password: `your_password`

4. Должно перенаправить на http://localhost:3000/admin

5. Проверьте Logout - должно перенаправить обратно на login

## Troubleshooting

### "Invalid login credentials"
- Проверьте правильность email/password
- Убедитесь, что пользователь создан в Supabase
- Проверьте, подтверждён ли email (если включено confirmation)

### Бесконечное перенаправление
- Проверьте Redirect URLs в Supabase Dashboard
- Убедитесь, что `.env.local` содержит правильные ключи
- Проверьте middleware.ts - возможно логика редиректа некорректна

### Cookies не сохраняются
- Проверьте, что используете правильные Supabase клиенты (client.ts для клиента, server.ts для сервера)
- В Chrome DevTools → Application → Cookies проверьте наличие Supabase cookies

### "Email not confirmed"
- Либо подтвердите email в Supabase Dashboard
- Либо отключите email confirmation в настройках

## Готово! 🎉

Ваша система авторизации готова к использованию.

Следующие шаги:
- Добавьте функционал "Forgot password"
- Настройте профили пользователей
- Добавьте role-based access control (если нужно)
- Интегрируйте CMS контент с Supabase Database
