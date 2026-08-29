'use client';

import { PricingItem, PricingSettings, PricingColumn } from '@/types/pricing';
import PricingItemRow from './PricingItemRow';

interface PricingCategorySectionProps {
  category: { name: string; items: PricingItem[] };
  settings: PricingSettings;
  onToggleVisibility: (id: string) => void;
  onDelete: (id: string) => void;
  onInlineUpdate: (id: string, field: string, value: string) => void;
}

export default function PricingCategorySection({
  category,
  settings,
  onToggleVisibility,
  onDelete,
  onInlineUpdate,
}: PricingCategorySectionProps) {
  const visibleColumns = (settings.columns || []).filter(col => col.visible).sort((a, b) => a.order - b.order);
  const visibleItems = category.items.filter((i) => i.visible);
  const hasVisible = visibleItems.length > 0;

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Category header */}
      <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#DB9844]" />
          <h3 className="text-lg font-bold text-white pricing-typography">{category.name}</h3>
          <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded">
            {category.items.length} {category.items.length === 1 ? 'услуга' : 'услуг'}
          </span>
        </div>
      </div>

      {/* Items table */}
      <div className="overflow-x-auto">
        <table className="w-full pricing-typography">
          <thead>
            <tr className="border-b border-slate-700/30">
              <th className="text-left py-3 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider w-8"></th>
              {visibleColumns.map((col: PricingColumn) => (
                <th
                  key={col.id}
                  className="text-left py-3 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider"
                  style={col.width ? { width: `${col.width}px` } : undefined}
                >
                  {col.label}
                </th>
              ))}
              <th className="text-right py-3 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody>
            {!hasVisible && (
              <tr>
                <td colSpan={visibleColumns.length + 2} className="py-8 text-center text-slate-500 text-sm">
                  Все элементы скрыты
                </td>
              </tr>
            )}
            {category.items.map((item) => (
              <PricingItemRow
                key={item.id}
                item={item}
                settings={settings}
                columns={visibleColumns}
                onToggleVisibility={onToggleVisibility}
                onDelete={onDelete}
                onInlineUpdate={onInlineUpdate}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
