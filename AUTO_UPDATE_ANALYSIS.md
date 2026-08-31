# Глубокий анализ проблемы автообновления

## Дата анализа
31 августа 2026

## Текущее состояние

### Версия приложения
- Текущая версия в package.json: **0.2.3**
- Последний релиз на GitHub: **v0.2.3** (опубликован 31.08.2026 07:17:23 UTC)

### Симптомы проблемы
1. ❌ При запуске приложения появляется ошибка автообновления
2. ❌ Автообновление не работает - ничего не скачивается
3. ❌ Пользователь видит ошибку каждый раз при входе в программу

---

## Выявленные критические проблемы

### 🔴 ПРОБЛЕМА #1: Приватный репозиторий без настройки аутентификации

**Статус**: КРИТИЧЕСКАЯ

**Описание**: 
- Репозиторий `CGskills/cms-admin` является **приватным** (`"isPrivate": true`)
- `electron-updater` **НЕ может получить доступ** к файлам релизов без токена аутентификации
- Попытки скачать файлы возвращают **HTTP 404 Not Found**

**Проверка**:
```bash
curl https://github.com/CGskills/cms-admin/releases/download/v0.2.3/latest.yml
# Результат: 404 Not Found
```

**Затронутые файлы**:
- `latest.yml` (метаданные релиза)
- `CMS-Admin-0.2.3-win-x64.exe` (установщик)
- `CMS-Admin-0.2.3-win-x64.exe.blockmap` (для дельта-обновлений)

**Почему это критично**:
- `electron-updater` по умолчанию пытается скачать `latest.yml` с GitHub без аутентификации
- Без доступа к `latest.yml` автообновление полностью не работает
- При каждом запуске приложения происходит проверка обновлений, которая завершается ошибкой

---

### 🔴 ПРОБЛЕМА #2: Отсутствие blockmap файла в релизе v0.2.3

**Статус**: КРИТИЧЕСКАЯ

**Описание**:
В релизе v0.2.3 загружены только 2 файла из 3 необходимых:
- ✅ `CMS-Admin-0.2.3-win-x64.exe` (179,995,662 bytes)
- ✅ `latest.yml` (351 bytes)
- ❌ `CMS-Admin-0.2.3-win-x64.exe.blockmap` (ОТСУТСТВУЕТ)

**Логи сборки показывают**:
```
• building block map  blockMapFile=release\CMS-Admin-0.2.3-win-x64.exe.blockmap
• uploading       file=CMS-Admin-0.2.3-win-x64.exe.blockmap provider=github
```

Файл был создан и началась загрузка, но **не появился в релизе**.

**Для сравнения - релиз v0.2.2**:
- ✅ `CMS-Admin-0.2.2-win-x64.exe.blockmap` (присутствует)
- ✅ `latest.yml` (присутствует)
- ❌ `CMS-Admin-0.2.2-win-x64.exe` (отсутствует - другая проблема)

**Почему это критично**:
- Без `.blockmap` файла невозможны дельта-обновления
- `electron-updater` должен скачивать полный установщик каждый раз
- Увеличивается время и трафик обновления

---

### 🟡 ПРОБЛЕМА #3: Конфигурация electron-updater для приватных репозиториев

**Статус**: ВАЖНАЯ

**Текущая конфигурация** (`package.json:52-72`):
```json
"publish": {
  "provider": "github",
  "owner": "CGskills",
  "repo": "cms-admin",
  "releaseType": "release"
}
```

**Проблема**: 
Отсутствует конфигурация для доступа к приватному репозиторию.

**Что требуется для приватных репозиториев**:
1. GitHub Personal Access Token с правами `repo`
2. Настройка токена в `electron-updater`
3. Альтернатива: использовать `provider: "generic"` с публичным CDN

---

### 🟡 ПРОБЛЕМА #4: Отсутствие electron-log в production build

**Статус**: ВАЖНАЯ

