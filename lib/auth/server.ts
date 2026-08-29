import 'server-only';

import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { normalizeAdminEmails, isTrustedMutationOrigin } from './policy';
export { normalizeAdminEmails, isTrustedMutationOrigin } from './policy';

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface AuthenticatedServerContext {
  supabase: SupabaseServerClient;
  user: User;
}

export async function getAuthenticatedServerContext(): Promise<AuthenticatedServerContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return { supabase, user };
}

export async function requireAuthenticatedServerContext(): Promise<AuthenticatedServerContext> {
  const context = await getAuthenticatedServerContext();

  if (!context) {
    throw new Error('Authentication required');
  }

  return context;
}

/** Require an authenticated user explicitly allow-listed for CMS administration. */
export async function requireAdminServerContext(): Promise<AuthenticatedServerContext> {
  const context = await getAuthenticatedServerContext();

  if (!context) {
    throw new Error('Authentication required');
  }

  const email = context.user.email?.trim().toLowerCase();
  const allowlist = normalizeAdminEmails();
  if (!email || allowlist.size === 0 || !allowlist.has(email)) {
    throw new Error('Administrator access required');
  }

  return context;
}

export function requireTrustedMutationOrigin(request: Request): void {
  if (!isTrustedMutationOrigin(request)) {
    throw new Error('Untrusted mutation origin');
  }
}
