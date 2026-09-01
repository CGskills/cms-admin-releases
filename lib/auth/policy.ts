export function normalizeAdminEmails(value = process.env.ADMIN_EMAILS ?? ''): Set<string> {
  return new Set(value.split(',').map((email) => email.trim().toLowerCase()).filter(Boolean));
}

export function isTrustedMutationOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const configuredOrigin = process.env.APP_ORIGIN?.trim().replace(/\/$/, '');
  if (origin) {
    if (configuredOrigin) return origin === configuredOrigin;

    // When APP_ORIGIN is omitted, compare with the URL Next received rather
    // than trusting forwarded headers supplied by a client.
    const requestUrl = new URL(request.url);
    return origin === requestUrl.origin;
  }

  // Chromium/Electron can omit Origin for same-origin form/fetch requests.
  // Keep CSRF protection by accepting the request only when its actual host
  // matches the configured application origin (or the URL handled by Next).
  const requestUrl = new URL(request.url);
  if (configuredOrigin) {
    return false;
  }

  // A same-origin request normally includes Host even when Origin is omitted.
  // Compare it with the URL Next received before allowing this Electron path.
  const host = request.headers.get('host');
  if (!host) {
    return false;
  }
  if (host.trim().toLowerCase() !== requestUrl.host.toLowerCase()) {
    return false;
  }

  return requestUrl.protocol === 'http:' || requestUrl.protocol === 'https:';
}
