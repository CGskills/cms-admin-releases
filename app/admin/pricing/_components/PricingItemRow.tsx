'use client';

import { useState, useRef, useEffect } from 'react';
import { PricingItem, PricingSettings, PricingColumn } from '@/types/pricing';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { quickUpdatePricing } from '../actions';

interface PricingItemRowProps {
  item: PricingItem;
  settings: PricingSettings;
  columns: PricingColumn[];
  onToggleVisibility: (id: string) => void;
  onDelete: (id: string) => void;
  onInlineUpdate: (id: string, field: string, value: string) => void;
}

export default function PricingItemRow({
  item,
  settings,
  columns,
  onToggleVisibility,
  onDelete,
  onInlineUpdate,
}: PricingItemRowProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingField]);

  const startEdit = (field: string, value: string) => {
    setEditingField(field);
    setEditValue(value);
  };

  const saveEdit = async () => {
    if (!editingField) return;
    const field = editingField;
    const value = editValue;
    setEditingField(null);

    if (value === (item as Record<string, unknown>)[field]) return;

    onInlineUpdate(item.id, field, value);
    try {
      await quickUpdatePricing(item.id, field, value);
    } catch {
      onInlineUpdate(item.id, field, String((item as Record<string, unknown>)[field]));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    }
    if (e.key === 'Escape') {
      setEditingField(null);
    }
  };

  const formatPrice = (price: string) => {
    if (!price) return '—';
    if (settings.currencyPosition === 'before') {
      return `${settings.currency}${price}`;
    }
    return `${price}${settings.currency}`;
  };

  const renderCellValue = (column: PricingColumn) => {
    const value = (item as Record<string, unknown>)[column.key] as string || '';
    const isEditing = editingField === column.key;

    if (!column.editable) {
      if (column.type === 'price') {
        return <span className="text-lg font-bold text-[#DB9844]">{formatPrice(value)}</span>;
      }
      return <span className="text-white">{value || '—'}</span>;
    }

    if (isEditing) {
      if (column.type === 'textarea') {
        return (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={handleKeyDown}
            rows={2}
            className="w-full px-2 py-1 bg-slate-900/50 border border-[#DB9844] rounded text-white text-sm focus:outline-none resize-none pricing-typography"
          />
        );
      }

      return (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={handleKeyDown}
          type={column.type === 'number' ? 'number' : 'text'}
          className="w-full px-2 py-1 bg-slate-900/50 border border-[#DB9844] rounded text-white text-sm focus:outline-none pricing-typography"
        />
      );
    }

    // Non-editing display
    return (
      <button
        onClick={() => startEdit(column.key, value)}
        className="text-left w-full group"
      >
        {column.type === 'price' ? (
          <span className="text-lg font-bold text-[#DB9844] group-hover:underline">
            {formatPrice(value)}
          </span>
        ) : column.type === 'textarea' ? (
          <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors line-clamp-2">
            {value || 'Нажмите для добавления описания'}
          </span>
        ) : column.type === 'boolean' ? (
          <span className={`text-sm ${value ? 'text-green-400' : 'text-slate-500'}`}>
            {value ? 'Да' : 'Нет'}
          </span>
        ) : column.type === 'badge' ? (
          <span className="inline-block px-2 py-1 bg-[#DB9844]/20 text-[#DB9844] rounded text-xs font-medium">
            {value || '—'}
          </span>
        ) : column.type === 'link' ? (
          <span className="text-blue-400 hover:underline text-sm">
            {value || 'Добавить ссылку'}
          </span>
        ) : (
          <span className="text-white group-hover:text-[#DB9844] transition-colors">
            {value || '—'}
          </span>
        )}
      </button>
    );
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b border-slate-700/30 transition-all ${
        isDragging ? 'opacity-50 bg-slate-700/50' : 'hover:bg-slate-700/20'
      } ${!item.visible ? 'opacity-50' : ''}`}
    >
      {/* Drag handle */}
      <td className="py-3 px-2 text-center">
        <button
          {...attributes}
          {...listeners}
          className="cursor-move p-1 hover:bg-slate-700/50 rounded transition-colors"
        >
          <svg className="w-4 h-4 text-slate-500 mx-auto" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 6a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm8-16a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
      </td>

      {/* Dynamic columns */}
      {columns.map((column) => (
        <td
          key={column.id}
          className="py-3 px-6"
          style={column.width ? { width: `${column.width}px` } : undefined}
        >
          {renderCellValue(column)}
        </td>
      ))}

      {/* Actions */}
      <td className="py-3 px-6">
        <div className="flex items-center justify-end gap-1">
          {/* Visibility toggle */}
          <button
            onClick={() => onToggleVisibility(item.id)}
            className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
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

          {/* Delete */}
          {showConfirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onDelete(item.id)}
                className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
              >
                Да
              </button>
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors"
              >
                Нет
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="p-2 rounded-lg hover:bg-red-500/10 transition-colors"
              title="Удалить"
            >
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
