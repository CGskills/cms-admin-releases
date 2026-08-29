'use client';

import { useState, useCallback } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface Category {
  name: string;
  count: number;
}

interface CategoryManagerProps {
  categories: Category[];
  onClose: () => void;
  onRename: (oldName: string, newName: string) => Promise<void>;
  onMerge: (fromCategory: string, toCategory: string) => Promise<void>;
  onDelete: (categoryName: string) => Promise<void>;
}

export default function CategoryManager({
  categories,
  onClose,
  onRename,
  onMerge,
  onDelete,
}: CategoryManagerProps) {
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [mergeFrom, setMergeFrom] = useState('');
  const [mergeTo, setMergeTo] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleRename = useCallback(async () => {
    if (!editingCategory || !newName.trim()) return;

    try {
      setIsProcessing(true);
      setError('');
      await onRename(editingCategory, newName.trim());
      setEditingCategory(null);
      setNewName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка переименования');
    } finally {
      setIsProcessing(false);
    }
  }, [editingCategory, newName, onRename]);

  const handleMerge = useCallback(async () => {
    if (!mergeFrom || !mergeTo || mergeFrom === mergeTo) {
      setError('Выберите разные категории для объединения');
      return;
    }

    if (!confirm(`Объединить категорию "${mergeFrom}" с категорией "${mergeTo}"? Все услуги из "${mergeFrom}" будут перемещены в "${mergeTo}".`)) {
      return;
    }

    try {
      setIsProcessing(true);
      setError('');
      await onMerge(mergeFrom, mergeTo);
      setMergeFrom('');
      setMergeTo('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка объединения');
    } finally {
      setIsProcessing(false);
    }
  }, [mergeFrom, mergeTo, onMerge]);

  const handleDelete = useCallback(async (categoryName: string, count: number) => {
    if (count > 0) {
      setError(`Невозможно удалить категорию "${categoryName}". В ней ${count} услуг(и). Сначала переместите или удалите услуги.`);
      return;
    }

    if (!confirm(`Удалить категорию "${categoryName}"?`)) {
      return;
    }

    try {
      setIsProcessing(true);
      setError('');
      await onDelete(categoryName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    } finally {
      setIsProcessing(false);
    }
  }, [onDelete]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-700 max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-white">Управление категориями</h2>
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
            Переименовывайте, объединяйте и удаляйте категории прайс-листа
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Categories List */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Существующие категории</h3>
            <div className="space-y-2">
              {categories.map((category) => (
                <div
                  key={category.name}
                  className="bg-slate-800/50 rounded-lg p-4 border border-slate-700"
                >
                  {editingCategory === category.name ? (
                    <div className="space-y-3">
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Новое название категории"
                        autoFocus
                        disabled={isProcessing}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleRename}
                          disabled={isProcessing || !newName.trim()}
                        >
                          Сохранить
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingCategory(null);
                            setNewName('');
                          }}
                          disabled={isProcessing}
                        >
                          Отмена
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-medium">{category.name}</div>
                        <div className="text-sm text-slate-400">
                          {category.count} {category.count === 1 ? 'услуга' : category.count < 5 ? 'услуги' : 'услуг'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingCategory(category.name);
                            setNewName(category.name);
                            setError('');
                          }}
                          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                          title="Переименовать"
                          disabled={isProcessing}
                        >
                          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(category.name, category.count)}
                          className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Удалить"
                          disabled={isProcessing || category.count > 0}
                        >
                          <svg className={`w-4 h-4 ${category.count > 0 ? 'text-slate-600' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {categories.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  Нет категорий. Категории создаются автоматически при добавлении услуг.
                </div>
              )}
            </div>
          </div>

          {/* Merge Categories */}
          {categories.length > 1 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Объединить категории</h3>
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 space-y-4">
                <p className="text-sm text-slate-400">
                  Все услуги из первой категории будут перемещены во вторую. Первая категория будет удалена.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Из категории
                    </label>
                    <select
                      value={mergeFrom}
                      onChange={(e) => {
                        setMergeFrom(e.target.value);
                        setError('');
                      }}
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#DB9844]"
                      disabled={isProcessing}
                    >
                      <option value="">Выберите категорию</option>
                      {categories.map((cat) => (
                        <option key={cat.name} value={cat.name}>
                          {cat.name} ({cat.count})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      В категорию
                    </label>
                    <select
                      value={mergeTo}
                      onChange={(e) => {
                        setMergeTo(e.target.value);
                        setError('');
                      }}
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#DB9844]"
                      disabled={isProcessing}
                    >
                      <option value="">Выберите категорию</option>
                      {categories.map((cat) => (
                        <option key={cat.name} value={cat.name}>
                          {cat.name} ({cat.count})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <Button
                  onClick={handleMerge}
                  disabled={isProcessing || !mergeFrom || !mergeTo || mergeFrom === mergeTo}
                  className="w-full"
                >
                  Объединить категории
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 flex justify-end">
          <Button variant="ghost" onClick={onClose} disabled={isProcessing}>
            Закрыть
          </Button>
        </div>
      </div>
    </div>
  );
}
