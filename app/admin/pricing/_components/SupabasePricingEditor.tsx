'use client';

import { useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import {
  closestCenter,
  DndContext,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
  KeyboardSensor,
  PointerSensor,
  type DragEndEvent,
  useSensor,
  useSensors,
  type KeyboardSensorOptions,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  getPricingEditorItems,
  mutatePricingEditor as mutatePricingEditorAction,
} from '../actions';
import { logKeyEvent, installGlobalDiagnostics } from './DIAGNOSTIC_LOG';

interface PricingItem {
  id: string;
  category: string;
  name: string;
  description: string;
  price: string;
  order_index: number;
  visible: boolean;
  features: string;
}

interface ParsedFeatures { slideIndex: number; subtitle: string; subtitleTitle: string; meta: string; }

function pf(f: string): ParsedFeatures {
  try { const o = typeof f === 'string' ? JSON.parse(f) : f; return { slideIndex: o.slideIndex ?? 0, subtitle: o.subtitle || '', subtitleTitle: o.subtitleTitle || '', meta: o.meta || '' }; }
  catch { return { slideIndex: 0, subtitle: '', subtitleTitle: '', meta: '' }; }
}
function fs(f: ParsedFeatures): string { return JSON.stringify(f); }

// Custom KeyboardSensor that filters out editable elements to prevent Space key conflicts
class FilteredKeyboardSensor extends KeyboardSensor {
  static activators = [
    {
      eventName: 'onKeyDown' as const,
      handler: (
        event: React.KeyboardEvent<Element>,
        options: KeyboardSensorOptions,
        context: { active: any }
      ) => {
        const target = event.target as HTMLElement;

        // DIAGNOSTIC: Log when FilteredKeyboardSensor handler is called
        if (event.key === ' ') {
          console.log('[FilteredKeyboardSensor] Space key detected', {
            'target.tagName': target.tagName,
            'target.contentEditable': target.contentEditable,
            'will filter?': target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true',
          });
        }

        // Ignore keyboard activation if focused element is editable
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.contentEditable === 'true'
        ) {
          console.log('[FilteredKeyboardSensor] Filtered out - returning false');
          return false;
        }

        // Delegate to parent KeyboardSensor activator logic
        console.log('[FilteredKeyboardSensor] Delegating to parent KeyboardSensor');
        return KeyboardSensor.activators[0].handler(event, options, context);
      },
    },
  ];
}

type Subs = { [sub: string]: PricingItem[] };
type Grouped = { [cat: string]: Subs };
const UNCATEGORIZED_CATEGORY = 'Без категории';
const DEFAULT_SUBSECTION = 'Общие';

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

