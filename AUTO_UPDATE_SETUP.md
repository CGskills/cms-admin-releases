# Настройка автообновления Desktop приложения

Это руководство описывает, как настроить полноценное автообновление Windows Desktop-версии CMS Admin через GitHub Releases.

## 📋 Что уже настроено

### 1. Установлены зависимости
- ✅ `electron-updater@6.8.9` установлен как production dependency

### 2. Настроен Electron main process
- ✅ `desktop/main.cjs` - добавлена интеграция с `electron-updater`
- ✅ `desktop/preload.cjs` - создан безопасный IPC мост для связи main ↔ renderer
- ✅ Автоматическая проверка обновлений при запуске приложения (с задержкой 3 секунды)
- ✅ Безопасная архитектура: sandbox включен, contextIsolation: true, nodeIntegration: false

### 3. Добавлен UI в админке
- ✅ `app/admin/_components/UpdateChecker.tsx` - компонент проверки обновлений
- ✅ Интеграция в Header админки
- ✅ Кнопка "Проверить обновления" с индикацией статуса
- ✅ Показ прогресса загрузки
- ✅ Кнопка установки обновления

### 4. Настроен electron-builder
- ✅ GitHub publish provider настроен в `package.json`
- ✅ NSIS installer для Windows
- ✅ Генерация `latest.yml` для автообновления

### 5. Создан GitHub Actions workflow
- ✅ `.github/workflows/release.yml` - автоматическая сборка и публикация
- ✅ Запуск при push tag `v*`
- ✅ Использование `GITHUB_TOKEN` из GitHub Secrets

## ⚠️ ВАЖНО: Требуется настройка

### 1. Настройка GitHub Repository

В файле `package.json` найдите секцию `build.publish` и замените placeholder на ваши данные:

```json
"publish": {
  "provider": "github",
  "owner": "YOUR_GITHUB_USERNAME",  // ← ЗАМЕНИТЕ НА ВАШ USERNAME
  "repo": "YOUR_REPO_NAME",         // ← ЗАМЕНИТЕ НА ИМЯ РЕПОЗИТОРИЯ
  "releaseType": "release"
}
```

**Пример:**
```json
"publish": {
  "provider": "github",
  "owner": "john-doe",
  "repo": "cms-admin",
  "releaseType": "release"
}
```

### 2. Инициализация Git Repository

Если Git repository еще не настроен:

