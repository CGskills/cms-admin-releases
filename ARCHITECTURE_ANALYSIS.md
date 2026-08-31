# 🔍 ПОЛНЫЙ АНАЛИЗ ТЕКУЩЕЙ АРХИТЕКТУРЫ AUTO-UPDATE

## 📋 ТЕКУЩЕЕ СОСТОЯНИЕ

### Репозитории

#### 1. Исходный код (PRIVATE)
```
Repository: https://github.com/CGskills/cms-admin.git
Visibility: PRIVATE
Current Branch: claude/lucid-morse-56de7a
Version: 0.2.4
```

#### 2. Релизы (PUBLIC) ✅
```
Repository: https://github.com/CGskills/cms-admin-releases
Visibility: PUBLIC
Releases: НЕТ (пустой репозиторий)
```

**ВАЖНО**: Репозиторий `cms-admin-releases` уже создан и является ПУБЛИЧНЫМ!

---

## 🔧 ТЕКУЩАЯ КОНФИГУРАЦИЯ

### package.json - Electron Builder Config

```json
"build": {
  "appId": "com.cms.admin",
  "productName": "CMSAdminPanel",
  "artifactName": "CMS-Admin-${version}-${os}-${arch}.${ext}",
  "asar": true,
  "asarUnpack": [".next/standalone/**"],
  "files": ["desktop/**/*", ".next/standalone/**/*"],
  "directories": {
    "output": "release"
  },
  "publish": {
    "provider": "github",
    "owner": "CGskills",
    "repo": "cms-admin",           // ❌ ПРОБЛЕМА: указан приватный репозиторий
    "releaseType": "release"
  },
  "win": {
    "target": [{"target": "nsis", "arch": ["x64"]}],
    "icon": "public/logo.svg",
    "executableName": "CMSAdminPanel",
    "publish": ["github"]
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true
  }
}
```

**ПРОБЛЕМА**: 
- `publish.repo` указывает на `cms-admin` (приватный)
- electron-updater будет искать обновления в приватном репозитории
- Без токена на клиенте получит HTTP 404

---

### desktop/main.cjs - AutoUpdater Configuration

```javascript
// Строки 21-23: Базовая конфигурация
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// Строки 26-38: Логирование
const setupUpdateLogger = () => {
  try {
    const log = require('electron-log');
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
  } catch (error) {
    console.log('[AutoUpdater] Using console logger');
    autoUpdater.logger = console;
  }
};

// Строки 102-122: IPC Handler для проверки обновлений
ipcMain.handle('check-for-updates', async () => {
  if (!app.isPackaged) {
    return { error: 'Updates are only available in production builds' };
  }
  try {
    const result = await autoUpdater.checkForUpdates();
    return { success: true, updateInfo: result?.updateInfo };
  } catch (error) {
    return { error: errorMessage };
  }
});

// Строки 436-459: Автопроверка ОТКЛЮЧЕНА
// Auto-update check temporarily disabled until proper authentication is configured
console.log('[Main] Auto-update check disabled - manual check available in UI');
```

**ТЕКУЩЕЕ ПОВЕДЕНИЕ**:
- Автопроверка при запуске ОТКЛЮЧЕНА (из-за проблемы с приватным репозиторием)
- Ручная проверка через UI ДОСТУПНА
- `autoUpdater.checkForUpdates()` пытается получить `latest.yml` из `cms-admin` (приватный)
- Получает HTTP 404
- НЕТ конфигурации для указания альтернативного репозитория

---

### .github/workflows/release.yml - GitHub Actions

```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: windows-latest
    permissions:
      contents: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build Next.js app
        run: npm run build

      - name: Build and publish Electron app
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY }}
          ADMIN_EMAILS: ${{ secrets.ADMIN_EMAILS }}
        run: npm run desktop:dist:win -- --publish always

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: windows-installer
          path: release/*.exe
          retention-days: 7
```

