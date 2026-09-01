# 🔍 ПРОВЕРКА АРХИТЕКТУРЫ ПЕРЕД МИГРАЦИЕЙ

## ✅ ТЕКУЩЕЕ СОСТОЯНИЕ (Проверено)

### Схема репозиториев:

```
┌──────────────────────────────────────────────────────────────┐
│ PRIVATE SOURCE REPOSITORY                                     │
│ https://github.com/CGskills/cms-admin                        │
│                                                               │
│ Содержит:                                                     │
│ - Исходный код приложения (app/, desktop/, components/)     │
│ - package.json, конфигурация                                 │
│ - .github/workflows/release.yml                              │
│ - Secrets (RELEASE_TOKEN, SUPABASE_*, ADMIN_EMAILS)          │
│                                                               │
│ НЕ содержит: готовые .exe релизы                            │
└──────────────────────────────────────────────────────────────┘
                            ↓
                   GitHub Actions (CI/CD)
                   с RELEASE_TOKEN
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ PUBLIC RELEASE REPOSITORY                                     │
│ https://github.com/CGskills/cms-admin-releases               │
│                                                               │
│ Содержит ТОЛЬКО:                                              │
│ - Готовые .exe файлы (CMS-Admin-0.2.x-win-x64.exe)          │
│ - Blockmap файлы (для дельта-обновлений)                    │
│ - latest.yml (метаданные релиза)                             │
│                                                               │
│ НЕ содержит: исходный код, токены, secrets                   │
└──────────────────────────────────────────────────────────────┘
                            ↓
                   PUBLIC HTTP GET (без токена)
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ CLIENT DESKTOP APPLICATION                                    │
│ electron-updater встроен в приложение                        │
│                                                               │
│ 1. Запуск → через 3 сек автопроверка                        │
│ 2. GET https://github.com/CGskills/                          │
│    cms-admin-releases/releases/download/vX.X.X/latest.yml    │
│ 3. Без авторизации (публичный доступ)                       │
│ 4. Если новая версия → показать уведомление                 │
│ 5. Пользователь нажимает "Скачать"                          │
│ 6. GET .exe из cms-admin-releases                            │
│ 7. NSIS устанавливает обновление                             │
│                                                               │
│ НЕ содержит: GitHub token, credentials                       │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔐 БЕЗОПАСНОСТЬ (Проверено)

### ✅ ГДЕ НЕТ ТОКЕНОВ (Проверено grep):

```bash
✅ desktop/main.cjs         - НЕТ токенов
✅ desktop/preload.cjs      - НЕТ токенов
✅ app/admin/_components/UpdateChecker.tsx - НЕТ токенов
✅ package.json            - НЕТ токенов (только конфигурация)
```

### ✅ ГДЕ ИСПОЛЬЗУЕТСЯ ТОКЕН:

```yaml
# .github/workflows/release.yml (строка 32)
# ТОЛЬКО в GitHub Actions CI/CD:
env:
  GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}  # ❌ Текущий (недостаточно прав)
```

**ИЗМЕНЕНИЕ:**
```yaml
env:
  GH_TOKEN: ${{ secrets.RELEASE_TOKEN }}  # ✅ Новый (права на cms-admin-releases)
```

### ✅ ТОКЕН НИКОГДА НЕ ПОПАДАЕТ В:

- ❌ .exe файл (собранное приложение)
- ❌ app.asar (упакованный код)
- ❌ desktop/main.cjs (main process)
- ❌ desktop/preload.cjs (preload script)
- ❌ renderer процесс (React компоненты)
- ❌ package.json (конфигурация)
- ❌ latest.yml (метаданные релиза)
- ❌ любой packaged файл

### ✅ ТОКЕН ИСПОЛЬЗУЕТСЯ ТОЛЬКО:

- ✅ GitHub Actions workflow (зашифрован в Secrets)
- ✅ Для публикации релиза в cms-admin-releases
- ✅ Никогда не передается в клиентское приложение

---

## 🔧 ЧТО НУЖНО ИЗМЕНИТЬ

### Изменение 1: package.json (строка 71)

**ТЕКУЩЕЕ:**
```json
"publish": {
  "provider": "github",
  "owner": "CGskills",
  "repo": "cms-admin",        // ❌ Приватный репозиторий
  "releaseType": "release"
}
```

**НОВОЕ:**
```json
"publish": {
  "provider": "github",
  "owner": "CGskills",
  "repo": "cms-admin-releases",  // ✅ Публичный репозиторий
  "releaseType": "release"
}
```

**НАЗНАЧЕНИЕ:**
- Указывает electron-builder, КУДА публиковать релизы
- НЕ влияет на клиентское приложение
- Используется только при сборке в CI/CD

---

### Изменение 2: .github/workflows/release.yml (строка 32)

**ТЕКУЩЕЕ:**
```yaml
- name: Build and publish Electron app
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}  // ❌ Права только на cms-admin
```

**НОВОЕ:**
```yaml
- name: Build and publish Electron app
  env:
    GH_TOKEN: ${{ secrets.RELEASE_TOKEN }}  // ✅ Права на cms-admin-releases
