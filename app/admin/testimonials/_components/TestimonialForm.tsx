'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import ImageUpload from './ImageUpload';
import { createTestimonial, deleteTestimonialImageAction, updateTestimonial } from '../actions';
import { getTestimonialImageUrl } from '@/lib/testimonials/storage';
import type { Testimonial } from '@/types/testimonials';

interface TestimonialFormProps {
  testimonial?: Testimonial;
}

export default function TestimonialForm({ testimonial }: TestimonialFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [rating, setRating] = useState(testimonial?.rating || 5);
  const initialAvatarPath = testimonial?.avatar_path || null;
  const initialScreenshotPath = testimonial?.screenshot_path || null;
  const initialAvatarUrl = initialAvatarPath ? getTestimonialImageUrl(initialAvatarPath) : null;
  const initialScreenshotUrl = initialScreenshotPath ? getTestimonialImageUrl(initialScreenshotPath) : null;
  const [avatarPath, setAvatarPath] = useState(initialAvatarPath);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [screenshotPath, setScreenshotPath] = useState(initialScreenshotPath);
  const [screenshotUrl, setScreenshotUrl] = useState(initialScreenshotUrl);
  const [uploadedImagePaths, setUploadedImagePaths] = useState<string[]>([]);
  const [published, setPublished] = useState(testimonial?.published || false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const formData = new FormData(e.currentTarget);
      formData.set('rating', String(rating));
      formData.set('published', String(published));
      formData.set('avatar_path', avatarPath || '');
      formData.set('screenshot_path', screenshotPath || '');
      formData.set('uploaded_paths', JSON.stringify(uploadedImagePaths));

      if (testimonial) {
        await updateTestimonial(testimonial.id, formData);
      } else {
        await createTestimonial(formData);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
      // Failed server mutations remove temporary objects. Restore the values
      // that were persisted when the form opened to avoid submitting a stale
      // temporary path on retry.
      setAvatarPath(initialAvatarPath);
      setAvatarUrl(initialAvatarUrl);
      setScreenshotPath(initialScreenshotPath);
      setScreenshotUrl(initialScreenshotUrl);
      setUploadedImagePaths([]);
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (isSubmitting) return;

    await Promise.allSettled(
      uploadedImagePaths
        .filter((path) => path !== initialAvatarPath && path !== initialScreenshotPath)
        .map((path) => deleteTestimonialImageAction(path)),
    );
    router.back();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Имя клиента *"
          name="name"
          defaultValue={testimonial?.name}
          placeholder="Иван"
          required
          disabled={isSubmitting}
        />

        <Input
          label="Фамилия"
          name="surname"
          defaultValue={testimonial?.surname || ''}
          placeholder="Иванов"
          disabled={isSubmitting}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Должность / Профессия"
          name="position"
          defaultValue={testimonial?.position || ''}
          placeholder="Директор"
          disabled={isSubmitting}
        />

        <Input
          label="Компания"
          name="company"
          defaultValue={testimonial?.company || ''}
          placeholder="ООО Компания"
          disabled={isSubmitting}
        />
      </div>

      <Input
        label="Город / Страна"
        name="location"
        defaultValue={testimonial?.location || ''}
        placeholder="Москва, Россия"
        disabled={isSubmitting}
      />

      <Textarea
        label="Текст отзыва *"
        name="content"
        defaultValue={testimonial?.content}
        placeholder="Напишите отзыв..."
        rows={5}
        required
        disabled={isSubmitting}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ImageUpload
          type="avatar"
          label="Фото клиента"
          currentPath={avatarPath}
          currentUrl={avatarUrl}
          testimonialId={testimonial?.id}
          onUpload={(path, url) => {
            setAvatarPath(path);
            setAvatarUrl(url);
            setUploadedImagePaths((paths) => paths.includes(path) ? paths : [...paths, path]);
          }}
          onDelete={() => {
            setAvatarPath(null);
            setAvatarUrl(null);
          }}
        />

        <ImageUpload
          type="screenshot"
          label="Скриншот отзыва"
          currentPath={screenshotPath}
          currentUrl={screenshotUrl}
          testimonialId={testimonial?.id}
          onUpload={(path, url) => {
            setScreenshotPath(path);
            setScreenshotUrl(url);
            setUploadedImagePaths((paths) => paths.includes(path) ? paths : [...paths, path]);
          }}
          onDelete={() => {
            setScreenshotPath(null);
            setScreenshotUrl(null);
          }}
        />
      </div>

      <Input
        label="Ссылка на источник отзыва"
        name="source_url"
        type="url"
        defaultValue={testimonial?.source_url || ''}
        placeholder="https://example.com/review"
        disabled={isSubmitting}
      />

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Рейтинг *</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              className="focus:outline-none"
              disabled={isSubmitting}
            >
              <svg
                className={`w-8 h-8 ${value <= rating ? 'text-[#DB9844]' : 'text-slate-600'} hover:text-[#DB9844] transition-colors disabled:opacity-50`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="hidden"
          name="published"
          value={published ? 'true' : 'false'}
        />
        <input
          type="checkbox"
          id="published"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
          disabled={isSubmitting}
          className="w-5 h-5 rounded border-slate-600 bg-slate-900/50 text-[#DB9844] focus:ring-[#DB9844] focus:ring-offset-0 disabled:opacity-50"
        />
        <label htmlFor="published" className="text-sm text-slate-300">
          Опубликовать отзыв (будет виден на сайте)
        </label>
      </div>

      <div className="flex gap-4">
        <Button type="button" variant="ghost" onClick={handleCancel} disabled={isSubmitting}>
          Отмена
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {testimonial ? 'Обновить отзыв' : 'Добавить отзыв'}
        </Button>
      </div>
    </form>
  );
}
