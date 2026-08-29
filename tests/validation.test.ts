import { describe, expect, it } from 'vitest';
import { assertOrderedItems, assertSafeUrl, assertUuid, parseJsonRecord } from '@/lib/validation/input';

const id = '123e4567-e89b-12d3-a456-426614174000';

describe('input hardening', () => {
  it('accepts UUID and rejects traversal-like identifiers', () => {
    expect(() => assertUuid(id)).not.toThrow();
    expect(() => assertUuid('../etc/passwd')).toThrow();
  });
  it('rejects duplicate and invalid order payloads', () => {
    expect(() => assertOrderedItems([{ id, order_index: 0 }, { id, order_index: 1 }])).toThrow('Duplicate');
    expect(() => assertOrderedItems([{ id, order_index: -1 }])).toThrow('order index');
  });
  it('allows only http(s) URLs and plain JSON records', () => {
    expect(() => assertSafeUrl('https://example.com/a')).not.toThrow();
    expect(() => assertSafeUrl('javascript:alert(1)')).toThrow();
    expect(parseJsonRecord('{"enabled":true}', 'settings')).toEqual({ enabled: true });
    expect(() => parseJsonRecord('[]', 'settings')).toThrow();
  });
});
