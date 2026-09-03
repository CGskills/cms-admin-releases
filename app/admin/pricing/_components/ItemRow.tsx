import { useState } from 'react';
import type { PricingItem, ParsedFeatures } from './types';
import { parseFeatures, stringifyFeatures } from './types';

interface ItemRowProps {
  item: PricingItem;
  itemIdx: number;
  slideItems: PricingItem[];
  slideIndices: number[];
  movingId: string | null;
  pendingToggleId: string | null;
  deletingKey: string | null;
  mutationBusy: boolean;
  saving: boolean;
  onMoveItem: (item: PricingItem, direction: 'up' | 'down') => void;
  onSaveItem: (id: string, updates: { name: string; price: string; features: string }) => Promise<boolean | undefined>;
  onToggleVisibility: (id: string) => void;
  onDeleteItem: (id: string, name: string) => void;
  onMoveToSlide: (id: string, slideIndex: number, features: string) => void;
}

export function ItemRow({
  item,
  itemIdx,
  slideItems,
  slideIndices,
  movingId,
  pendingToggleId,
  deletingKey,
  mutationBusy,
  saving,
  onMoveItem,
  onSaveItem,
  onToggleVisibility,
  onDeleteItem,
  onMoveToSlide,
}: ItemRowProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    price: '',
    subtitle: '',
    subtitleTitle: '',
    meta: '',
  });

  const feat = parseFeatures(item.features);

  const handleEdit = () => {
    setEditingId(item.id);
    setEditForm({
      name: item.name,
      price: item.price,
      subtitle: feat.subtitle,
      subtitleTitle: feat.subtitleTitle,
      meta: feat.meta,
    });
  };

  const handleSave = async () => {
    const updatedFeat: ParsedFeatures = {
      slideIndex: feat.slideIndex,
      subtitle: editForm.subtitle,
      subtitleTitle: editForm.subtitleTitle,
      meta: editForm.meta,
    };
    const success = await onSaveItem(item.id, {
      name: editForm.name,
      price: editForm.price,
      features: stringifyFeatures(updatedFeat),
    });
    if (success) {
      setEditingId(null);
    }
  };

  const ArrowBtn = ({ onClick, disabled, title }: { onClick: () => void; disabled?: boolean; title: string }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !!movingId || !!pendingToggleId || !!deletingKey || mutationBusy}
      title={title}
      className="p-1 text-slate-500 hover:text-white hover:bg-slate-700/50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    </button>
  );

  const ArrowDownBtn = ({ onClick, disabled, title }: { onClick: () => void; disabled?: boolean; title: string }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !!movingId || !!pendingToggleId || !!deletingKey || mutationBusy}
      title={title}
      className="p-1 text-slate-500 hover:text-white hover:bg-slate-700/50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );

  return (
    <div
      className={`px-12 py-2.5 transition-opacity ${!item.visible ? 'opacity-50' : ''} ${movingId === item.id ? 'opacity-50' : ''}`}
    >
      {editingId === item.id ? (
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              onKeyDown={(e) => e.stopPropagation()}
              className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded text-white text-sm"
              placeholder="Название"
            />
            <input
              value={editForm.price}
              onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
              onKeyDown={(e) => e.stopPropagation()}
              className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded text-white text-sm"
              placeholder="Цена"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              value={editForm.subtitleTitle}
              onChange={(e) => setEditForm({ ...editForm, subtitleTitle: e.target.value })}
              onKeyDown={(e) => e.stopPropagation()}
              className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded text-white text-xs"
              placeholder="Подзаголовок"
            />
            <input
              value={editForm.subtitle}
              onChange={(e) => setEditForm({ ...editForm, subtitle: e.target.value })}
              onKeyDown={(e) => e.stopPropagation()}
              className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded text-white text-xs"
              placeholder="Описание"
            />
            <input
              value={editForm.meta}
              onChange={(e) => setEditForm({ ...editForm, meta: e.target.value })}
              onKeyDown={(e) => e.stopPropagation()}
              className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded text-white text-xs"
              placeholder="Мета"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? '...' : 'Сохранить'}
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="px-3 py-1.5 bg-slate-600 text-white rounded text-xs hover:bg-slate-500"
            >
              Отмена
            </button>
            <span className="text-xs text-slate-500 ml-2">→ Стр:</span>
            {slideIndices.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onMoveToSlide(item.id, s, item.features)}
                className={`px-2 py-1 text-xs rounded ${feat.slideIndex === s ? 'bg-[#DB9844] text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
              >
                {s + 1}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onMoveToSlide(item.id, Math.max(...slideIndices) + 1, item.features)}
              className="px-2 py-1 text-xs rounded bg-slate-700 text-slate-400 hover:text-white"
            >
              +
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <ArrowBtn onClick={() => onMoveItem(item, 'up')} disabled={itemIdx === 0} title="Вверх" />
            <ArrowDownBtn
              onClick={() => onMoveItem(item, 'down')}
              disabled={itemIdx === slideItems.length - 1}
              title="Вниз"
            />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm text-white truncate block">{item.name}</span>
            {(feat.subtitleTitle || feat.meta) && (
              <span className="text-xs text-slate-500 truncate block">
                {feat.subtitleTitle}
                {feat.subtitleTitle && feat.meta ? ' · ' : ''}
                {feat.meta}
              </span>
            )}
          </div>
          <span className="text-sm font-semibold text-[#DB9844] whitespace-nowrap">{item.price}</span>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={handleEdit}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded"
              title="Редактировать"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => onToggleVisibility(item.id)}
              disabled={Boolean(movingId || pendingToggleId || deletingKey)}
              className={`p-1.5 rounded disabled:opacity-40 ${item.visible ? 'text-green-400' : 'text-slate-600'}`}
              title={item.visible ? 'Скрыть' : 'Показать'}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={
                    item.visible
                      ? 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
                      : 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M3 3l3.59 3.59'
                  }
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => onDeleteItem(item.id, item.name)}
              disabled={Boolean(movingId || pendingToggleId || deletingKey)}
              className="p-1.5 text-slate-400 hover:text-red-400 rounded disabled:opacity-50"
              title="Удалить"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
