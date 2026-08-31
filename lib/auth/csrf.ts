import 'server-only';

import { headers } from 'next/headers';

/**
 * Validate that the request comes from a trusted origin to prevent CSRF attacks.
 *
 * This function checks the Origin or Referer header against the expected origin
 * (APP_ORIGIN environment variable or current host in development).
 *
 * @throws {Error} If the origin is missing or doesn't match the expected origin
 */
export async function validateCSRF(): Promise<void> {
  const headersList = await headers();
  const origin = headersList.get('origin');
  const referer = headersList.get('referer');
  const host = headersList.get('host');

  // Требуем хотя бы один заголовок
  if (!origin && !referer) {
    throw new Error('Missing origin header');
  }

  // Извлекаем origin из доступного заголовка
  const requestOrigin = origin || new URL(referer!).origin;

  // В dev окружении (localhost) разрешаем любые localhost origins
  const isDev = process.env.NODE_ENV === 'development' || host?.includes('localhost');
  if (isDev && (requestOrigin.includes('localhost') || requestOrigin.includes('127.0.0.1'))) {
    return; // Разрешаем в dev
  }

  // В production проверяем APP_ORIGIN
  const configuredOrigin = process.env.APP_ORIGIN?.trim();

  if (!configuredOrigin) {
    // Если APP_ORIGIN не задан, используем текущий host
    if (host) {
      const protocol = headersList.get('x-forwarded-proto') || 'https';
      const expectedOrigin = `${protocol}://${host}`;
      if (requestOrigin !== expectedOrigin) {
        throw new Error('Invalid request origin');
      }
      return;
    }
    throw new Error('APP_ORIGIN is not configured and host header is missing');
  }

  const expectedOrigin = configuredOrigin.replace(/\/$/, '');
  if (requestOrigin !== expectedOrigin) {
    throw new Error('Invalid request origin');
  }
}