**Описание**:
В `desktop/main.cjs:26-36` есть попытка использовать `electron-log`:
```javascript
const setupUpdateLogger = () => {
  try {
    const log = require('electron-log');
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    log.info('[AutoUpdater] Logger initialized');
  } catch (error) {
    console.log('[AutoUpdater] Using console logger (electron-log not available)');
    autoUpdater.logger = console;
  }
};
```

**Проверка зависимостей**:
```bash
npm list electron-log
# Результат: (empty) - пакет НЕ установлен
```

**Проблема**:
- `electron-log` не указан в `dependencies` в `package.json`
- В production build логирование будет использовать `console`, который не пишет в файлы
- Отсутствуют логи автообновления для диагностики проблем

---

## Техническая информация

### Конфигурация автообновления (desktop/main.cjs:21-23)
```javascript
autoUpdater.autoDownload = false;  // Ручное скачивание
autoUpdater.autoInstallOnAppQuit = true;  // Установка при выходе
```

### Логика проверки обновлений
1. Приложение запускается
2. Через 3 секунды автоматически запускается проверка (строка 439-445)
3. `autoUpdater.checkForUpdates()` пытается скачать `latest.yml` с GitHub
4. Получает **404 Not Found** из-за приватного репозитория
5. Событие `error` срабатывает и отправляется в UI
6. Пользователь видит ошибку в компоненте `UpdateChecker.tsx`

### Обработка ошибок в UI (UpdateChecker.tsx:73-81)
```typescript
const unsubscribeError = api.onUpdateError((err: { message: string }) => {
  setStatus('error');
  setError(err.message);
  // Auto-hide error after 5 seconds
  setTimeout(() => {
    setStatus('idle');
    setError(null);
  }, 5000);
});
```

Ошибка показывается на 5 секунд, но при каждом запуске приложения повторяется.

---

## История попыток исправления

### Коммит 16004d0 (31.08.2026)
**"Fix: Remove spaces from productName for stable auto-update"**
- Изменил `productName` с `"CMS Admin Panel"` на `"CMSAdminPanel"`
- Убрал пробелы из путей для стабильности
- Улучшил логирование ошибок
- **Результат**: Проблема с путями решена, но автообновление все равно не работает

### Коммит 4617c15 (30.08.2026)
**"Fix: Improve auto-update with better logging and error handling"**
- Добавил попытку использовать `electron-log`
- Улучшил обработку ошибок в UpdateChecker
- **Результат**: Лучшая диагностика, но основная проблема не решена

### Коммит 415b77a (30.08.2026)
**"Release v0.2.1: Fix auto-update download"**
- Попытки исправить скачивание
- **Результат**: Проблема сохраняется

---

## Решения

### ✅ РЕШЕНИЕ #1: Использовать Generic Provider с публичным хостингом

**Рекомендуется**: Самое надежное решение для приватных репозиториев

**Преимущества**:
- Не требует токенов на стороне клиента
- Полный контроль над файлами
- Работает с любыми CDN/хостингами

**Варианты хостинга**:
1. **GitHub Pages** (публичный статический сайт из приватного репозитория)
2. **Amazon S3 + CloudFront**
3. **Azure Blob Storage**
4. **DigitalOcean Spaces**
5. **Собственный веб-сервер**

**Изменения в package.json**:
```json
"publish": {
  "provider": "generic",
  "url": "https://your-domain.com/updates"
}
```

**Структура на сервере**:
```
https://your-domain.com/updates/
├── latest.yml
├── CMS-Admin-0.2.3-win-x64.exe
└── CMS-Admin-0.2.3-win-x64.exe.blockmap
```

---

### ✅ РЕШЕНИЕ #2: GitHub Token в приложении (НЕ РЕКОМЕНДУЕТСЯ)

**Описание**: Встроить токен в приложение для доступа к приватным релизам

**⚠️ КРИТИЧЕСКИЕ РИСКИ**:
- Токен можно извлечь из скомпилированного приложения
- Компрометация токена = полный доступ к репозиторию
- Нарушение безопасности

