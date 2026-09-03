import { useState, type ReactNode } from 'react';
import {
  type DraggableAttributes,
  type DraggableSyntheticListeners,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { PricingItem, Subs } from './types';
import { SubsectionList } from './SubsectionList';

interface SortableCategoryProps {
  category: string;
  disabled: boolean;
  className: string;
  children: (activator: {
    setActivatorNodeRef: (element: HTMLElement | null) => void;
    attributes: DraggableAttributes;
    listeners: DraggableSyntheticListeners;
  }) => ReactNode;
}

function SortableCategory({ category, disabled, className, children }: SortableCategoryProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: category,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`${className} ${isDragging ? 'ring-2 ring-[#DB9844]/70 shadow-lg shadow-black/20' : ''}`}
    >
      {children({ setActivatorNodeRef, attributes, listeners })}
    </div>
  );
}

interface CategorySectionProps {
  category: string;
  subsections: Subs;
  categoryIndex: number;
  totalCategories: number;
  itemCount: number;
  expanded: boolean;
  expandedSubs: Set<string>;
  movingId: string | null;
  pendingToggleId: string | null;
  deletingKey: string | null;
  mutationBusy: boolean;
  saving: boolean;
  onToggleCategory: (category: string) => void;
  onMoveCategory: (category: string, direction: 'up' | 'down') => void;
  onRenameCategory: (oldName: string, newName: string) => Promise<boolean | undefined>;
  onDeleteCategory: (category: string) => void;
  onAddToCategory: (category: string, subsection: string) => void;
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

export function CategorySection({
  category,
  subsections,
  categoryIndex,
  totalCategories,
  itemCount,
  expanded,
  expandedSubs,
  movingId,
  pendingToggleId,
  deletingKey,
  mutationBusy,
  saving,
  onToggleCategory,
  onMoveCategory,
  onRenameCategory,
  onDeleteCategory,
  onAddToCategory,
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
}: CategorySectionProps) {
  const [renamingCat, setRenamingCat] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const handleRename = async () => {
    if (!renameValue.trim()) return;
    const success = await onRenameCategory(category, renameValue.trim());
    if (success) {
      setRenamingCat(false);
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
    <SortableCategory
      category={category}
      disabled={Boolean(movingId || pendingToggleId || deletingKey || mutationBusy)}
      className={`bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden transition-opacity ${movingId === `cat:${category}` || deletingKey === `category:${category}` ? 'opacity-50' : ''}`}
    >
      {({ setActivatorNodeRef, attributes, listeners }) => (
        <>
          <div className="flex items-center px-4 py-3">
            <div className="flex flex-col mr-2">
              <ArrowBtn onClick={() => onMoveCategory(category, 'up')} disabled={categoryIndex <= 0} title="Переместить вверх" />
              <ArrowDownBtn
                onClick={() => onMoveCategory(category, 'down')}
                disabled={categoryIndex < 0 || categoryIndex === totalCategories - 1}
                title="Переместить вниз"
              />
            </div>
            <button
              type="button"
              ref={setActivatorNodeRef}
              {...attributes}
              {...listeners}
              disabled={Boolean(movingId || pendingToggleId || deletingKey)}
              className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 mr-2 select-none p-1 rounded hover:bg-slate-700/50 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              title="Перетащите категорию"
              aria-label={`Перетащить категорию «${category}»`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="9" cy="5" r="1.5" />
                <circle cx="15" cy="5" r="1.5" />
                <circle cx="9" cy="12" r="1.5" />
                <circle cx="15" cy="12" r="1.5" />
                <circle cx="9" cy="19" r="1.5" />
                <circle cx="15" cy="19" r="1.5" />
              </svg>
            </button>
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                type="button"
                onClick={() => onToggleCategory(category)}
                className="p-0.5 rounded hover:opacity-80 transition-opacity"
                aria-label={`${expanded ? 'Свернуть' : 'Развернуть'} категорию «${category}»`}
                aria-expanded={expanded}
              >
                <svg
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              {renamingCat ? (
                <input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleRename();
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      setRenamingCat(false);
                    }
                  }}
                  className="px-2 py-1 bg-slate-900 border border-slate-600 rounded text-white text-sm"
                  autoFocus
                  onBlur={handleRename}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <button type="button" onClick={() => onToggleCategory(category)} className="min-w-0 text-left hover:opacity-80 transition-opacity">
                  <span className="text-white font-semibold text-base truncate block">{category}</span>
                </button>
              )}
            </div>
            <span className="text-xs text-slate-500 mr-3 bg-slate-700/30 px-2 py-0.5 rounded">{itemCount}</span>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => {
                  setRenamingCat(true);
                  setRenameValue(category);
                }}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded"
                title="Переименовать"
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
                onClick={() => onAddToCategory(category, '')}
                className="p-1.5 text-slate-400 hover:text-green-400 hover:bg-green-500/10 rounded"
                title="Добавить услугу"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => onDeleteCategory(category)}
                disabled={Boolean(movingId || pendingToggleId || deletingKey)}
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded disabled:opacity-50"
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

          {expanded && (
            <SubsectionList
              category={category}
              subsections={subsections}
              expandedSubs={expandedSubs}
              movingId={movingId}
              pendingToggleId={pendingToggleId}
              deletingKey={deletingKey}
              mutationBusy={mutationBusy}
              saving={saving}
              onToggleSubsection={onToggleSubsection}
              onRenameSubsection={onRenameSubsection}
              onDeleteSubsection={onDeleteSubsection}
              onAddToSubsection={onAddToSubsection}
              onMoveItem={onMoveItem}
              onSaveItem={onSaveItem}
              onToggleVisibility={onToggleVisibility}
              onDeleteItem={onDeleteItem}
              onMoveToSlide={onMoveToSlide}
              onAddSubsection={onAddSubsection}
            />
          )}
        </>
      )}
    </SortableCategory>
  );
}
