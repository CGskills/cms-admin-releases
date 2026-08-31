# Проверка системы CMS Admin

## 1. ✅ Supabase Connection
- **URL**: https://pjujhrfkykxgzcexyyti.supabase.co
- **Status**: Connected
- **Buckets**: portfolio, employees, services, avatars, logos, interior-photos, testimonials, video

## 2. ✅ Employees (Сотрудники)
- **Table**: employees ✅
- **Records**: 3 сотрудника найдены
- **Photos**: Все имеют фото в bucket `employees/avatars/`
  - Екатерина Плескачева: avatars/d8a56d14-f806-4c22-9c1d-54e31244efaa/1786962168797-witpp.jpeg
  - Светлана Киселева: avatars/e8406279-b052-41b5-bd82-b6cf7f94081b/1786962098225-76ou0m.jpeg
  - Михаил Киселев: avatars/470b75b2-87ce-4119-a199-9e754c4a3365/1786962153246-wywtkb.jpeg

### Photo URLs
Photos are displayed using: `https://pjujhrfkykxgzcexyyti.supabase.co/storage/v1/object/public/employees/{path}`

## 3. ✅ Code Library
- **Table**: code_blocks ✅
- **Records**: 4 блока кода
  1. Сотрудники — Карусель (team) - ready
  2. Портфолио — До/После (before_after) - ready
  3. Отзывы — Карусель с QR (reviews) - ready
  4. Прайс-лист — Таблица (custom_ui) - ready

### Features
- ✅ Create/Edit/Delete code blocks
- ✅ Copy code to clipboard with namespace wrapping
- ✅ Import from preview
- ✅ Delete all blocks
- ✅ Duplicate blocks
- ✅ Filter by category
- ✅ Search by name/description

## 4. Portfolio
- **Bucket**: portfolio ✅
- **Files**: 3 images + projects folder

## 5. Известные проблемы

### Issue 1: Server Components Error при загрузке фото
**Симптом**: "An error occurred in the Server Components render..."
**Возможные причины**:
1. RLS policies могут блокировать доступ
2. Неправильный MIME type при загрузке
3. Проблема с валидацией изображения

### Issue 2: Code Library - Import/Export
**Требования**:
- Импорт должен работать корректно
- Код должен содержать namespace wrapping
- При изменении кода должна быть возможность удалить и импортировать заново

## Следующие шаги

1. ✅ Проверить RLS policies для storage buckets
2. ✅ Добавить более детальное логирование ошибок загрузки
3. ✅ Проверить MIME type validation
4. ✅ Тестировать импорт/экспорт Code Library
