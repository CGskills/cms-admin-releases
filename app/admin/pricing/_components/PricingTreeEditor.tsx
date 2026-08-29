'use client';

import { useState, useCallback, useRef } from 'react';
import { PricingItem, PricingSettings } from '@/types/pricing';
import Button from '@/components/ui/Button';
import {
  updatePricingOrder,
  togglePricingVisibility,
  deletePricing,
  savePricingSettings,
  quickUpdatePricing,
  createPricingDirect,
  renameCategory,
  renameSubsection,
  deleteSubsection,
  deleteCategory,
} from '../actions';

interface Category {
  name: string;
  subsections: {
    name: string;
    slides: {
      subtitleTitle: string;
      subtitle: string;
      items: PricingItem[];
    }[];
  }[];
}

interface PricingTreeEditorProps {
  initialItems: PricingItem[];
  initialSettings: PricingSettings;
}

function parseFeatures(item: PricingItem): Record<string, unknown> {
  const raw = Array.isArray(item.features) ? item.features[0] : item.features;
  if (raw && typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  if (raw && typeof raw === 'object') return raw as Record<string, unknown>;
  return {};
}

function buildTree(items: PricingItem[]): Category[] {
  const sorted = [...items].sort((a, b) => a.order_index - b.order_index);
  const map = new Map<string, Category>();

  for (const item of sorted) {
    const catName = item.category || 'Без категории';
    if (!map.has(catName)) {
      map.set(catName, { name: catName, subsections: [] });
    }
    const cat = map.get(catName)!;

    const subName = item.description || 'Общее';
    let sub = cat.subsections.find((s) => s.name === subName);
    if (!sub) {
      sub = { name: subName, slides: [] };
      cat.subsections.push(sub);
    }

    const feat = parseFeatures(item);
    const si = (feat.slideIndex as number) || 0;

    while (sub.slides.length <= si) {
      sub.slides.push({ subtitleTitle: '', subtitle: '', items: [] });
    }
    sub.slides[si].items.push(item);
    if (feat.subtitleTitle) sub.slides[si].subtitleTitle = feat.subtitleTitle as string;
    if (feat.subtitle) sub.slides[si].subtitle = feat.subtitle as string;
  }

  return Array.from(map.values());
}

export default function PricingTreeEditor({
  initialItems,
  initialSettings,
}: PricingTreeEditorProps) {
  const [items, setItems] = useState<PricingItem[]>(initialItems);
  const [settings, setSettings] = useState<PricingSettings>(initialSettings);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(() => {
    const cats = new Set<string>();
    const tree = buildTree(initialItems);
    tree.forEach((c) => cats.add(c.name));
    return cats;
  });
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(() => {
    const subs = new Set<string>();
    const tree = buildTree(initialItems);
    tree.forEach((c) => c.subsections.forEach((s) => subs.add(`${c.name}|||${s.name}`)));
    return subs;
  });
  const [expandedSlides, setExpandedSlides] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [newSubCategory, setNewSubCategory] = useState('');
  const [showAddSub, setShowAddSub] = useState(false);

  // Category rename state
  const [renamingCategory, setRenamingCategory] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop state
  const [draggedCat, setDraggedCat] = useState<string | null>(null);
  const [dragOverCat, setDragOverCat] = useState<string | null>(null);

  // Subsection rename state
  const [renamingSub, setRenamingSub] = useState<string | null>(null);
  const [renameSubValue, setRenameSubValue] = useState('');
  const renameSubInputRef = useRef<HTMLInputElement>(null);

  // Confirm delete state
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<string | null>(null);
  const [confirmDeleteSub, setConfirmDeleteSub] = useState<string | null>(null);

  const tree = buildTree(items);

  const toggleCat = (name: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleSub = (key: string) => {
    setExpandedSubs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSlide = (key: string) => {
    setExpandedSlides((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const startEdit = (field: string, value: string) => {
    setEditingField(field);
    setEditValue(value);
  };

  const saveEdit = async () => {
    if (!editingField) return;
    const [type, id, extra] = editingField.split('|');
    const value = editValue;
    setEditingField(null);

    if (type === 'item') {
      const field = extra;
      const item = items.find((i) => i.id === id);
      if (!item || value === String((item as Record<string, unknown>)[field])) return;

      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, [field]: value } : i))
      );
      try {
        await quickUpdatePricing(id, field, value);
      } catch {
        setItems((prev) =>
          prev.map((i) =>
            i.id === id ? { ...i, [field]: (item as Record<string, unknown>)[field] as string } : i
          )
        );
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    }
    if (e.key === 'Escape') setEditingField(null);
  };

  const handleDelete = async (id: string) => {
    const deleted = items.find((i) => i.id === id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await deletePricing(id);
    } catch {
      if (deleted) setItems((prev) => [...prev, deleted]);
    }
  };

  const handleToggleVisibility = async (id: string) => {
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
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    const fd = new FormData();
    fd.set('category', newCategoryName.trim());
    fd.set('name', 'Новая услуга');
    fd.set('description', '');
    fd.set('price', '');
    await handleAddItem(fd);
    setShowAddCategory(false);
    setNewCategoryName('');
  };

  const handleAddSub = async () => {
    if (!newSubName.trim() || !newSubCategory.trim()) return;
    const fd = new FormData();
    fd.set('category', newSubCategory.trim());
    fd.set('name', 'Новая услуга');
    fd.set('description', newSubName.trim());
    fd.set('price', '');
    await handleAddItem(fd);
    setShowAddSub(false);
    setNewSubName('');
    setNewSubCategory('');
  };

  const handleAddItem = async (form: FormData) => {
    try {
      const result = await createPricingDirect(form);
      if (result) {
        setItems((prev) => [...prev, result]);
      }
      setShowAddItem(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSlide = async (catName: string, subName: string) => {
    const subItems = items.filter(
      (i) => i.category === catName && (i.description || 'Общее') === subName
    );
    let maxSlideIndex = -1;
    for (const item of subItems) {
      const feat = parseFeatures(item);
      const si = (feat.slideIndex as number) || 0;
      if (si > maxSlideIndex) maxSlideIndex = si;
    }

    const newSlideIndex = maxSlideIndex + 1;
    const subKey = `${catName}|||${subName}`;

    const fd = new FormData();
    fd.set('category', catName);
    fd.set('name', 'Новая услуга');
    fd.set('description', subName === 'Общее' ? '' : subName);
    fd.set('price', '');
    fd.set('features', JSON.stringify({ slideIndex: newSlideIndex, subtitle: '', subtitleTitle: '', meta: '' }));

    await handleAddItem(fd);

    // Auto-expand to show the new slide
    const slideKey = `${subKey}|||${newSlideIndex}`;
    setExpandedCats((prev) => new Set([...prev, catName]));
    setExpandedSubs((prev) => new Set([...prev, subKey]));
    setExpandedSlides((prev) => new Set([...prev, slideKey]));
  };

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

  // ─── Category Rename ───────────────────────────

  const startRenameCategory = (catName: string) => {
    setRenamingCategory(catName);
    setRenameValue(catName);
    setTimeout(() => renameInputRef.current?.focus(), 0);
  };

  const saveRenameCategory = async () => {
    if (!renamingCategory || !renameValue.trim() || renameValue.trim() === renamingCategory) {
      setRenamingCategory(null);
      return;
    }

    const oldName = renamingCategory;
    const newName = renameValue.trim();
    setRenamingCategory(null);

    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.category === oldName ? { ...i, category: newName } : i))
    );
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(oldName)) {
        next.delete(oldName);
        next.add(newName);
      }
      return next;
    });

    try {
      await renameCategory(oldName, newName);
    } catch {
      // Revert on error
      setItems((prev) =>
        prev.map((i) => (i.category === newName ? { ...i, category: oldName } : i))
      );
    }
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveRenameCategory();
    }
    if (e.key === 'Escape') setRenamingCategory(null);
  };

  // ─── Category Drag & Drop ──────────────────────

  const handleCatDragStart = (e: React.DragEvent, catName: string) => {
    setDraggedCat(catName);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', catName);
  };

  const handleCatDragOver = (e: React.DragEvent, catName: string) => {
    e.preventDefault();
    if (draggedCat && draggedCat !== catName) {
      setDragOverCat(catName);
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleCatDragLeave = () => {
    setDragOverCat(null);
  };

  const handleCatDrop = async (e: React.DragEvent, targetCatName: string) => {
    e.preventDefault();
    setDragOverCat(null);

    if (!draggedCat || draggedCat === targetCatName) {
      setDraggedCat(null);
      return;
    }

    const draggedIdx = tree.findIndex((c) => c.name === draggedCat);
    const targetIdx = tree.findIndex((c) => c.name === targetCatName);
    if (draggedIdx === -1 || targetIdx === -1) {
      setDraggedCat(null);
      return;
    }

    // Reorder: move dragged category to target position
    const newTree = [...tree];
    const [removed] = newTree.splice(draggedIdx, 1);
    newTree.splice(targetIdx, 0, removed);

    // Update order_index for all items based on new category order
    const updates: { id: string; order_index: number }[] = [];
    let orderIdx = 0;
    for (const cat of newTree) {
      const catItems = cat.subsections.flatMap((s) => s.slides.flatMap((sl) => sl.items));
      for (const item of catItems) {
        updates.push({ id: item.id, order_index: orderIdx });
        orderIdx++;
      }
    }

    // Optimistic update
    setItems((prev) => {
      const updated = [...prev];
      for (const u of updates) {
        const idx = updated.findIndex((i) => i.id === u.id);
        if (idx !== -1) updated[idx] = { ...updated[idx], order_index: u.order_index };
      }
      return updated;
    });

    setDraggedCat(null);

    try {
      await updatePricingOrder(updates);
    } catch {
      setItems(initialItems);
    }
  };

  const handleCatDragEnd = () => {
    setDraggedCat(null);
    setDragOverCat(null);
  };

  // ─── Subsection Rename ─────────────────────────

  const startRenameSub = (catName: string, subName: string) => {
    const key = `${catName}|||${subName}`;
    setRenamingSub(key);
    setRenameSubValue(subName);
    setTimeout(() => renameSubInputRef.current?.focus(), 0);
  };

  const saveRenameSub = async (catName: string, oldSubName: string) => {
    if (!renameSubValue.trim() || renameSubValue.trim() === oldSubName) {
      setRenamingSub(null);
      return;
    }

    const newName = renameSubValue.trim();
    setRenamingSub(null);

    // Optimistic update
    setItems((prev) =>
      prev.map((i) =>
        i.category === catName && (i.description || 'Общее') === oldSubName
          ? { ...i, description: newName === 'Общее' ? '' : newName }
          : i
      )
    );

    try {
      await renameSubsection(catName, oldSubName === 'Общее' ? '' : oldSubName, newName === 'Общее' ? '' : newName);
    } catch {
      setItems((prev) =>
        prev.map((i) =>
          i.category === catName && (i.description || 'Общее') === newName
            ? { ...i, description: oldSubName === 'Общее' ? '' : oldSubName }
            : i
        )
      );
    }
  };

  const handleRenameSubKeyDown = (e: React.KeyboardEvent, catName: string, oldSubName: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveRenameSub(catName, oldSubName);
    }
    if (e.key === 'Escape') setRenamingSub(null);
  };

  // ─── Category Delete ───────────────────────────

  const handleDeleteCategory = async (catName: string) => {
    const catItems = items.filter((i) => i.category === catName);
    setItems((prev) => prev.filter((i) => i.category !== catName));
    setConfirmDeleteCat(null);

    try {
      await deleteCategory(catName);
    } catch {
      setItems((prev) => [...prev, ...catItems]);
    }
  };

  // ─── Subsection Delete ─────────────────────────

  const handleDeleteSubsection = async (catName: string, subName: string) => {
    const subItems = items.filter(
      (i) => i.category === catName && (i.description || 'Общее') === subName
    );
    setItems((prev) =>
      prev.filter(
        (i) => !(i.category === catName && (i.description || 'Общее') === subName)
      )
    );
    setConfirmDeleteSub(null);

    try {
      await deleteSubsection(catName, subName === 'Общее' ? '' : subName);
    } catch {
      setItems((prev) => [...prev, ...subItems]);
    }
  };

  const categoryNames = tree.map((c) => c.name);
  const visibleCount = items.filter((i) => i.visible).length;

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => setShowAddItem(true)}>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Добавить услугу
        </Button>

        <Button variant="secondary" onClick={() => setShowAddCategory(true)}>
          + Категория
        </Button>

        <Button variant="secondary" onClick={() => setShowAddSub(true)}>
          + Подраздел
        </Button>

        <Button variant="secondary" onClick={() => setShowSettings(!showSettings)}>
          Настройки
        </Button>

        <div className="ml-auto text-sm text-slate-400">
          {visibleCount} из {items.length} видимых
        </div>
      </div>

      {/* Settings */}
      {showSettings && (
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Настройки отображения</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Валюта</label>
              <input
                value={settings.currency}
                onChange={(e) => handleSettingsChange({ ...settings, currency: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Позиция валюты</label>
              <select
                value={settings.currencyPosition}
                onChange={(e) => handleSettingsChange({ ...settings, currencyPosition: e.target.value as 'before' | 'after' })}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm"
              >
                <option value="before">До цены</option>
                <option value="after">После цены</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Цвет акцента</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.accentColor}
                  onChange={(e) => handleSettingsChange({ ...settings, accentColor: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer border-0"
                />
                <input
                  value={settings.accentColor}
                  onChange={(e) => handleSettingsChange({ ...settings, accentColor: e.target.value })}
                  className="flex-1 px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Dialog */}
      {showAddCategory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Новая категория</h3>
            <input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white mb-4"
              placeholder="Название категории"
              autoFocus
            />
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setShowAddCategory(false)} className="flex-1">Отмена</Button>
              <Button onClick={handleAddCategory} className="flex-1">Создать</Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Subcategory Dialog */}
      {showAddSub && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Новый подраздел</h3>
            <select
              value={newSubCategory}
              onChange={(e) => setNewSubCategory(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white mb-3"
            >
              <option value="">Выберите категорию</option>
              {categoryNames.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              value={newSubName}
              onChange={(e) => setNewSubName(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white mb-4"
              placeholder="Название подраздела"
              autoFocus
            />
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setShowAddSub(false)} className="flex-1">Отмена</Button>
              <Button onClick={handleAddSub} className="flex-1">Создать</Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Dialog */}
      {showAddItem && (
        <AddItemDialog
          categories={categoryNames}
          onClose={() => setShowAddItem(false)}
          onAdd={handleAddItem}
        />
      )}

      {/* Tree */}
      {items.length === 0 ? (
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-12 text-center">
          <h3 className="text-xl font-bold text-white mb-2">Пока нет услуг</h3>
          <p className="text-slate-400 mb-6">Добавьте первую услугу в прайс-лист</p>
          <Button onClick={() => setShowAddItem(true)}>Добавить услугу</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {tree.map((cat) => {
            const catKey = cat.name;
            const isCatExpanded = expandedCats.has(catKey);
            const catItems = cat.subsections.flatMap((s) => s.slides.flatMap((sl) => sl.items));
            const catVisible = catItems.filter((i) => i.visible).length;
            const isDragging = draggedCat === catKey;
            const isDragOver = dragOverCat === catKey;

            return (
              <div
                key={catKey}
                className={`bg-slate-800/50 backdrop-blur-xl rounded-xl border overflow-hidden transition-all ${
                  isDragOver ? 'border-[#DB9844] border-2' : 'border-slate-700/50'
                } ${isDragging ? 'opacity-50 scale-[0.98]' : ''}`}
                draggable
                onDragStart={(e) => handleCatDragStart(e, catKey)}
                onDragOver={(e) => handleCatDragOver(e, catKey)}
                onDragLeave={handleCatDragLeave}
                onDrop={(e) => handleCatDrop(e, catKey)}
                onDragEnd={handleCatDragEnd}
              >
                {/* Category header */}
                <div
                  className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-700/30 transition-colors"
                  onClick={() => toggleCat(catKey)}
                >
                  <div className="flex items-center gap-3">
                    {/* Drag handle */}
                    <div
                      className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                      title="Перетащить для изменения порядка"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                      </svg>
                    </div>

                    <svg className={`w-5 h-5 text-slate-400 transition-transform ${isCatExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <div className="w-3 h-3 rounded-full bg-[#DB9844]" />

                    {/* Editable category name */}
                    {renamingCategory === catKey ? (
                      <input
                        ref={renameInputRef}
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={saveRenameCategory}
                        onKeyDown={handleRenameKeyDown}
                        onClick={(e) => e.stopPropagation()}
                        className="text-lg font-bold text-white bg-slate-900/50 border border-[#DB9844] rounded px-2 py-0.5 outline-none"
                      />
                    ) : (
                      <h3
                        className="text-lg font-bold text-white hover:text-[#DB9844] transition-colors cursor-text"
                        onClick={(e) => {
                          e.stopPropagation();
                          startRenameCategory(catKey);
                        }}
                        title="Нажмите для переименования"
                      >
                        {cat.name}
                      </h3>
                    )}

                    <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded">
                      {cat.subsections.length} подразд. / {catItems.length} услуг
                    </span>
                    <span className="text-xs text-slate-500">
                      ({catVisible} видимых)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {confirmDeleteCat === catKey ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCategory(catKey);
                          }}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                        >
                          Да
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteCat(null);
                          }}
                          className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors"
                        >
                          Нет
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteCat(catKey);
                        }}
                        className="p-1 rounded hover:bg-red-500/10 transition-colors"
                        title="Удалить категорию со всеми услугами"
                      >
                        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Subsections */}
                {isCatExpanded && (
                  <div className="border-t border-slate-700/30">
                    {cat.subsections.map((sub) => {
                      const subKey = `${catKey}|||${sub.name}`;
                      const isSubExpanded = expandedSubs.has(subKey);
                      const subItems = sub.slides.flatMap((sl) => sl.items);
                      const subVisible = subItems.filter((i) => i.visible).length;

                      return (
                        <div key={subKey}>
                          <div
                            className="px-10 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-700/20 transition-colors"
                            onClick={() => toggleSub(subKey)}
                          >
                            <div className="flex items-center gap-3">
                              <svg className={`w-4 h-4 text-slate-500 transition-transform ${isSubExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              {renamingSub === subKey ? (
                                <input
                                  ref={renameSubInputRef}
                                  value={renameSubValue}
                                  onChange={(e) => setRenameSubValue(e.target.value)}
                                  onBlur={() => saveRenameSub(catKey, sub.name)}
                                  onKeyDown={(e) => handleRenameSubKeyDown(e, catKey, sub.name)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-sm font-semibold text-white bg-slate-900/50 border border-[#DB9844] rounded px-2 py-0.5 outline-none"
                                />
                              ) : (
                                <span
                                  className="text-sm font-semibold text-slate-300 hover:text-[#DB9844] transition-colors cursor-text"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startRenameSub(catKey, sub.name);
                                  }}
                                  title="Нажмите для переименования"
                                >
                                  {sub.name}
                                </span>
                              )}
                              <span className="text-xs text-slate-500">
                                {sub.slides.length} слайд(ов) / {subItems.length} услуг ({subVisible} видимых)
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddSlide(catKey, sub.name);
                                }}
                                className="text-xs text-[#DB9844] hover:text-white transition-colors px-2 py-1 rounded hover:bg-[#DB9844]/10"
                              >
                                + Слайд
                              </button>
                              {confirmDeleteSub === subKey ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteSubsection(catKey, sub.name);
                                    }}
                                    className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                                  >
                                    Да
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmDeleteSub(null);
                                    }}
                                    className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors"
                                  >
                                    Нет
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDeleteSub(subKey);
                                  }}
                                  className="p-1 rounded hover:bg-red-500/10 transition-colors"
                                  title="Удалить подраздел"
                                >
                                  <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Slides */}
                          {isSubExpanded && (
                            <div className="px-14 pb-2">
                              {sub.slides.map((slide, si) => {
                                const slideKey = `${subKey}|||${si}`;
                                const isSlideExpanded = expandedSlides.has(slideKey);

                                return (
                                  <div key={slideKey} className="mb-2">
                                    <div
                                      className="py-2 flex items-center gap-3 cursor-pointer hover:bg-slate-700/10 rounded px-3 transition-colors"
                                      onClick={() => toggleSlide(slideKey)}
                                    >
                                      <svg className={`w-4 h-4 text-slate-500 transition-transform ${isSlideExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                      <span className="text-xs font-medium text-[#DB9844]">Слайд {si + 1}</span>
                                      {slide.subtitleTitle && (
                                        <span className="text-xs text-slate-400">— {slide.subtitleTitle}</span>
                                      )}
                                      <span className="text-xs text-slate-500">({slide.items.length} услуг)</span>
                                    </div>

                                    {/* Items */}
                                    {isSlideExpanded && (
                                      <div className="ml-8 border-l-2 border-slate-700/50 pl-4 space-y-1">
                                        {slide.items.map((item) => (
                                          <div
                                            key={item.id}
                                            className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-colors ${!item.visible ? 'opacity-40' : 'hover:bg-slate-700/20'}`}
                                          >
                                            {/* Visibility */}
                                            <button
                                              onClick={() => handleToggleVisibility(item.id)}
                                              className="flex-shrink-0"
                                              title={item.visible ? 'Скрыть' : 'Показать'}
                                            >
                                              {item.visible ? (
                                                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                              ) : (
                                                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                </svg>
                                              )}
                                            </button>

                                            {/* Name */}
                                            {editingField === `item|${item.id}|name` ? (
                                              <input
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onBlur={saveEdit}
                                                onKeyDown={handleKeyDown}
                                                className="flex-1 px-2 py-1 bg-slate-900/50 border border-[#DB9844] rounded text-white text-sm"
                                                autoFocus
                                              />
                                            ) : (
                                              <button
                                                onClick={() => startEdit(`item|${item.id}|name`, item.name)}
                                                className="flex-1 text-left text-sm text-slate-300 hover:text-white transition-colors truncate"
                                              >
                                                {item.name}
                                              </button>
                                            )}

                                            {/* Description */}
                                            {editingField === `item|${item.id}|description` ? (
                                              <input
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onBlur={saveEdit}
                                                onKeyDown={handleKeyDown}
                                                className="w-48 px-2 py-1 bg-slate-900/50 border border-[#DB9844] rounded text-white text-xs"
                                                autoFocus
                                              />
                                            ) : (
                                              <button
                                                onClick={() => startEdit(`item|${item.id}|description`, item.description || '')}
                                                className="w-48 text-left text-xs text-slate-500 hover:text-slate-300 transition-colors truncate"
                                              >
                                                {item.description || '—'}
                                              </button>
                                            )}

                                            {/* Price */}
                                            {editingField === `item|${item.id}|price` ? (
                                              <input
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onBlur={saveEdit}
                                                onKeyDown={handleKeyDown}
                                                className="w-28 px-2 py-1 bg-slate-900/50 border border-[#DB9844] rounded text-white text-sm text-right"
                                                autoFocus
                                              />
                                            ) : (
                                              <button
                                                onClick={() => startEdit(`item|${item.id}|price`, item.price)}
                                                className="w-28 text-right text-sm font-bold text-[#DB9844] hover:underline"
                                              >
                                                {item.price || '—'}
                                              </button>
                                            )}

                                            {/* Delete */}
                                            {confirmDelete === item.id ? (
                                              <div className="flex items-center gap-1">
                                                <button
                                                  onClick={() => { handleDelete(item.id); setConfirmDelete(null); }}
                                                  className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                                                >
                                                  Да
                                                </button>
                                                <button
                                                  onClick={() => setConfirmDelete(null)}
                                                  className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors"
                                                >
                                                  Нет
                                                </button>
                                              </div>
                                            ) : (
                                              <button
                                                onClick={() => setConfirmDelete(item.id)}
                                                className="flex-shrink-0 p-1 rounded hover:bg-red-500/10 transition-colors"
                                                title="Удалить"
                                              >
                                                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                              </button>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Add Item Dialog ─── */

function AddItemDialog({
  categories,
  onClose,
  onAdd,
}: {
  categories: string[];
  onClose: () => void;
  onAdd: (formData: FormData) => void;
}) {
  const [category, setCategory] = useState(categories[0] || '');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !category.trim() || !price.trim()) return;
    const fd = new FormData();
    fd.set('category', category);
    fd.set('name', name);
    fd.set('description', description);
    fd.set('price', price);
    onAdd(fd);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-6 max-w-lg w-full">
        <h3 className="text-xl font-bold text-white mb-4">Новая услуга</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Категория *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm"
              required
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Подраздел</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm"
              placeholder="Первичный прием"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Название *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Цена *</label>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm"
              placeholder="1 500 ₽"
              required
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">Отмена</Button>
            <Button type="submit" className="flex-1">Создать</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
