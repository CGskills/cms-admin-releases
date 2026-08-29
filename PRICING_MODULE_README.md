# Pricing Module Documentation

## Обзор

Полнофункциональный модуль управления прайс-листом с:
- ✅ Динамическими колонками (8 типов полей)
- ✅ Drag & Drop через @dnd-kit
- ✅ Live Preview с Montserrat шрифтом
- ✅ Редактируемыми названиями
- ✅ Публичным компонентом для сайта
- ✅ Responsive дизайном (Desktop таблица / Mobile карточки)
- ✅ RLS policies для безопасности

## Установка и Миграция

### 1. Применить SQL миграции

Перейдите в Supabase Dashboard → SQL Editor и выполните:

```sql
-- Файл: supabase/migrations/20260814000000_pricing_dynamic_columns.sql
-- Добавляет custom_fields JSONB колонку и индексы

-- Файл: supabase/migrations/20260814000001_pricing_rls_policies.sql
-- Настраивает Row Level Security
```

Подробные инструкции в `supabase/MIGRATION_README.md`

### 2. Проверить структуру БД

После миграции таблица `pricing` должна содержать:
- `custom_fields` (jsonb) - для хранения значений динамических колонок
- Индекс на `custom_fields` для быстрых запросов

Таблица `settings` должна содержать:
- `pricing_settings` (jsonb) - конфигурация колонок и labels

## Использование в CMS Admin

### Доступ к модулю

Перейдите в админ-панели: `/admin/pricing`

### Основные функции

#### 1. Добавление услуги
- Нажмите кнопку с текстом из `labels.addButtonText`
- Заполните форму
- Услуга автоматически добавится в таблицу

#### 2. Управление колонками
- Нажмите кнопку **"Колонки"**
- Перетаскивайте колонки для изменения порядка
- Редактируйте название, тип, ширину
- Добавляйте/удаляйте колонки
- Скрывайте/показывайте колонки

**Поддерживаемые типы полей:**
- `text` - однострочный текст
- `textarea` - многострочный текст
- `price` - цена (форматируется с валютой)
- `number` - число
- `duration` - срок выполнения
- `badge` - бейдж с цветом акцента
- `boolean` - да/нет
- `link` - ссылка

#### 3. Редактирование названий
- Нажмите кнопку **"Названия"**
- Измените:
  - Название прайс-листа (отображается в админке)
  - Заголовок таблицы (для публичного сайта)
  - Подзаголовок
  - Текст кнопки добавления
  - Название поля категории

#### 4. Live Preview
- Нажмите кнопку **"Live Preview"**
- Откроется режим Editor | Preview
- Preview обновляется автоматически
- Показывает, как таблица будет выглядеть на сайте

#### 5. Настройки отображения
- Нажмите кнопку **"Настройки"**
- Измените:
  - Валюту и её позицию
  - Стиль таблицы
  - Цвет акцента
  - Видимость полей

#### 6. Drag & Drop строк
- Наведите на иконку ⋮⋮ слева от строки
- Перетащите строку на новое место
- Порядок автоматически сохраняется

#### 7. Inline редактирование
- Кликните по любой ячейке (если поле editable)
- Введите новое значение
- Нажмите Enter или кликните вне ячейки для сохранения
- Esc для отмены

## Использование на публичном сайте

### Client-Side компонент (с состояниями загрузки)

```tsx
import PublicPricingTable from '@/components/public/PublicPricingTable';

export default function PricingPage() {
  return (
    <div className="container mx-auto py-12">
      <PublicPricingTable className="max-w-6xl mx-auto" />
    </div>
  );
}
```

**Преимущества:**
- Loading state (анимация загрузки)
- Error state (обработка ошибок)
- Автоматическая перезагрузка при изменении данных

### Server-Side компонент (для SEO)

```tsx
import PublicPricingTableSSR from '@/components/public/PublicPricingTableSSR';

export default async function PricingPage() {
  return (
    <div className="container mx-auto py-12">
      <PublicPricingTableSSR className="max-w-6xl mx-auto" />
    </div>
  );
}
```

**Преимущества:**
- Server-side rendering
- Лучшее SEO (контент рендерится на сервере)
- Быстрая первая загрузка
- Использует Supabase server client

### Responsive поведение

#### Desktop (md и выше)
- Полная таблица с колонками
- Hover эффекты
- Прокрутка по горизонтали при большом количестве колонок

#### Mobile (до md)
- Карточки вместо таблицы
- Каждая услуга — отдельная карточка
- Все поля видимы без прокрутки
- Удобная навигация

## Архитектура данных

### Типы полей в pricing таблице

```typescript
interface PricingItem {
  id: string;
  category: string;         // Категория услуги
  name: string;             // Название (основное поле)
  description: string;      // Описание
  price: string;            // Цена
  duration: string;         // Срок выполнения
  features: string[];       // Дополнительные особенности
  order_index: number;      // Порядок отображения
  visible: boolean;         // Видимость на сайте
  custom_fields: {          // Динамические поля
    [key: string]: any;
  };
  created_at: string;
}
```

