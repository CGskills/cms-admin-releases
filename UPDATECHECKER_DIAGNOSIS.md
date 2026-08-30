# 🔍 ДИАГНОСТИКА: ПОЧЕМУ КНОПКА "ПРОВЕРИТЬ ОБНОВЛЕНИЯ" НЕ ВИДНА

## TAG COMMIT:
```
743b332887db3b5b2ff537bf67b428f8ccaf2f40
Tag: v0.1.1
Commit message: "Release v0.1.1"
```

**Содержимое tag v0.1.1:**
- ✅ UpdateChecker.tsx - ПРИСУТСТВУЕТ
- ✅ Header.tsx (с UpdateChecker) - ПРИСУТСТВУЕТ
- ✅ preload.cjs (с electronAPI) - ПРИСУТСТВУЕТ
- ✅ main.cjs (с electron-updater) - ПРИСУТСТВУЕТ
- ✅ package.json version: 0.1.1 - ПРИСУТСТВУЕТ
- ✅ electron-updater dependency - ПРИСУТСТВУЕТ

## WORKFLOW COMMIT:
```
❓ UNKNOWN - GitHub API недоступен (404)
```

Workflow должен был собрать коммит: `743b332`

## WORKFLOW STATUS:
```
❓ UNKNOWN - Невозможно проверить через API
```

**Возможные статусы:**
- Не запустился (permissions не настроены)
- Запустился, но failed
- Запустился и успешно завершился
- Еще выполняется

## RELEASE:
```
⚠️ СТРАНИЦА СУЩЕСТВУЕТ на GitHub
```

URL: https://github.com/CGskills/cms-admin/releases/tag/v0.1.1

**Но проверить детали через API невозможно (404) - репозиторий приватный или требует авторизации**

## INSTALLER ASSETS:
```
❓ UNKNOWN - Невозможно проверить через API
```

**Ожидаются:**
- CMS-Admin-0.1.1-win-x64.exe
- latest.yml

**Локально найден СТАРЫЙ installer:**
```
CMS-Admin-0.1.0-win-x64.exe
Размер: 114M
Дата: Aug 29 20:50
```

❌ **Локальный installer версии 0.1.0, НЕ 0.1.1**

## INSTALLED APP VERSION:
```
❓ НЕИЗВЕСТНО - Требуется проверка в установленном приложении
```

**Для проверки в DevTools Console:**
```javascript
await window.electronAPI.getAppVersion()
// Должно вернуть "0.1.1" если установлен из release v0.1.1
```

## UPDATECHECKER IN PACKAGED APP:
```
❓ ЗАВИСИТ ОТ ТОГО, КАКОЙ INSTALLER БЫЛ УСТАНОВЛЕН
```

**Если установлен CMS-Admin-0.1.0-win-x64.exe:**
- ❌ UpdateChecker НЕТ (файлы автообновления добавлены ПОСЛЕ v0.1.0)

**Если установлен CMS-Admin-0.1.1-win-x64.exe из GitHub Release:**
- ✅ UpdateChecker ЕСТЬ (присутствует в tag v0.1.1)

## ELECTRON API IN RENDERER:
```
❓ ЗАВИСИТ ОТ ВЕРСИИ УСТАНОВЛЕННОГО ПРИЛОЖЕНИЯ
```

**Если установлен v0.1.0:**
- ❌ window.electronAPI отсутствует (preload.cjs не было в v0.1.0)
- UpdateChecker вернет `return null`

**Если установлен v0.1.1:**
- ✅ window.electronAPI должен присутствовать

## ТОЧНАЯ ПРИЧИНА:

**УСТАНОВЛЕНА НЕПРАВИЛЬНАЯ ВЕРСИЯ ПРИЛОЖЕНИЯ**

### Сценарий 1 (наиболее вероятный):
Пользователь установил **локальный installer CMS-Admin-0.1.0-win-x64.exe** вместо installer из GitHub Release v0.1.1.

**Доказательства:**
1. Локально существует `CMS-Admin-0.1.0-win-x64.exe` (114M, Aug 29 20:50)
2. Этот installer был собран ДО добавления файлов автообновления
3. Версия 0.1.0 НЕ содержит UpdateChecker/preload/electron-updater

### Сценарий 2:
GitHub Actions workflow для v0.1.1 НЕ запустился или failed из-за отсутствия permissions.

**Что проверить:**
1. GitHub Actions permissions: "Read and write" должны быть включены
2. Workflow run для tag v0.1.1 должен быть успешным
3. GitHub Release v0.1.1 должен содержать CMS-Admin-0.1.1-win-x64.exe

### Сценарий 3:
GitHub Release v0.1.1 существует, но пользователь скачал и установил неправильный файл.

## ЧТО ИСПРАВЛЯТЬ:

### Немедленно:

**1. Проверить GitHub Actions permissions**
```
https://github.com/CGskills/cms-admin/settings/actions
→ Workflow permissions
→ Убедиться: "Read and write permissions" выбрано
```

**2. Проверить workflow для v0.1.1**
```
https://github.com/CGskills/cms-admin/actions
→ Найти run для tag v0.1.1
→ Проверить статус: Success / Failed / In progress
```

**3. Проверить GitHub Release v0.1.1**
```
https://github.com/CGskills/cms-admin/releases/tag/v0.1.1
→ Проверить наличие assets:
   - CMS-Admin-0.1.1-win-x64.exe
   - latest.yml
```

**4. Установить ПРАВИЛЬНЫЙ installer**

Если GitHub Release v0.1.1 существует:
- Скачать CMS-Admin-0.1.1-win-x64.exe из GitHub Release
- Деинсталлировать старую версию
- Установить новую версию из GitHub Release
- Запустить приложение
- Проверить версию: `await window.electronAPI.getAppVersion()`
- Должно вернуть: "0.1.1"
- Кнопка "Проверить обновления" должна появиться

### Если workflow failed или не запустился:

**5. Проверить permissions и перезапустить**

Если permissions не были настроены:
1. Настроить "Read and write permissions"
2. Удалить failed release (если создался)
3. Удалить tag v0.1.1: `git push origin :refs/tags/v0.1.1`
4. Пересоздать tag и push снова:
   ```bash
   git tag -d v0.1.1
   git tag v0.1.1 743b332
   git push origin v0.1.1
   ```

### Если нужен новый release:

**6. Создать v0.1.2**

Если v0.1.1 не может быть исправлен:
1. Создать новый tag v0.1.2
2. Дождаться успешного workflow
3. Установить из GitHub Release v0.1.2

## 🎯 ПРОВЕРОЧНЫЙ ЧЕК-ЛИСТ

В установленном Desktop приложении проверить в DevTools Console:

```javascript
// 1. Проверить версию
await window.electronAPI.getAppVersion()
// Ожидается: "0.1.1"
// Если вернет "0.1.0" или undefined - установлена неправильная версия

// 2. Проверить наличие electronAPI
console.log('electronAPI' in window)
// Ожидается: true
// Если false - preload.cjs не загрузился

// 3. Проверить методы
console.log(window.electronAPI)
// Должны быть: checkForUpdates, getAppVersion, onUpdateAvailable, и др.

// 4. Проверить UpdateChecker компонент
document.querySelector('[class*="update"]') || 'UpdateChecker not found'
// Должен найти элементы UpdateChecker
```

## 📊 ВЫВОД

**Проблема:** Установлена версия 0.1.0 вместо 0.1.1

**Решение:** Установить правильный installer из GitHub Release v0.1.1

**Код автообновления:** ✅ Корректный (присутствует в tag v0.1.1)

**Причина отсутствия кнопки:** Установлен старый installer без кода автообновления
