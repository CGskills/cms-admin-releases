# 🔍 АНАЛИЗ: ПОЧЕМУ WINDOWS INSTALLER НЕ ОПУБЛИКОВАН В RELEASE v0.1.1

## ROOT CAUSE:

**GitHub Actions не имеет прав на публикацию assets в Release.**

GitHub Release v0.1.1 был создан автоматически при push tag, но electron-builder НЕ СМОГ загрузить installer и latest.yml из-за недостаточных permissions.

## WORKFLOW PROBLEM:

### Отсутствуют явные permissions для workflow

**Файл:** `.github/workflows/release.yml`

**Текущая конфигурация:**
```yaml
jobs:
  release:
    runs-on: windows-latest
    # ❌ ОТСУТСТВУЕТ: permissions block
```

**Проблема:**

Workflow использует `secrets.GITHUB_TOKEN`, НО:
1. В репозитории НЕ настроены "Read and write permissions" для Actions
2. В workflow НЕ указаны явные permissions для contents

**Результат:**
- GitHub автоматически создал release при push tag v0.1.1 (только с source code)
- electron-builder запустился с `--publish always`
- electron-builder попытался загрузить .exe и latest.yml в release
- Получил ошибку 403 Forbidden из-за недостаточных прав
- Workflow продолжился, но assets не загрузились

## ELECTRON-BUILDER CONFIG:

**✅ КОНФИГУРАЦИЯ КОРРЕКТНА**

```json
"build": {
  "publish": {
    "provider": "github",
    "owner": "CGskills",
    "repo": "cms-admin",
    "releaseType": "release"
  },
  "win": {
    "target": [{"target": "nsis", "arch": ["x64"]}],
    "publish": ["github"]
  }
}
```

**Проверка:**
- ✅ provider: github
- ✅ owner: CGskills (правильный)
- ✅ repo: cms-admin (правильный)
- ✅ win.publish: ["github"]
- ✅ artifactName: "CMS-Admin-${version}-${os}-${arch}.${ext}"

## PUBLISH CONFIG:

**Workflow команда:**
```bash
npm run desktop:dist:win -- --publish always
```

**Что выполняется:**
```bash
npm run build && npm run desktop:prepare && electron-builder --win --publish always
```

**✅ --publish always ПРИСУТСТВУЕТ**

**Проблема:** НЕ в команде, а в правах доступа.

## EXPECTED EXE:

**Имя:** `CMS-Admin-0.1.1-win-x64.exe`

**Расположение:** `release/CMS-Admin-0.1.1-win-x64.exe` (локально после сборки)

**Размер:** ~100-150 MB (включает Electron + Node.js + Next.js standalone)

**Должен быть загружен:** В GitHub Release v0.1.1 как asset

## EXPECTED LATEST.YML:

**Имя:** `latest.yml`

**Содержание:**
```yaml
version: 0.1.1
files:
  - url: CMS-Admin-0.1.1-win-x64.exe
    sha512: [hash]
    size: [bytes]
path: CMS-Admin-0.1.1-win-x64.exe
sha512: [hash]
releaseDate: [timestamp]
```

**Должен быть загружен:** В GitHub Release v0.1.1 как asset

**Используется:** electron-updater для проверки обновлений

## ЧТО НУЖНО ИЗМЕНИТЬ:

### Исправление 1: Добавить permissions в workflow

**Файл:** `.github/workflows/release.yml`

**Изменить:**
```yaml
jobs:
  release:
    runs-on: windows-latest
    permissions:
      contents: write  # ← ДОБАВИТЬ ЭТО
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      # ... остальные шаги
```

### Исправление 2: Настроить GitHub Actions permissions в репозитории

**URL:** https://github.com/CGskills/cms-admin/settings/actions

**Настройки:**
1. Перейти в "Workflow permissions"
2. Выбрать: **"Read and write permissions"**
3. ✅ Чекбокс: "Allow GitHub Actions to create and approve pull requests"
4. Сохранить

