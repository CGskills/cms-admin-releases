# Security Best Practices

This document outlines the security measures implemented in this application and best practices for developers.

## 🔒 Implemented Security Features

### 1. CSRF Protection

All Server Actions are protected against Cross-Site Request Forgery attacks.

**How it works:**
- Validates `Origin` or `Referer` header on every mutation request
- Compares against `APP_ORIGIN` or `NEXT_PUBLIC_SUPABASE_URL`
- Automatically applied to all actions via `validateCSRF()`

**Configuration:**
```env
# Optional: Explicit origin for CSRF validation
APP_ORIGIN=https://your-domain.com

# Required: Supabase URL (used as fallback)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
```

### 2. Input Validation

#### URL Validation
Prevents SSRF (Server-Side Request Forgery) and phishing attacks:
- ✅ Only HTTP/HTTPS protocols allowed
- ✅ Blocks IP addresses (127.0.0.1, 192.168.x.x, etc.)
- ✅ Blocks localhost and internal hostnames
- ✅ Blocks @ in hostnames (phishing protection)
- ✅ Blocks metadata endpoints (169.254.169.254)

#### NPM Package Validation
Prevents code injection through dependencies:
- ✅ Validates npm naming rules (lowercase, max 214 chars)
- ✅ Blocks path traversal (../, ../../, etc.)
- ✅ Validates semantic versioning (semver)
- ✅ Blocks invalid characters and scripts

### 3. Rate Limiting

In-memory rate limiting protects against abuse:
- Default: 10 requests per minute per IP
- Customizable per action
- Automatic cleanup of expired entries

**Usage in Server Actions:**
```typescript
import { requireRateLimit } from '@/lib/rate-limit/middleware';

export async function sensitiveAction(data: FormData) {
  await requireRateLimit(5, 60000); // 5 req/min
  await validateCSRF();
  // ... rest of action
}
```

### 4. Centralized Error Handling

Structured error handling prevents information leakage:
- Custom error classes with proper HTTP status codes
- User-friendly error messages
- Internal errors are logged but not exposed
- Consistent error responses across the application

**Error Types:**
- `ValidationError` (400) - Invalid input
- `AuthenticationError` (401) - Not authenticated
- `AuthorizationError` (403) - Insufficient permissions
- `CSRFError` (403) - Invalid origin
- `NotFoundError` (404) - Resource not found
- `RateLimitError` (429) - Too many requests

### 5. DevTools Security

Production builds have DevTools disabled by default.

**To enable DevTools for debugging (use with caution):**

**Windows:**
```cmd
set ENABLE_DEVTOOLS=1
CMS-Admin-Panel.exe
```

**macOS/Linux:**
```bash
ENABLE_DEVTOOLS=1 ./CMS-Admin-Panel
```

## 🛡️ Security Checklist for Developers

### When Adding New Server Actions

1. **Always add CSRF protection:**
   ```typescript
   import { validateCSRF } from '@/lib/auth/csrf';
   
   export async function myAction(formData: FormData) {
     await validateCSRF(); // First line
     const { supabase } = await requireAdminServerContext();
     // ...
   }
   ```

2. **Add rate limiting for sensitive operations:**
   ```typescript
   import { requireRateLimit } from '@/lib/rate-limit/middleware';
   
   export async function sensitiveAction(data: FormData) {
     await requireRateLimit(); // Before CSRF
     await validateCSRF();
     // ...
   }
   ```

3. **Validate all user input:**
   ```typescript
   import { 
     assertUuid, 
     assertSafeUrl, 
     assertNpmPackageName,
     assertSemver 
   } from '@/lib/validation/input';
   
   // Validate IDs
   assertUuid(id);
   
   // Validate URLs
   assertSafeUrl(url, 'website');
   
   // Validate npm packages
   assertNpmPackageName(packageName);
   assertSemver(version);
   ```

4. **Use structured error handling:**
   ```typescript
   import { ValidationError, handleActionError } from '@/lib/errors';
   
   try {
     if (!data) {
       throw new ValidationError('Data is required', 'data');
     }
     // ... action logic
   } catch (error) {
     handleActionError(error); // Converts to safe errors
   }
   ```

### When Handling File Uploads

1. **Always validate file types and sizes**
2. **Use UUID-based filenames** (already implemented)
3. **Clean up failed uploads** (rollback pattern)
4. **Never trust client-provided filenames**

### When Working with External URLs

1. **Always use `assertSafeUrl()`** before fetching
2. **Never fetch user-provided URLs directly**
3. **Be cautious with redirects**

### Database Operations

1. **Use parameterized queries** (Supabase does this automatically)
2. **Validate UUIDs** before using in queries
3. **Use RLS policies** for row-level security
4. **Never expose internal error messages**

## 🧪 Testing Security Features

Run security tests:
```bash
npm test tests/csrf.test.ts
npm test tests/url-validation.test.ts
npm test tests/npm-validation.test.ts
npm test tests/rate-limit.test.ts
```

Run all tests:
```bash
npm test
```

## 🚨 Security Incident Response

If you discover a security vulnerability:

1. **Do NOT** create a public issue
2. **Do NOT** commit fixes to public branches
3. Contact the security team immediately
4. Document the vulnerability privately
5. Wait for coordinated disclosure

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/security)
- [Supabase Security](https://supabase.com/docs/guides/platform/security)

## 🔄 Regular Security Maintenance

### Monthly
- Review and update dependencies
- Check for security advisories
- Review access logs for suspicious activity

### Quarterly
- Security audit of new features
- Rate limit threshold review
- Error message review (no info leakage)

### Annually
- Full security penetration test
- Third-party security audit
- Security training for developers
