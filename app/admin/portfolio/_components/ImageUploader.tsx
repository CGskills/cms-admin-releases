'use client';

import { useState, useRef } from 'react';
import { extractPathFromUrl, validateImageFile } from '@/lib/storage/upload';
import Button from '@/components/ui/Button';
import { deletePortfolioImageAction, uploadPortfolioImageAction } from '../actions';

interface ImageUploaderProps {
  label: string;
  value: string;
  onChange: (url: string, uploadedPath?: string) => void;
  required?: boolean;
}

export default function ImageUploader({
  label,
  value,
  onChange,
  required = false,
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const initialPath = value ? extractPathFromUrl(value, 'portfolio') : null;
  const initialPathRef = useRef(initialPath);
  // The selected image is already represented by the controlled `value` prop.
  // Deriving its storage path avoids an effect-driven state update (and keeps
  // the path in sync immediately when a parent rolls back a failed save).
  const activePath = value ? extractPathFromUrl(value, 'portfolio') : null;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setUploadProgress(0);

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Недопустимый файл');
      return;
    }

    setIsUploading(true);

    try {
      const oldPath = value ? extractPathFromUrl(value, 'portfolio') : null;
      const result = await uploadPortfolioImageAction(file, oldPath);
      setUploadProgress(100);
      const previousPath = activePath;
      onChange(result.url, result.path);

      if (previousPath && previousPath !== initialPathRef.current && previousPath !== result.path) {
        try {
          await deletePortfolioImageAction(previousPath);
        } catch {
          // Media remains available for a later manual cleanup.
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleUrlChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = e.target.value;
    const nextPath = extractPathFromUrl(nextValue, 'portfolio');
    const previousPath = activePath;
    onChange(nextValue);

    if (previousPath && previousPath !== initialPathRef.current && previousPath !== nextPath) {
      try {
        await deletePortfolioImageAction(previousPath);
      } catch {
        setError('Не удалось удалить временное изображение; его можно удалить в Media');
      }
    }
  };

  const handleClear = async () => {
    if (isUploading || isDeleting) return;
    setError('');
    const pathToClear = activePath;
    const isTemporary = Boolean(pathToClear && pathToClear !== initialPathRef.current);

    if (pathToClear && isTemporary) {
      setIsDeleting(true);
      try {
        await deletePortfolioImageAction(pathToClear);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Ошибка удаления изображения');
        setIsDeleting(false);
        return;
      }
      setIsDeleting(false);
    }

    onChange('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-300">
        {label} {required && <span className="text-red-400">*</span>}
      </label>

      {/* Preview */}
      {value && (
        <div className="relative w-full h-48 bg-slate-900/50 border border-slate-700 rounded-lg overflow-hidden group">
          <img
            src={value}
            alt="Превью"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleClear}
              disabled={isUploading || isDeleting}
            >
              Удалить
            </Button>
          </div>
        </div>
      )}

      {/* Upload or URL input */}
      <div className="flex gap-3">
        <div className="flex-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={isUploading || isDeleting}
            className="hidden"
            id={`file-${label}`}
          />
          <label htmlFor={`file-${label}`}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isUploading || isDeleting}
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 mr-2"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Загрузка {uploadProgress}%
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  Загрузить файл
                </>
              )}
            </Button>
          </label>
        </div>
      </div>

      {/* URL Input */}
      <div className="relative">
        <input
          type="url"
          value={value}
          onChange={handleUrlChange}
          placeholder="https://example.com/image.jpg"
          className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#DB9844] focus:border-transparent transition-all text-sm"
          disabled={isUploading}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/50 rounded px-3 py-2">
          {error}
        </div>
      )}

      {/* Help text */}
      <p className="text-xs text-slate-500">
        Загрузите изображение или вставьте URL. Макс. размер: 10 МБ
      </p>
    </div>
  );
}