```

**НАЗНАЧЕНИЕ:**
- GitHub Actions использует этот токен для публикации
- GITHUB_TOKEN имеет права только на текущий репозиторий (cms-admin)
- RELEASE_TOKEN имеет права на целевой репозиторий (cms-admin-releases)
- Токен НЕ попадает в .exe

---

### Изменение 3: desktop/main.cjs (строки 446-459)

**ТЕКУЩЕЕ:**
```javascript
// Auto-update check temporarily disabled until proper authentication is configured
// for private repository access. Users can manually check for updates via the UI button.
console.log('[Main] Auto-update check disabled - manual check available in UI');

// For manual check only - uncomment after fixing authentication:
/*
if (app.isPackaged) {
  console.log('[Main] Scheduling auto-update check...');
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((error) => {
      console.error('[Main] Auto-update check failed:', error.message || error);
    });
  }, 3000);
}
*/
```

**НОВОЕ:**
```javascript
// Auto-update configured for public release repository: cms-admin-releases
// Public repository allows electron-updater to check for updates without authentication
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
```

**НАЗНАЧЕНИЕ:**
- Включает автопроверку обновлений при запуске приложения
- НЕ добавляет токены (работает с публичным репозиторием)
- electron-updater автоматически определяет URL из package.json

---

## 🔍 КАК РАБОТАЕТ electron-updater

### Откуда electron-updater берет URL?

**Автоматически из package.json:**
```json
"build": {
  "appId": "com.cgskills.cmsadmin",
  "productName": "CMSAdminPanel",
  "publish": {
    "provider": "github",
    "owner": "CGskills",
    "repo": "cms-admin-releases",  // ← ОТСЮДА
    "releaseType": "release"
  }
}
```

**electron-updater формирует URL:**
```
https://github.com/CGskills/cms-admin-releases/releases/download/v0.2.5/latest.yml
```

### Нужна ли авторизация?

**НЕТ**, потому что:
- cms-admin-releases - PUBLIC репозиторий
- GitHub разрешает публичный доступ к релизам
- HTTP GET без токена возвращает HTTP 200

### Где хранится конфигурация в .exe?

**В app.asar (упакованный package.json):**
```
CMS-Admin-0.2.5-win-x64.exe
└─ resources/
   └─ app.asar
      └─ package.json ← конфигурация "publish"
```

**НЕ содержит токены**, только:
- owner: "CGskills"
- repo: "cms-admin-releases"
- provider: "github"

---

## ✅ ЧТО НЕ ИЗМЕНЯЕТСЯ

### Клиентский код:
- ✅ desktop/preload.cjs - без изменений
- ✅ app/admin/_components/UpdateChecker.tsx - без изменений
- ✅ app/admin/_components/Header.tsx - без изменений

### Функциональность:
- ✅ Кнопка "Проверить обновления" - работает
- ✅ Browser версия - не затронута
- ✅ Supabase - без изменений
- ✅ Auth - без изменений
- ✅ Все UI компоненты - без изменений

### Безопасность:
- ✅ Исходный код остается в cms-admin (приватный)
- ✅ Релизы публикуются в cms-admin-releases (публичный)
- ✅ Токен только в GitHub Secrets
- ✅ Токен НЕ в клиентском коде

---

## 🎯 ИТОГОВАЯ СХЕМА (После миграции)

```
[PRIVATE SOURCE]                    [CI/CD]                      [PUBLIC RELEASE]                    [CLIENT]
cms-admin                           GitHub Actions               cms-admin-releases                  Desktop App
                                    
- Исходный код      ──────────→    - Checkout код    ──────────→  - .exe файлы        ──────────→   - electron-updater
- package.json                      - npm ci                       - .blockmap                        - БЕЗ токена
- Secrets                           - npm run build                - latest.yml                       - PUBLIC GET
  - RELEASE_TOKEN   ────┐           - RELEASE_TOKEN                                                   - Автопроверка
  - SUPABASE_*          │           - electron-builder                                                - Ручная кнопка
                        │           - Publish to ──────────────→
                        └──────────────→ cms-admin-releases
```

**КРИТИЧЕСКИ ВАЖНО:**
- ✅ RELEASE_TOKEN используется ТОЛЬКО в GitHub Actions
- ✅ RELEASE_TOKEN НЕ попадает в .exe
- ✅ Desktop App работает БЕЗ токена (публичный доступ)

---

## 📋 ПРОВЕРКА ПЕРЕД ИЗМЕНЕНИЯМИ

- [x] cms-admin - PRIVATE ✅
- [x] cms-admin-releases - PUBLIC ✅
- [x] Токены отсутствуют в клиентском коде ✅
- [x] electron-updater не использует токены ✅
- [x] package.json содержит только конфигурацию ✅
- [x] GitHub Actions использует GITHUB_TOKEN (нужна замена на RELEASE_TOKEN)
- [x] Автопроверка отключена (нужно включить)
- [x] Браузерная версия защищена (проверка window.electronAPI)

---

**СТАТУС:** ✅ Архитектура проверена, безопасность подтверждена

**СЛЕДУЮЩИЙ ШАГ:** Внести 3 минимальных изменения в код