### Исправление 3: Убедиться, что GH_TOKEN передается правильно

**Текущая конфигурация (правильная):**
```yaml
- name: Build and publish Electron app
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: npm run desktop:dist:win -- --publish always
```

✅ Это корректно, НЕ требует изменений.

---

## МОЖНО ЛИ ПОВТОРНО ОПУБЛИКОВАТЬ v0.1.1?

### ❌ НЕТ, нельзя повторно опубликовать тот же tag

**Причина:**

GitHub Release для v0.1.1 уже создан. electron-builder НЕ может:
- Перезаписать существующий release
- Добавить assets к существующему release при повторном запуске

**Что происходит при повторном push v0.1.1:**
- GitHub отклонит push (tag уже существует)
- Если удалить и пересоздать tag - release останется в исходном состоянии
- electron-builder получит ошибку "Release already exists"

### ✅ НУЖНО СОЗДАТЬ НОВЫЙ TAG: v0.1.2

**Правильный процесс:**

1. Исправить `.github/workflows/release.yml` (добавить permissions)
2. Настроить GitHub Actions permissions в Settings
3. Commit исправленного workflow
4. Push изменений в main
5. Создать новую версию:
   ```bash
   npm version patch  # 0.1.1 → 0.1.2
   git add package.json package-lock.json
   git commit -m "Release v0.1.2: Fix GitHub Actions permissions"
   git tag v0.1.2
   git push origin main
   git push origin v0.1.2
   ```
6. Дождаться завершения workflow
7. Проверить Release v0.1.2 на наличие assets

---

## АЛЬТЕРНАТИВНЫЙ ВАРИАНТ (НЕ РЕКОМЕНДУЕТСЯ):

### Удалить v0.1.1 и пересоздать

**Шаги:**
1. Удалить GitHub Release v0.1.1 вручную через веб-интерфейс
2. Удалить tag локально: `git tag -d v0.1.1`
3. Удалить tag на GitHub: `git push origin :refs/tags/v0.1.1`
4. Исправить workflow
5. Настроить permissions
6. Пересоздать tag: `git tag v0.1.1 743b332`
7. Push tag: `git push origin v0.1.1`

**Недостатки:**
- История изменится
- Пользователи, уже видевшие v0.1.1, увидят его заново
- Confusion в истории releases
- Возможны проблемы с кэшированием

**⚠️ НЕ РЕКОМЕНДУЕТСЯ** для production releases.

---

## ИТОГОВЫЙ ПЛАН ДЕЙСТВИЙ:

### 1. Исправить workflow (сейчас)

Добавить `permissions: contents: write` в `.github/workflows/release.yml`

### 2. Настроить GitHub Settings (сейчас)

Settings → Actions → "Read and write permissions"

### 3. Создать v0.1.2 (после исправлений)

```bash
npm version patch
git add package.json package-lock.json .github/workflows/release.yml
git commit -m "Release v0.1.2: Fix GitHub Actions permissions for asset upload"
git tag v0.1.2
git push origin main
git push origin v0.1.2
```

### 4. Проверить Release v0.1.2

- Workflow status: Success
- Assets: CMS-Admin-0.1.2-win-x64.exe, latest.yml
- Размер installer: ~100-150 MB

### 5. Тестировать

- Скачать CMS-Admin-0.1.2-win-x64.exe
- Установить
- Проверить: `await window.electronAPI.getAppVersion()` → "0.1.2"
- Проверить наличие кнопки "Проверить обновления"

---

## РЕЗЮМЕ:

**Проблема:** GitHub Actions permissions  
**Решение:** Добавить `permissions: contents: write` + настроить Settings  
**Следующая версия:** v0.1.2 (нельзя повторно использовать v0.1.1)

**После исправления:** Все будущие releases будут публиковаться с assets автоматически.
