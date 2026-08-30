# ✅ ИСПРАВЛЕНИЕ WORKFLOW ДЛЯ ПУБЛИКАЦИИ RELEASE

## WORKFLOW FIX:

**Файл:** `.github/workflows/release.yml`

**Изменение:**
```yaml
jobs:
  release:
    runs-on: windows-latest
    permissions:              # ← ДОБАВЛЕНО
      contents: write         # ← ДОБАВЛЕНО

    steps:
      # ... остальные шаги без изменений
```

**Diff:**
```diff
@@ -8,6 +8,8 @@ on:
 jobs:
   release:
     runs-on: windows-latest
+    permissions:
+      contents: write

     steps:
       - name: Checkout code
```

**Что исправлено:**
- ✅ Добавлен `permissions: contents: write` на уровне job
- ✅ Теперь workflow имеет права на создание/обновление releases
- ✅ electron-builder сможет загружать assets в GitHub Release

## PERMISSIONS:

**Job level:**
```yaml
permissions:
  contents: write
```

**Что позволяет:**
- ✅ Создавать/обновлять releases
- ✅ Загружать assets в release
- ✅ Создавать теги (если нужно)
- ✅ Изменять repository content

**GH_TOKEN:**
```yaml
env:
  GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

✅ Используется правильно в шаге "Build and publish Electron app"

## PUBLISH CONFIG:

**electron-builder команда:**
```bash
npm run desktop:dist:win -- --publish always
```

**package.json build.publish:**
```json
{
  "provider": "github",
  "owner": "CGskills",
  "repo": "cms-admin",
  "releaseType": "release"
}
```

**package.json win.publish:**
```json
"publish": ["github"]
```

✅ Все конфигурации корректны и не изменены

## READY FOR v0.1.2: ✅ YES

### Что готово:

1. ✅ Workflow исправлен (permissions: contents: write добавлен)
2. ✅ YAML синтаксис корректен
3. ✅ GH_TOKEN используется правильно
4. ✅ electron-builder config не изменен
5. ✅ publish provider настроен правильно
6. ✅ --publish always присутствует

### Следующие шаги для создания v0.1.2:

```bash
# 1. Commit исправленного workflow
git add .github/workflows/release.yml
git commit -m "Fix GitHub Actions permissions for release asset upload"

# 2. Push изменений
git push origin main

# 3. Увеличить версию
npm version patch  # 0.1.1 → 0.1.2

# 4. Commit новой версии
git add package.json package-lock.json
git commit -m "Release v0.1.2"

# 5. Создать tag
git tag v0.1.2

# 6. Push всё
git push origin main
git push origin v0.1.2

# 7. Ожидать завершения workflow (~10-15 мин)

# 8. Проверить Release v0.1.2
# https://github.com/CGskills/cms-admin/releases/tag/v0.1.2
# Должны быть assets:
# - CMS-Admin-0.1.2-win-x64.exe
# - latest.yml
```

### Что изменится после v0.1.2:

**Для v0.1.1:**
- Остается как есть (без installer assets)
- Не используется для production

**Для v0.1.2:**
- ✅ Workflow с правильными permissions
- ✅ Assets будут загружены: .exe и latest.yml
- ✅ Installer будет доступен для скачивания
- ✅ electron-updater сможет проверять обновления

**Для пользователей:**
- Скачать и установить CMS-Admin-0.1.2-win-x64.exe
- Проверить версию: `await window.electronAPI.getAppVersion()` → "0.1.2"
- Кнопка "Проверить обновления" будет видна
- Автообновление будет работать для следующих версий

### Дополнительно: GitHub Settings

Также нужно настроить (если еще не сделано):
```
https://github.com/CGskills/cms-admin/settings/actions
→ Workflow permissions
→ Выбрать: "Read and write permissions"
→ Save
```

Это обеспечит, что `secrets.GITHUB_TOKEN` имеет нужные права.

---

## ✅ ГОТОВО К СОЗДАНИЮ v0.1.2

Workflow исправлен. После commit, push и создания tag v0.1.2, GitHub Release будет содержать:
- ✅ CMS-Admin-0.1.2-win-x64.exe
- ✅ latest.yml
- ✅ Source code (zip)
- ✅ Source code (tar.gz)
