# 🔍 АНАЛИЗ ПРОБЛЕМЫ: Релиз создаётся в cms-admin вместо cms-admin-releases

## ❌ ТЕКУЩАЯ СИТУАЦИЯ

### Что происходит:
1. ✅ GitHub Actions workflow завершился успешно
2. ✅ Electron-builder собрал `.exe` файл
3. ❌ Релиз создаётся в **cms-admin** (private), а не в **cms-admin-releases** (public)
4. ❌ Релизы остаются в статусе **Draft** (черновик)

### Логи показывают:
```
• publishing      publisher=Github (owner: CGskills, project: cms-admin, version: 0.2.4)
• overwrite published file  file=CMS-Admin-0.2.4-win-x64.exe.blockmap reason=already exists on GitHub
```

**Проблема:** electron-builder видит `"repo": "cms-admin-releases"` в package.json, но публикует в `cms-admin`.

---

## 🔍 ПРИЧИНА

### Почему это происходит:

electron-builder по умолчанию публикует в **репозиторий, из которого идёт сборка**.

**Текущий процесс:**
```
GitHub Actions в cms-admin
├─ Checkout code из cms-admin
├─ npm run build
├─ electron-builder --publish always
└─ electron-builder смотрит:
   ├─ git remote origin → cms-admin
   └─ Публикует в cms-admin (игнорирует package.json)
```

---

## ✅ РЕШЕНИЕ

### Вариант 1: Использовать GH_REPOSITORY для публикации в другой репозиторий

**НЕ РАБОТАЕТ** с GitHub provider - electron-builder не поддерживает публикацию в другой репозиторий через GH_TOKEN напрямую.

### Вариант 2: Опубликовать релиз вручную с помощью gh CLI ✅

После сборки использовать `gh release create` для публикации в cms-admin-releases.

---

## 📝 ПРАВИЛЬНЫЙ РАБОЧИЙ ПРОЦЕСС

### Обновлённый .github/workflows/release.yml:

```yaml
- name: Build Electron app (without publish)
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY }}
    ADMIN_EMAILS: ${{ secrets.ADMIN_EMAILS }}
  run: npm run desktop:dist:win

- name: Create release in cms-admin-releases
  env:
    GH_TOKEN: ${{ secrets.RELEASE_TOKEN }}
  run: |
    gh release create ${{ github.ref_name }} \
      --repo CGskills/cms-admin-releases \
      --title "CMS Admin ${{ github.ref_name }}" \
      --notes "Auto-update release for CMS Admin desktop application" \
      release/*.exe \
      release/*.blockmap \
      release/latest.yml
```

**Изменения:**
1. Убрать `--publish always` из electron-builder
2. Собрать файлы локально в `release/`
3. Использовать `gh release create` с `--repo cms-admin-releases`
4. Использовать `RELEASE_TOKEN` для доступа к другому репозиторию

---

## 🎯 ЧТО НУЖНО СДЕЛАТЬ

1. Обновить `.github/workflows/release.yml`
2. Удалить старый tag v0.2.4
3. Создать новый tag v0.2.4
4. Проверить, что релиз создаётся в cms-admin-releases

---

## 📊 ПРОВЕРКА

После исправления должно быть:

```bash
# cms-admin (private) - исходный код
gh release list --repo CGskills/cms-admin
# → Пусто или старые релизы

# cms-admin-releases (public) - бинарные релизы
gh release list --repo CGskills/cms-admin-releases
# → v0.2.4 с CMS-Admin-0.2.4-win-x64.exe, latest.yml
```

---

**СТАТУС:** Проблема идентифицирована, решение готово к применению
