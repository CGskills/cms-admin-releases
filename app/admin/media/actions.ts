'use server';

import { listAdminStorageFiles, deleteAdminImage, uploadAdminImage } from '@/lib/storage/server';
import { validateCSRF } from '@/lib/auth/csrf';
import { revalidatePath } from 'next/cache';

const ALLOWED_BUCKETS = new Set(['portfolio', 'employees', 'services', 'avatars', 'logos', 'testimonials']);
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']);

export interface MediaUploadFile {
  name: string;
  path: string;
  id: string | null;
  created_at: string;
  updated_at: string;
  last_accessed_at: string | null;
  metadata: Record<string, unknown>;
}

export interface MediaUploadResult {
  url: string;
  path: string;
  file: MediaUploadFile;
}

function assertBucket(bucket: string): void {
  if (!ALLOWED_BUCKETS.has(bucket)) throw new Error('Unsupported storage bucket');
}

export async function uploadMedia(bucket: string, file: File): Promise<MediaUploadResult> {
  await validateCSRF();
  assertBucket(bucket);
  if (!file || typeof file.name !== 'string' || typeof file.arrayBuffer !== 'function' || file.size <= 0 || file.size > MAX_FILE_SIZE || !ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error('Unsupported or oversized file');
  }

  const result = await uploadAdminImage({ bucket, file });

  revalidatePath('/admin/media');

  const now = new Date().toISOString();
  return {
    url: result.url,
    path: result.path,
    file: {
      name: result.path.split('/').pop() || result.path,
      path: result.path,
      id: null,
      created_at: now,
      updated_at: now,
      last_accessed_at: null,
      metadata: {
        size: file.size,
        mimetype: file.type,
        contentType: file.type,
        cacheControl: '3600',
      },
    },
  };
}

export async function deleteMedia(bucket: string, path: string) {
  await validateCSRF();
  assertBucket(bucket);
  await deleteAdminImage(bucket, path);

  revalidatePath('/admin/media');
}

export async function listMediaFiles(bucket: string) {
  // The recursive helper uses the same authenticated server context and
  // includes files nested in folders (the upload forms use folder prefixes).
  return listAdminStorageFiles(bucket);
}
