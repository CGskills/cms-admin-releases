'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import { createPricing, updatePricing } from '../actions';

interface PricingFormProps {
  pricing?: {
    id: string;
    category: string;
    name: string;
    description: string;
    price: string;
    duration?: string;
  };
  categories: string[];
}

export default function PricingForm({ pricing, categories }: PricingFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [category, setCategory] = useState(pricing?.category || '');
  const [useNewCategory, setUseNewCategory] = useState(
    pricing ? !categories.includes(pricing.category) : false
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const formData = new FormData(e.currentTarget);
      formData.set('category', useNewCategory ? (formData.get('new_category') as string) : category);

      if (pricing) {
        await updatePricing(pricing.id, formData);
      } else {
        await createPricing(formData);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Категория *
          </label>
          <select
            value={useNewCategory ? '__new__' : category}
            onChange={(e) => {
              if (e.target.value === '__new__') {
                setUseNewCategory(true);
                setCategory('');
              } else {
                setUseNewCategory(false);
                setCategory(e.target.value);
              }
            }}
            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#DB9844] focus:border-transparent transition-all"
            disabled={isSubmitting}
            required
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
            {categories.length === 0 && <option value="">Нет категорий</option>}
            <option value="__new__">+ Новая категория</option>
          </select>
          {useNewCategory && (
            <Input
              name="new_category"
              placeholder="Название новой категории"
              className="mt-2"
              required
              disabled={isSubmitting}
            />
          )}
        </div>

        <Input
          label="Название услуги *"
          name="name"
          defaultValue={pricing?.name}
          placeholder="Чистка зубов"
          required
          disabled={isSubmitting}
        />
      </div>

      <Textarea
        label="Описание"
        name="description"
        defaultValue={pricing?.description}
        placeholder="Подробное описание услуги..."
        rows={3}
        disabled={isSubmitting}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Цена *"
          name="price"
          defaultValue={pricing?.price}
          placeholder="1500"
          required
          disabled={isSubmitting}
        />

        <Input
          label="Срок выполнения"
          name="duration"
          defaultValue={pricing?.duration}
          placeholder="1 час"
          disabled={isSubmitting}
        />
      </div>

      <div className="flex gap-4 pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Отмена
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {pricing ? 'Сохранить изменения' : 'Создать услугу'}
        </Button>
      </div>
    </form>
  );
}
