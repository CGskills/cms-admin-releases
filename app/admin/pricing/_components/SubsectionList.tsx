import { useState } from 'react';
import type { PricingItem, Subs } from './types';
import { parseFeatures, DEFAULT_SUBSECTION, stringifyFeatures } from './types';
import { ItemRow } from './ItemRow';

interface SubsectionListProps {
  category: string;
  subsections: Subs;
  expandedSubs: Set<string>;
  movingId: string | null;
  pendingToggleId: string | null;
  deletingKey: string | null;
  mutationBusy: boolean;
  saving: boolean;
  onToggleSubsection: (key: string) => void;
  onRenameSubsection: (category: string, oldName: string, newName: string) => Promise<boolean | undefined>;
  onDeleteSubsection: (category: string, subsection: string) => void;
  onAddToSubsection: (category: string, subsection: string, slideIndex: number) => void;
  onMoveItem: (item: PricingItem, direction: 'up' | 'down') => void;
  onSaveItem: (id: string, updates: { name: string; price: string; features: string }) => Promise<boolean | undefined>;
  onToggleVisibility: (id: string) => void;
  onDeleteItem: (id: string, name: string) => void;
  onMoveToSlide: (id: string, slideIndex: number, features: string) => void;
  onAddSubsection: (category: string, subsection: string) => void;
}

export function SubsectionList({
  category,
  subsections,
  expandedSubs,
  movingId,
  pendingToggleId,
  deletingKey,
  mutationBusy,
  saving,
  onToggleSubsection,
  onRenameSubsection,
  onDeleteSubsection,
  onAddToSubsection,
  onMoveItem,
  onSaveItem,
  onToggleVisibility,
  onDeleteItem,
  onMoveToSlide,
  onAddSubsection,
}: SubsectionListProps) {
  const [renamingSub, setRenamingSub] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const handleRename = async (subsection: string) => {
    if (!renameValue.trim()) return;
    const success = await onRenameSubsection(category, subsection, renameValue.trim());
    if (success) {
      setRenamingSub(null);
    }
  };

  const handleAddSubsection = () => {
    if (!renameValue.trim()) return;
    onAddSubsection(category, renameValue.trim());
    setRenamingSub(null);
    setRenameValue('');
  };

  return (
    <div className="border-t border-slate-700/30">
      {Object.entries(subsections).map(([subsection, subItems]) => {
        const subsectionKey = `${category}|||${subsection}`;
        const slides: { [idx: number]: PricingItem[] } = {};
        for (const item of subItems) {
          const si = parseFeatures(item.features).slideIndex;
          if (!slides[si]) slides[si] = [];
          slides[si].push(item);
        }
        const slideIndices = Object.keys(slides)
          .map(Number)
          .sort((a, b) => a - b);

        return (
          <div key={subsection}>
            <div className="flex items-center px-8 py-2 hover:bg-slate-700/15 transition-colors border-b border-slate-700/5">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => onToggleSubsection(subsectionKey)}
                  className="p-0.5 rounded"
                  aria-label={`${expandedSubs.has(subsectionKey) ? 'Свернуть' : 'Развернуть'} подраздел «${subsection}»`}
                  aria-expanded={expandedSubs.has(subsectionKey)}
                >
                  <svg
                    className={`w-3 h-3 text-slate-500 transition-transform duration-200 ${expandedSubs.has(subsectionKey) ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                {renamingSub === subsectionKey ? (
                  <input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleRename(subsection);
                      }
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        setRenamingSub(null);
                      }
                    }}
                    className="px-2 py-0.5 bg-slate-900 border border-slate-600 rounded text-white text-xs"
                    autoFocus
                    onBlur={() => handleRename(subsection)}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <button type="button" onClick={() => onToggleSubsection(subsectionKey)} className="min-w-0 text-left">
                    <span className="text-sm text-slate-300 truncate block">{subsection}</span>
                  </button>
                )}
              </div>
              <span className="text-xs text-slate-600 mr-2">
                {subItems.length} · {slideIndices.length} стр.
              </span>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setRenamingSub(subsectionKey);
                    setRenameValue(subsection);
                  }}
                  className="p-1 text-slate-500 hover:text-white rounded"
                  title="Переименовать"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  onClick={() =>
                    onAddToSubsection(category, subsection, slideIndices.length > 0 ? Math.max(...slideIndices) : 0)
                  }
                  className="p-1 text-slate-500 hover:text-green-400 rounded"
                  title="Добавить"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteSubsection(category, subsection)}
                  disabled={Boolean(movingId || pendingToggleId || deletingKey)}
                  className="p-1 text-slate-500 hover:text-red-400 rounded disabled:opacity-50"
                  title="Удалить"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

            {expandedSubs.has(subsectionKey) && (
              <div>
                {slideIndices.map((slideIdx) => {
                  const slideItems = slides[slideIdx];
                  return (
                    <div key={slideIdx}>
                      <div className="flex items-center px-12 py-1.5 bg-slate-900/30 border-b border-slate-700/5">
                        <span className="text-xs text-slate-500 font-medium">Страница {slideIdx + 1}</span>
                        {slideItems[0] &&
                          (() => {
                            const f = parseFeatures(slideItems[0].features);
                            return f.subtitleTitle ? (
                              <span className="text-xs text-slate-600 ml-2">— {f.subtitleTitle}</span>
                            ) : null;
                          })()}
                        <div className="flex-1" />
                        <button
                          type="button"
                          onClick={() => onAddToSubsection(category, subsection, slideIdx)}
                          className="px-2 py-0.5 text-xs text-slate-500 hover:text-[#DB9844]"
                        >
                          + услуга
                        </button>
                      </div>

                      {slideItems.map((item, itemIdx) => (
                        <ItemRow
                          key={item.id}
                          item={item}
                          itemIdx={itemIdx}
                          slideItems={slideItems}
                          slideIndices={slideIndices}
                          movingId={movingId}
                          pendingToggleId={pendingToggleId}
                          deletingKey={deletingKey}
                          mutationBusy={mutationBusy}
                          saving={saving}
                          onMoveItem={onMoveItem}
                          onSaveItem={onSaveItem}
                          onToggleVisibility={onToggleVisibility}
                          onDeleteItem={onDeleteItem}
                          onMoveToSlide={onMoveToSlide}
                        />
                      ))}
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() =>
                    onAddToSubsection(category, subsection, Math.max(...slideIndices, -1) + 1)
                  }
                  className="w-full px-12 py-2 text-xs text-slate-500 hover:text-[#DB9844] hover:bg-slate-700/10 text-left border-t border-slate-700/5"
                >
                  + Добавить страницу
                </button>
              </div>
            )}
          </div>
        );
      })}
      <div className="px-8 py-2">
        <button
          type="button"
          onClick={() => {
            setRenamingSub(`__new__|||${category}`);
            setRenameValue('');
          }}
          className="text-xs text-slate-500 hover:text-[#DB9844]"
        >
          + Добавить подраздел
        </button>
        {renamingSub === `__new__|||${category}` && (
          <div className="mt-2 flex gap-2">
            <input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddSubsection();
                if (e.key === 'Escape') setRenamingSub(null);
              }}
              placeholder="Название подраздела"
              className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-600 rounded text-white text-xs"
              autoFocus
            />
            <button
              type="button"
              onClick={handleAddSubsection}
              className="px-3 py-1.5 bg-green-600 text-white rounded text-xs"
            >
              OK
            </button>
            <button
              type="button"
              onClick={() => setRenamingSub(null)}
              className="px-3 py-1.5 bg-slate-600 text-white rounded text-xs"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
