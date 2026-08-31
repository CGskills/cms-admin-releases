# Инструкция по исправлению автообновления

## 🔴 КРИТИЧЕСКИЕ ПРОБЛЕМЫ

### Проблема 1: Приватный репозиторий
**Статус**: Автообновление не работает из-за 404 ошибок при доступе к файлам релизов

### Проблема 2: Отсутствие blockmap файла
**Статус**: В релизе v0.2.3 нет файла для дельта-обновлений

### Проблема 3: Отсутствие electron-log
**Статус**: Нет логирования в файлы, сложно диагностировать проблемы

---

## ✅ БЫСТРОЕ ИСПРАВЛЕНИЕ (30 минут)

### Шаг 1: Добавить electron-log
```bash
npm install --save electron-log
```

### Шаг 2: Временно отключить автопроверку
Открыть `desktop/main.cjs` и изменить строки 436-448:

**Было**:
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

**Стало**:
```javascript
// Автопроверка отключена до настройки доступа к приватному репозиторию
// Пользователи могут проверять обновления вручную через кнопку в UI
console.log('[Main] Auto-update check disabled - manual check available in UI');
```

### Шаг 3: Пересобрать и опубликовать
```bash
git add package.json desktop/main.cjs
git commit -m "Fix: Add electron-log and disable auto-check until proper auth setup"
git tag v0.2.4
git push origin main v0.2.4
```

**Результат**: Пользователи больше не видят ошибку при запуске

---

## 🎯 ПРАВИЛЬНОЕ РЕШЕНИЕ (2-4 часа)

### Вариант А: Generic Provider с GitHub Pages (РЕКОМЕНДУЕТСЯ)

#### 1. Создать ветку gh-pages для релизов
```bash
git checkout --orphan gh-pages
git rm -rf .
echo "# CMS Admin Updates" > README.md
git add README.md
git commit -m "Initialize gh-pages"
git push origin gh-pages
```

#### 2. Включить GitHub Pages в настройках репозитория
- Зайти в Settings → Pages
- Source: Deploy from branch
- Branch: gh-pages / (root)
- Сохранить

#### 3. Обновить package.json
```json
"publish": {
  "provider": "generic",
  "url": "https://cgskills.github.io/cms-admin/updates"
}
```

#### 4. Создать GitHub Action для публикации релизов
Создать `.github/workflows/publish-updates.yml`:
```yaml
name: Publish Updates to GitHub Pages

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    
    steps:
      - name: Checkout gh-pages
        uses: actions/checkout@v4
        with:
          ref: gh-pages
          path: gh-pages
      
      - name: Download release assets
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          mkdir -p gh-pages/updates
          cd gh-pages/updates
          gh release download ${{ github.event.release.tag_name }} \
            --repo ${{ github.repository }} \
            --pattern "*.exe" \
            --pattern "*.blockmap" \
            --pattern "latest.yml"
      
      - name: Commit and push
        working-directory: gh-pages
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add updates/
          git commit -m "Publish ${{ github.event.release.tag_name }}"
          git push
```

#### 5. Пересобрать и протестировать
```bash
npm run desktop:release:win
```

---

### Вариант Б: Публичный репозиторий только для релизов

#### 1. Создать новый публичный репозиторий
```
Название: cms-admin-releases
Описание: Public releases for CMS Admin Panel auto-update
Visibility: Public
```

#### 2. Обновить package.json
```json
"publish": {
  "provider": "github",
  "owner": "CGskills",
  "repo": "cms-admin-releases",
  "releaseType": "release"
}
```

#### 3. Настроить GitHub Action для кросс-репозиторной публикации
Обновить `.github/workflows/release.yml`:
```yaml
- name: Build and publish to public repo
  env:
    GH_TOKEN: ${{ secrets.PUBLIC_REPO_TOKEN }}
  run: |
    npm run desktop:dist:win -- --publish always
```

Потребуется Personal Access Token с правами на публичный репозиторий.

---

### Вариант В: Сделать репозиторий публичным

**Самое простое решение** - если нет требований к конфиденциальности кода:

1. Settings → General → Danger Zone
2. Change repository visibility → Make public
3. Confirm

**Автообновление заработает немедленно без дополнительных изменений.**

---

## 🧪 ТЕСТИРОВАНИЕ

### После применения исправлений:

1. **Установить текущую версию**:
```bash
# Из папки release/
CMSAdminPanel-Setup-0.2.4.exe
```

2. **Опубликовать тестовую версию 0.2.5**:
```bash
# Изменить версию в package.json на 0.2.5
npm run desktop:release:win
```

3. **Проверить автообновление**:
- Запустить приложение версии 0.2.4
- Нажать кнопку проверки обновлений
- Должно появиться уведомление о версии 0.2.5
- Скачать обновление
- Установить и перезапустить
- Проверить, что установлена версия 0.2.5

4. **Проверить логи**:
```
%APPDATA%\CMSAdminPanel\logs\main.log
%APPDATA%\CMSAdminPanel\logs\next-server.log
```

---

## 📋 ЧЕКЛИСТ

- [ ] Добавлен electron-log в dependencies
- [ ] Отключена автопроверка при запуске
- [ ] Выбран способ публикации (A/B/C)
- [ ] Настроена публикация релизов
- [ ] Пересобрана версия 0.2.4
- [ ] Протестировано обновление с 0.2.4 на 0.2.5
- [ ] Проверены логи автообновления
- [ ] Включена обратно автопроверка (опционально)
- [ ] Документация обновлена

---

## 🆘 ЕСЛИ ЧТО-ТО ПОШЛО НЕ ТАК

### Ошибка: "Cannot find module 'electron-log'"
```bash
npm install --save electron-log
npm run desktop:prepare
npm run desktop:dist:win
```

### Ошибка: 404 Not Found при проверке обновлений
- Проверить, что релиз опубликован (не draft)
- Проверить URL в publish config
- Проверить доступность файлов через браузер

### Blockmap файл не загружается
Проверить в логах GitHub Actions:
```bash
gh run view <run-id> --log | grep blockmap
```

Если файл создан но не загружен - проблема с GitHub API или правами.

---

## 📞 ДОПОЛНИТЕЛЬНАЯ ПОМОЩЬ

Логи для диагностики:
- **Приложение**: `%APPDATA%\CMSAdminPanel\logs\`
- **GitHub Actions**: `gh run list --workflow=release.yml`
- **Консоль разработчика**: Ctrl+Shift+I в приложении

Полезные команды:
```bash
# Проверить релизы
gh release list

# Посмотреть детали релиза
gh release view v0.2.4

# Проверить статус GitHub Pages
gh api repos/CGskills/cms-admin/pages
```
