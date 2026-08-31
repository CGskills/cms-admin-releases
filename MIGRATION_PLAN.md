# 🚀 ПОШАГОВЫЙ ПЛАН МИГРАЦИИ AUTO-UPDATE

## ✅ ЧТО УЖЕ ЕСТЬ

1. ✅ Репозиторий `cms-admin-releases` создан и PUBLIC
2. ✅ `electron-updater@6.8.9` установлен
3. ✅ `electron-log@5.4.4` установлен
4. ✅ UpdateChecker.tsx работает только в Electron
5. ✅ Браузерная версия защищена (проверка `isElectron`)
6. ✅ Нет токенов в исходном коде
7. ✅ NSIS installer настроен

## 📝 МИНИМАЛЬНЫЕ ИЗМЕНЕНИЯ

Всего нужно изменить **3 файла** и создать **1 токен**:

### Изменение 1: package.json (1 строка)
```diff
  "publish": {
    "provider": "github",
    "owner": "CGskills",
-   "repo": "cms-admin",
+   "repo": "cms-admin-releases",
    "releaseType": "release"
  }
```

### Изменение 2: .github/workflows/release.yml (1 строка)
```diff
  - name: Build and publish Electron app
    env:
-     GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
+     GH_TOKEN: ${{ secrets.RELEASE_TOKEN }}
      NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY }}
      ADMIN_EMAILS: ${{ secrets.ADMIN_EMAILS }}
    run: npm run desktop:dist:win -- --publish always
```

### Изменение 3: desktop/main.cjs (включить автопроверку)
```diff
- // Auto-update check temporarily disabled until proper authentication is configured
- // for private repository access. Users can manually check for updates via the UI button.
- //
- // ISSUE: Private GitHub repository returns 404 for release assets without authentication.
- // SOLUTION: Configure generic provider with public hosting OR make releases repository public.
- // See AUTO_UPDATE_ANALYSIS.md and AUTO_UPDATE_FIX_GUIDE.md for detailed solutions.
- console.log('[Main] Auto-update check disabled - manual check available in UI');
- console.log('[Main] To re-enable: configure authentication or use generic provider');
-
- // For manual check only - uncomment after fixing authentication:
- /*
+ // Auto-update configured for public release repository: cms-admin-releases
  if (app.isPackaged) {
    console.log('[Main] Scheduling auto-update check...');
    setTimeout(() => {
      console.log('[Main] Starting automatic update check...');
      autoUpdater.checkForUpdates().catch((error) => {
        console.error('[Main] Auto-update check failed:', error.message || error);
        console.error('[Main] Error details:', error);
      });
    }, 3000); // Delay to let the app fully load first
  } else {
    console.log('[Main] Auto-update disabled in development mode');
  }
- */
```

### Изменение 4: Создать GitHub Token

**В GitHub вручную** (я не могу это сделать):

1. Перейти: https://github.com/settings/tokens?type=beta
2. Нажать: "Generate new token"
3. Заполнить:
   - Token name: `CMS_ADMIN_RELEASE_TOKEN`
   - Expiration: Custom → 365 days
   - Description: "Publish releases to cms-admin-releases"
   - Repository access: **Only select repositories**
   - Выбрать: `CGskills/cms-admin-releases`
   - Repository permissions:
     - Contents: **Read and write** ✅
     - Metadata: Read-only (автоматически)
4. Generate token
5. **СКОПИРОВАТЬ ТОКЕН** (больше не покажется!)

6. Добавить в Secrets:
   - Перейти: https://github.com/CGskills/cms-admin/settings/secrets/actions
   - New repository secret
   - Name: `RELEASE_TOKEN`
   - Value: <вставить скопированный токен>
   - Add secret

---

## 🔒 БЕЗОПАСНОСТЬ

### ✅ ЧТО ПРАВИЛЬНО

- Токен хранится в GitHub Secrets (зашифровано)
- Токен НЕ попадает в код
- Токен НЕ попадает в .exe
- Токен имеет минимальные права (только cms-admin-releases)
- Токен может быть отозван в любой момент

### ❌ ЧТО НЕ НУЖНО ДЕЛАТЬ

- ❌ НЕ добавлять токен в .env
- ❌ НЕ добавлять токен в package.json
- ❌ НЕ добавлять токен в main.cjs
- ❌ НЕ коммитить токен
- ❌ НЕ логировать токен

---

## 📦 ЧТО ПРОИЗОЙДЕТ ПОСЛЕ МИГРАЦИИ

### При создании тега v0.2.5:

