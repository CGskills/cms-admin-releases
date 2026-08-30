# 🔧 ИНСТРУКЦИЯ: НАСТРОЙКА GITHUB SECRETS ДЛЯ WORKFLOW

## ✅ WORKFLOW ИСПРАВЛЕН

**Файл:** `.github/workflows/release.yml`

**Изменения:**
```yaml
- name: Prepare standalone server
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY }}
    ADMIN_EMAILS: ${{ secrets.ADMIN_EMAILS }}
  run: npm run desktop:prepare
```

## 📝 СЛЕДУЮЩИЕ ШАГИ

### 1. Добавить GitHub Secrets

**URL:** https://github.com/CGskills/cms-admin/settings/secrets/actions

**Шаги:**

1. Нажать кнопку **"New repository secret"**

2. Добавить первый secret:
   - **Name:** `NEXT_PUBLIC_SUPABASE_URL`
   - **Value:** [ваш Supabase Project URL]
   - Нажать **"Add secret"**

3. Добавить второй secret:
   - **Name:** `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - **Value:** [ваш Supabase Publishable Key (anon key)]
   - Нажать **"Add secret"**

4. Добавить третий secret:
   - **Name:** `ADMIN_EMAILS`
   - **Value:** [список admin emails через запятую]
   - Пример: `admin@example.com,user@example.com`
   - Нажать **"Add secret"**

### 2. Где найти Supabase credentials

**Supabase Dashboard:**
1. Откройте ваш проект: https://supabase.com/dashboard/project/[your-project-id]
2. Перейдите в **Settings** → **API**
3. Найдите:
   - **Project URL** → используйте для `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → используйте для `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

### 3. Commit и push исправленного workflow

```bash
git add .github/workflows/release.yml
git commit -m "Add environment variables for Supabase in workflow"
git push origin main
```

### 4. Создать новый release v0.1.3

После настройки secrets:

```bash
npm version patch  # 0.1.2 → 0.1.3
git add package.json package-lock.json
git commit -m "Release v0.1.3"
git tag v0.1.3
git push origin main
git push origin v0.1.3
```

## ⚠️ ВАЖНО

**НЕ commit .env.local в Git!**

Эти значения должны быть только в:
- GitHub Secrets (для CI/CD)
- Локальный `.env.local` (для development)

**.gitignore уже содержит:**
```
.env*
```

## 🔐 БЕЗОПАСНОСТЬ

- ✅ Secrets хранятся зашифрованными в GitHub
- ✅ Secrets не видны в логах workflow
- ✅ Secrets доступны только workflow в этом repository
- ✅ NEXT_PUBLIC_* переменные публичные (попадут в bundle), но это нормально для Supabase

## 📊 ГОТОВНОСТЬ

| Компонент | Статус |
|-----------|--------|
| Workflow исправлен | ✅ |
| Secrets нужно добавить | ⏳ |
| Готов к commit | ✅ |
| Готов к v0.1.3 | ⏳ После добавления secrets |

---

**Следующий шаг:** Добавьте secrets в GitHub, затем commit workflow и создайте v0.1.3
