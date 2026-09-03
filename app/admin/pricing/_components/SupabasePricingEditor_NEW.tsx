'use client';

import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  closestCenter,
  DndContext,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
  type DraggableNode,
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
        context: { active: DraggableNode }
      ) => {
        const target = event.target as HTMLElement;

        if (process.env.NODE_ENV === 'development' && event.key === ' ') {
          console.log('[FilteredKeyboardSensor] Space key detected', {
            'target.tagName': target.tagName,
            'target.contentEditable': target.contentEditable,
            'will filter?': target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true',
          });
        }

        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.contentEditable === 'true'
        ) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[FilteredKeyboardSensor] Filtered out - returning false');
          }
          return false;
        }

        if (process.env.NODE_ENV === 'development') {
          console.log('[FilteredKeyboardSensor] Delegating to parent KeyboardSensor');
        }
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
  const queryClient = useQueryClient();
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [ef, setEf] = useState({ name: '', price: '', subtitle: '', subtitleTitle: '', meta: '' });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
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
  const [actionError, setActionError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(FilteredKeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // React Query: fetch items with automatic caching and race condition handling
  const { data: items = [], isLoading: loading } = useQuery({
    queryKey: ['pricingItems'],
    queryFn: getPricingEditorItems,
    staleTime: 0,
  });

  // React Query: mutation for all pricing operations
  const pricingMutation = useMutation({
    mutationFn: mutatePricingEditorAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricingItems'] });
    },
    onError: (error) => {
      setActionError(`Ошибка: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`);
    },
  });

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      installGlobalDiagnostics();
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
