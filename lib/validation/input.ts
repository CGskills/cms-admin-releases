const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
const NPM_NAME_PATTERN = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

export function getFormText(formData: FormData, field: string, maxLength = 10_000): string {
  const value = formData.get(field);
  const text = typeof value === 'string' ? value.trim() : '';

  if (text.length > maxLength) {
    throw new Error(`Field ${field} is too long`);
  }

  return text;
}

export function requireFormText(formData: FormData, field: string, maxLength = 10_000): string {
  const value = getFormText(formData, field, maxLength);

  if (!value) {
    throw new Error(`Field ${field} is required`);
  }

  return value;
}

export function assertUuid(value: string, field = 'id'): void {
  if (!UUID_PATTERN.test(value)) {
    throw new Error(`Invalid ${field}`);
  }
}

export function assertOrderedItems(items: { id: string; order_index: number }[]): void {
  if (!Array.isArray(items) || items.length > 1_000) {
    throw new Error('Invalid reorder payload');
  }

  const ids = new Set<string>();
  for (const item of items) {
    assertUuid(item.id);
    if (ids.has(item.id)) throw new Error('Duplicate identifier');
    ids.add(item.id);
    if (!Number.isInteger(item.order_index) || item.order_index < 0) {
      throw new Error('Invalid order index');
    }
  }
}

export function assertUuidList(ids: string[]): void {
  if (!Array.isArray(ids) || ids.length > 1_000) {
    throw new Error('Invalid identifier list');
  }

  const seen = new Set<string>();
  ids.forEach((id) => {
    assertUuid(id);
    if (seen.has(id)) throw new Error('Duplicate identifier');
    seen.add(id);
  });
}

export function assertSafeUrl(value: string, field = 'url'): void {
  if (!value?.trim()) {
    return; // Empty URLs are allowed (optional fields)
  }

  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new Error(`Invalid ${field}`);
  }

  // Только HTTP/HTTPS
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`Invalid ${field} protocol`);
  }

  // Блокируем @ в hostname (phishing protection)
  // Check both hostname and the full URL for @ after protocol
  const urlWithoutProtocol = value.trim().replace(/^https?:\/\//, '');
  if (urlWithoutProtocol.includes('@')) {
    throw new Error(`Invalid ${field} hostname`);
  }

  // Блокируем IP адреса (SSRF protection)
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Pattern = /^([0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}$/i;
  if (ipv4Pattern.test(parsed.hostname) || ipv6Pattern.test(parsed.hostname)) {
    throw new Error(`IP addresses not allowed in ${field}`);
  }

  // Блокируем localhost и internal hosts (SSRF protection)
  const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '169.254.169.254'];
  const hostname = parsed.hostname.toLowerCase();
  if (blockedHosts.some(blocked => hostname === blocked || hostname.includes(blocked))) {
    throw new Error(`Invalid ${field} hostname`);
  }
}

export function parseJsonRecord(value: string, field: string): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isPlainRecord(parsed)) throw new Error('invalid');
    return parsed;
  } catch {
    throw new Error(`Invalid ${field}`);
  }
}

export function getBoundedInteger(value: string, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
}

export function getBoundedNumber(value: string, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
}

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validate npm package name according to npm naming rules.
 * Blocks path traversal attempts and invalid package names.
 */
export function assertNpmPackageName(name: string): void {
  if (!name || typeof name !== 'string') {
    throw new Error('Invalid package name');
  }

  const trimmed = name.trim();

  // Check length (npm limit is 214 characters)
  if (trimmed.length === 0 || trimmed.length > 214) {
    throw new Error('Invalid package name length');
  }

  // Check against npm naming pattern
  if (!NPM_NAME_PATTERN.test(trimmed)) {
    throw new Error('Invalid package name format');
  }

  // Explicitly block common attack patterns
  if (trimmed.includes('..') || trimmed.includes('/') && !trimmed.startsWith('@')) {
    throw new Error('Invalid package name');
  }
}

/**
 * Validate semantic version string (semver).
 * Ensures version follows the semver specification.
 */
export function assertSemver(version: string): void {
  if (!version || typeof version !== 'string') {
    throw new Error('Invalid version');
  }

  const trimmed = version.trim();

  if (!SEMVER_PATTERN.test(trimmed)) {
    throw new Error('Invalid semver version');
  }
}
