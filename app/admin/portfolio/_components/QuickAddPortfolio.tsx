'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { createPortfolio } from '../actions';

interface QuickAddPortfolioProps {
  onClose: () => void;
  onCreated?: () => void;
}

export default function QuickAddPortfolio({ onClose, onCreated }: QuickAddPortfolioProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    description: '',
    category: '',
    image_url: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('Введите название проекта');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('subtitle', formData.subtitle);
      data.append('description', formData.description);
      data.append('category', formData.category);
      data.append('image_url', formData.image_url);
      data.append('slug', formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
      
      await createPortfolio(data);
      
      if (onCreated) {
        onCreated();
      }
      
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания проекта');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-700 max-w-2xl w-full">
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-white">Быстрое добавление проекта</h2>
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
            Создайте новый проект портфолио. Подробности можно будет добавить позже.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          <Input
            label="Название проекта *"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Например: Редизайн корпоративного сайта"
            required
            disabled={isSubmitting}
          />

          <Input
            label="Подзаголовок"
            value={formData.subtitle}
            onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
            placeholder="Краткое описание одной строкой"
            disabled={isSubmitting}
          />

          <Textarea
            label="Описание"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Опишите проект подробнее..."
            rows={4}
            disabled={isSubmitting}
          />

          <Input
            label="Категория"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            placeholder="Например: Web-дизайн, Брендинг, UX/UI"
            disabled={isSubmitting}
          />

          <Input
            label="URL обложки"
            value={formData.image_url}
            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
            placeholder="https://example.com/image.jpg"
            type="url"
            disabled={isSubmitting}
          />

          <div className="text-xs text-slate-500">
            * После создания вы сможете добавить галерею, технологии, проблему/решение и другие детали на странице редактирования.
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Отмена
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Создать проект
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
