# Supabase Authentication Setup

## Архитектура авторизации

Проект использует профессиональную систему авторизации на базе **Supabase Auth** с Next.js App Router.

### Компоненты системы

#### 1. **Middleware** (`middleware.ts`)
- Защищает все маршруты `/admin/*`
- Проверяет сессию пользователя на уровне сервера
- Автоматически перенаправляет:
  - Неавторизованных пользователей → `/admin/login`
  - Авторизованных пользователей с `/admin/login` → `/admin`
- Использует Supabase SSR для работы с cookies

#### 2. **Страница логина** (`app/admin/login/page.tsx`)
- Client Component с формой авторизации
- Использует `supabase.auth.signInWithPassword()`
- Обрабатывает ошибки авторизации:
  - Invalid credentials
  - Email not confirmed
  - Другие ошибки Supabase
- Состояние загрузки и защита от повторной отправки
- Сохраняет оригинальный дизайн

#### 3. **Dashboard** (`app/admin/page.tsx`)
- Server Component с проверкой авторизации
- Получает пользователя через `supabase.auth.getUser()`
- Дополнительная защита через `redirect()`
- Рендерится только для авторизованных пользователей

#### 4. **Logout Button** (`app/admin/_components/LogoutButton.tsx`)
- Client Component для выхода
- Использует `supabase.auth.signOut()`
- Очищает сессию и cookies
- Middleware автоматически перенаправляет на `/admin/login`

#### 5. **Supabase Clients**
- `lib/supabase/client.ts` - для Client Components
- `lib/supabase/server.ts` - для Server Components
- Правильное разделение клиентов по контексту

#### 6. **Auth Utils** (`lib/auth/utils.ts`)
- `getCurrentUser()` - получение текущего пользователя
- `isAuthenticated()` - проверка авторизации
- Переиспользуемые утилиты для server-side

### Безопасность

✅ **Что используется:**
- Supabase SSR с cookies
- Server-side session checking
- Middleware для защиты маршрутов
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (безопасный публичный ключ)

❌ **Что НЕ используется:**
- localStorage для токенов
- Секретные ключи (service_role)
- Хардкод email/паролей
- Временные setTimeout
- Проверка только на клиенте

### Переменные окружения

Файл `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

**Важно:** Используйте только `PUBLISHABLE_KEY`, никогда не используйте `SERVICE_ROLE_KEY` на клиенте!

### Поток авторизации

1. **Вход:**
   ```
   User заполняет форму → signInWithPassword() → Cookie устанавливается → 
   Middleware проверяет → Перенаправление на /admin
   ```

2. **Доступ к защищённому маршруту:**
   ```
   Request /admin → Middleware проверяет cookie → 
   Если нет сессии: redirect /admin/login
   Если есть сессия: разрешить доступ
   ```

3. **Выход:**
   ```
   User нажимает Logout → signOut() → Cookie удаляется → 
   Middleware проверяет → Перенаправление на /admin/login
   ```

### Создание первого пользователя

Создайте пользователя в Supabase Dashboard:
1. Откройте ваш проект в Supabase
2. Перейдите в Authentication → Users
3. Нажмите "Add user" → "Create new user"
4. Укажите email и password
5. Подтвердите email (или отключите email confirmation в настройках)

Альтернатива - используйте Supabase CLI:
```bash
supabase users create user@example.com --password your_password
```

### Bootstrap администратора после DB hardening

Каноническая миграция `supabase/migrations/20260823000000_admin_hardening.sql`
закрывает прямой CRUD для обычных `authenticated` пользователей. После её
применения trusted operator должен один раз добавить существующего пользователя
в allow-list через Supabase SQL Editor (не через CMS и не через браузер):

```sql
INSERT INTO public.admin_users (user_id)
SELECT id FROM auth.users WHERE lower(email) = lower('admin@gmail.com')
ON CONFLICT (user_id) DO UPDATE SET is_active = true;
```

Замените email на фактический адрес администратора. Самостоятельный bootstrap
из клиентского приложения намеренно не предусмотрен. После выполнения SQL
выйдите из CMS и войдите снова, чтобы Supabase выдал JWT с актуальной сессией.
Если allow-list пуст, миграция выводит предупреждение и защищённые операции
будут отклоняться до настройки администратора.

### Тестирование

**Development:**
```bash
npm run dev
```

Откройте:
- http://localhost:3000/admin/login - страница входа
- http://localhost:3000/admin - защищённый dashboard

**Production build:**
```bash
npm run build
npm start
```

### TypeScript

Все компоненты полностью типизированы:
- Использованы типы из `@supabase/supabase-js`
- Нет `any` типов
- Строгая типизация для auth методов

### Расширение системы

Для добавления дополнительных защищённых маршрутов:

1. Обновите `matcher` в `middleware.ts`:
```typescript
export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*', // новый защищённый путь
  ],
}
```

2. Используйте Server Component с проверкой:
```typescript
import { getCurrentUser } from '@/lib/auth/utils';

export default async function MyProtectedPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/admin/login');
  // ...
}
```

### Production Checklist

- [ ] Проверьте `.env.local` не попал в git
- [ ] Настройте правильные URLs в Supabase Dashboard (Redirect URLs)
- [ ] Включите Email confirmation (или настройте без неё)
- [ ] Настройте Rate Limiting в Supabase
- [ ] Проверьте работу `npm run build`
- [ ] Протестируйте авторизацию в production режиме
- [ ] Настройте обработку ошибок и логирование

### Полезные ссылки

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/nextjs)
