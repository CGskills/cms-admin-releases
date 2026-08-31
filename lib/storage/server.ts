import 'server-only';

import { requireAdminServerContext } from '@/lib/auth/server';
import type { AuthenticatedServerContext } from '@/lib/auth/server';
import {
  assertStoragePath,
  extractPathFromUrl,
  getSafeFileExtension,
  validateImageFileContent,
} from './upload';

// Backwards-compatible exports for the legacy server storage wrapper.
export { assertStoragePath, validateImageFile, validateImageFileContent } from './upload';

export const STORAGE_BUCKETS = [
  'portfolio',
  'employees',
  'services',
  'avatars',
  'logos',
  'testimonials',
] as const;

export type StorageBucket = (typeof STORAGE_BUCKETS)[number];

export interface AdminStorageFile {
  name: string;
  path: string;
  id: string | null;
  created_at: string | null;
  updated_at: string | null;
  last_accessed_at?: string | null;
  metadata: Record<string, unknown> | null;
}

const ALLOWED_BUCKETS = new Set<string>(STORAGE_BUCKETS);
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function assertBucket(bucket: string): asserts bucket is StorageBucket {
  if (!ALLOWED_BUCKETS.has(bucket)) {
    throw new Error('Unsupported storage bucket');
  }
}

function normalizePath(bucket: StorageBucket, value: string): string {
  const candidate = value.trim();
  const isUrl = candidate.startsWith('http://') || candidate.startsWith('https://');
  let fromUrl: string | null = candidate;

  if (isUrl) {
    // A path-looking URL is not enough to prove that it belongs to this
    // Supabase project.  Cleanup runs with an authenticated client and would
    // otherwise be able to remove an object from another project's bucket
    // when an external URL was persisted in a row.  The public URL is known
    // at runtime in every supported deployment, so require an exact origin
    // match before extracting the object path.
    let candidateUrl: URL;
    let configuredUrl: URL;
    try {
      candidateUrl = new URL(candidate);
      configuredUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
    } catch {
      throw new Error('Invalid storage URL');
    }

    if (candidateUrl.origin !== configuredUrl.origin) {
      throw new Error('Storage URL belongs to another project');
    }

    fromUrl = extractPathFromUrl(candidate, bucket);
  }

  if (!fromUrl) {
    throw new Error('Invalid storage path');
  }

  assertStoragePath(fromUrl);
  return fromUrl;
}

async function validateUpload(file: File): Promise<void> {
  if (!file || typeof file.arrayBuffer !== 'function' || file.size <= 0 || file.size > MAX_FILE_SIZE) {
    throw new Error('Unsupported or oversized file');
  }

  const validation = await validateImageFileContent(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Unsupported image file');
  }
}

function makePath(folder: string, file: File): string {
  const ext = getSafeFileExtension(file.name, file.type);
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const path = folder ? `${folder}/${fileName}` : fileName;
  assertStoragePath(path);
  return path;
}

/**
 * Upload an image using the authenticated server Supabase client.
 *
 * Image uploads are intentionally independent from a database update.  The
 * caller can upload a replacement before submitting a form, therefore this
 * function must not remove the currently persisted object here: a subsequent
 * form validation/database failure (or a user cancellation) would otherwise
 * leave the row pointing at a deleted object.  Callers remove the old object
 * after their database mutation succeeds and clean up the new object when the
 * mutation fails.
 *
 * `oldPath` is retained for API compatibility with existing actions. It is
 * deliberately ignored; cleanup is coordinated by the database mutation.
 */
export async function uploadAdminImage({
  bucket,
  folder,
  file,
  oldPath,
}: {
  bucket: string;
  folder?: string;
  file: File;
  oldPath?: string | null;
}): Promise<{ path: string; url: string }> {
  try {
    assertBucket(bucket);
    await validateUpload(file);

    const { supabase } = await requireAdminServerContext();
    const path = makePath(folder || '', file);
    const storage = supabase.storage.from(bucket);

    const { data, error } = await storage.upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

    if (error) {
      console.error('[Storage] Upload error:', {
        bucket,
        path,
        error: error.message,
        fileSize: file.size,
        fileType: file.type,
      });
      throw new Error(error.message || 'Failed to upload image');
    }

    if (!data?.path) {
      console.error('[Storage] No path returned:', { bucket, expectedPath: path });
      throw new Error('Failed to upload image');
    }

    // `oldPath` is intentionally not touched here; see the function comment.
    void oldPath;

    const { data: urlData } = storage.getPublicUrl(data.path);

    console.log('[Storage] Upload success:', {
      bucket,
      path: data.path,
      url: urlData.publicUrl,
    });

    return { path: data.path, url: urlData.publicUrl };
  } catch (error) {
    console.error('[Storage] Upload failed:', error);
    throw error;
  }
}

