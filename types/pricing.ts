import { Database } from './database.types';

export type PricingItem = Database['public']['Tables']['pricing']['Row'];
export type PricingInsert = Database['public']['Tables']['pricing']['Insert'];
export type PricingUpdate = Database['public']['Tables']['pricing']['Update'];

// Column types supported in dynamic table
export type ColumnType = 'text' | 'textarea' | 'price' | 'number' | 'badge' | 'boolean' | 'link' | 'duration';

// Column definition for dynamic table structure
export interface PricingColumn {
  id: string;
  key: string; // field name in pricing table or custom_fields
  label: string; // Display name (editable)
  type: ColumnType;
  width?: number; // in pixels or percentage
  visible: boolean;
  order: number;
  editable: boolean;
  required?: boolean;
}

// Table labels (all editable)
export interface PricingLabels {
  tableName: string;
  tableTitle: string;
  tableSubtitle: string;
  addButtonText: string;
  categoryLabel: string;
}

export interface PricingSettings {
  currency: string;
  currencyPosition: 'before' | 'after';
  showDuration: boolean;
  showDescription: boolean;
  tableStyle: 'default' | 'cards' | 'compact';
  accentColor: string;
  columns?: PricingColumn[];
  labels?: PricingLabels;
}

export const DEFAULT_PRICING_COLUMNS: PricingColumn[] = [
  { id: 'name', key: 'name', label: 'Название услуги', type: 'text', visible: true, order: 0, editable: true, required: true },
  { id: 'description', key: 'description', label: 'Описание', type: 'textarea', visible: true, order: 1, editable: true },
  { id: 'price', key: 'price', label: 'Цена', type: 'price', visible: true, order: 2, editable: true, required: true },
  { id: 'duration', key: 'duration', label: 'Срок', type: 'duration', visible: true, order: 3, editable: true },
];

export const DEFAULT_PRICING_LABELS: PricingLabels = {
  tableName: 'Прайс-лист',
  tableTitle: 'Наши услуги и цены',
  tableSubtitle: 'Актуальные цены на все услуги',
  addButtonText: 'Добавить услугу',
  categoryLabel: 'Категория',
};

export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  currency: '₽',
  currencyPosition: 'after',
  showDuration: true,
  showDescription: true,
  tableStyle: 'default',
  accentColor: '#DB9844',
  columns: DEFAULT_PRICING_COLUMNS,
  labels: DEFAULT_PRICING_LABELS,
};

export interface PricingCategory {
  name: string;
  items: PricingItem[];
}
