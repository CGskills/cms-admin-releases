const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  if (!value) return;
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('invalid');
  } catch {
    throw new Error(`Invalid ${field}`);
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