```bash
git init
git add .
git commit -m "Initial commit with auto-update setup"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

### 3. Настройка GitHub Repository Permissions

GitHub Actions нужны права для создания releases:

1. Откройте ваш repository на GitHub
2. Перейдите в **Settings** → **Actions** → **General**
3. В секции **Workflow permissions** выберите:
   - ✅ **Read and write permissions**
4. Сохраните изменения

## 🚀 Как создать первый release

### Шаг 1: Обновите версию

Текущая версия: **0.1.0**

Для первого release используйте версию **0.1.1**:

```bash
npm version patch  # Увеличит версию до 0.1.1
```

Или вручную измените `version` в `package.json`:
```json
{
  "version": "0.1.1"
}
```

### Шаг 2: Создайте Git tag

```bash
git add .
git commit -m "Release v0.1.1: Add auto-update functionality"
git tag v0.1.1
git push origin main
git push origin v0.1.1
```

### Шаг 3: GitHub Actions автоматически

После push tag `v0.1.1`:

1. ✅ GitHub Actions запустит workflow
2. ✅ Соберет Next.js приложение
3. ✅ Соберет Windows NSIS installer
4. ✅ Создаст GitHub Release `v0.1.1`
5. ✅ Прикрепит `.exe` файл и `latest.yml`

## 📱 Как работает автообновление для пользователя

### Автоматическая проверка при запуске

При каждом запуске Desktop приложения (через 3 секунды после загрузки):

1. Приложение автоматически проверяет GitHub Releases
2. Если новая версия доступна:
   - Показывается уведомление: "Доступна новая версия v0.1.2"
   - Кнопки: **"Обновить"** или **"Позже"**

### Ручная проверка

В Header админки есть кнопка обновления (🔄 иконка):

1. Пользователь нажимает кнопку
2. Статусы:
   - **Проверка...** - идет проверка
   - **Обновлений нет** - текущая версия актуальна
   - **Доступно обновление vX.Y.Z** - есть новая версия
   - **Скачивание...** - показывает прогресс (%)
   - **Обновление готово** - готово к установке
   - **Ошибка проверки** - что-то пошло не так

### Процесс обновления

1. Пользователь нажимает **"Скачать"**
2. Обновление скачивается в фоне с показом прогресса
3. После загрузки показывается кнопка **"Установить и перезапустить"**
4. При нажатии:
   - Приложение закрывается
   - Обновление устанавливается автоматически
   - Приложение перезапускается
   - Пользователь получает новую версию

## 🔐 Безопасность

### ✅ Что безопасно

- GH_TOKEN используется только в GitHub Actions Secrets
- GH_TOKEN НЕ хранится в коде приложения
- GH_TOKEN НЕ попадает в packaged app
- Sandbox остается включенным
- contextIsolation остается включенным
- nodeIntegration остается выключенным
- Безопасный IPC мост через preload.cjs

### ⚠️ Важные ограничения

- Автообновление работает только в production build (packaged app)
- В dev режиме (`npm run desktop:dev`) обновления недоступны
- Обновления проверяются только для того же repository, который указан в конфигурации

## 📝 Следующие версии

### Создание новой версии

Для каждого нового release:

1. Обновите версию:
   ```bash
   npm version patch  # 0.1.1 → 0.1.2
   # или
   npm version minor  # 0.1.2 → 0.2.0
   # или
   npm version major  # 0.2.0 → 1.0.0
   ```

2. Commit и создайте tag:
   ```bash
   git add .
   git commit -m "Release v0.1.2: Bug fixes"
   git tag v0.1.2
   git push origin main
   git push origin v0.1.2
   ```

3. GitHub Actions автоматически создаст release

## 🧪 Тестирование автообновления

### Полный сценарий

1. **Установите старую версию**:
   - Соберите и установите версию 0.1.0
   - Запустите приложение

2. **Создайте новую версию**:
   - Обновите версию до 0.1.1
   - Создайте GitHub Release

3. **Проверьте обновление**:
   - Запустите установленную 0.1.0
   - Дождитесь автоматической проверки (3 сек)
   - Или нажмите кнопку проверки вручную
   - Должно показаться: "Доступна новая версия 0.1.1"

4. **Скачайте и установите**:
   - Нажмите "Скачать"
   - Дождитесь завершения загрузки
   - Нажмите "Установить и перезапустить"

5. **Проверьте версию**:
   - После перезапуска откройте DevTools
   - Выполните: `await window.electronAPI.getAppVersion()`
   - Должно вернуть: `"0.1.1"`

## 🛠️ Scripts

### Build Scripts

```bash
# Development
npm run desktop:dev

# Build локально (без публикации)
npm run desktop:dist:win

# Build и публикация в GitHub (требует GH_TOKEN)
npm run desktop:release:win
```

### Проверка версии

В DevTools консоли (в Desktop приложении):

```javascript
await window.electronAPI.getAppVersion()
// Вернет текущую версию, например: "0.1.0"
```

## 📊 Текущий статус

- ✅ **Версия приложения**: 0.1.0
- ⚠️ **GitHub Repository**: НЕ НАСТРОЕН (требуется замена placeholder)
- ✅ **electron-updater**: Установлен и настроен
- ✅ **UI компонент**: Создан и интегрирован
- ✅ **GitHub Actions**: Workflow создан
- ✅ **Безопасность**: Sandbox включен, IPC безопасен

## ⏭️ Следующие шаги

1. ⚠️ **ОБЯЗАТЕЛЬНО**: Замените `YOUR_GITHUB_USERNAME` и `YOUR_REPO_NAME` в `package.json`
2. Инициализируйте Git repository и push на GitHub
3. Настройте GitHub Actions permissions (Read and write)
4. Создайте первый release v0.1.1
5. Проверьте работу автообновления

## 🐛 Возможные проблемы

### "Updates are only available in production builds"

**Причина**: Пытаетесь проверить обновления в dev режиме

**Решение**: Соберите production build и установите его

### "Failed to check for updates"

**Причина**: GitHub repository не найден или неверный owner/repo

**Решение**: Проверьте настройки в `package.json` → `build.publish`

### Обновление не обнаруживается

**Причина**: 
- GitHub Release не создан
- `latest.yml` отсутствует в release
- Версия в release меньше или равна установленной

**Решение**: Убедитесь, что GitHub Release создан корректно с файлами `.exe` и `latest.yml`

## 📚 Дополнительная информация

- [electron-updater документация](https://www.electron.build/auto-update)
- [electron-builder publish документация](https://www.electron.build/configuration/publish)
- [GitHub Actions для Electron](https://www.electron.build/configuration/publish#github-options)
