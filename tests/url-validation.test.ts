import { describe, it, expect } from 'vitest';
import { assertSafeUrl } from '@/lib/validation/input';

describe('URL Validation', () => {
  it('should accept valid HTTP and HTTPS URLs', () => {
    expect(() => assertSafeUrl('https://example.com')).not.toThrow();
    expect(() => assertSafeUrl('http://example.com/path')).not.toThrow();
    expect(() => assertSafeUrl('https://subdomain.example.com')).not.toThrow();
  });

  it('should accept empty URLs (optional fields)', () => {
    expect(() => assertSafeUrl('')).not.toThrow();
    expect(() => assertSafeUrl('   ')).not.toThrow();
  });

  it('should reject non-HTTP(S) protocols', () => {
    expect(() => assertSafeUrl('javascript:alert(1)')).toThrow('Invalid url protocol');
    expect(() => assertSafeUrl('file:///etc/passwd')).toThrow('Invalid url protocol');
    expect(() => assertSafeUrl('ftp://example.com')).toThrow('Invalid url protocol');
    expect(() => assertSafeUrl('data:text/html,<script>alert(1)</script>')).toThrow('Invalid url protocol');
  });

  it('should reject URLs with @ in hostname (phishing protection)', () => {
    expect(() => assertSafeUrl('https://evil.com@good.com')).toThrow('Invalid url hostname');
    expect(() => assertSafeUrl('https://user:pass@evil.com@good.com')).toThrow('Invalid url hostname');
  });

  it('should reject IP addresses (SSRF protection)', () => {
    expect(() => assertSafeUrl('https://192.168.1.1')).toThrow('IP addresses not allowed');
    expect(() => assertSafeUrl('http://10.0.0.1:8080')).toThrow('IP addresses not allowed');
    expect(() => assertSafeUrl('https://127.0.0.1')).toThrow('IP addresses not allowed');
    expect(() => assertSafeUrl('http://[::1]')).toThrow('IP addresses not allowed');
  });

  it('should reject localhost and internal hosts', () => {
    expect(() => assertSafeUrl('https://localhost:3000')).toThrow('Invalid url hostname');
    expect(() => assertSafeUrl('http://localhost')).toThrow('Invalid url hostname');
    expect(() => assertSafeUrl('https://127.0.0.1')).toThrow('IP addresses not allowed');
    expect(() => assertSafeUrl('http://0.0.0.0')).toThrow('IP addresses not allowed');
    expect(() => assertSafeUrl('http://169.254.169.254/metadata')).toThrow('IP addresses not allowed');
  });

  it('should reject malformed URLs', () => {
    expect(() => assertSafeUrl('not a url')).toThrow('Invalid url');
    expect(() => assertSafeUrl('htp://missing-t.com')).toThrow('Invalid url');
  });
});
