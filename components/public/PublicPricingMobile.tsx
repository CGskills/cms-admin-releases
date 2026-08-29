'use client';

import { useEffect, useMemo, useState } from 'react';
import type { PricingItem, PricingSettings } from '@/types/pricing';

interface PublicPricingMobileProps {
  items: PricingItem[];
  settings: PricingSettings;
}

type FeatureDetails = { meta?: string; subtitle?: string; subtitleTitle?: string; slideIndex?: number };

const MOBILE_CATEGORY_ORDER = [
  'Диагностика',
  'Профилактика и гигиена',
  'Протезирование',
  'Лечение',
  'Хирургия',
  'Имплантация',
] as const;

function getFeatureDetails(item: PricingItem): FeatureDetails {
  const raw = item.features;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed as FeatureDetails : {};
    } catch {
      return {};
    }
  }
  return value && typeof value === 'object' ? value as FeatureDetails : {};
}

function formatPrice(item: PricingItem, settings: PricingSettings): string {
  const value = item.price?.trim();
  if (!value) return '—';
  if (settings.currency && value.includes(settings.currency)) return value;
  return settings.currencyPosition === 'before'
    ? settings.currency + value
    : value + settings.currency;
}

function getDescription(item: PricingItem): string {
  const details = getFeatureDetails(item);
  return details.meta || details.subtitle || item.description || '';
}

export default function PublicPricingMobile({ items, settings }: PublicPricingMobileProps) {
  const categories = useMemo(() => {
    const grouped = new Map<string, PricingItem[]>();
    for (const item of items) {
      const name = item.category?.trim() || 'Без категории';
      const current = grouped.get(name) || [];
      current.push(item);
      grouped.set(name, current);
    }
    const orderedCategories: Array<[string, PricingItem[]]> = MOBILE_CATEGORY_ORDER.map((name) => [name, grouped.get(name) || []]);
    const priority = new Set<string>(MOBILE_CATEGORY_ORDER);
    const additionalCategories = Array.from(grouped.entries()).filter(([name]) => !priority.has(name));
    return [...orderedCategories, ...additionalCategories];
  }, [items]);
  const [activeCategory, setActiveCategory] = useState(categories[0]?.[0] || '');
  const [selectedItem, setSelectedItem] = useState<PricingItem | null>(null);

  useEffect(() => {
    if (!selectedItem) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedItem(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedItem]);

  const selectedCategory = categories.some(([name]) => name === activeCategory)
    ? activeCategory
    : categories[0]?.[0] || '';
  const activeItems = categories.find(([name]) => name === selectedCategory)?.[1] || [];
  const title = settings.labels?.tableTitle || 'Наши услуги и цены';

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-[#F0E4D4] bg-white dark:border-slate-700 dark:bg-slate-900" aria-label="Мобильный прайс-лист">
        <header className="bg-[#DB9844] px-4 py-4 text-white [padding-inline-start:calc(1rem+env(safe-area-inset-left))] [padding-inline-end:calc(1rem+env(safe-area-inset-right))]">
          <div className="flex items-center justify-between gap-3">
            <span className="text-lg font-semibold tracking-[0.08em]">AMBER</span>
            <span className="text-[0.68rem] font-semibold uppercase tracking-[0.24em]">{settings.labels?.tableName || 'Прайс-лист'}</span>
          </div>
          <h2 className="mt-3 text-[1.7rem] font-bold leading-tight">{title}</h2>
        </header>

        <nav className="overflow-x-auto border-b border-[#F0E4D4] bg-[#FFFCF8] px-3 py-2 [scrollbar-width:none] dark:border-slate-700 dark:bg-slate-950" aria-label="Категории услуг">
          <div className="flex min-w-max gap-5">
            {categories.map(([name]) => {
              const active = name === selectedCategory;
              return (
                <button
                  key={name}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setActiveCategory(name)}
                  className={`min-h-11 whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${active ? 'border-[#DB9844] bg-[#FFF8EF] text-[#A96418] shadow-sm' : 'border-[#F0E4D4] bg-white text-[#2F2013] hover:bg-[#FFF8EF] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'}`}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="px-4 py-5 [padding-inline-start:calc(1rem+env(safe-area-inset-left))] [padding-inline-end:calc(1rem+env(safe-area-inset-right))]">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#DB9844]">Прайс-лист</p>
          <h3 className="mb-4 text-2xl font-bold leading-tight text-slate-950 dark:text-white">{selectedCategory}</h3>
          <div className="overflow-hidden rounded-2xl border border-[#F0E4D4] bg-white dark:border-slate-700 dark:bg-slate-900">
            {activeItems.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">В этой категории пока нет опубликованных услуг</p>
            )}
            {activeItems.map((item, index) => {
              const description = getDescription(item);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedItem(item)}
                  className={`grid min-h-[72px] w-full grid-cols-[minmax(0,1fr)_2.75rem_5.25rem_1.25rem] items-start gap-2 px-4 py-4 text-left transition-colors active:bg-[#FFF8EF] ${index > 0 ? 'border-t border-[#F0E4D4] dark:border-slate-700' : ''}`}
                  aria-label={`Подробнее: ${item.name}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-[0.95rem] font-medium leading-snug text-slate-950 dark:text-white">{item.name}</span>
                    {description && <span className="mt-1 block break-words text-xs leading-relaxed text-slate-500 dark:text-slate-400">{description}</span>}
                  </span>
                  <span className="flex h-11 w-11 self-center items-center justify-center rounded-full border border-[#DB9844] text-lg font-semibold leading-none text-[#A96418]" aria-hidden="true">?</span>
                  <span className="self-center break-words text-right text-base font-semibold leading-tight text-[#DB9844]">{formatPrice(item, settings)}</span>
                  <span className="self-center text-center text-2xl leading-none text-[#DB9844]" aria-hidden="true">›</span>
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">Нажмите на услугу, чтобы посмотреть подробное описание</p>
        </div>
      </section>

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-4 sm:items-center" role="presentation" onClick={() => setSelectedItem(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pricing-mobile-dialog-title"
            className="w-full max-w-md rounded-2xl border border-[#F0E4D4] bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 id="pricing-mobile-dialog-title" className="text-lg font-semibold text-slate-950 dark:text-white">{selectedItem.name}</h2>
              <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setSelectedItem(null)} aria-label="Закрыть описание">×</button>
            </div>
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">{getDescription(selectedItem) || 'Подробное описание услуги уточняйте у администратора клиники.'}</p>
            <p className="mt-5 text-lg font-semibold text-[#DB9844]">{formatPrice(selectedItem, settings)}</p>
          </div>
        </div>
      )}
    </>
  );
}
