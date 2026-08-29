'use client';

import { useState } from 'react';
import { PricingLabels, DEFAULT_PRICING_LABELS } from '@/types/pricing';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface LabelsEditorProps {
  labels: PricingLabels;
  onChange: (labels: PricingLabels) => void;
  onClose: () => void;
}

export default function LabelsEditor({ labels, onChange, onClose }: LabelsEditorProps) {
  const [localLabels, setLocalLabels] = useState<PricingLabels>(labels);

  const handleReset = () => {
    if (confirm('Сбросить все названия к настройкам по умолчанию?')) {
      setLocalLabels(DEFAULT_PRICING_LABELS);
    }
  };

  const handleSave = () => {
    onChange(localLabels);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-700 max-w-2xl w-full">
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-white">Редактирование названий</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-slate-400 text-sm">
            Все названия можно изменить без изменения кода. Изменения отображаются на сайте автоматически.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <Input
            label="Название прайс-листа"
            value={localLabels.tableName}
            onChange={(e) =>
              setLocalLabels({ ...localLabels, tableName: e.target.value })
            }
            placeholder="Прайс-лист"
          />

          <Input
            label="Заголовок таблицы"
            value={localLabels.tableTitle}
            onChange={(e) =>
              setLocalLabels({ ...localLabels, tableTitle: e.target.value })
            }
            placeholder="Наши услуги и цены"
          />

          <Input
            label="Подзаголовок таблицы"
            value={localLabels.tableSubtitle}
            onChange={(e) =>
              setLocalLabels({ ...localLabels, tableSubtitle: e.target.value })
            }
            placeholder="Актуальные цены на все услуги"
          />

          <Input
            label="Текст кнопки добавления"
            value={localLabels.addButtonText}
            onChange={(e) =>
              setLocalLabels({ ...localLabels, addButtonText: e.target.value })
            }
            placeholder="Добавить услугу"
          />

          <Input
            label="Название поля категории"
            value={localLabels.categoryLabel}
            onChange={(e) =>
              setLocalLabels({ ...localLabels, categoryLabel: e.target.value })
            }
            placeholder="Категория"
          />

          {/* Preview */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Предпросмотр</div>
            <div className="space-y-2 text-sm">
              <div className="text-white">
                <span className="text-slate-400">Админка:</span> {localLabels.tableName}
              </div>
              <div className="text-white">
                <span className="text-slate-400">Заголовок:</span> {localLabels.tableTitle}
              </div>
              <div className="text-slate-400">{localLabels.tableSubtitle}</div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Кнопка:</span>
                <span className="px-3 py-1 bg-[#DB9844] text-white rounded text-xs">
                  {localLabels.addButtonText}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 flex justify-between">
          <Button variant="ghost" onClick={handleReset}>
            Сбросить
          </Button>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose}>
              Отмена
            </Button>
            <Button onClick={handleSave}>
              Сохранить
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
