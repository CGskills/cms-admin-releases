# Desktop-сборка CMS Admin

CMS Admin упаковывается как Electron-приложение. В установщик попадает
production-сервер Next.js (`.next/standalone/server.js`) и runtime Electron,
поэтому пользователю не нужно отдельно устанавливать Node.js или npm.

## Локальная проверка

На машине сборки нужен Node.js 22.12+ (требование Electron 44) и зависимости проекта:

```bash
npm ci
npm run desktop:dev
```

`desktop:dev` собирает Next.js, подготавливает standalone-папку и открывает
окно Electron. Для обычной веб-разработки по-прежнему используется
`npm run dev`.

## Установщики

```bash
# Текущая ОС (electron-builder выберет её целевой формат)
npm run desktop:dist

# Windows x64 (NSIS .exe)
npm run desktop:dist:win

# macOS (DMG и ZIP; x64 + arm64)
npm run desktop:dist:mac
```

Артефакты появляются в `release/`. Подписывание Windows Code Signing и
macOS Developer ID/notarization подключаются стандартными переменными
`CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD` и
`APPLE_TEAM_ID` в CI. Для распространения на macOS без предупреждений Gatekeeper
подпись и notarization обязательны.

macOS-артефакты собирайте на macOS (или на macOS runner в CI), чтобы
standalone bundle содержал нативные зависимости нужной платформы. Windows
сборка в текущей конфигурации выпускает установщик x64.

## Переменные окружения и первый запуск

`desktop:prepare` читает `.env`, `.env.production`, `.env.local`,
`.env.production.local` (последний имеет приоритет) и переменные процесса.
В standalone bundle записываются только
необходимые ключи:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `ADMIN_EMAILS`
- необязательно `APP_ORIGIN`, `ENABLE_ADMIN_DIAGNOSTICS`

`.env.local` не включается в репозиторий и не копируется в установщик. Для
релизной сборки значения должны быть переданы в защищённом CI-секрете или
локальном `.env.local`; `desktop/prepare-standalone.mjs` завершится с понятной
ошибкой, если обязательный ключ отсутствует.

Пользовательский override можно положить в файл `config.json` внутри каталога
данных приложения (Electron `app.getPath('userData')`). Пример находится в
`desktop/config.example.json`. Это удобно, если один и тот же установщик
разворачивается для разных Supabase-проектов. Значения `NEXT_PUBLIC_*` также
вшиваются Next.js в браузерный bundle во время `next build`, поэтому при смене
Supabase-проекта следует пересобрать установщик.

В desktop-режиме сервер слушает только `127.0.0.1` на свободном локальном
порту. `APP_ORIGIN` автоматически нормализуется к этому origin, чтобы защита
Server Actions не отклоняла действия из окна Electron. Данные и авторизация
по-прежнему работают через Supabase и требуют сетевого доступа; desktop-пакет
устраняет зависимость от установленного Node.js, но не превращает облачную БД
в локальную офлайн-БД.

## Что попадает в bundle

Скрипт подготовки копирует в `.next/standalone` `public/`, `.next/static/` и
`preview/`. Последняя папка нужна существующим API-обработчикам импорта
code-blocks, которые читают файлы относительно `process.cwd()`. Standalone
сервер распаковывается electron-builder в `app.asar.unpacked`, потому что
сгенерированный Next.js `server.js` меняет рабочий каталог при запуске.
