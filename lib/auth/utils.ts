import { createClient } from '@/lib/supabase/server';

/**
 * Получает текущего авторизованного пользователя на сервере
 * @returns User object или null если не авторизован
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Проверяет, авторизован ли пользователь
 * @returns true если пользователь авторизован
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return !!user;
}
