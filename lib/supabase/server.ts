import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { fetchWithTimeout } from './fetch-with-timeout'

export interface CreateClientOptions {
  /**
   * Request timeout in milliseconds.
   * - Dashboard queries: 5000-8000ms (fail fast for UI responsiveness)
   * - Standard operations: 20000ms (default)
   * - Bulk operations: 60000ms (long-running imports, exports, batch processing)
   */
  timeoutMs?: number
}

export async function createClient(options: CreateClientOptions = {}) {
  const cookieStore = await cookies()
  const timeoutMs = options.timeoutMs ?? 20_000

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variable')
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: {
        fetch: (input, init) => fetchWithTimeout(input, init, timeoutMs)
      },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component может не иметь возможность записать cookie.
          }
        },
      },
    }
  )
}

/**
 * Create a client optimized for dashboard queries.
 * Uses a shorter timeout (8s) to keep the UI responsive.
 */
export async function createDashboardClient() {
  return createClient({ timeoutMs: 8_000 })
}

/**
 * Create a client for bulk operations.
 * Uses a longer timeout (60s) for imports, exports, and batch processing.
 */
export async function createBulkClient() {
  return createClient({ timeoutMs: 60_000 })
}
