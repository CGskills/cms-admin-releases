# 🔧 Инструкции по пересборке с исправлением "Cannot find module 'debug'"

## ⚠️ Проблема

После первого исправления появилась новая ошибка:
```
Error: Cannot find module 'debug'
Require stack:
- ...\resources\app.asar\node_modules\builder-util-runtime\out\httpExecutor.js
```

## ✅ Исправление применено

В `package.json` добавлены ещё 3 недостающие зависимости:
- `node_modules/debug/**/*` (зависимость builder-util-runtime)
- `node_modules/ms/**/*` (зависимость debug)
- `node_modules/sax/**/*` (зависимость builder-util-runtime)

**Итого теперь включено: 19 модулей** (было 16)

## 🔄 Как пересобрать

### Шаг 1: Закрыть запущенное приложение

**ВАЖНО**: Закройте все экземпляры `CMS Admin Panel.exe`, если они запущены!

Проверьте в Диспетчере задач:
- `CMS Admin Panel.exe`
- `electron.exe`

### Шаг 2: Удалить старую сборку

```bash
# Вариант 1: Через проводник Windows
# Удалите папку: C:\Users\fomin\Desktop\admin\release

# Вариант 2: Через командную строку
cd C:\Users\fomin\Desktop\admin
rmdir /s /q release
```

### Шаг 3: Пересобрать приложение

```bash
npm run desktop:dist:win
```

Процесс займёт 30-60 секунд.

### Шаг 4: Запустить и проверить

```bash
# Запустить unpacked версию
release\win-unpacked\CMS Admin Panel.exe
```

Приложение должно запуститься **без ошибок**:
- ❌ "Cannot find module 'universalify'" - исправлено
- ❌ "Cannot find module 'debug'" - исправлено

## 📦 Полный список включённых зависимостей

```json
"files": [
  "desktop/**/*",
  ".next/standalone/**/*",
  "!node_modules/**/*",
  
  // Прямые зависимости
  "node_modules/electron-updater/**/*",
  "node_modules/fs-extra/**/*",
  
  // Зависимости fs-extra
  "node_modules/universalify/**/*",
  "node_modules/graceful-fs/**/*",
  "node_modules/jsonfile/**/*",
  
  // Зависимости electron-updater
  "node_modules/js-yaml/**/*",
  "node_modules/lazy-val/**/*",
  "node_modules/lodash.escaperegexp/**/*",
  "node_modules/lodash.isequal/**/*",
  "node_modules/semver/**/*",
  "node_modules/tiny-typed-emitter/**/*",
  "node_modules/builder-util-runtime/**/*",
  
  // Зависимости js-yaml
  "node_modules/argparse/**/*",
  
  // Зависимости builder-util-runtime
  "node_modules/debug/**/*",
  "node_modules/sax/**/*",
  
  // Зависимости debug
  "node_modules/ms/**/*"
]
```

## 🔍 Что изменилось

### package.json
```diff
  "node_modules/builder-util-runtime/**/*",
  "node_modules/argparse/**/*",
+ "node_modules/debug/**/*",
+ "node_modules/ms/**/*",
+ "node_modules/sax/**/*"
```

## 🧪 Тестирование

После успешной сборки:

1. **Запуск приложения**:
   ```bash
   release\win-unpacked\CMS Admin Panel.exe
   ```
   ✅ Должно запуститься без ошибок

2. **Проверка auto-update**:
   - Откройте DevTools (если есть доступ)
   - Проверьте консоль на наличие ошибок electron-updater
   - Убедитесь, что updater инициализировался

3. **NSIS Installer**:
   ```bash
   release\CMS-Admin-0.1.8-win-x64.exe
   ```
   Установить и запустить

## ❓ Если появятся ещё ошибки "Cannot find module"

Это значит, что есть ещё транзитивные зависимости, которые не включены.

### Как найти недостающий модуль:

1. Ошибка покажет путь:
   ```
   Error: Cannot find module 'MISSING_MODULE'
   Require stack:
   - ...\node_modules\PARENT_MODULE\...
   ```

2. Проверить в `node_modules/PARENT_MODULE/package.json`:
   ```json
   "dependencies": {
     "MISSING_MODULE": "^1.0.0"
   }
   ```

3. Добавить в `package.json` → `build.files`:
   ```json
   "node_modules/MISSING_MODULE/**/*"
   ```

4. Пересобрать

## 📝 Альтернативное решение (не рекомендуется)

Вместо whitelist подхода можно использовать blacklist:

```json
"files": [
  "desktop/**/*",
  ".next/standalone/**/*",
  "node_modules/**/*",
  "!node_modules/@codemirror/**/*",
  "!node_modules/@dnd-kit/**/*",
  "!node_modules/@supabase/**/*",
  "!node_modules/next/**/*",
  "!node_modules/react/**/*",
  "!node_modules/react-dom/**/*"
]
```

⚠️ **Риск**: Может включить ненужные модули и увеличить размер приложения.

---

**Статус**: Исправление готово, требуется пересборка после закрытия приложения.
