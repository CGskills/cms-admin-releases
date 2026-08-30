import 'server-only';

import { headers } from 'next/headers';

/**
 * Validate that the request comes from a trusted origin to prevent CSRF attacks.
 *
 * This function checks the Origin or Referer header against the expected origin
 * (APP_ORIGIN environment variable or NEXT_PUBLIC_SUPABASE_URL).
 *
 * @throws {Error} If the origin is missing or doesn't match the expected origin
 */
export async function validateCSRF(): Promise<void> {
  const headersList = await headers();
  const origin = headersList.get('origin');
  const referer = headersList.get('referer');

  // Требуем хотя бы один заголовок
  if (!origin && !referer) {
    throw new Error('Missing origin header');
  }

  // Извлекаем origin из доступного заголовка
  const requestOrigin = origin || new URL(referer!).origin;

  // Проверяем APP_ORIGIN если задан, иначе используем NEXT_PUBLIC_SUPABASE_URL
  const configuredOrigin = process.env.APP_ORIGIN?.trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  let expectedOrigin: string;
  if (configuredOrigin) {
    expectedOrigin = configuredOrigin.replace(/\/$/, '');
  } else if (supabaseUrl) {
    expectedOrigin = new URL(supabaseUrl).origin;
  } else {
    throw new Error('Neither APP_ORIGIN nor NEXT_PUBLIC_SUPABASE_URL is configured');
  }

  if (requestOrigin !== expectedOrigin) {
    throw new Error('Invalid request origin');
  }
}
