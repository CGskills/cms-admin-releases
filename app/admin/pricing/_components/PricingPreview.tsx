'use client';

import { PricingItem, PricingSettings, PricingColumn } from '@/types/pricing';
import { useMemo } from 'react';
import PublicPricingMobile from '@/components/public/PublicPricingMobile';

interface PricingPreviewProps {
  items: PricingItem[];
  settings: PricingSettings;
}

export default function PricingPreview({ items, settings }: PricingPreviewProps) {
  const visibleItems = items.filter(i => i.visible);
  const visibleColumns = (settings.columns || []).filter(col => col.visible).sort((a, b) => a.order - b.order);
  
  const categories = useMemo(() => {
    const map = new Map<string, PricingItem[]>();
    for (const item of visibleItems) {
      const cat = item.category || 'Без категории';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    return Array.from(map.entries());
  }, [visibleItems]);

  const formatPrice = (price: string) => {
    if (!price) return '—';
    if (settings.currencyPosition === 'before') {
      return `${settings.currency}${price}`;
    }
    return `${price}${settings.currency}`;
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
          <span className={`text-sm ${value ? 'text-green-600 dark:text-green-400' : 'text-slate-500'}`}>
            {value ? 'Да' : 'Нет'}
          </span>
        );
      case 'badge':
        return value ? (
          <span 
            className="inline-block px-2 py-1 rounded text-xs font-medium"
            style={{ 
              backgroundColor: `${settings.accentColor}20`, 
              color: settings.accentColor 
            }}
          >
            {value}
          </span>
        ) : <span className="text-slate-400">—</span>;
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
        ) : <span className="text-slate-400">—</span>;
      case 'number':
      case 'duration':
      case 'text':
      default:
        return <span className="text-slate-900 dark:text-white">{value || '—'}</span>;
    }
  };

  if (visibleItems.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
        <div className="text-slate-400 text-sm">
          Нет видимых элементов для отображения
        </div>
      </div>
    );
  }

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

      {/* Desktop categories */}
      <div className="hidden divide-y divide-slate-200 dark:divide-slate-700 md:block">
        {categories.map(([categoryName, categoryItems]) => (
          <div key={categoryName} className="p-6">
            {/* Category title */}
            <h3 
              className="text-xl font-bold mb-4"
              style={{ color: settings.accentColor }}
            >
              {categoryName}
            </h3>

            <div className="overflow-x-auto">
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
                  {categoryItems.map((item, idx) => (
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
      <div className="md:hidden">
        <PublicPricingMobile items={visibleItems} settings={settings} />
      </div>
    </div>
  );
}