**Если все же использовать** (только для внутреннего использования):

```javascript
// В desktop/main.cjs после строки 23
autoUpdater.requestHeaders = {
  "Authorization": `token ${process.env.GITHUB_TOKEN}`
};
```

И хранить токен в зашифрованном виде или использовать отдельный токен только для чтения релизов.

---

### ✅ РЕШЕНИЕ #3: Сделать репозиторий публичным

**Описание**: Самое простое решение - сделать репозиторий публичным

**Преимущества**:
- Автообновление заработает немедленно
- Не требует дополнительной настройки
- Electron-updater будет работать "из коробки"

**Недостатки**:
- Исходный код станет доступен всем
- Потеря конфиденциальности

**Компромиссное решение**:
- Создать отдельный публичный репозиторий только для релизов
- Основной код оставить приватным
- Настроить CI/CD для публикации релизов в публичный репозиторий

---

## Немедленные действия

### 1. Исправить отсутствующий blockmap файл

**Проблема**: В релизе v0.2.3 отсутствует `.blockmap` файл

**Решение**:
```bash
# Пересобрать и переопубликовать релиз
npm run desktop:release:win
```

### 2. Добавить electron-log в зависимости

```bash
npm install --save electron-log
```

Обновить `package.json`:
```json
"dependencies": {
  "electron-log": "^5.2.4",
  "electron-updater": "^6.8.9",
  ...
}
```

### 3. Временно отключить автопроверку обновлений

В `desktop/main.cjs:436-448` закомментировать автоматическую проверку:
```javascript
// Временно отключено до настройки правильного доступа
/*
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
*/
console.log('[Main] Auto-update temporarily disabled - pending configuration');
```

Пользователь сможет проверять обновления вручную через кнопку в UI.

---

## Рекомендуемый план действий

### Этап 1: Немедленное исправление (1-2 часа)
1. ✅ Добавить `electron-log` в dependencies
2. ✅ Отключить автоматическую проверку при запуске
3. ✅ Пересобрать версию 0.2.4 с исправлениями
4. ✅ Опубликовать релиз с полным набором файлов

### Этап 2: Выбор стратегии (обсуждение с командой)
1. 🤔 Решить: публичный репозиторий ИЛИ generic provider
2. 🤔 Если generic provider - выбрать хостинг
3. 🤔 Настроить инфраструктуру

### Этап 3: Внедрение решения (4-8 часов)
1. ✅ Реализовать выбранную стратегию
2. ✅ Обновить конфигурацию electron-builder
3. ✅ Протестировать автообновление
4. ✅ Включить обратно автоматическую проверку

### Этап 4: Тестирование (2-4 часа)
1. ✅ Установить текущую версию
2. ✅ Опубликовать новую версию
3. ✅ Проверить автообновление
4. ✅ Проверить дельта-обновления (blockmap)

---

## Дополнительная информация

### Ссылки на релизы
- v0.2.3: https://github.com/CGskills/cms-admin/releases/tag/v0.2.3
- v0.2.2: https://github.com/CGskills/cms-admin/releases/tag/v0.2.2

### GitHub Actions Workflow
- Файл: `.github/workflows/release.yml`
- Последний успешный запуск: 33367225395 (31.08.2026)
- Используется `GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`

### Конфигурация проекта
- App ID: `com.cms.admin`
- Product Name: `CMSAdminPanel`
- Executable: `CMSAdminPanel.exe`
- Release Directory: `release/`

---

## Вывод

**Основная причина проблемы**: Приватный репозиторий GitHub без настроенного доступа для electron-updater.

**Рекомендация**: Использовать **Generic Provider** с публичным хостингом (GitHub Pages или CDN) - это самый безопасный и надежный способ для приватных проектов.

**Временное решение**: Отключить автоматическую проверку обновлений при запуске, оставить ручную проверку через UI.

**Долгосрочное решение**: Настроить отдельный публичный хостинг для файлов обновлений или создать публичный репозиторий только для релизов.
