export interface UploadResult {
  url: string;
  path: string;
  error: null;
}

export interface UploadError {
  url: null;
  path: null;
  error: string;
}

/**
 * Storage mutations must run in authenticated server actions.  This module is
 * intentionally client-safe and only contains shared validation/path helpers;
 * importing a browser Supabase client here would allow an unguarded upload or
 * delete from any client component.
 */

/**
 * Extract path from Supabase URL
 */
export function extractPathFromUrl(url: string, bucket: string): string | null {
  try {
    const urlObj = new URL(url);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const pathParts = urlObj.pathname.split(marker);
    const path = pathParts[1] || null;
    return path ? decodeURIComponent(path) : null;
  } catch {
    return null;
  }
}

/** Validate a path before passing it to Supabase Storage. */
export function assertStoragePath(path: string): asserts path is string {
  if (
    typeof path !== 'string' ||
    path.length === 0 ||
    path.length > 500 ||
    path.startsWith('/') ||
    path.includes('\\') ||
    path.includes('..') ||
    path.includes('\0') ||
    path.split('/').some((part) => !part || part === '.')
  ) {
    throw new Error('Invalid storage path');
  }
}

/** Return a safe extension for an uploaded file name. */
export function getSafeFileExtension(fileName: string, mimeType?: string): string {
  // Once an upload has passed binary/MIME validation, keep the object suffix
  // canonical as well.  File names are client-controlled and may contain a
  // misleading suffix (for example `photo.exe` with an image/jpeg MIME).
  // Storage metadata still carries the MIME, but a canonical suffix avoids
  // confusing previews, downloads and later orphan inspection in Media.
  const canonicalByMime: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  const canonicalExtension = mimeType ? canonicalByMime[mimeType.toLowerCase()] : undefined;
  if (canonicalExtension) return canonicalExtension;

  const extension = fileName.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (extension) return extension.slice(0, 12);

  const mimeExtension = mimeType?.split('/')[1]?.toLowerCase().replace(/[^a-z0-9]/g, '');
  return mimeExtension ? mimeExtension.slice(0, 12) : 'bin';
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Загрузите изображение (JPG, PNG, WebP или GIF)',
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'Размер файла не должен превышать 10 МБ',
    };
  }

  return { valid: true };
}

/**
 * Validate the binary signature as well as the client supplied MIME type.
 * MIME values and file names are user-controlled, so the server must not rely
 * on them when accepting bytes into public Storage buckets.
 */
export async function validateImageFileContent(
  file: File,
): Promise<{ valid: boolean; error?: string }> {
  const basic = validateImageFile(file);
  if (!basic.valid) return basic;

  try {
    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const startsWith = (...signature: number[]) =>
      signature.every((value, index) => bytes[index] === value);
    const ascii = (start: number, length: number) =>
      String.fromCharCode(...bytes.slice(start, start + length));

    const isJpeg = startsWith(0xff, 0xd8, 0xff);
    const isPng = startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    const isGif = ascii(0, 6) === 'GIF87a' || ascii(0, 6) === 'GIF89a';
    const isWebp = ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP';

    const matchesClaimedType =
      (file.type === 'image/jpeg' || file.type === 'image/jpg')
        ? isJpeg
        : file.type === 'image/png'
          ? isPng
          : file.type === 'image/gif'
            ? isGif
            : file.type === 'image/webp'
              ? isWebp
              : false;

    if (!matchesClaimedType) {
      return { valid: false, error: 'Содержимое файла не соответствует типу изображения' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Не удалось проверить содержимое изображения' };
  }
}