/** Delete one image through the authenticated server Supabase client. */
export async function deleteAdminImage(bucket: string, value: string): Promise<void> {
  assertBucket(bucket);
  const path = normalizePath(bucket, value);
  const { supabase } = await requireAdminServerContext();
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Remove one or more objects with an already-authenticated client.  Keeping
 * this primitive server-side lets entity actions perform cleanup after a
 * successful row mutation without re-authenticating for every object.
 */
export async function removeAdminStorageObjects(
  bucket: string,
  values: readonly string[],
  authenticatedClient?: AuthenticatedServerContext['supabase'],
): Promise<void> {
  assertBucket(bucket);

  const paths: string[] = [];
  for (const value of values) {
    try {
      const path = normalizePath(bucket, value);
      if (!paths.includes(path)) paths.push(path);
    } catch {
      // A form may contain an external URL. It is not an object in this
      // bucket and must never make an otherwise successful DB mutation fail.
    }
  }

  if (paths.length === 0) return;

  const supabase = authenticatedClient ?? (await requireAdminServerContext()).supabase;
  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) throw new Error(error.message);
}

/** Recursively list all files (including files nested below folders). */
export async function listAdminStorageFiles(
  bucket: string,
  authenticatedClient?: AuthenticatedServerContext['supabase'],
): Promise<AdminStorageFile[]> {
  assertBucket(bucket);
  const supabase = authenticatedClient ?? (await requireAdminServerContext()).supabase;
  const storage = supabase.storage.from(bucket);
  const files: AdminStorageFile[] = [];
  const maxFiles = 5_000;
  const maxDepth = 12;

  const walk = async (prefix: string, depth: number): Promise<void> => {
    if (depth > maxDepth || files.length >= maxFiles) return;

    let offset = 0;
    while (files.length < maxFiles) {
      const { data, error } = await storage.list(prefix, {
        limit: 100,
        offset,
        sortBy: { column: 'created_at', order: 'desc' },
      });

      if (error) throw new Error(error.message);
      const entries = data || [];
      if (entries.length === 0) break;

      for (const entry of entries) {
        const isFolder = entry.id === null && entry.metadata === null;
        const path = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (isFolder) {
          await walk(path, depth + 1);
          if (files.length >= maxFiles) break;
          continue;
        }

        files.push({
          name: entry.name,
          path,
          id: entry.id ?? null,
          created_at: entry.created_at ?? null,
          updated_at: entry.updated_at ?? null,
          last_accessed_at: entry.last_accessed_at ?? null,
          metadata: entry.metadata ?? null,
        });
      }

      if (entries.length < 100) break;
      offset += entries.length;
    }
  };

  await walk('', 0);
  return files.sort((a, b) => {
    const aTime = a.created_at ? Date.parse(a.created_at) : 0;
    const bTime = b.created_at ? Date.parse(b.created_at) : 0;
    return bTime - aTime;
  });
}

/** Convert a URL/path supplied by a form into a validated bucket path. */
export function getAdminStoragePath(bucket: string, value: string): string {
  assertBucket(bucket);
  return normalizePath(bucket, value);
}

/**
 * Return a path only when a value is a path/URL generated by this app's
 * uploader.  This is used for best-effort rollback after a failed form save;
 * arbitrary external URLs or user-entered paths are never deleted as part of
 * error handling.
 */
export function getManagedUploadPath(bucket: string, value: string | null | undefined): string | null {
  if (!value?.trim()) return null;

  let path: string;
  try {
    path = getAdminStoragePath(bucket, value);
  } catch {
    return null;
  }

  // All new uploads use a UUID filename. Keep this check deliberately strict
  // so rollback cannot remove an arbitrary object supplied in a form field.
  const uuidFile = /(?:^|\/)\w{8}-\w{4}-4\w{3}-[89ab]\w{3}-\w{12}\.[a-z0-9]{1,12}$/i;
  return uuidFile.test(path) ? path : null;
}
