'use client';

import { useState, useRef } from 'react';
import { deleteTestimonialImageAction, uploadTestimonialImageAction } from '../actions';
import type { MediaType } from '@/types/testimonials';

interface ImageUploadProps {
  type: MediaType;
  currentPath?: string | null;
  currentUrl?: string | null;
  onUpload: (path: string, url: string) => void;
  onDelete: () => void;
  testimonialId?: string;
  label: string;
  maxSize?: number; // in MB
}

export default function ImageUpload({
  type,
  currentPath,
  currentUrl,
  onUpload,
  onDelete,
  testimonialId,
  label,
  maxSize = 10,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  // Keep persisted and temporary paths separate. Persisted files are deleted
  // by the entity action after a successful DB update; temporary replacements
  // can be removed immediately when superseded or cleared.
  const initialPathRef = useRef(currentPath || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // The parent owns the selected image. Deriving these values from props keeps
  // rollback after a failed save immediately authoritative without an
  // effect-driven state update.
  const preview = currentUrl || null;
  const activePath = currentPath || null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`Размер файла не должен превышать ${maxSize} МБ`);
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Загрузите изображение (JPG, PNG, WebP или GIF)');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const result = await uploadTestimonialImageAction(file, type, testimonialId, currentPath || null);
      const previousPath = activePath;
      onUpload(result.path, result.url);

      if (previousPath && previousPath !== initialPathRef.current && previousPath !== result.path) {
        try {
          await deleteTestimonialImageAction(previousPath);
        } catch {
          // Media remains available for a later manual cleanup.
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    if (isUploading || isDeleting) return;
    setError('');
    const pathToClear = activePath;
    const isTemporary = Boolean(pathToClear && pathToClear !== initialPathRef.current);
    if (pathToClear && isTemporary) {
      setIsDeleting(true);
      try {
        await deleteTestimonialImageAction(pathToClear);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Ошибка удаления изображения');
        setIsDeleting(false);
        return;
      }
      setIsDeleting(false);
    }
    onDelete();
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        disabled={isUploading || isDeleting}
        className="hidden"
      />

      {preview ? (
        <div className="relative group">
          <div className="relative rounded-lg overflow-hidden border border-slate-600 bg-slate-800/50">
            <img
              src={preview}
              alt={label}
              className={`w-full object-cover ${type === 'avatar' ? 'h-32 w-32 rounded-full mx-auto' : 'h-48'}`}
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isDeleting}
                className="px-3 py-2 bg-[#DB9844] text-white rounded-lg text-sm hover:bg-[#c48535] transition-colors disabled:opacity-50"
              >
                {isUploading ? 'Загрузка...' : 'Заменить'}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isUploading || isDeleting}
                className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center hover:border-[#DB9844] transition-colors">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isDeleting}
            className="w-full"
          >
            <div className="w-12 h-12 bg-[#DB9844]/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-6 h-6 text-[#DB9844]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-slate-300 text-sm mb-1">
              {isUploading ? 'Загрузка...' : 'Нажмите для загрузки'}
            </p>
            <p className="text-slate-500 text-xs">
              JPG, PNG, WebP, GIF (макс. {maxSize} МБ)
            </p>
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
