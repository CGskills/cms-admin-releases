'use client';

import { useState } from 'react';
import { PricingItem } from '@/types/pricing';
import { createPricingDirect } from '../actions';
import Button from '@/components/ui/Button';

interface AddPricingItemDialogProps {
  categories: string[];
  onClose: () => void;
  onCreated: (item: PricingItem) => void;
}

export default function AddPricingItemDialog({
  categories,
  onClose,
  onCreated,
}: AddPricingItemDialogProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState(categories[0] || '');
  const [newCategory, setNewCategory] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const useNewCategory = !categories.includes(category) || category === '__new__';
  const effectiveCategory = useNewCategory ? newCategory : category;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !effectiveCategory.trim() || !price.trim()) {
      setError('Заполните обязательные поля');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Mutations from the admin UI must go through the server action.  A
      // browser Supabase client only proves that a user has a session and can
      // therefore bypass the CMS admin allow-list whenever permissive RLS
      // policies are present.  The server action performs the same validation
      // and sequencing as the rest of the pricing editor, then returns the
      // committed row for an immediate local state update.
      const formData = new FormData();
      formData.set('name', name.trim());
      formData.set('category', effectiveCategory.trim());
      formData.set('description', description.trim());
      formData.set('price', price.trim());
      formData.set('duration', duration.trim());

      const data = await createPricingDirect(formData);
      if (data) onCreated(data as PricingItem);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка создания');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Новая услуга</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 mb-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Название *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#DB9844]"
              placeholder="Чистка зубов"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Категория *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#DB9844]"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
              <option value="__new__">+ Новая категория</option>
            </select>
          </div>

          {useNewCategory && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Название категории *
              </label>
              <input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#DB9844]"
                placeholder="Терапия"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Описание
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#DB9844] resize-none"
              placeholder="Краткое описание услуги..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Цена *
              </label>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#DB9844]"
                placeholder="1500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Срок
              </label>
              <input
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#DB9844]"
                placeholder="1 час"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting} className="flex-1">
              Отмена
            </Button>
            <Button type="submit" isLoading={isSubmitting} className="flex-1">
              Создать
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