**ТЕКУЩЕЕ ПОВЕДЕНИЕ**:
- Запускается при создании тега `v*`
- Использует `GITHUB_TOKEN` (имеет права только на текущий репозиторий `cms-admin`)
- Выполняет `electron-builder --win --publish always`
- Публикует релиз в `cms-admin` (приватный) согласно `package.json`
- НЕ может публиковать в `cms-admin-releases` (другой репозиторий)

---

### UpdateChecker.tsx - UI Component

```typescript
// Компонент работает только в Electron
const checkElectron = typeof window !== 'undefined' && 'electronAPI' in window;

// Доступные методы через IPC:
- checkForUpdates()       // Проверка обновлений
- downloadUpdate()        // Скачивание
- installUpdate()         // Установка
- getAppVersion()         // Текущая версия

// События от autoUpdater:
- update-available        // Новая версия найдена
- update-not-available    // Обновлений нет
- update-downloading      // Процесс скачивания
- update-downloaded       // Скачивание завершено
- update-error            // Ошибка
```

**ТЕКУЩЕЕ ПОВЕДЕНИЕ**:
- Компонент НЕ показывается в браузерной версии (проверка `isElectron`)
- В Desktop показывает кнопку обновления
- При клике вызывает `check-for-updates` IPC
- Получает ошибку 404 (приватный репозиторий)

---

## ❌ ТЕКУЩИЕ ПРОБЛЕМЫ

### Проблема 1: Репозиторий публикации
```
Конфигурация: repo: "cms-admin"
Фактически: PRIVATE репозиторий
Результат: electron-updater получает 404 при попытке скачать latest.yml
```

### Проблема 2: GitHub Actions Token
```
Токен: secrets.GITHUB_TOKEN
Права: только на текущий репозиторий (cms-admin)
Проблема: НЕ может публиковать в cms-admin-releases
```

### Проблема 3: Отсутствие релизов в целевом репозитории
```
cms-admin-releases: создан, но пустой
Релизы: отсутствуют
```

### Проблема 4: Hardcoded repository в package.json
```
electron-builder берет конфигурацию из package.json
autoUpdater использует ту же конфигурацию
НЕТ способа указать разные репозитории для:
- публикации (cms-admin-releases)
- обновлений (cms-admin-releases)
```

---

## 🔐 БЕЗОПАСНОСТЬ: ТОКЕНЫ

### Что НЕ ДОЛЖНО быть в коде:

❌ GitHub Personal Access Token в:
- package.json
- desktop/main.cjs
- desktop/preload.cjs
- любом .js/.ts файле
- .env файлах, которые попадают в build
- app.asar

### Что МОЖНО:

✅ В GitHub Actions Secrets:
- `RELEASE_TOKEN` - для публикации в cms-admin-releases
- `NEXT_PUBLIC_SUPABASE_URL` - публичный ключ
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - публичный ключ
- `ADMIN_EMAILS` - список админов

✅ В runtime-env.json (создается при сборке):
- Публичные Supabase ключи
- ADMIN_EMAILS
- НЕТ GitHub токенов

---

## 🎯 ТРЕБУЕМАЯ АРХИТЕКТУРА

```
┌─────────────────────────────────────┐
│   CGskills/cms-admin (PRIVATE)      │
│   - Исходный код                    │
│   - Next.js приложение              │
│   - Desktop код                     │
│   - .github/workflows/release.yml   │
└─────────────────┬───────────────────┘
                  │
                  │ git tag v0.2.5
                  ▼
         ┌─────────────────┐
         │  GitHub Actions  │
         │  1. npm run build│
         │  2. desktop:     │
         │     prepare      │
         │  3. electron-    │
         │     builder      │
         └────────┬─────────┘
                  │
                  │ Publish with RELEASE_TOKEN
                  ▼
┌─────────────────────────────────────┐
│ CGskills/cms-admin-releases (PUBLIC)│
│ - CMS-Admin-0.2.5-win-x64.exe       │
│ - CMS-Admin-0.2.5-win-x64.exe.      │
│   blockmap                          │
│ - latest.yml                        │
│ - GitHub Release (публичный)        │
└─────────────────┬───────────────────┘
                  │
                  │ autoUpdater.checkForUpdates()
                  ▼
┌─────────────────────────────────────┐
│   Desktop Application (USER)        │
│   - Проверяет cms-admin-releases    │
│   - Скачивает latest.yml (публично) │
│   - Скачивает .exe (публично)       │
│   - Устанавливает обновление        │
└─────────────────────────────────────┘
```

