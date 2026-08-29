'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import type { MediaFile } from './MediaManager';

interface FileCardProps {
  file: MediaFile;
  bucket: string;
  onDelete: () => Promise<void>;
  onError: (message: string) => void;
}

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'avif']);

function metadataString(file: MediaFile, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = file.metadata?.[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return null;
}

function getMimeType(file: MediaFile): string | null {
  return metadataString(file, 'mimetype', 'contentType', 'content-type');
}

function getSize(file: MediaFile): number | null {
  const value = file.metadata?.size;
  const size = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(size) && size >= 0 ? size : null;
}

function formatBytes(bytes: number | null): string {
  if (bytes === null) return 'Size unavailable';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDate(value: string | null): string {
  if (!value) return 'Date unavailable';
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'Date unavailable';
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(timestamp);
}

function isImage(file: MediaFile): boolean {
  const mime = getMimeType(file);
  if (mime) return mime.startsWith('image/');
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  return IMAGE_EXTENSIONS.has(extension);
}

export default function FileCard({ file, bucket, onDelete, onError }: FileCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);

  const handleDelete = async () => {
    if (isDeleting) return;
    if (!window.confirm(`Delete ${file.name}?`)) return;

    setIsDeleting(true);
    try {
      await onDelete();
    } catch (error: unknown) {
      // Keep the card in place when Storage rejects the mutation. The parent
      // only removes it after this callback resolves successfully.
      onError(error instanceof Error ? error.message : 'Failed to delete file');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(file.publicUrl);
    } catch {
      onError('Unable to copy URL to clipboard');
    }
  };

  const mimeType = getMimeType(file) || 'Unknown type';
  const previewable = isImage(file) && Boolean(file.publicUrl) && !previewFailed;

  return (
    <article className="group overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-xl transition-all hover:border-[#DB9844]/50">
      <div className="relative aspect-square bg-slate-900/50">
        {previewable ? (
          <img
            src={file.publicUrl}
            alt={file.name}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setPreviewFailed(true)}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center text-slate-400">
            <svg className="h-12 w-12 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 3h7l4 4v14H7a2 2 0 01-2-2V5a2 2 0 012-2Z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 3v5h5M9 13h6M9 17h6" />
            </svg>
            <span className="max-w-full truncate text-xs">{mimeType}</span>
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          {file.publicUrl && (
            <Button type="button" size="sm" variant="secondary" onClick={handleCopyUrl}>
              Copy URL
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2 p-3">
        <p className="truncate text-sm text-white" title={file.name}>{file.name}</p>
        <dl className="space-y-1 text-xs text-slate-400">
          <div className="flex justify-between gap-2"><dt>Type</dt><dd className="max-w-[65%] truncate text-right" title={mimeType}>{mimeType}</dd></div>
          <div className="flex justify-between gap-2"><dt>Size</dt><dd>{formatBytes(getSize(file))}</dd></div>
          <div className="flex justify-between gap-2"><dt>Added</dt><dd>{formatDate(file.created_at)}</dd></div>
          <div className="flex justify-between gap-2"><dt>Bucket</dt><dd className="truncate text-right" title={bucket}>{bucket}</dd></div>
        </dl>
        <p className="truncate text-[11px] text-slate-500" title={file.path}>/{file.path}</p>
        <div className="flex gap-2 pt-1">
          {file.publicUrl && (
            <Button type="button" variant="ghost" size="sm" onClick={handleCopyUrl} className="flex-1 text-xs">
              Copy URL
            </Button>
          )}
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={handleDelete}
            isLoading={isDeleting}
            className="text-xs"
          >
            Delete
          </Button>
        </div>
      </div>
    </article>
  );
}