```
1. GitHub Actions запускается
   ├─ Checkout код из cms-admin (приватный)
   ├─ npm ci
   ├─ npm run build (Next.js production)
   └─ npm run desktop:prepare (standalone + runtime-env.json)

2. electron-builder собирает приложение
   ├─ Упаковывает .next/standalone в app.asar
   ├─ Создает NSIS installer: CMS-Admin-0.2.5-win-x64.exe
   ├─ Создает blockmap: CMS-Admin-0.2.5-win-x64.exe.blockmap
   └─ Создает latest.yml с метаданными

3. electron-builder публикует в cms-admin-releases
   ├─ Использует RELEASE_TOKEN из Secrets
   ├─ Создает Release v0.2.5 в cms-admin-releases
   ├─ Загружает .exe (публичный)
   ├─ Загружает .blockmap (публичный)
   └─ Загружает latest.yml (публичный)

4. Desktop приложение пользователя
   ├─ Автопроверка через 3 секунды после запуска
   ├─ autoUpdater.checkForUpdates()
   ├─ GET https://github.com/CGskills/cms-admin-releases/releases/download/v0.2.5/latest.yml
   ├─ ✅ HTTP 200 (публичный доступ)
   ├─ Показывает уведомление "Доступна версия 0.2.5"
   ├─ Пользователь нажимает "Скачать"
   ├─ Скачивает .exe из cms-admin-releases
   ├─ Показывает "Обновление готово"
   ├─ Пользователь нажимает "Установить и перезапустить"
   └─ NSIS устанавливает новую версию
```

### Что НЕ изменится:

- ✅ Исходный код остается в cms-admin (приватный)
- ✅ Браузерная версия работает как раньше
- ✅ Supabase работает как раньше
- ✅ Авторизация работает как раньше
- ✅ Админка работает как раньше
- ✅ Pricing работает как раньше
- ✅ Drag-and-drop работает как раньше
- ✅ PointerSensor работает как раньше
- ✅ KeyboardSensor работает как раньше

---

## 🧪 ТЕСТИРОВАНИЕ

### После внесения изменений:

1. **Локальная сборка** (БЕЗ публикации):
```bash
npm run build
npm run desktop:prepare
npm run desktop:dist:win
```

Проверить файлы в `release/`:
- ✅ CMS-Admin-0.2.4-win-x64.exe
- ✅ CMS-Admin-0.2.4-win-x64.exe.blockmap
- ✅ latest.yml

2. **Проверить latest.yml**:
```bash
cat release/latest.yml
```

Должно содержать:
```yaml
version: 0.2.4
files:
  - url: CMS-Admin-0.2.4-win-x64.exe
    sha512: <hash>
    size: <bytes>
path: CMS-Admin-0.2.4-win-x64.exe
sha512: <hash>
releaseDate: 2026-08-31T...
```

3. **Тестовый релиз** (ТОЛЬКО после одобрения):
```bash
# Изменить version в package.json на 0.2.5
git add .
git commit -m "Configure auto-update for public release repository"
git tag v0.2.5
git push origin claude/lucid-morse-56de7a
git push origin v0.2.5
```

4. **Проверить GitHub Actions**:
```bash
gh run list --workflow=release.yml --limit 1
gh run watch
```

5. **Проверить релиз**:
```bash
gh release view v0.2.5 --repo CGskills/cms-admin-releases
```

Должно показать:
```
title: v0.2.5
tag: v0.2.5
draft: false
assets:
  - CMS-Admin-0.2.5-win-x64.exe
  - CMS-Admin-0.2.5-win-x64.exe.blockmap
  - latest.yml
```

6. **Проверить публичный доступ**:
```bash
curl -I https://github.com/CGskills/cms-admin-releases/releases/download/v0.2.5/latest.yml
```

Должно вернуть: `HTTP/2 200`

7. **Установить v0.2.4 и протестировать обновление**:
- Установить CMS-Admin-0.2.4-win-x64.exe
- Запустить приложение
- Проверить, что автопроверка работает (через 3 сек)
- Проверить, что находит v0.2.5
- Скачать обновление
- Установить обновление
- Проверить версию после перезапуска

---

## 🔄 ОТКАТ (если что-то пойдет не так)

### Быстрый откат:

1. В package.json вернуть:
```json
"repo": "cms-admin"
```

