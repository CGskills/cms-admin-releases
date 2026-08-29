'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  PricingItem,
  PricingSettings,
  PricingCategory,
  DEFAULT_PRICING_COLUMNS,
  DEFAULT_PRICING_LABELS,
} from '@/types/pricing';
import PricingCategorySection from './PricingCategorySection';
import PricingSettingsPanel from './PricingSettingsPanel';
import AddPricingItemDialog from './AddPricingItemDialog';
import ColumnManager from './ColumnManager';
import LabelsEditor from './LabelsEditor';
import PricingPreview from './PricingPreview';
import CategoryManager from './CategoryManager';
import Button from '@/components/ui/Button';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  updatePricingOrder,
  togglePricingVisibility,
  deletePricing,
  savePricingSettings,
  renameCategory,
  mergeCategories,
  deleteCategory,
} from '../actions';

interface PricingBuilderProps {
  initialItems: PricingItem[];
  initialSettings: PricingSettings;
}

interface PendingDelete {
  token: symbol;
  item: PricingItem;
  originalIndex: number;
  beforeId?: string;
  afterId?: string;
}

export default function PricingBuilder({
  initialItems,
  initialSettings,
}: PricingBuilderProps) {
  const [items, setItems] = useState<PricingItem[]>(initialItems);
  const [settings, setSettings] = useState<PricingSettings>({
    ...initialSettings,
    columns: initialSettings.columns || DEFAULT_PRICING_COLUMNS,
    labels: initialSettings.labels || DEFAULT_PRICING_LABELS,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [showLabelsEditor, setShowLabelsEditor] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const itemsRef = useRef(items);
  const pendingDeletesRef = useRef(new Map<string, PendingDelete>());
  const confirmedDeletesRef = useRef(new Set<string>());

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const categories = useMemo(() => {
    const map = new Map<string, PricingCategory>();
    for (const item of items) {
      const cat = item.category || 'Без категории';
      if (!map.has(cat)) map.set(cat, { name: cat, items: [] });
      map.get(cat)!.items.push(item);
    }
    return Array.from(map.values());
  }, [items]);

  const categoryNames = useMemo(
    () => categories.map((c) => c.name),
    [categories]
  );

  const filteredCategories = useMemo(() => {
    if (filterCategory === 'all') return categories;
    return categories.filter((c) => c.name === filterCategory);
  }, [categories, filterCategory]);

  const visibleCount = items.filter((i) => i.visible).length;

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) return;

      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
        ...item,
        order_index: index,
      }));

      setItems(reordered);

      try {
        setIsSaving(true);
        await updatePricingOrder(
          reordered.map((i) => ({ id: i.id, order_index: i.order_index }))
        );
      } catch {
        setItems(items);
      } finally {
        setIsSaving(false);
      }
    },
    [items]
  );

  const handleToggleVisibility = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;
      const newVisible = !item.visible;
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, visible: newVisible } : i))
      );
      try {
        await togglePricingVisibility(id, newVisible);
      } catch {
        setItems((prev) =>
          prev.map((i) => (i.id === id ? { ...i, visible: !newVisible } : i))
        );
      }
    },
    [items]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (confirmedDeletesRef.current.has(id) || pendingDeletesRef.current.has(id)) return;

      const currentItems = itemsRef.current;
      const deletedIndex = currentItems.findIndex((i) => i.id === id);
      const deleted = deletedIndex >= 0 ? currentItems[deletedIndex] : undefined;
      if (!deleted) return;

      const token = Symbol(id);
      pendingDeletesRef.current.set(id, {
        token,
        item: deleted,
        originalIndex: deletedIndex,
        beforeId: currentItems[deletedIndex - 1]?.id,
        afterId: currentItems[deletedIndex + 1]?.id,
      });
      setItems((prev) => prev.filter((i) => i.id !== id));

      try {
        await deletePricing(id);
        const pending = pendingDeletesRef.current.get(id);
        if (pending?.token !== token) return;
        pendingDeletesRef.current.delete(id);
        confirmedDeletesRef.current.add(id);
        setItems((prev) => prev.filter((item) => item.id !== id));
      } catch {
        const pending = pendingDeletesRef.current.get(id);
        if (pending?.token !== token) return;
        pendingDeletesRef.current.delete(id);
        if (confirmedDeletesRef.current.has(id)) return;

        setItems((prev) => {
          if (confirmedDeletesRef.current.has(id) || prev.some((item) => item.id === id)) return prev;

          const next = [...prev];
          const beforeIndex = pending.beforeId
            ? prev.findIndex((item) => item.id === pending.beforeId)
            : -1;
          const afterIndex = pending.afterId
            ? prev.findIndex((item) => item.id === pending.afterId)
            : -1;
          const insertionIndex = beforeIndex >= 0
            ? beforeIndex + 1
            : afterIndex >= 0
              ? afterIndex
              : Math.min(pending.originalIndex, next.length);

          next.splice(insertionIndex, 0, pending.item);
          return next;
        });
      }
    },
    []
  );

  const handleSettingsChange = useCallback(
    async (newSettings: PricingSettings) => {
      setSettings(newSettings);
      try {
        await savePricingSettings(newSettings);
      } catch {
        setSettings(settings);
      }
    },
    [settings]
  );

  const handleColumnsChange = useCallback(
    async (columns: typeof settings.columns) => {
      const newSettings = { ...settings, columns };
      setSettings(newSettings);
      try {
        await savePricingSettings(newSettings);
      } catch {
        setSettings(settings);
      }
    },
    [settings]
  );

  const handleLabelsChange = useCallback(
    async (labels: typeof settings.labels) => {
      const newSettings = { ...settings, labels };
      setSettings(newSettings);
      try {
        await savePricingSettings(newSettings);
      } catch {
        setSettings(settings);
      }
    },
    [settings]
  );

  const handleRenameCategory = useCallback(
    async (oldName: string, newName: string) => {
      await renameCategory(oldName, newName);
      setItems((prev) => prev.map((item) => (
        (item.category || 'Без категории') === oldName
          ? { ...item, category: newName }
          : item
      )));
    },
    []
  );

  const handleMergeCategories = useCallback(
    async (fromCategory: string, toCategory: string) => {
      await mergeCategories(fromCategory, toCategory);
      setItems((prev) => prev.map((item) => (
        (item.category || 'Без категории') === fromCategory
          ? { ...item, category: toCategory }
          : item
      )));
    },
    []
  );

  const handleDeleteCategory = useCallback(
    async (categoryName: string) => {
      await deleteCategory(categoryName);
      setItems((prev) => prev.filter((item) => (item.category || 'Без категории') !== categoryName));
    },
    []
  );

  const handleItemCreated = useCallback((newItem: PricingItem) => {
    setItems((prev) => [...prev, newItem]);
    setShowAddDialog(false);
  }, []);

  const handleInlineUpdate = useCallback((id: string, field: string, value: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    );
  }, []);

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => setShowAddDialog(true)}>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {settings.labels?.addButtonText || 'Добавить услугу'}
        </Button>

        <Button variant="secondary" onClick={() => setShowPreview(!showPreview)}>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          {showPreview ? 'Скрыть Preview' : 'Live Preview'}
        </Button>

        <Button variant="secondary" onClick={() => setShowSettings(!showSettings)}>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Настройки
        </Button>

        <Button variant="secondary" onClick={() => setShowColumnManager(true)}>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          Колонки
        </Button>

        <Button variant="secondary" onClick={() => setShowLabelsEditor(true)}>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          Названия
        </Button>

        <Button variant="secondary" onClick={() => setShowCategoryManager(true)}>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Категории
        </Button>

        {/* Category filter */}
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#DB9844]"
        >
          <option value="all">Все категории ({items.length})</option>
          {categoryNames.map((cat) => (
            <option key={cat} value={cat}>
              {cat} ({items.filter((i) => i.category === cat).length})
            </option>
          ))}
        </select>

        {/* Status */}
        <div className="ml-auto text-sm text-slate-400">
          {visibleCount} из {items.length} видимых
          {isSaving && (
            <span className="ml-2 text-[#DB9844] animate-pulse">Сохранение...</span>
          )}
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <PricingSettingsPanel
          settings={settings}
          onChange={handleSettingsChange}
        />
      )}

      {/* Main content area */}
      <div className={showPreview ? 'grid grid-cols-1 xl:grid-cols-2 gap-6' : ''}>
        {/* Editor */}
        <div className="space-y-6">
          {items.length === 0 ? (
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-12 text-center">
              <div className="w-16 h-16 bg-[#DB9844]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#DB9844]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Пока нет услуг</h3>
              <p className="text-slate-400 mb-6">Добавьте первую услугу в прайс-лист</p>
              <Button onClick={() => setShowAddDialog(true)}>Добавить услугу</Button>
            </div>
          ) : (
            <DndContext
              id="pricing-items"
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={items.map(i => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-6">
                  {filteredCategories.map((cat) => (
                    <PricingCategorySection
                      key={cat.name}
                      category={cat}
                      settings={settings}
                      onToggleVisibility={handleToggleVisibility}
                      onDelete={handleDelete}
                      onInlineUpdate={handleInlineUpdate}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Live Preview */}
        {showPreview && (
          <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700">
              <span className="text-sm font-medium text-white">Live Preview</span>
              <span className="text-xs text-slate-400">Обновляется автоматически</span>
            </div>
            <PricingPreview items={items} settings={settings} />
          </div>
        )}
      </div>

      {/* Add dialog */}
      {showAddDialog && (
        <AddPricingItemDialog
          categories={categoryNames}
          onClose={() => setShowAddDialog(false)}
          onCreated={handleItemCreated}
        />
      )}

      {/* Column Manager */}
      {showColumnManager && (
        <ColumnManager
          columns={settings.columns || DEFAULT_PRICING_COLUMNS}
          onChange={handleColumnsChange}
          onClose={() => setShowColumnManager(false)}
        />
      )}

      {/* Labels Editor */}
      {showLabelsEditor && (
        <LabelsEditor
          labels={settings.labels || DEFAULT_PRICING_LABELS}
          onChange={handleLabelsChange}
          onClose={() => setShowLabelsEditor(false)}
        />
      )}

      {/* Category Manager */}
      {showCategoryManager && (
        <CategoryManager
          categories={categories.map(c => ({ name: c.name, count: c.items.length }))}
          onClose={() => setShowCategoryManager(false)}
          onRename={handleRenameCategory}
          onMerge={handleMergeCategories}
          onDelete={handleDeleteCategory}
        />
      )}
    </div>
  );
}