---

## 📝 ПЛАН МИГРАЦИИ

### Шаг 1: Создать RELEASE_TOKEN в GitHub

**Требуемые permissions** (Fine-grained token):
```
Repository: CGskills/cms-admin-releases
Permissions:
  - Contents: Read and Write
  - Metadata: Read-only (автоматически)
```

**Где создать**:
1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Token name: `CMS_ADMIN_RELEASE_TOKEN`
3. Expiration: Custom (1 год)
4. Repository access: Only select repositories → `cms-admin-releases`
5. Permissions: Contents: Read and Write
6. Generate token
7. Скопировать токен

**Добавить в Secrets**:
1. CGskills/cms-admin → Settings → Secrets and variables → Actions
2. New repository secret
3. Name: `RELEASE_TOKEN`
4. Value: <вставить токен>
5. Add secret

### Шаг 2: Изменить package.json

```json
"publish": {
  "provider": "github",
  "owner": "CGskills",
  "repo": "cms-admin-releases",    // ✅ ИЗМЕНИТЬ
  "releaseType": "release"
}
```

### Шаг 3: Изменить .github/workflows/release.yml

Заменить `GH_TOKEN` на `RELEASE_TOKEN`:

```yaml
- name: Build and publish Electron app
  env:
    GH_TOKEN: ${{ secrets.RELEASE_TOKEN }}    # ✅ ИЗМЕНИТЬ
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY }}
    ADMIN_EMAILS: ${{ secrets.ADMIN_EMAILS }}
  run: npm run desktop:dist:win -- --publish always
```

### Шаг 4: Удалить строку создания релиза в cms-admin

GitHub Actions НЕ создает релиз в `cms-admin` - только artifacts.
Убрать Upload artifacts или оставить для backup.

### Шаг 5: Включить автопроверку в desktop/main.cjs

Раскомментировать строки 446-459:

```javascript
if (app.isPackaged) {
  console.log('[Main] Scheduling auto-update check...');
  setTimeout(() => {
    console.log('[Main] Starting automatic update check...');
    autoUpdater.checkForUpdates().catch((error) => {
      console.error('[Main] Auto-update check failed:', error.message || error);
      console.error('[Main] Error details:', error);
    });
  }, 3000);
} else {
  console.log('[Main] Auto-update disabled in development mode');
}
```

### Шаг 6: Протестировать локально

```bash
# НЕ ДЕЛАТЬ пока не одобрено
npm run build
npm run desktop:prepare
npm run desktop:dist:win
```

Проверить, что создаются:
- release/CMS-Admin-0.2.4-win-x64.exe
- release/CMS-Admin-0.2.4-win-x64.exe.blockmap
- release/latest.yml

### Шаг 7: Создать тестовый релиз

```bash
# НЕ ДЕЛАТЬ пока не одобрено
git tag v0.2.5
git push origin v0.2.5
```

---

## ⚠️ КРИТИЧЕСКИЕ ПРОВЕРКИ

### ✅ Что ПРАВИЛЬНО в текущей конфигурации:

1. **Репозиторий релизов уже создан и ПУБЛИЧНЫЙ** ✅
2. **electron-log установлен** ✅
3. **UpdateChecker работает только в Electron** ✅
4. **Браузерная версия не затронута** ✅
5. **Supabase credentials передаются через Secrets** ✅
6. **NSIS installer используется** ✅
7. **Sandbox включен** ✅
8. **Нет токенов в исходном коде** ✅

### ❌ Что НУЖНО ИСПРАВИТЬ:

