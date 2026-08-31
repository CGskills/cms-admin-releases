'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { PricingItem, PricingSettings, PricingColumn } from '@/types/pricing';
import PublicPricingMobile from './PublicPricingMobile';

interface PublicPricingTableProps {
  className?: string;
}

export default function PublicPricingTable({ className = '' }: PublicPricingTableProps) {
  const [items, setItems] = useState<PricingItem[]>([]);
  const [settings, setSettings] = useState<PricingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const supabase = createClient();

        // Fetch visible pricing items
        const { data: pricingData, error: pricingError } = await supabase
          .from('pricing')
          .select('*')
          .eq('visible', true)
          .order('order_index', { ascending: true });

        if (pricingError) throw pricingError;

        // Fetch settings
        const { data: settingsData, error: settingsError } = await supabase
          .from('settings')
          .select('pricing_settings')
          .limit(1)
          .single();

        if (settingsError && settingsError.code !== 'PGRST116') {
          throw settingsError;
        }

        setItems(pricingData || []);
        setSettings(
          (settingsData?.pricing_settings as unknown as PricingSettings) || {
            currency: '₽',
            currencyPosition: 'after',
            showDuration: true,
            showDescription: true,
            tableStyle: 'default',
            accentColor: '#DB9844',
          }
        );
      } catch (err) {
        console.error('Error fetching pricing data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load pricing data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className={`${className} animate-pulse`}>
        <div className="bg-slate-100 dark:bg-slate-800 rounded-xl h-96 flex items-center justify-center">
          <div className="text-slate-400 text-sm">Загрузка прайс-листа...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <svg className="w-12 h-12 text-red-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-700 dark:text-red-400 font-medium mb-2">Ошибка загрузки прайс-листа</p>
          <p className="text-red-600 dark:text-red-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!settings || items.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <svg className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-slate-500 dark:text-slate-400">Прайс-лист пока не заполнен</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <PricingTableContent items={items} settings={settings} />
    </div>
  );
}

interface PricingTableContentProps {
  items: PricingItem[];
  settings: PricingSettings;
}

function PricingTableContent({ items, settings }: PricingTableContentProps) {
  const visibleColumns = (settings.columns || [])
    .filter((col) => col.visible)
    .sort((a, b) => a.order - b.order);

  const categories = new Map<string, PricingItem[]>();
  for (const item of items) {
    const cat = item.category || 'Без категории';
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push(item);
  }

  const formatPrice = (price: string) => {
    if (!price) return '—';
    if (settings.currencyPosition === 'before') {
      return `${settings.currency}${price}`;
    }
    return `${price}${settings.currency}`;
  };

  // Helper to parse features JSON
  const parseFeatures = (item: PricingItem): { subtitle?: string; meta?: string } => {
    try {
      const features = item.features;
      if (!features || features.length === 0) return {};

      const firstFeature = features[0];
      if (typeof firstFeature === 'string') {
        const parsed = JSON.parse(firstFeature);
        return {
          subtitle: parsed.subtitle || parsed.subtitleTitle,
          meta: parsed.meta
        };
      }
    } catch {
      return {};
    }
    return {};
  };

  const renderCellValue = (item: PricingItem, column: PricingColumn) => {
    const value = (item as Record<string, unknown>)[column.key] as string || '';

    switch (column.type) {
      case 'price':
        return (
          <span className="text-lg font-bold" style={{ color: settings.accentColor }}>
            {formatPrice(value)}
          </span>
        );
      case 'textarea':
        return <span className="text-sm text-slate-600 dark:text-slate-400">{value || '—'}</span>;
      case 'boolean':
        return (
          <span className={`text-sm ${value ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}`}>
            {value ? 'Да' : 'Нет'}
          </span>
        );
      case 'badge':
        return value ? (
          <span
            className="inline-block px-2 py-1 rounded text-xs font-medium"
            style={{
              backgroundColor: `${settings.accentColor}20`,
              color: settings.accentColor,
            }}
          >
            {value}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        );
      case 'link':
        return value ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
          >
            Ссылка
          </a>
        ) : (
          <span className="text-slate-400">—</span>
        );
      case 'number':
      case 'duration':
      case 'text':
      default:
        return <span className="text-slate-900 dark:text-white">{value || '—'}</span>;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden pricing-typography">
      {/* Header */}
      <div className="hidden px-6 py-8 text-center border-b border-slate-200 dark:border-slate-700 md:block">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          {settings.labels?.tableTitle || 'Наши услуги и цены'}
        </h2>
        {settings.labels?.tableSubtitle && (
          <p className="text-slate-600 dark:text-slate-400">
            {settings.labels.tableSubtitle}
          </p>
        )}
      </div>

      {/* Categories */}
      <div className="hidden divide-y divide-slate-200 dark:divide-slate-700 md:block">
        {Array.from(categories.entries()).map(([categoryName, categoryItems]) => (
          <div key={categoryName} className="p-6">
            {/* Category title */}
            <h3 className="text-xl font-bold mb-4" style={{ color: settings.accentColor }}>
              {categoryName}
            </h3>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    {visibleColumns.map((col) => (
                      <th
                        key={col.id}
                        className="py-3 px-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider"
                        style={col.width ? { width: `${col.width}px` } : undefined}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {categoryItems.map((item, idx) => {
                    const itemMeta = parseFeatures(item);
                    return (
                      <>
                        <tr
                          key={item.id}
                          className={`${
                            idx !== categoryItems.length - 1
                              ? 'border-b border-slate-100 dark:border-slate-800'
                              : ''
                          } hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors`}
                        >
                          {visibleColumns.map((col) => (
                            <td
                              key={col.id}
                              className="py-4 px-4"
                              style={col.width ? { width: `${col.width}px` } : undefined}
                            >
                              {renderCellValue(item, col)}
                            </td>
                          ))}
                        </tr>
                        {/* Meta row */}
                        {(itemMeta.subtitle || item.description || itemMeta.meta) && (
                          <tr
                            key={`${item.id}-meta`}
                            className={`${
                              idx !== categoryItems.length - 1
                                ? 'border-b border-slate-100 dark:border-slate-800'
                                : ''
                            }`}
                          >
                            <td colSpan={visibleColumns.length} className="py-3 px-4 bg-slate-50 dark:bg-slate-800/30">
                              <div className="space-y-1 text-sm">
                                {itemMeta.subtitle && (
                                  <div className="text-slate-600 dark:text-slate-400 font-medium">
                                    {itemMeta.subtitle}
                                  </div>
                                )}
                                {item.description && (
                                  <div className="text-slate-500 dark:text-slate-500">
                                    {item.description}
                                  </div>
                                )}
                                {itemMeta.meta && (
                                  <div className="text-slate-500 dark:text-slate-500">
                                    {itemMeta.meta}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>
        ))}
      </div>
      <div className="md:hidden">
        <PublicPricingMobile items={items} settings={settings} />
      </div>
    </div>
  );
}
