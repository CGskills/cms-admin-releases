'use client';

import { useCallback, useMemo, useState } from 'react';
import Button from '@/components/ui/Button';
import { deleteMedia } from '../actions';
import FileCard from './FileCard';
import FileUploader from './FileUploader';

export interface MediaFile {
  name: string;
  path: string;
  id: string | null;
  created_at: string | null;
  updated_at: string | null;
  last_accessed_at?: string | null;
  metadata: Record<string, unknown> | null;
  publicUrl: string;
}

export interface MediaBucket {
  bucket: string;
  files: MediaFile[];
  error?: string;
}

interface MediaManagerProps {
  initialBuckets: MediaBucket[];
}

function getFileSize(file: MediaFile): number | null {
  const value = file.metadata?.size;
  const size = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(size) && size >= 0 ? size : null;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export default function MediaManager({ initialBuckets }: MediaManagerProps) {
  const [buckets, setBuckets] = useState(initialBuckets);
  const [error, setError] = useState('');

  const stats = useMemo(() => {
    let fileCount = 0;
    let usedBytes = 0;
    let unknownSizeCount = 0;

    for (const bucket of buckets) {
      fileCount += bucket.files.length;
      for (const file of bucket.files) {
        const size = getFileSize(file);
        if (size === null) unknownSizeCount += 1;
        else usedBytes += size;
      }
    }

    return { fileCount, usedBytes, unknownSizeCount };
  }, [buckets]);

  const handleUploaded = useCallback((bucketName: string, file: MediaFile) => {
    setBuckets((current) =>
      current.map((bucket) =>
        bucket.bucket === bucketName
          ? { ...bucket, error: undefined, files: [file, ...bucket.files] }
          : bucket,
      ),
    );
    setError('');
  }, []);

  const handleUploadError = useCallback((message: string) => {
    setError(message);
  }, []);

  const handleDelete = useCallback(async (bucketName: string, path: string) => {
    await deleteMedia(bucketName, path);
    setBuckets((current) =>
      current.map((bucket) =>
        bucket.bucket === bucketName
          ? { ...bucket, files: bucket.files.filter((file) => file.path !== path) }
          : bucket,
      ),
    );
  }, []);

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Media</h1>
        <p className="text-slate-400">Manage uploaded files and images</p>
      </div>

      <section className="mb-10 rounded-xl border border-slate-700/50 bg-slate-800/40 p-5" aria-label="Storage statistics">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Storage usage</h2>
            <p className="mt-1 text-sm text-slate-400">
              {formatBytes(stats.usedBytes)} known used across {stats.fileCount} file{stats.fileCount === 1 ? '' : 's'}
              {stats.unknownSizeCount > 0 ? ` · ${stats.unknownSizeCount} size${stats.unknownSizeCount === 1 ? '' : 's'} unavailable` : ''}
            </p>
          </div>
          <p className="max-w-md text-right text-xs text-slate-500">
            Quota and free space are not exposed by the Supabase Storage API.
          </p>
        </div>
      </section>

      {error && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">
          <span>{error}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => setError('')}>
            Dismiss
          </Button>
        </div>
      )}

      {buckets.map(({ bucket, files, error: bucketError }) => (
        <section key={bucket} className="mb-10" aria-labelledby={`bucket-${bucket}`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id={`bucket-${bucket}`} className="text-xl font-bold capitalize text-white">{bucket}</h2>
              <p className="text-sm text-slate-400">
                {files.length} file{files.length !== 1 ? 's' : ''}
              </p>
            </div>
            <FileUploader
              bucket={bucket}
              onUploaded={(file) => handleUploaded(bucket, file)}
              onError={handleUploadError}
            />
          </div>

          {bucketError ? (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-8 text-center" role="alert">
              <p className="text-sm text-red-300">{bucketError}</p>
            </div>
          ) : files.length === 0 ? (
            <div className="rounded-xl border border-slate-700/30 bg-slate-800/30 p-8 text-center">
              <p className="text-sm text-slate-500">No files in this bucket yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
              {files.map((file) => (
                <FileCard
                  key={`${bucket}:${file.path}`}
                  file={file}
                  bucket={bucket}
                  onDelete={() => handleDelete(bucket, file.path)}
                  onError={handleUploadError}
                />
              ))}
            </div>
          )}
        </section>
      ))}
    </>
  );
}
