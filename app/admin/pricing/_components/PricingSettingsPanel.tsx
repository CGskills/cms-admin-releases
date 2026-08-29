'use client';

import { useState } from 'react';
import { PricingSettings } from '@/types/pricing';

interface PricingSettingsPanelProps {
  settings: PricingSettings;
  onChange: (settings: PricingSettings) => void;
}

export default function PricingSettingsPanel({
  settings,
  onChange,
}: PricingSettingsPanelProps) {
  const [local, setLocal] = useState(settings);

  const update = (patch: Partial<PricingSettings>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    onChange(next);
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Настройки отображения</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Currency */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Валюта
          </label>
          <input
            value={local.currency}
            onChange={(e) => update({ currency: e.target.value })}
            className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#DB9844]"
            placeholder="₽"
          />
        </div>

        {/* Currency position */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Позиция валюты
          </label>
          <select
            value={local.currencyPosition}
            onChange={(e) =>
              update({ currencyPosition: e.target.value as 'before' | 'after' })
            }
            className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#DB9844]"
          >
            <option value="before">До цены (₽1000)</option>
            <option value="after">После цены (1000₽)</option>
          </select>
        </div>

        {/* Table style */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Стиль таблицы
          </label>
          <select
            value={local.tableStyle}
            onChange={(e) =>
              update({ tableStyle: e.target.value as PricingSettings['tableStyle'] })
            }
            className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#DB9844]"
          >
            <option value="default">Таблица</option>
            <option value="cards">Карточки</option>
            <option value="compact">Компактная</option>
          </select>
        </div>

        {/* Accent color */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Цвет акцента
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={local.accentColor}
              onChange={(e) => update({ accentColor: e.target.value })}
              className="w-10 h-10 rounded cursor-pointer border-0"
            />
            <input
              value={local.accentColor}
              onChange={(e) => update({ accentColor: e.target.value })}
              className="flex-1 px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#DB9844]"
            />
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={local.showDuration}
              onChange={(e) => update({ showDuration: e.target.checked })}
              className="w-4 h-4 rounded border-slate-700 bg-slate-900/50 text-[#DB9844] focus:ring-2 focus:ring-[#DB9844]"
            />
            <span className="text-sm text-slate-300">Показывать сроки</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={local.showDescription}
              onChange={(e) => update({ showDescription: e.target.checked })}
              className="w-4 h-4 rounded border-slate-700 bg-slate-900/50 text-[#DB9844] focus:ring-2 focus:ring-[#DB9844]"
            />
            <span className="text-sm text-slate-300">Показывать описания</span>
          </label>
        </div>
      </div>
    </div>
  );
}