### Структура settings.pricing_settings

```json
{
  "currency": "₽",
  "currencyPosition": "after",
  "showDuration": true,
  "showDescription": true,
  "tableStyle": "default",
  "accentColor": "#DB9844",
  "columns": [
    {
      "id": "name",
      "key": "name",
      "label": "Название услуги",
      "type": "text",
      "width": 300,
      "visible": true,
      "order": 0,
      "editable": true,
      "required": true
    }
  ],
  "labels": {
    "tableName": "Прайс-лист",
    "tableTitle": "Наши услуги и цены",
    "tableSubtitle": "Актуальные цены на все услуги",
    "addButtonText": "Добавить услугу",
    "categoryLabel": "Категория"
  }
}
```

## Безопасность (RLS Policies)

### Публичный доступ (SELECT)
```sql
-- Пользователи сайта могут видеть только visible услуги
CREATE POLICY "Public read access to visible pricing"
  ON pricing FOR SELECT
  USING (visible = true);

-- Пользователи сайта могут читать settings
CREATE POLICY "Public read access to settings"
  ON settings FOR SELECT
  USING (true);
```

### Админ доступ (ALL)
```sql
-- Аутентифицированные пользователи имеют полный доступ
CREATE POLICY "Authenticated users can manage pricing"
  ON pricing FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
```

## Шрифт Montserrat

Подключен через `next/font/google` в `app/layout.tsx`:

```typescript
import { Montserrat } from "next/font/google";

const montserrat = Montserrat({
  subsets: ["latin", "cyrillic"],
  variable: "--font-montserrat",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});
```

Применяется через CSS класс `.pricing-typography` во всех Pricing компонентах.

## Проверка работоспособности

### Checklist после установки

- [ ] SQL миграции применены
- [ ] В админке доступен `/admin/pricing`
- [ ] Можно добавить услугу
- [ ] Drag & Drop работает
- [ ] Live Preview отображается корректно
- [ ] Кнопка "Колонки" открывает редактор
- [ ] Кнопка "Названия" открывает редактор
- [ ] На публичном сайте отображается таблица
- [ ] Montserrat применяется (проверить в DevTools)
- [ ] Mobile версия показывает карточки
- [ ] Изменения в админке отражаются на сайте

### Тестирование RLS

1. **Logout из админки**
2. Откройте публичный сайт с компонентом
3. Должны видеть только `visible: true` услуги
4. Попытка изменить данные должна быть запрещена

## Примеры использования

### Создание прайс-листа стоматологии

1. Откройте `/admin/pricing`
2. Нажмите "Колонки" → создайте колонки:
   - Название услуги (text)
   - Описание (textarea)
   - Цена (price)
   - Срок (duration)
3. Нажмите "Названия" → измените:
   - Заголовок: "Цены на стоматологические услуги"
   - Подзаголовок: "Актуальные цены в нашей клинике"
4. Добавьте категории:
   - Терапия
   - Хирургия
   - Ортопедия
5. Добавьте услуги в каждую категорию
6. Нажмите "Live Preview" для проверки

### Интеграция на сайт

Создайте страницу `app/pricing/page.tsx`:

```tsx
import PublicPricingTableSSR from '@/components/public/PublicPricingTableSSR';

export const metadata = {
  title: 'Цены на услуги',
  description: 'Актуальный прайс-лист нашей компании',
};

export default async function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 py-16">
      <div className="container mx-auto px-4">
        <PublicPricingTableSSR />
      </div>
    </main>
  );
}
```

## Troubleshooting

### Проблема: "Прайс-лист пока не заполнен"
**Решение:** Проверьте, что услуги имеют `visible: true` в БД

### Проблема: Montserrat не применяется
**Решение:** 
1. Проверьте импорт шрифта в `layout.tsx`
2. Проверьте наличие класса `.pricing-typography` в CSS
3. Проверьте применение класса в компонентах

### Проблема: Drag & Drop не работает
**Решение:** Проверьте установку `@dnd-kit` пакетов:
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Проблема: RLS блокирует доступ
**Решение:** 
1. Проверьте применение миграции `20260814000001_pricing_rls_policies.sql`
2. В Supabase Dashboard проверьте активные policies на таблицах `pricing` и `settings`

### Проблема: Custom fields не сохраняются
**Решение:** 
1. Проверьте наличие колонки `custom_fields` в таблице `pricing`
2. Примените миграцию `20260814000000_pricing_dynamic_columns.sql`

## Поддержка

Для вопросов и проблем:
1. Проверьте документацию выше
2. Проверьте `supabase/MIGRATION_README.md`
3. Проверьте browser console для ошибок JavaScript
4. Проверьте Supabase logs для ошибок БД

## Changelog

### v1.0.0 (2026-08-14)
- ✅ Начальный релиз
- ✅ Динамические колонки (8 типов)
- ✅ Drag & Drop (@dnd-kit)
- ✅ Live Preview
- ✅ Редактируемые labels
- ✅ PublicPricingTable компонент
- ✅ Responsive (Desktop/Mobile)
- ✅ RLS policies
- ✅ Montserrat typography
