# Portfolio Builder - Complete Guide

## ✅ Что реализовано

### 1. **Database Schema** (portfolio_items table)

**Таблица:** `portfolio_items`

**Поля:**
- ✅ `title`, `slug`, `subtitle`, `description`
- ✅ `category`, `technologies[]`, `client`, `project_date`, `project_url`
- ✅ `image_url` - главное изображение
- ✅ `before_image`, `after_image` - для слайдера до/после
- ✅ `gallery[]` - массив дополнительных изображений
- ✅ `col_span` (4-12) - ширина в grid
- ✅ `tile_height` (200-560px) - высота плитки
- ✅ `cover_x`, `cover_y`, `cover_zoom` - позиционирование изображения
- ✅ `order_index` - порядок отображения
- ✅ `visible` - видимость на сайте
- ✅ `created_at`, `updated_at`

### 2. **Supabase Storage**

**Buckets:**
- ✅ `portfolio` - для изображений проектов
- ✅ `employees`, `services`, `avatars`, `logos` - дополнительные

**Policies:**
- ✅ Authenticated users - upload/delete
- ✅ Public users - read

### 3. **TypeScript Types**

**Файлы:**
- ✅ `types/database.types.ts` - типы БД
- ✅ `types/portfolio.ts` - специфичные типы Portfolio
- ✅ `GRID_SIZES` - предустановленные размеры

### 4. **Storage Utilities**

**Файл:** `lib/storage/upload.ts`

**Функции:**
- ✅ `uploadFile()` - загрузка файла
- ✅ `deleteFile()` - удаление файла
- ✅ `uploadMultipleFiles()` - множественная загрузка
- ✅ `validateImageFile()` - валидация
- ✅ `extractPathFromUrl()` - извлечение пути

### 5. **Admin Components**

**Portfolio Grid Builder** (`_components/PortfolioGridBuilder.tsx`)
- ✅ Drag & Drop для reorder
- ✅ Visual grid layout (12-column)
- ✅ Auto-save при изменении порядка
- ✅ Real-time feedback

**Portfolio Tile** (`_components/PortfolioTile.tsx`)
- ✅ Image preview с zoom/position
- ✅ Category badge
- ✅ Technologies tags
- ✅ Edit/Delete actions
- ✅ Visibility indicator
- ✅ Grid size indicator
- ✅ Drag handle

**Portfolio Form** (`_components/PortfolioForm.tsx`)
- ✅ Все поля проекта
- ✅ Image upload интеграция
- ✅ Grid size селекторы
- ✅ Image positioning (edit mode)
- ✅ Visibility toggle
- ✅ Before/After images

**Image Uploader** (`_components/ImageUploader.tsx`)
- ✅ File upload в Supabase Storage
- ✅ URL input (альтернатива)
- ✅ Image preview
- ✅ Progress indicator
- ✅ Validation
- ✅ Remove функция

### 6. **Server Actions**

**Файл:** `actions.ts`

- ✅ `createPortfolio()` - создание проекта
- ✅ `updatePortfolio()` - обновление
- ✅ `deletePortfolio()` - удаление
- ✅ `updatePortfolioOrder()` - изменение порядка
- ✅ Auto-slugify
- ✅ Auto-increment order_index

### 7. **Pages**

- ✅ `/admin/portfolio` - Grid Builder view
- ✅ `/admin/portfolio/new` - Создание
- ✅ `/admin/portfolio/[id]` - Редактирование

## 🎨 Как работает Grid Builder

### Column Span System

12-column grid:
- **4 columns** = Small (1/3 ширины)
- **6 columns** = Medium (1/2 ширины)
- **8 columns** = Wide (2/3 ширины)
- **12 columns** = Full Width

### Tile Heights

- **200px** = Short
- **280px** = Standard (default)
- **360px** = Tall
- **560px** = Extra Tall (2x)

### Комбинации размеров

```
Small (1x1):    col_span=4,  height=280
Medium (2x1):   col_span=6,  height=280
Large (2x2):    col_span=6,  height=560
Wide (3x1):     col_span=8,  height=280
Extra Wide:     col_span=12, height=280
Extra Large:    col_span=12, height=560
```

## 🚀 Использование

### 1. Создание проекта

```
1. Перейти в /admin/portfolio
2. Нажать "Add Project"
3. Заполнить:
   - Title (обязательно)
   - Subtitle, Description
   - Category, Client, Date
   - Technologies (через запятую)
   - Main Image (обязательно)
   - Before/After (опционально)
   - Grid size
4. Нажать "Create Project"
```

### 2. Drag & Drop Reorder

```
1. В Grid Builder view
2. Схватить плитку (cursor: move)
3. Перетащить на новое место
4. Отпустить - автосохранение
```

### 3. Изменение размера

```
1. Открыть проект на редактирование
2. Изменить "Column Span" или "Tile Height"
3. Сохранить
4. Grid автоматически перестроится
```

### 4. Image Positioning

Только в edit mode:
- **Horizontal Position** (0-100%) - горизонтальная позиция
- **Vertical Position** (0-100%) - вертикальная позиция
- **Zoom** (1-2.5) - зум изображения

