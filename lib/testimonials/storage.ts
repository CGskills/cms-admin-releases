import { extractPathFromUrl } from '@/lib/storage/upload';

/** The bucket name is shared by server actions and URL helpers. */
export const TESTIMONIALS_STORAGE_BUCKET = 'testimonials';

/**
 * Get public URL from path
 */
export function getTestimonialImageUrl(path: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  return `${supabaseUrl}/storage/v1/object/public/${TESTIMONIALS_STORAGE_BUCKET}/${path}`;
}

/**
 * Extract path from full URL
 */
export function extractTestimonialPath(url: string): string | null {
  return extractPathFromUrl(url, TESTIMONIALS_STORAGE_BUCKET);
}
