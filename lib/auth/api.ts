import { NextResponse } from 'next/server';
import { getAuthenticatedServerContext, isTrustedMutationOrigin } from './server';
export { methodNotAllowed } from './http';
export async function requireAdminApi(request: Request): Promise<NextResponse | null> {
  const context = await getAuthenticatedServerContext();
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const allowlist = new Set((process.env.ADMIN_EMAILS ?? '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean));
  if (!context.user.email || allowlist.size === 0 || !allowlist.has(context.user.email.trim().toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!isTrustedMutationOrigin(request)) {
    return NextResponse.json({ error: 'Untrusted origin' }, { status: 403 });
  }
  return null;
}
