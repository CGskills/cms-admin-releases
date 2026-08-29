import 'server-only';

import { requireAdminServerContext } from '@/lib/auth/server';
import {
  assertStoragePath,
  STORAGE_BUCKETS,
  validateImageFileContent,
} from '@/lib/storage/server';

const ALLOWED_BUCKETS = new Set<string>(STORAGE_BUCKETS);

function assertBucket(bucket: string): void {
  if (!ALLOWED_BUCKETS.has(bucket)) {
    throw new Error('Unsupported storage bucket');
  }
}

export async function uploadFile(
  bucket: string,
  path: string,
  file: File
): Promise<string> {
  assertBucket(bucket);
  assertStoragePath(path);
  const validation = await validateImageFileContent(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Unsupported image file');
  }

  const { supabase } = await requireAdminServerContext();

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteFile(bucket: string, path: string): Promise<void> {
  assertBucket(bucket);
  assertStoragePath(path);
  const { supabase } = await requireAdminServerContext();

  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    throw new Error(error.message);
  }
}

export function getStoragePathFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const marker = '/storage/v1/object/public/';
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex < 0) return null;

    const bucketAndPath = parsed.pathname.slice(markerIndex + marker.length);
    const separatorIndex = bucketAndPath.indexOf('/');
    if (separatorIndex <= 0) return null;

    const bucket = decodeURIComponent(bucketAndPath.slice(0, separatorIndex));
    const path = decodeURIComponent(bucketAndPath.slice(separatorIndex + 1));
    assertBucket(bucket);
    assertStoragePath(path);
    return path;
  } catch {
    return null;
  }
}
