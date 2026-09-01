import { describe, expect, it, afterEach } from 'vitest';
import { isTrustedMutationOrigin, normalizeAdminEmails } from '@/lib/auth/policy';
import { methodNotAllowed } from '@/lib/auth/http';

afterEach(() => { delete process.env.APP_ORIGIN; });

describe('admin auth boundaries', () => {
  it('normalizes and deduplicates the email allowlist', () => {
    expect([...normalizeAdminEmails(' Admin@Example.com,admin@example.com ') ]).toEqual(['admin@example.com']);
    expect(normalizeAdminEmails('')).toHaveLength(0);
  });
  it('requires an exact trusted origin', () => {
    process.env.APP_ORIGIN = 'https://admin.example.com';
    expect(isTrustedMutationOrigin(new Request('https://admin.example.com/api/x', { headers: { origin: 'https://admin.example.com' } }))).toBe(true);
    expect(isTrustedMutationOrigin(new Request('https://admin.example.com/api/x', { headers: { origin: 'https://evil.example.com' } }))).toBe(false);
    expect(isTrustedMutationOrigin(new Request('https://admin.example.com/api/x'))).toBe(false);
  });
  it('accepts same-host desktop requests without Origin and rejects missing Host', () => {
    delete process.env.APP_ORIGIN;
    expect(isTrustedMutationOrigin(new Request('http://127.0.0.1:43123/api/x', {
      headers: { host: '127.0.0.1:43123' },
    }))).toBe(true);
    expect(isTrustedMutationOrigin(new Request('http://127.0.0.1:43123/api/x'))).toBe(false);
  });
  it('returns 405 with POST allow header', () => {
    const response = methodNotAllowed();
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('POST');
  });
});