1. **package.json: repo: "cms-admin"** → **"cms-admin-releases"**
2. **workflow: GH_TOKEN: secrets.GITHUB_TOKEN** → **secrets.RELEASE_TOKEN**
3. **Создать RELEASE_TOKEN с правами на cms-admin-releases**
4. **Включить автопроверку обновлений**
5. **Создать первый релиз в cms-admin-releases**

---

## 🔬 ДОКУМЕНТАЦИЯ electron-updater

### Официальная поддержка GitHub

electron-updater **автоматически** определяет репозиторий из `package.json`:

```javascript
// Внутри electron-updater:
const owner = this.app.build.publish.owner;
const repo = this.app.build.publish.repo;
const url = `https://github.com/${owner}/${repo}/releases/download/${tag}/latest.yml`;
```

### Публичный vs Приватный репозиторий

**Публичный** (наш случай после миграции):
- ✅ НЕ требует токена на клиенте
- ✅ `latest.yml` доступен публично
- ✅ `.exe` файл доступен публично
- ✅ Безопасно

**Приватный** (текущая ситуация):
- ❌ Требует токена на клиенте (НЕБЕЗОПАСНО)
- ❌ Получает HTTP 404 без токена
- ❌ Hardcoding токена = утечка credentials

### Версия electron-updater

```
Установлена: 6.8.9
Последняя: 6.8.9 ✅
```

---

## 💡 ПОЧЕМУ ЭТО БЕЗОПАСНО

### ✅ Что будет в публичном репозитории:

```
cms-admin-releases/
├── README.md (описание релизов)
└── Releases/
    ├── v0.2.5/
    │   ├── CMS-Admin-0.2.5-win-x64.exe (скомпилированный .exe)
    │   ├── CMS-Admin-0.2.5-win-x64.exe.blockmap
    │   └── latest.yml (метаданные)
```

### ❌ Чего НЕ будет в публичном репозитории:

- ❌ Исходный код (app/, lib/, components/, etc.)
- ❌ package.json
- ❌ .env файлы
- ❌ GitHub токены
- ❌ Supabase private keys (только публичные ключи в runtime-env.json внутри .exe)
- ❌ node_modules
- ❌ .next (исходники, только standalone в .exe)

### 🔒 Что защищено:

1. **Исходный код**: остается в приватном cms-admin
2. **API ключи**: Supabase publishable keys (публичные по дизайну)
3. **GitHub токены**: только в Actions Secrets
4. **.exe декомпиляция**: app.asar содержит только Next.js bundle, НЕ исходники

---

## 🎯 ИТОГ АНАЛИЗА

### Текущее состояние:

```
SOURCE REPOSITORY: https://github.com/CGskills/cms-admin (PRIVATE)
RELEASE REPOSITORY: https://github.com/CGskills/cms-admin-releases (PUBLIC) ✅
UPDATER REPOSITORY: cms-admin (PRIVATE) ❌ - НУЖНО ИЗМЕНИТЬ
PRIVATE RELEASE: NO (после миграции)
AUTO UPDATE: NOT READY (отключено из-за 404)
TOKEN SAFE: YES (нет токенов в коде)
SOURCE CODE EXPOSED: NO (только в приватном репо)
BROWSER VERSION: UNCHANGED
BUILD: NOT TESTED YET
RELEASE WORKFLOW: NEEDS UPDATE
```

### Необходимые изменения:

1. ✏️ **package.json**: 1 строка
2. ✏️ **.github/workflows/release.yml**: 1 строка
3. ✏️ **desktop/main.cjs**: раскомментировать 13 строк
4. 🔑 **GitHub**: создать RELEASE_TOKEN
5. 🔑 **GitHub Secrets**: добавить RELEASE_TOKEN

### Риски:

- ⚠️ **Минимальные**: изменения только в конфигурации
- ⚠️ **Обратимо**: можно откатить за минуты
- ✅ **Безопасно**: токены остаются в Secrets
- ✅ **Не ломает**: браузерная версия не затронута

---

**СТАТУС**: ✅ Готов к внесению изменений после вашего одобрения

**СЛЕДУЮЩИЙ ШАГ**: Создать RELEASE_TOKEN в GitHub вручную
