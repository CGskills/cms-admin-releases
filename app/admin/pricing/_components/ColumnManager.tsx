'use client';

import { useState, useCallback } from 'react';
import { PricingColumn, ColumnType, DEFAULT_PRICING_COLUMNS } from '@/types/pricing';
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
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Button from '@/components/ui/Button';

interface ColumnManagerProps {
  columns: PricingColumn[];
  onChange: (columns: PricingColumn[]) => void;
  onClose: () => void;
}

const COLUMN_TYPES: { value: ColumnType; label: string }[] = [
  { value: 'text', label: 'Текст' },
  { value: 'textarea', label: 'Многострочный текст' },
  { value: 'price', label: 'Цена' },
  { value: 'number', label: 'Число' },
  { value: 'duration', label: 'Срок' },
  { value: 'badge', label: 'Бейдж' },
  { value: 'boolean', label: 'Да/Нет' },
  { value: 'link', label: 'Ссылка' },
];

function SortableColumnItem({
  column,
  onEdit,
  onDelete,
  onToggleVisibility,
}: {
  column: PricingColumn;
  onEdit: (column: PricingColumn) => void;
  onDelete: (id: string) => void;
  onToggleVisibility: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-slate-800/50 rounded-lg border ${
        isDragging ? 'border-[#DB9844]' : 'border-slate-700'
      } p-4`}
    >
      <div className="flex items-center gap-3">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-move p-1 hover:bg-slate-700/50 rounded transition-colors"
        >
          <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 6a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm8-16a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>

        {/* Column info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-white">{column.label}</span>
            <span className="text-xs px-2 py-0.5 bg-slate-700 rounded text-slate-300">
              {COLUMN_TYPES.find(t => t.value === column.type)?.label}
            </span>
            {column.required && (
              <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded">
                Обязательное
              </span>
            )}
          </div>
          <div className="text-sm text-slate-400">
            Ключ: <code className="text-xs bg-slate-900/50 px-1 py-0.5 rounded">{column.key}</code>
            {column.width && ` • Ширина: ${column.width}px`}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggleVisibility(column.id)}
            className="p-2 hover:bg-slate-700/50 rounded transition-colors"
            title={column.visible ? 'Скрыть' : 'Показать'}
          >
            {column.visible ? (
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

          <button
            onClick={() => onEdit(column)}
            className="p-2 hover:bg-slate-700/50 rounded transition-colors"
            title="Редактировать"
          >
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          {!column.required && (
            <button
              onClick={() => onDelete(column.id)}
              className="p-2 hover:bg-red-500/10 rounded transition-colors"
              title="Удалить"
            >
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ColumnManager({ columns, onChange, onClose }: ColumnManagerProps) {
  const [localColumns, setLocalColumns] = useState<PricingColumn[]>(columns);
  const [editingColumn, setEditingColumn] = useState<PricingColumn | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setLocalColumns((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        return reordered.map((col, index) => ({ ...col, order: index }));
      });
    }
  }, []);

  const handleToggleVisibility = useCallback((id: string) => {
    setLocalColumns((prev) =>
      prev.map((col) => (col.id === id ? { ...col, visible: !col.visible } : col))
    );
  }, []);

  const handleDelete = useCallback((id: string) => {
    setLocalColumns((prev) => prev.filter((col) => col.id !== id));
  }, []);

  const handleSaveColumn = useCallback((column: PricingColumn) => {
    if (isAddingNew) {
      setLocalColumns((prev) => [...prev, { ...column, order: prev.length }]);
      setIsAddingNew(false);
    } else {
      setLocalColumns((prev) =>
        prev.map((col) => (col.id === column.id ? column : col))
      );
    }
    setEditingColumn(null);
  }, [isAddingNew]);

  const handleAddNew = useCallback(() => {
    const newColumn: PricingColumn = {
      id: `custom_${Date.now()}`,
      key: `custom_field_${Date.now()}`,
      label: 'Новая колонка',
      type: 'text',
      visible: true,
      order: localColumns.length,
      editable: true,
      required: false,
    };
    setEditingColumn(newColumn);
    setIsAddingNew(true);
  }, [localColumns.length]);

  const handleReset = useCallback(() => {
    if (confirm('Сбросить все колонки к настройкам по умолчанию?')) {
      setLocalColumns(DEFAULT_PRICING_COLUMNS);
    }
  }, []);

  const handleSave = useCallback(() => {
    onChange(localColumns);
    onClose();
  }, [localColumns, onChange, onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-700 max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-white">Управление колонками</h2>
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
            Перетаскивайте колонки для изменения порядка. Добавляйте, удаляйте и настраивайте отображение.
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {editingColumn ? (
            <ColumnEditor
              column={editingColumn}
              isNew={isAddingNew}
              onSave={handleSaveColumn}
              onCancel={() => {
                setEditingColumn(null);
                setIsAddingNew(false);
              }}
            />
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-slate-400">
                  Всего колонок: {localColumns.length} • Видимых: {localColumns.filter(c => c.visible).length}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={handleReset}>
                    Сбросить
                  </Button>
                  <Button size="sm" onClick={handleAddNew}>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Добавить колонку
                  </Button>
                </div>
              </div>

              <DndContext
                id="pricing-columns"
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={localColumns.map(c => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {localColumns.map((column) => (
                      <SortableColumnItem
                        key={column.id}
                        column={column}
                        onEdit={setEditingColumn}
                        onDelete={handleDelete}
                        onToggleVisibility={handleToggleVisibility}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </>
          )}
        </div>

        {/* Footer */}
        {!editingColumn && (
          <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose}>
              Отмена
            </Button>
            <Button onClick={handleSave}>
              Сохранить изменения
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function ColumnEditor({
  column,
  isNew,
  onSave,
  onCancel,
}: {
  column: PricingColumn;
  isNew: boolean;
  onSave: (column: PricingColumn) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState(column);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.label.trim()) {
      setError('Название колонки обязательно');
      return;
    }
    
    if (!formData.key.trim()) {
      setError('Ключ колонки обязателен');
      return;
    }

    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h3 className="text-lg font-semibold text-white mb-4">
        {isNew ? 'Новая колонка' : 'Редактирование колонки'}
      </h3>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Название колонки *
          </label>
          <input
            type="text"
            value={formData.label}
            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#DB9844]"
            placeholder="Название услуги"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Ключ (для БД) *
          </label>
          <input
            type="text"
            value={formData.key}
            onChange={(e) => setFormData({ ...formData, key: e.target.value.replace(/[^a-z0-9_]/g, '') })}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#DB9844]"
            placeholder="name"
            required
            disabled={!isNew && formData.required}
          />
          <p className="text-xs text-slate-500 mt-1">Только латиница, цифры и _</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Тип поля
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as ColumnType })}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#DB9844]"
          >
            {COLUMN_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Ширина (px)
          </label>
          <input
            type="number"
            value={formData.width || ''}
            onChange={(e) => setFormData({ ...formData, width: e.target.value ? parseInt(e.target.value) : undefined })}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#DB9844]"
            placeholder="авто"
            min="50"
          />
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.visible}
            onChange={(e) => setFormData({ ...formData, visible: e.target.checked })}
            className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-[#DB9844] focus:ring-2 focus:ring-[#DB9844]"
          />
          <span className="text-sm text-slate-300">Показывать колонку</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.editable}
            onChange={(e) => setFormData({ ...formData, editable: e.target.checked })}
            className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-[#DB9844] focus:ring-2 focus:ring-[#DB9844]"
          />
          <span className="text-sm text-slate-300">Разрешить редактирование</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.required || false}
            onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
            className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-[#DB9844] focus:ring-2 focus:ring-[#DB9844]"
            disabled={!isNew}
          />
          <span className="text-sm text-slate-300">Обязательное поле</span>
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit">
          {isNew ? 'Добавить' : 'Сохранить'}
        </Button>
      </div>
    </form>
  );
}