export default function SupabasePricingEditor() {
  const [items, setItems] = useState<PricingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [ef, setEf] = useState({ name: '', price: '', subtitle: '', subtitleTitle: '', meta: '' });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState<string | null>(null);
  const [af, setAf] = useState({ name: '', price: '', category: '', subsection: '', slideIndex: 0, subtitle: '', subtitleTitle: '', meta: '' });
  const [renamingCat, setRenamingCat] = useState<string | null>(null);
  const [renamingSub, setRenamingSub] = useState<string | null>(null);
  const [rv, setRv] = useState('');
  const [showNewCat, setShowNewCat] = useState(false);
  const [ncn, setNcn] = useState('');
  const [movingId, setMovingId] = useState<string | null>(null);
  const [pendingToggleId, setPendingToggleId] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [mutationBusy, setMutationBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  // Server reads can finish out of order (especially after a slow Storage or
  // Supabase request). Keep a generation for mutations and a sequence for
  // reads so an old response cannot overwrite newer optimistic state or call
  // setState after this editor has unmounted.
  const mountedRef = useRef(false);
  const mutationGenerationRef = useRef(0);
  const fetchSequenceRef = useRef(0);
  const createInFlightRef = useRef(false);
  const saveItemInFlightRef = useRef(new Set<string>());
  const slideMoveInFlightRef = useRef(new Set<string>());
  const toggleTokensRef = useRef(new Map<string, symbol>());
  const reorderInFlightRef = useRef(false);
  const renameInFlightRef = useRef(new Set<string>());
  const mutationInFlightRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(FilteredKeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchItems = useCallback(async () => {
    const fetchSequence = ++fetchSequenceRef.current;
    const mutationGeneration = mutationGenerationRef.current;

    try {
      const data = await getPricingEditorItems();
      if (
        !mountedRef.current
        || mutationGeneration !== mutationGenerationRef.current
        || fetchSequence !== fetchSequenceRef.current
      ) {
        return false;
      }
      setItems(data);
      return true;
    } catch (error) {
      if (
        mountedRef.current
        && mutationGeneration === mutationGenerationRef.current
        && fetchSequence === fetchSequenceRef.current
      ) {
        setActionError(`Не удалось загрузить услуги: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`);
      }
      return false;
    }
  }, []);

  const runPricingMutation = useCallback(
    async (input: Parameters<typeof mutatePricingEditorAction>[0]) => {
      // Invalidate every read that started before this mutation. The next
      // explicit fetch (after the mutation resolves) is the only response
      // allowed to reconcile the editor.
      mutationGenerationRef.current += 1;
      return mutatePricingEditorAction(input);
    },
    [],
  );

  const beginMutation = useCallback(() => {
    if (mutationInFlightRef.current) return false;
    mutationInFlightRef.current = true;
    setMutationBusy(true);
    return true;
  }, []);

  const finishMutation = useCallback(() => {
    mutationInFlightRef.current = false;
    setMutationBusy(false);
  }, []);

  useEffect(() => {
    let isCurrent = true;
    mountedRef.current = true;

    // DIAGNOSTIC: Install global keyboard listeners
    installGlobalDiagnostics();

    const loadItems = async () => {
      try {
        await fetchItems();
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    void loadItems();
    return () => {
      isCurrent = false;
      mountedRef.current = false;
      mutationGenerationRef.current += 1;
      fetchSequenceRef.current += 1;
    };
  }, [fetchItems]);

  const grouped = useMemo(() => {
    const g: Grouped = {};
    for (const item of items) {
      const category = item.category || UNCATEGORIZED_CATEGORY;
      const subsection = item.description || DEFAULT_SUBSECTION;
      if (!g[category]) g[category] = {};
      if (!g[category][subsection]) g[category][subsection] = [];
      g[category][subsection].push(item);
    }
    return g;
  }, [items]);

  // ── Reorder helpers ──
  const categoryOrder = useMemo(() => {
    const seen = new Set<string>();
    const order: string[] = [];
    for (const item of items) {
      const category = item.category || UNCATEGORIZED_CATEGORY;
      if (!seen.has(category)) {
        seen.add(category);
        order.push(category);
      }
    }
    return order;
  }, [items]);

  const persistCategoryOrder = async (categoryOrder: string[], movingCategory: string) => {
    if (movingId || pendingToggleId || deletingKey || reorderInFlightRef.current || mutationInFlightRef.current) return;
    if (!beginMutation()) return;

    const previousItems = items;
    const orderedItems = categoryOrder.flatMap((category) =>
      previousItems
        .filter((item) => (item.category || UNCATEGORIZED_CATEGORY) === category)
        .sort((first, second) => first.order_index - second.order_index)
    );
    const optimisticItems = orderedItems.map((item, order_index) => ({ ...item, order_index }));

    setActionError(null);
    setItems(optimisticItems);
    reorderInFlightRef.current = true;
    setMovingId(`cat:${movingCategory}`);
    try {
      await runPricingMutation({
        kind: 'reorder',
        items: orderedItems.map((item, order_index) => ({ id: item.id, order_index })),
      });
      // The optimistic list uses the exact normalized order sent to the
      // server. Avoid an extra full-table read after a successful reorder;
      // failed batches still reconcile below.
    } catch (error) {
      // A batch can partially succeed. Best-effort restore the original
      // order in Supabase, then always read the server state back. Never
      // restore a stale local snapshot after a failed compensation.
      try {
        await runPricingMutation({
          kind: 'reorder',
          items: previousItems.map((item) => ({ id: item.id, order_index: item.order_index })),
        });
      } catch {
        // The guarded reload below is authoritative when compensation fails.
      }
      await fetchItems();
      setActionError(
        `Не удалось изменить порядок категорий: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`
      );
    } finally {
      reorderInFlightRef.current = false;
      setMovingId(null);
      finishMutation();
    }
  };

  const handleCategoryDragEnd = async ({ active, over }: DragEndEvent) => {
    if (movingId || pendingToggleId || deletingKey || !over || String(active.id) === String(over.id)) return;

    // The visible list can be filtered, but persistence must always use the
    // complete category order so hidden categories are not dropped or moved
    // to the end during a filtered drag.
    const oldIndex = categoryOrder.indexOf(String(active.id));
    const newIndex = categoryOrder.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    await persistCategoryOrder(arrayMove(categoryOrder, oldIndex, newIndex), String(active.id));
  };

  const moveCategory = async (cat: string, direction: 'up' | 'down') => {
    if (movingId || pendingToggleId || deletingKey) return;

    const idx = categoryOrder.indexOf(cat);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= categoryOrder.length) return;

    const reordered = [...categoryOrder];
    [reordered[idx], reordered[targetIdx]] = [reordered[targetIdx], reordered[idx]];
    await persistCategoryOrder(reordered, cat);
  };

  const toggleCategory = (category: string) => {
    setExpandedCats((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const toggleSubsection = (subsection: string) => {
    setExpandedSubs((current) => {
      const next = new Set(current);
      if (next.has(subsection)) next.delete(subsection);
      else next.add(subsection);
      return next;
    });
  };

  const moveItem = async (item: PricingItem, direction: 'up' | 'down') => {
    if (movingId || pendingToggleId || deletingKey || reorderInFlightRef.current || mutationInFlightRef.current) return;

    const itemSubsection = item.description || DEFAULT_SUBSECTION;
    const itemSlideIndex = pf(item.features).slideIndex;
    const subItems = items
      .filter((i) =>
        (i.category || UNCATEGORIZED_CATEGORY) === (item.category || UNCATEGORIZED_CATEGORY)
        && (i.description || DEFAULT_SUBSECTION) === itemSubsection
        && pf(i.features).slideIndex === itemSlideIndex
      )
      .sort((a, b) => a.order_index - b.order_index);
    const idx = subItems.findIndex((i) => i.id === item.id);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= subItems.length) return;

    const previousItems = items;
    if (!beginMutation()) return;
    reorderInFlightRef.current = true;
    setMovingId(item.id);
    setActionError(null);
    const a = subItems[idx], b = subItems[targetIdx];
    const optimisticItems = previousItems
      .map((current) => {
        if (current.id === a.id) return { ...current, order_index: b.order_index };
        if (current.id === b.id) return { ...current, order_index: a.order_index };
        return current;
      })
      .sort((first, second) => first.order_index - second.order_index);
    setItems(optimisticItems);

    try {
      await runPricingMutation({
        kind: 'reorder',
        items: [
          { id: a.id, order_index: b.order_index },
          { id: b.id, order_index: a.order_index },
        ],
      });
      // The two confirmed updates are already represented in optimisticItems.
    } catch (error) {
      try {
        await runPricingMutation({
          kind: 'reorder',
          items: [
            { id: a.id, order_index: a.order_index },
            { id: b.id, order_index: b.order_index },
          ],
        });
      } catch {
        // The guarded reload below is authoritative when compensation fails.
      }
      await fetchItems();
      setActionError(
        `Не удалось изменить порядок услуги: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`
      );
    } finally {
      reorderInFlightRef.current = false;
      setMovingId(null);
      finishMutation();
    }
  };

  // ── CRUD ──
  const saveItem = async (id: string) => {
    if (saveItemInFlightRef.current.has(id) || slideMoveInFlightRef.current.has(id) || mutationInFlightRef.current) return;
    if (!beginMutation()) return;
    saveItemInFlightRef.current.add(id);
    setSaving(true);
    const ex = items.find((i) => i.id === id);
    const feat = ex ? pf(ex.features) : { slideIndex: 0, subtitle: '', subtitleTitle: '', meta: '' };
    feat.subtitle = ef.subtitle; feat.subtitleTitle = ef.subtitleTitle; feat.meta = ef.meta;
    try {
      await runPricingMutation({ kind: 'updateItem', id, name: ef.name, price: ef.price, features: fs(feat) });
      setEditingId(null);
      await fetchItems();
    } catch (error) {
      setActionError(`Не удалось сохранить услугу: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`);
    } finally {
      saveItemInFlightRef.current.delete(id);
      setSaving(false);
      finishMutation();
    }
  };
  const toggleVis = async (id: string) => {
    if (movingId || pendingToggleId || deletingKey || toggleTokensRef.current.size > 0 || mutationInFlightRef.current) return;
    if (toggleTokensRef.current.has(id)) return;
    const previousVisible = items.find((item) => item.id === id)?.visible;
    if (previousVisible === undefined) return;
    if (!beginMutation()) return;

    const token = Symbol(id);
    toggleTokensRef.current.set(id, token);
    const nextVisible = !previousVisible;
    setActionError(null);
    setPendingToggleId(id);
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, visible: nextVisible } : item))
    );

    try {
      await runPricingMutation({ kind: 'toggleVisibility', id, visible: nextVisible });
      if (toggleTokensRef.current.get(id) !== token) return;
      await fetchItems();
    } catch (error) {
      if (toggleTokensRef.current.get(id) !== token) return;
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, visible: previousVisible } : item))
      );
      setActionError(
        `Не удалось изменить видимость услуги: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`
      );
    } finally {
      if (toggleTokensRef.current.get(id) === token) {
        toggleTokensRef.current.delete(id);
        setPendingToggleId(null);
      }
      finishMutation();
    }
  };
  const delItem = async (id: string, name: string) => {
    if (movingId || pendingToggleId || deletingKey || mutationInFlightRef.current) return;
    if (!confirm(`Удалить "${name}"?`)) return;
    if (!beginMutation()) return;
    setActionError(null);
    setDeletingKey(`item:${id}`);
    try {
      await runPricingMutation({ kind: 'deleteItem', id });
      // Update the local tree only after Supabase confirms the delete. This
      // keeps failed records visible and removes successful deletes instantly.
      setItems((current) => current.filter((item) => item.id !== id));
      await fetchItems();
    } catch (error) {
      // A count=0 response can mean another client already deleted the row.
      // Reconcile on every failure so that stale records are not resurrected;
      // if the row still exists, the reload keeps it visible.
      await fetchItems();
      alert(`Не удалось удалить услугу: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`);
    } finally {
      setDeletingKey(null);
      finishMutation();
    }
  };
  const addItem = async () => {
    if (!af.name.trim() || !af.category.trim()) { alert('Заполните название и категорию'); return; }
    if (createInFlightRef.current || mutationInFlightRef.current || !beginMutation()) return;
    createInFlightRef.current = true;
    try {
      await runPricingMutation({
        kind: 'createItem',
        category: af.category,
        name: af.name,
        description: af.subsection || 'Общие',
        price: af.price,
        features: fs({ slideIndex: af.slideIndex, subtitle: af.subtitle, subtitleTitle: af.subtitleTitle, meta: af.meta }),
      });
      setShowAdd(null);
      setAf({ name: '', price: '', category: '', subsection: '', slideIndex: 0, subtitle: '', subtitleTitle: '', meta: '' });
      await fetchItems();
    } catch (error) {
      setActionError(`Не удалось добавить услугу: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`);
    } finally {
      createInFlightRef.current = false;
      finishMutation();
    }
  };
  const renameCatFn = async () => {
    if (!renamingCat || !rv.trim()) return;
    const oldName = renamingCat;
    const newName = rv.trim();
    const renameKey = `category:${oldName}`;
    if (renameInFlightRef.current.has(renameKey) || mutationInFlightRef.current || !beginMutation()) return;
    renameInFlightRef.current.add(renameKey);
    setRenamingCat(null);
    try {
      await runPricingMutation({ kind: 'renameCategory', oldName, newName });
      await fetchItems();
    } catch (error) {
      setActionError(`Не удалось переименовать категорию: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`);
    } finally {
      renameInFlightRef.current.delete(renameKey);
      finishMutation();
    }
  };
  const delCat = async (c: string) => {
    if (movingId || pendingToggleId || deletingKey || mutationInFlightRef.current) return;
    if (!confirm(`Удалить "${c}" и все услуги?`)) return;
    if (!beginMutation()) return;
    setActionError(null);
    setDeletingKey(`category:${c}`);
    try {
      await runPricingMutation({ kind: 'deleteCategory', category: c });
      setItems((current) => current.filter((item) => (item.category || UNCATEGORIZED_CATEGORY) !== c));
      await fetchItems();
    } catch (error) {
      // A zero-count response can mean another client already removed the
      // category. Reconcile on every failure so stale categories are not
      // left visible in the editor.
      await fetchItems();
      alert(`Не удалось удалить категорию: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`);
    } finally {
      setDeletingKey(null);
      finishMutation();
    }
  };
  const addCat = async () => {
    const category = ncn.trim();
    if (!category || createInFlightRef.current || mutationInFlightRef.current || !beginMutation()) return;
    createInFlightRef.current = true;
    try {
      await runPricingMutation({
        kind: 'createItem',
        category,
        name: 'Новая услуга',
        description: 'Общие',
        price: '0 ₽',
        features: '{"slideIndex":0,"subtitle":"","subtitleTitle":"","meta":""}',
      });
      setShowNewCat(false);
      setNcn('');
      await fetchItems();
    } catch (error) {
      setActionError(`Не удалось создать категорию: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`);
    } finally {
      createInFlightRef.current = false;
      finishMutation();
    }
  };
  const renameSubFn = async (c: string, o: string) => {
    if (!rv.trim()) return;
    const newName = rv.trim();
    const renameKey = `subsection:${c}:${o}`;
    if (renameInFlightRef.current.has(renameKey) || mutationInFlightRef.current || !beginMutation()) return;
    renameInFlightRef.current.add(renameKey);
    setRenamingSub(null);
    try {
      await runPricingMutation({ kind: 'renameSubsection', category: c, oldName: o, newName });
      await fetchItems();
    } catch (error) {
      setActionError(`Не удалось переименовать подраздел: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`);
    } finally {
      renameInFlightRef.current.delete(renameKey);
      finishMutation();
    }
  };
  const delSub = async (c: string, s: string) => {
    if (movingId || pendingToggleId || deletingKey || mutationInFlightRef.current) return;
    if (!confirm(`Удалить "${s}" и все услуги?`)) return;
    if (!beginMutation()) return;
    setActionError(null);
    setDeletingKey(`sub:${c}:${s}`);
    try {
      await runPricingMutation({ kind: 'deleteSubsection', category: c, subsection: s });
      setItems((current) => current.filter((item) => {
        const category = item.category || UNCATEGORIZED_CATEGORY;
        const subsection = item.description || DEFAULT_SUBSECTION;
        return category !== c || subsection !== s;
      }));
      await fetchItems();
    } catch (error) {
      // Keep the tree authoritative when the server reports count=0 or the
      // request fails after a remote delete.
      await fetchItems();
      alert(`Не удалось удалить подраздел: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`);
    } finally {
      setDeletingKey(null);
      finishMutation();
    }
  };
  const addSub = async (c: string) => {
    const subsection = rv.trim();
    if (!subsection || createInFlightRef.current || mutationInFlightRef.current || !beginMutation()) return;
    createInFlightRef.current = true;
    try {
      await runPricingMutation({
        kind: 'createItem',
        category: c,
        name: 'Новая услуга',
        description: subsection,
        price: '0 ₽',
        features: '{"slideIndex":0,"subtitle":"","subtitleTitle":"","meta":""}',
      });
      setRenamingSub(null);
      setRv('');
      await fetchItems();
    } catch (error) {
      setActionError(`Не удалось создать подраздел: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`);
    } finally {
      createInFlightRef.current = false;
      finishMutation();
    }
  };
  const moveToSlide = async (id: string, si: number) => {
    const item = items.find((current) => current.id === id);
    if (!item || movingId || pendingToggleId || deletingKey || mutationInFlightRef.current) return;
    if (saveItemInFlightRef.current.has(id) || slideMoveInFlightRef.current.has(id) || !beginMutation()) return;
    slideMoveInFlightRef.current.add(id);
    setMovingId(id);
    setActionError(null);
    try {
      await runPricingMutation({ kind: 'moveToSlide', id, slideIndex: si, features: item.features });
      await fetchItems();
    } catch (error) {
      setActionError(`Не удалось изменить страницу услуги: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`);
    } finally {
      slideMoveInFlightRef.current.delete(id);
      setMovingId(null);
      finishMutation();
    }
  };

  const normalizedSearch = search.trim().toLowerCase();
  const fg = useMemo<Grouped>(() => {
    if (!normalizedSearch) return grouped;

    const result: Grouped = {};
    for (const [category, subsections] of Object.entries(grouped)) {
      const filteredSubsections: Subs = {};
      for (const [subsection, subsectionItems] of Object.entries(subsections)) {
        const matchingItems = subsectionItems.filter((item) =>
          item.name.toLowerCase().includes(normalizedSearch)
          || item.price.toLowerCase().includes(normalizedSearch)
        );
        if (matchingItems.length > 0) filteredSubsections[subsection] = matchingItems;
      }
      if (Object.keys(filteredSubsections).length > 0) result[category] = filteredSubsections;
    }
    return result;
  }, [grouped, normalizedSearch]);

  if (loading) return <div className="text-center py-12 text-slate-400"><div className="animate-spin w-8 h-8 border-2 border-[#DB9844] border-t-transparent rounded-full mx-auto mb-4" />Загрузка...</div>;

  const cats = categoryOrder;
  const catEntries = Object.entries(fg);

  // Arrow button component
  const ArrowBtn = ({ onClick, disabled, title }: { onClick: () => void; disabled?: boolean; title: string }) => (
    <button type="button" onClick={onClick} disabled={disabled || !!movingId || !!pendingToggleId || !!deletingKey || mutationBusy}
      title={title}
      className="p-1 text-slate-500 hover:text-white hover:bg-slate-700/50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    </button>
  );

  const ArrowDownBtn = ({ onClick, disabled, title }: { onClick: () => void; disabled?: boolean; title: string }) => (
    <button type="button" onClick={onClick} disabled={disabled || !!movingId || !!pendingToggleId || !!deletingKey || mutationBusy}
      title={title}
      className="p-1 text-slate-500 hover:text-white hover:bg-slate-700/50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );

  return (
    <div className="space-y-4">
      {actionError && (
        <div role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {actionError}
        </div>
      )}
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-slate-400">Всего: <strong className="text-white">{items.length}</strong></span>
        <span className="text-sm text-slate-400">Видимых: <strong className="text-green-400">{items.filter((i) => i.visible).length}</strong></span>
        <span className="text-sm text-slate-400">Категорий: <strong className="text-white">{cats.length}</strong></span>
        <div className="flex-1" />
        <button type="button" onClick={() => { setAf({ ...af, category: '', subsection: '' }); setShowAdd('new'); }}
          className="px-3 py-1.5 bg-[#DB9844] text-white rounded-lg text-sm hover:bg-[#AF5D3E]">+ Добавить услугу</button>
        <button type="button" onClick={() => setShowNewCat(true)}
          className="px-3 py-1.5 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-600">+ Категория</button>
      </div>

      {/* Search */}
      <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
        onKeyDownCapture={(e) => logKeyEvent('capture', 'keydown', e)}
        onKeyDown={(e) => logKeyEvent('bubble', 'keydown', e)}
        onKeyUpCapture={(e) => logKeyEvent('capture', 'keyup', e)}
        onKeyUp={(e) => logKeyEvent('bubble', 'keyup', e)}
        onKeyPressCapture={(e) => logKeyEvent('capture', 'keypress', e)}
        onKeyPress={(e) => logKeyEvent('bubble', 'keypress', e)}
        placeholder="Поиск по названию или цене..."
        className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#DB9844]" />

      {/* New category dialog */}
      {showNewCat && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex gap-2">
          <input value={ncn} onChange={(e) => setNcn(e.target.value)} placeholder="Название категории"
            className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white text-sm" autoFocus />
          <button type="button" onClick={addCat} className="px-4 py-2 bg-green-600 text-white rounded text-sm">Создать</button>
          <button type="button" onClick={() => setShowNewCat(false)} className="px-4 py-2 bg-slate-600 text-white rounded text-sm">Отмена</button>
        </div>
      )}

      {/* Add item dialog */}
      {showAdd === 'new' && (
        <div className="bg-slate-800 border border-[#DB9844]/30 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <select value={af.category} onChange={(e) => setAf({ ...af, category: e.target.value })}
              className="px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white text-sm">
              <option value="">Категория</option>
              {cats.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input value={af.subsection} onChange={(e) => setAf({ ...af, subsection: e.target.value })} placeholder="Подраздел"
              className="px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white text-sm" />
            <input value={af.name} onChange={(e) => setAf({ ...af, name: e.target.value })} placeholder="Название"
              className="px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white text-sm" />
            <input value={af.price} onChange={(e) => setAf({ ...af, price: e.target.value })} placeholder="Цена"
              className="px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white text-sm" />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={addItem} className="px-4 py-2 bg-green-600 text-white rounded text-sm">Добавить</button>
            <button type="button" onClick={() => setShowAdd(null)} className="px-4 py-2 bg-slate-600 text-white rounded text-sm">Отмена</button>
          </div>
        </div>
      )}

      {/* Categories */}
      <DndContext
        id="pricing-categories"
        collisionDetection={closestCenter}
        onDragEnd={handleCategoryDragEnd}
        sensors={sensors}
      >
        <SortableContext items={catEntries.map(([category]) => category)} strategy={verticalListSortingStrategy}>
      {catEntries.map(([cat, subs]) => {
        const fullCatIdx = cats.indexOf(cat);
        const catItems = Object.values(subs).flat();
        return (
          <SortableCategory
            key={cat}
            category={cat}
            disabled={Boolean(movingId || pendingToggleId || deletingKey || mutationBusy)}
            className={`bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden transition-opacity ${movingId === `cat:${cat}` || deletingKey === `category:${cat}` ? 'opacity-50' : ''}`}
          >
            {({ setActivatorNodeRef, attributes, listeners }) => (
            <>
            {/* Category header */}
            <div className="flex items-center px-4 py-3">
              {/* Reorder arrows */}
              <div className="flex flex-col mr-2">
                <ArrowBtn onClick={() => moveCategory(cat, 'up')} disabled={fullCatIdx <= 0} title="Переместить вверх" />
                <ArrowDownBtn onClick={() => moveCategory(cat, 'down')} disabled={fullCatIdx < 0 || fullCatIdx === cats.length - 1} title="Переместить вниз" />
              </div>
              <button
                type="button"
                ref={setActivatorNodeRef}
                {...attributes}
                {...listeners}
                disabled={Boolean(movingId || pendingToggleId || deletingKey)}
                className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 mr-2 select-none p-1 rounded hover:bg-slate-700/50 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                title="Перетащите категорию"
                aria-label={`Перетащить категорию «${cat}»`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg>
              </button>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <button type="button" onClick={() => toggleCategory(cat)}
                  className="p-0.5 rounded hover:opacity-80 transition-opacity" aria-label={`${expandedCats.has(cat) ? 'Свернуть' : 'Развернуть'} категорию «${cat}»`} aria-expanded={expandedCats.has(cat)}>
                  <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expandedCats.has(cat) ? 'rotate-90' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                {renamingCat === cat ? (
                  <input value={rv} onChange={(e) => setRv(e.target.value)}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') { e.preventDefault(); void renameCatFn(); }
                      if (e.key === 'Escape') { e.preventDefault(); setRenamingCat(null); }
                    }}
                    className="px-2 py-1 bg-slate-900 border border-slate-600 rounded text-white text-sm" autoFocus onBlur={renameCatFn}
                    onClick={(e) => e.stopPropagation()} />
                ) : (
                  <button type="button" onClick={() => toggleCategory(cat)} className="min-w-0 text-left hover:opacity-80 transition-opacity">
                    <span className="text-white font-semibold text-base truncate block">{cat}</span>
                  </button>
                )}
              </div>
              <span className="text-xs text-slate-500 mr-3 bg-slate-700/30 px-2 py-0.5 rounded">{catItems.length}</span>
              <div className="flex items-center gap-0.5">
                <button type="button" onClick={() => { setRenamingCat(cat); setRv(cat); }} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded" title="Переименовать">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
                <button type="button" onClick={() => { setAf({ ...af, category: cat, subsection: '' }); setShowAdd('new'); }} className="p-1.5 text-slate-400 hover:text-green-400 hover:bg-green-500/10 rounded" title="Добавить услугу">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </button>
                <button type="button" onClick={() => delCat(cat)} disabled={Boolean(movingId || pendingToggleId || deletingKey)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded disabled:opacity-50" title="Удалить">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>

            {/* Subsections */}
            {expandedCats.has(cat) && (
              <div className="border-t border-slate-700/30">
                {Object.entries(subs).map(([sub, subItems]) => {
                  const sk = `${cat}|||${sub}`;
                  const slides: { [idx: number]: PricingItem[] } = {};
                  for (const i of subItems) { const si = pf(i.features).slideIndex; if (!slides[si]) slides[si] = []; slides[si].push(i); }
                  const si = Object.keys(slides).map(Number).sort((a, b) => a - b);

                  return (
                    <div key={sub}>
                      <div className="flex items-center px-8 py-2 hover:bg-slate-700/15 transition-colors border-b border-slate-700/5">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <button type="button" onClick={() => toggleSubsection(sk)}
                            className="p-0.5 rounded" aria-label={`${expandedSubs.has(sk) ? 'Свернуть' : 'Развернуть'} подраздел «${sub}»`} aria-expanded={expandedSubs.has(sk)}>
                            <svg className={`w-3 h-3 text-slate-500 transition-transform duration-200 ${expandedSubs.has(sk) ? 'rotate-90' : ''}`}
                              fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                          {renamingSub === sk ? (
                            <input value={rv} onChange={(e) => setRv(e.target.value)}
                              onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === 'Enter') { e.preventDefault(); void renameSubFn(cat, sub); }
                                if (e.key === 'Escape') { e.preventDefault(); setRenamingSub(null); }
                              }}
                              className="px-2 py-0.5 bg-slate-900 border border-slate-600 rounded text-white text-xs" autoFocus onBlur={() => renameSubFn(cat, sub)}
                              onClick={(e) => e.stopPropagation()} />
                          ) : (
                            <button type="button" onClick={() => toggleSubsection(sk)} className="min-w-0 text-left">
                              <span className="text-sm text-slate-300 truncate block">{sub}</span>
                            </button>
                          )}
                        </div>
                        <span className="text-xs text-slate-600 mr-2">{subItems.length} · {si.length} стр.</span>
                        <div className="flex items-center gap-0.5">
                          <button type="button" onClick={() => { setRenamingSub(sk); setRv(sub); }} className="p-1 text-slate-500 hover:text-white rounded" title="Переименовать">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button type="button" onClick={() => { setAf({ ...af, category: cat, subsection: sub, slideIndex: si.length > 0 ? Math.max(...si) : 0 }); setShowAdd('new'); }} className="p-1 text-slate-500 hover:text-green-400 rounded" title="Добавить">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                          </button>
                          <button type="button" onClick={() => delSub(cat, sub)} disabled={Boolean(movingId || pendingToggleId || deletingKey)} className="p-1 text-slate-500 hover:text-red-400 rounded disabled:opacity-50" title="Удалить">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>

                      {expandedSubs.has(sk) && (
                        <div>
                          {si.map((slideIdx) => {
                            const slideItems = slides[slideIdx];
                            return (
                              <div key={slideIdx}>
                                <div className="flex items-center px-12 py-1.5 bg-slate-900/30 border-b border-slate-700/5">
                                  <span className="text-xs text-slate-500 font-medium">Страница {slideIdx + 1}</span>
                                  {slideItems[0] && (() => { const f = pf(slideItems[0].features); return f.subtitleTitle ? <span className="text-xs text-slate-600 ml-2">— {f.subtitleTitle}</span> : null; })()}
                                  <div className="flex-1" />
                                  <button type="button" onClick={() => { setAf({ ...af, category: cat, subsection: sub, slideIndex: slideIdx }); setShowAdd('new'); }}
                                    className="px-2 py-0.5 text-xs text-slate-500 hover:text-[#DB9844]">+ услуга</button>
                                </div>

                                {slideItems.map((item, itemIdx) => {
                                  const feat = pf(item.features);
                                  return (
                                    <div key={item.id} className={`px-12 py-2.5 transition-opacity ${!item.visible ? 'opacity-50' : ''} ${movingId === item.id ? 'opacity-50' : ''}`}>
                                      {editingId === item.id ? (
                                        <div className="space-y-2">
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <input value={ef.name} onChange={(e) => setEf({ ...ef, name: e.target.value })} onKeyDown={(e) => e.stopPropagation()} className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded text-white text-sm" placeholder="Название" />
                                            <input value={ef.price} onChange={(e) => setEf({ ...ef, price: e.target.value })} onKeyDown={(e) => e.stopPropagation()} className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded text-white text-sm" placeholder="Цена" />
                                          </div>
                                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            <input value={ef.subtitleTitle} onChange={(e) => setEf({ ...ef, subtitleTitle: e.target.value })} onKeyDown={(e) => e.stopPropagation()} className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded text-white text-xs" placeholder="Подзаголовок" />
                                            <input value={ef.subtitle} onChange={(e) => setEf({ ...ef, subtitle: e.target.value })} onKeyDown={(e) => e.stopPropagation()} className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded text-white text-xs" placeholder="Описание" />
                                            <input value={ef.meta} onChange={(e) => setEf({ ...ef, meta: e.target.value })} onKeyDown={(e) => e.stopPropagation()} className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded text-white text-xs" placeholder="Мета" />
                                          </div>
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <button type="button" onClick={() => saveItem(item.id)} disabled={saving}
                                              className="px-3 py-1.5 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50">{saving ? '...' : 'Сохранить'}</button>
                                            <button type="button" onClick={() => setEditingId(null)}
                                              className="px-3 py-1.5 bg-slate-600 text-white rounded text-xs hover:bg-slate-500">Отмена</button>
                                            <span className="text-xs text-slate-500 ml-2">→ Стр:</span>
                                            {si.map((s) => (
                                              <button key={s} type="button" onClick={() => moveToSlide(item.id, s)}
                                                className={`px-2 py-1 text-xs rounded ${feat.slideIndex === s ? 'bg-[#DB9844] text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}>{s + 1}</button>
                                            ))}
                                            <button type="button" onClick={() => moveToSlide(item.id, Math.max(...si) + 1)}
                                              className="px-2 py-1 text-xs rounded bg-slate-700 text-slate-400 hover:text-white">+</button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-3">
                                          {/* Reorder arrows */}
                                          <div className="flex flex-col">
                                            <ArrowBtn onClick={() => moveItem(item, 'up')} disabled={itemIdx === 0} title="Вверх" />
                                            <ArrowDownBtn onClick={() => moveItem(item, 'down')} disabled={itemIdx === slideItems.length - 1} title="Вниз" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <span className="text-sm text-white truncate block">{item.name}</span>
                                            {(feat.subtitleTitle || feat.meta) && (
                                              <span className="text-xs text-slate-500 truncate block">
                                                {feat.subtitleTitle}{feat.subtitleTitle && feat.meta ? ' · ' : ''}{feat.meta}
                                              </span>
                                            )}
                                          </div>
                                          <span className="text-sm font-semibold text-[#DB9844] whitespace-nowrap">{item.price}</span>
                                          <div className="flex items-center gap-0.5">
                                            <button type="button" onClick={() => {
                                              setEditingId(item.id);
                                              setEf({ name: item.name, price: item.price, subtitle: feat.subtitle, subtitleTitle: feat.subtitleTitle, meta: feat.meta });
                                            }} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded" title="Редактировать">
                                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                              <button type="button" onClick={() => toggleVis(item.id)}
                                              disabled={Boolean(movingId || pendingToggleId || deletingKey)}
                                              className={`p-1.5 rounded disabled:opacity-40 ${item.visible ? 'text-green-400' : 'text-slate-600'}`} title={item.visible ? 'Скрыть' : 'Показать'}>
                                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d={item.visible ? 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' : 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M3 3l3.59 3.59'} />
                                              </svg>
                                            </button>
                                            <button type="button" onClick={() => delItem(item.id, item.name)} disabled={Boolean(movingId || pendingToggleId || deletingKey)}
                                              className="p-1.5 text-slate-400 hover:text-red-400 rounded disabled:opacity-50" title="Удалить">
                                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                          <button type="button" onClick={() => { setAf({ ...af, category: cat, subsection: sub, slideIndex: Math.max(...si, -1) + 1 }); setShowAdd('new'); }}
                            className="w-full px-12 py-2 text-xs text-slate-500 hover:text-[#DB9844] hover:bg-slate-700/10 text-left border-t border-slate-700/5">+ Добавить страницу</button>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="px-8 py-2">
                  <button type="button" onClick={() => { setRenamingSub(`__new__|||${cat}`); setRv(''); }} className="text-xs text-slate-500 hover:text-[#DB9844]">+ Добавить подраздел</button>
                  {renamingSub === `__new__|||${cat}` && (
                    <div className="mt-2 flex gap-2">
                      <input value={rv} onChange={(e) => setRv(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') addSub(cat); if (e.key === 'Escape') setRenamingSub(null); }}
                        placeholder="Название подраздела" className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-600 rounded text-white text-xs" autoFocus />
                      <button type="button" onClick={() => addSub(cat)} className="px-3 py-1.5 bg-green-600 text-white rounded text-xs">OK</button>
                      <button type="button" onClick={() => setRenamingSub(null)} className="px-3 py-1.5 bg-slate-600 text-white rounded text-xs">✕</button>
                    </div>
                  )}
                </div>
              </div>
            )}
            </>
            )}
          </SortableCategory>
        );
      })}
        </SortableContext>
      </DndContext>

      {catEntries.length === 0 && <div className="text-center py-12 text-slate-400">{search ? 'Ничего не найдено' : 'Нет данных'}</div>}
    </div>
  );
}
