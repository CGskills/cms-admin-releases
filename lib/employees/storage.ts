import { extractPathFromUrl } from '@/lib/storage/upload';

/** The bucket name is shared by server actions and URL helpers. */
export const EMPLOYEES_STORAGE_BUCKET = 'employees';

export function getEmployeePhotoUrl(path: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  return `${supabaseUrl}/storage/v1/object/public/${EMPLOYEES_STORAGE_BUCKET}/${path}`;
}

export function extractEmployeePhotoPath(url: string): string | null {
  return extractPathFromUrl(url, EMPLOYEES_STORAGE_BUCKET);
}