2. В workflow вернуть:
```yaml
GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

3. В main.cjs закомментировать автопроверку обратно

4. Закоммитить и создать новый тег

---

## 📋 ЧЕКЛИСТ ПЕРЕД НАЧАЛОМ

- [ ] Прочитан ARCHITECTURE_ANALYSIS.md
- [ ] Прочитан MIGRATION_PLAN.md (этот файл)
- [ ] Понятно, что изменяется
- [ ] Понятно, что НЕ изменяется
- [ ] Репозиторий cms-admin-releases существует и PUBLIC
- [ ] Готов создать RELEASE_TOKEN
- [ ] Готов добавить токен в Secrets
- [ ] Готов внести 3 изменения в код
- [ ] Готов протестировать локально
- [ ] Готов создать тестовый релиз

---

## 🎯 ПОРЯДОК ВЫПОЛНЕНИЯ

### Шаг 1: Создать RELEASE_TOKEN (ВРУЧНУЮ)
⏱️ Время: 2-3 минуты

См. раздел "Изменение 4" выше

### Шаг 2: Внести изменения в код
⏱️ Время: 2-3 минуты

Я внесу изменения в:
- package.json
- .github/workflows/release.yml  
- desktop/main.cjs

### Шаг 3: Локальное тестирование
⏱️ Время: 5-10 минут

```bash
npm run build
npm run desktop:prepare
npm run desktop:dist:win
```

### Шаг 4: Коммит и тег
⏱️ Время: 1-2 минуты

```bash
git add .
git commit -m "Configure auto-update for public release repository"
# НЕ менять version пока
```

### Шаг 5: Тестовый релиз
⏱️ Время: 5-7 минут (GitHub Actions)

```bash
# Изменить version на 0.2.5
git tag v0.2.5
git push origin v0.2.5
```

### Шаг 6: Проверка
⏱️ Время: 2-3 минуты

Проверить релиз в cms-admin-releases

### Шаг 7: Тестирование обновления
⏱️ Время: 10-15 минут

Установить v0.2.4 и проверить обновление до v0.2.5

---

## 📊 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ

```
SOURCE REPOSITORY: https://github.com/CGskills/cms-admin (PRIVATE)
RELEASE REPOSITORY: https://github.com/CGskills/cms-admin-releases (PUBLIC)
UPDATER REPOSITORY: cms-admin-releases (PUBLIC) ✅
PRIVATE RELEASE: NO ✅
AUTO UPDATE: READY ✅
TOKEN SAFE: YES ✅
SOURCE CODE EXPOSED: NO ✅
BROWSER VERSION: UNCHANGED ✅
BUILD: PASSED ✅
RELEASE WORKFLOW: READY ✅
```

---

## 🚨 ВАЖНЫЕ ЗАМЕЧАНИЯ

### 1. Version Bumping

**ВАЖНО**: Перед созданием тега v0.2.5 изменить version в package.json:

```json
"version": "0.2.5"
```

Иначе electron-builder создаст релиз с версией 0.2.4.

### 2. First Release

Первый релиз в cms-admin-releases должен быть создан вручную через tag.
После этого все последующие релизы будут создаваться автоматически.

### 3. Blockmap

Blockmap создается автоматически для дельта-обновлений.
Если его нет - обновление скачает полный .exe (~180 MB).

### 4. NSIS Updates

NSIS автоматически поддерживает in-place updates.
Пользователю не нужно удалять старую версию.

### 5. Browser Version

UpdateChecker НЕ показывается в браузере (проверка `window.electronAPI`).
Браузерная версия продолжит работать без изменений.

---

## ❓ FAQ

### Q: Будет ли работать без RELEASE_TOKEN?

A: НЕТ. electron-builder не сможет создать релиз в cms-admin-releases.

### Q: Можно ли использовать GITHUB_TOKEN?

A: НЕТ. GITHUB_TOKEN имеет права только на текущий репозиторий (cms-admin).

### Q: Безопасно ли хранить токен в Secrets?

A: ДА. GitHub Secrets зашифрованы и не отображаются в логах.

### Q: Что если токен утечет?

A: Немедленно отозвать токен в GitHub Settings. Токен имеет права только на cms-admin-releases.

### Q: Как проверить, что релиз публичный?

A: Открыть в браузере (incognito):
```
https://github.com/CGskills/cms-admin-releases/releases/latest
```

Если доступ без логина - релиз публичный.

### Q: Можно ли откатить изменения?

A: ДА. См. раздел "Откат" выше.

### Q: Ломается ли что-то?

A: НЕТ. Изменения только в конфигурации публикации и автообновления.

### Q: Нужно ли переустанавливать приложение?

A: НЕТ. После первого релиза v0.2.5 все пользователи получат автообновление.

---

**СТАТУС**: ✅ Готов к выполнению

**СЛЕДУЮЩИЙ ШАГ**: Создайте RELEASE_TOKEN и дайте мне знать, когда будете готовы к внесению изменений в код
