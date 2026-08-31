# 🎯 ЧТО НУЖНО СДЕЛАТЬ В GITHUB ВРУЧНУЮ

## Шаг 1: Создать Fine-Grained Personal Access Token

### 1.1 Открыть страницу создания токена

Перейти по ссылке:
```
https://github.com/settings/tokens?type=beta
```

Или:
1. Нажать на аватар в правом верхнем углу GitHub
2. Settings
3. Developer settings (в левом меню внизу)
4. Personal access tokens → Fine-grained tokens
5. Нажать кнопку "Generate new token"

### 1.2 Заполнить форму создания токена

**Token name:**
```
CMS_ADMIN_RELEASE_TOKEN
```

**Description:**
```
Publish Windows releases to cms-admin-releases repository
```

**Expiration:**
- Выбрать: Custom
- Указать: 365 days (1 год)

**Resource owner:**
- Выбрать: CGskills

**Repository access:**
- Выбрать: **Only select repositories** (НЕ "All repositories")
- В выпадающем списке найти и выбрать: `cms-admin-releases`

**Repository permissions:**

Найти раздел "Repository permissions" и установить:

| Permission | Access | Обязательно |
|------------|--------|-------------|
| **Contents** | **Read and write** | ✅ ДА |
| Metadata | Read-only | ✅ Автоматически |

**ВСЕ ОСТАЛЬНЫЕ PERMISSIONS ДОЛЖНЫ БЫТЬ "No access"**

### 1.3 Создать токен

1. Прокрутить вниз
2. Нажать кнопку: **"Generate token"**
3. **ВАЖНО**: Скопировать токен НЕМЕДЛЕННО

Токен выглядит примерно так:
```
github_pat_11XXXXXXXXXX_YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY
```

**⚠️ ТОКЕН ПОКАЗЫВАЕТСЯ ТОЛЬКО ОДИН РАЗ!**

Если не скопировали - придется создавать заново.

---

## Шаг 2: Добавить токен в Repository Secrets

### 2.1 Открыть настройки репозитория cms-admin

Перейти по ссылке:
```
https://github.com/CGskills/cms-admin/settings/secrets/actions
```

Или:
1. Открыть https://github.com/CGskills/cms-admin
2. Settings (вкладка)
3. Secrets and variables (в левом меню)
4. Actions
5. Нажать кнопку "New repository secret"

### 2.2 Создать Secret

**Name:**
```
RELEASE_TOKEN
```

**Value:**
```
<вставить скопированный токен>
```

Например:
```
github_pat_11XXXXXXXXXX_YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY
```

**⚠️ ПРОВЕРИТЬ**: 
- Нет пробелов в начале/конце
- Токен начинается с `github_pat_`
- Длина примерно 82-93 символа

### 2.3 Сохранить Secret

Нажать кнопку: **"Add secret"**

### 2.4 Проверить

После сохранения вы должны увидеть в списке:

```
Secrets:
- ADMIN_EMAILS (updated ... ago)
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (updated ... ago)
- NEXT_PUBLIC_SUPABASE_URL (updated ... ago)
- RELEASE_TOKEN (updated now) ✅ НОВЫЙ
```

---

## ✅ Проверка перед продолжением

После создания токена и добавления в Secrets, убедитесь:

- [ ] Токен создан в https://github.com/settings/tokens?type=beta
- [ ] Токен имеет название: `CMS_ADMIN_RELEASE_TOKEN`
- [ ] Токен имеет доступ к: `CGskills/cms-admin-releases`
- [ ] Токен имеет права: Contents: Read and write
- [ ] Токен добавлен в Secrets репозитория `cms-admin`
- [ ] Название Secret: `RELEASE_TOKEN` (без опечаток)

---

## 🔐 Безопасность токена

### ✅ ЧТО ПРАВИЛЬНО:

- Токен имеет минимальные права (только cms-admin-releases)
- Токен ограничен одним репозиторием
- Токен хранится в зашифрованном виде в Secrets
- Токен НЕ виден в логах GitHub Actions (маскируется автоматически)
- Токен можно отозвать в любой момент

### ❌ НИКОГДА НЕ:

- НЕ коммитить токен в git
- НЕ публиковать токен в Issues/Pull Requests
- НЕ отправлять токен по email/chat
- НЕ сохранять токен в незашифрованном виде
- НЕ использовать один токен для разных целей

### 🔄 Если токен скомпрометирован:

1. Перейти: https://github.com/settings/tokens?type=beta
2. Найти: CMS_ADMIN_RELEASE_TOKEN
3. Нажать: Revoke
4. Создать новый токен (повторить Шаг 1)
5. Обновить Secret (повторить Шаг 2)

---

## 📝 Что дальше?

После того как вы:
1. ✅ Создали RELEASE_TOKEN
2. ✅ Добавили его в Secrets репозитория cms-admin
3. ✅ Проверили, что все правильно

**Напишите мне**: "Токен создан и добавлен в Secrets"

Я внесу необходимые изменения в код (3 файла) и подготовлю к тестированию.

---

## 🆘 Если возникли проблемы

### Проблема: "You don't have permission to create tokens"

**Решение**: Вам нужны права администратора в организации CGskills.

### Проблема: "Repository not found in list"

**Решение**: 
1. Проверить, что репозиторий cms-admin-releases создан
2. Проверить, что у вас есть доступ к этому репозиторию
3. Обновить страницу и попробовать снова

### Проблема: "Secret already exists"

**Решение**: 
1. Это значит, что Secret RELEASE_TOKEN уже создан
2. Можно обновить его: нажать на RELEASE_TOKEN → Update secret
3. Вставить новый токен

### Проблема: "Token doesn't work in GitHub Actions"

**Решение**:
1. Проверить название Secret: должно быть ровно `RELEASE_TOKEN`
2. Проверить, что токен скопирован полностью
3. Проверить, что токен имеет права "Contents: Read and write"
4. Пересоздать токен и Secret

---

## 🎯 Итоговый чеклист

Перед тем как сообщить мне "Готово":

- [ ] Токен создан
- [ ] Токен имеет правильные permissions
- [ ] Токен имеет доступ к cms-admin-releases
- [ ] Токен скопирован
- [ ] Secret RELEASE_TOKEN создан в cms-admin
- [ ] Secret содержит правильный токен
- [ ] Нет опечаток в названии Secret
- [ ] Токен нигде не опубликован
- [ ] Готов к внесению изменений в код

**СТАТУС**: Ожидаю подтверждения создания токена