Для fine-tuning как изображение обрезается в плитке.

### 5. Before/After Images

```
1. Загрузить Before Image
2. Загрузить After Image
3. Оба присутствуют → на сайте будет слайдер
4. Только одно → обычный вид
```

## 📊 Database Setup

### Выполнить SQL

Схема уже в файле `supabase/schema.sql`. Выполнить:

```sql
-- Таблица portfolio_items уже создана
-- Storage buckets уже созданы
-- RLS policies уже установлены
```

Если нужно обновить существующую таблицу `portfolio`:

```sql
-- Удалить старую таблицу (ОСТОРОЖНО!)
DROP TABLE IF EXISTS portfolio CASCADE;

-- Выполнить из schema.sql секцию portfolio_items
```

## 🔗 Frontend Integration (для сайта)

### Получение проектов

```typescript
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// Все видимые проекты
const { data: projects } = await supabase
  .from('portfolio_items')
  .select('*')
  .eq('visible', true)
  .order('order_index', { ascending: true });

// По категории
const { data: webProjects } = await supabase
  .from('portfolio_items')
  .select('*')
  .eq('visible', true)
  .eq('category', 'Web Development')
  .order('order_index', { ascending: true });
```

### Grid Layout на сайте

```tsx
// components/portfolio/PortfolioGrid.tsx
export function PortfolioGrid({ projects }) {
  return (
    <div className="grid grid-cols-12 gap-4 auto-rows-auto">
      {projects.map((project) => (
        <div
          key={project.id}
          className={`col-span-12 md:col-span-${project.col_span}`}
          style={{
            gridColumn: `span ${project.col_span}`,
          }}
        >
          <PortfolioCard
            project={project}
            height={project.tile_height}
          />
        </div>
      ))}
    </div>
  );
}
```

### Before/After Slider

```tsx
// components/portfolio/BeforeAfterSlider.tsx
export function BeforeAfterSlider({ before, after }) {
  const [position, setPosition] = useState(50);

  return (
    <div className="relative">
      <img src={after} className="w-full" />
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${position}%` }}
      >
        <img src={before} className="w-full" />
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={position}
        onChange={(e) => setPosition(Number(e.target.value))}
        className="absolute bottom-4 left-1/2 transform -translate-x-1/2"
      />
    </div>
  );
}
```

## ⚙️ Настройки и оптимизация

### Image Optimization

Рекомендуется использовать:
- WebP формат
- Оптимизированные размеры
- Lazy loading
- CDN (Supabase CDN автоматически)

### Responsive Grid

На мобильных:
```css
@media (max-width: 768px) {
  .col-span-* {
    grid-column: span 12 !important;
  }
}
```

Все плитки становятся full-width.

### Performance

- ✅ Images загружаются через Supabase CDN
- ✅ Lazy loading на сайте
- ✅ Оптимизированные запросы (only visible)
- ✅ Index на `order_index`, `visible`

## 🐛 Troubleshooting

### Drag & Drop не работает

**Проблема:** Плитки не двигаются

**Решение:**
1. Проверить `draggable` attribute
2. Убедиться что `cursor: move` есть
3. Проверить console на ошибки

### Images не загружаются

**Проблема:** Upload fails

**Решение:**
1. Проверить Storage bucket создан
2. Проверить RLS policies
3. Проверить размер файла (<10MB)
4. Проверить формат (image/*)

### Grid не перестраивается

**Проблема:** Изменение col_span не применяется

**Решение:**
1. Проверить Tailwind CSS purge
2. Использовать inline styles для dynamic values
3. Перезагрузить страницу

### Order не сохраняется

**Проблема:** После drag-drop порядок сбрасывается

**Решение:**
1. Проверить `updatePortfolioOrder` action
2. Проверить network tab - должен быть запрос
3. Проверить permissions в Supabase

## 📝 TODO / Future Enhancements

### Не реализовано (можно добавить):

1. **Gallery Management**
   - Multiple image upload
   - Gallery editor
   - Image reordering

2. **Advanced Image Editor**
   - Crop tool
   - Filters
   - Resize

3. **Categories Management**
   - Dynamic categories
   - Category CRUD
   - Color coding

4. **Batch Operations**
   - Bulk delete
   - Bulk visibility toggle
   - Bulk category change

5. **Preview Mode**
   - Live preview before publish
   - Mobile preview
   - Different layouts

6. **Analytics**
   - View counts
   - Click tracking
   - Popular projects

## ✨ Итог

Portfolio Builder готов к использованию!

**Функционал:**
- ✅ Visual Drag & Drop Grid Builder
- ✅ Dynamic tile sizes (col_span + height)
- ✅ Image upload в Supabase Storage
- ✅ Before/After support
- ✅ Image positioning controls
- ✅ Full CRUD
- ✅ Auto-save order
- ✅ Visibility toggle
- ✅ Mobile responsive
- ✅ TypeScript full coverage

**Можно использовать:**
- Создавать проекты
- Менять размеры плиток
- Перетаскивать для reorder
- Загружать изображения
- Настраивать positioning
- Интегрировать на сайт

🎉 **Portfolio Builder готов!**
