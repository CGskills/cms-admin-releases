export function normalizeAdminEmails(value = process.env.ADMIN_EMAILS ?? ''): Set<string> {
  return new Set(value.split(',').map((email) => email.trim().toLowerCase()).filter(Boolean));
}

export function isTrustedMutationOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const configuredOrigin = process.env.APP_ORIGIN?.trim().replace(/\/$/, '');
  if (configuredOrigin) return origin === configuredOrigin;

  // Do not derive the expected origin from X-Forwarded-* headers here. Those
  // headers are client-controlled unless a trusted reverse proxy strips and
  // rewrites them, and accepting them would let an attacker spoof an origin
  // by sending matching forwarded host/protocol values. Deployments behind a
  // proxy should set APP_ORIGIN explicitly; otherwise use the URL Next.js
  // received after its own host validation.
  const requestUrl = new URL(request.url);
  return origin === requestUrl.origin;
}
