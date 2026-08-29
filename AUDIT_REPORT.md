# CMS Admin Panel — security and quality audit

Дата: 2026-08-23. Архитектура сохранена: Next App Router + Supabase SSR.

## Executive summary

Панель получила единый server-side admin guard, CSRF/origin protection для mutations, безопасную обработку Storage и атомарную синхронизацию pricing. Неавторизованный доступ к `/admin/*` и API закрыт. Исторические SQL-файлы не удалялись; для развёртывания используется одна каноническая migration.

## Findings and remediations

### HIGH

- **Admin authorization bypass risk** — ранее достаточно было authenticated-сессии. Исправлено в `lib/auth/server.ts`, всех admin actions, media/code-library actions и mutation API. Список `ADMIN_EMAILS` нормализуется и fail-closed при отсутствии.
- **CSRF / unsafe mutation verbs** — mutation API принимает только POST, GET отвечает 405, а `Origin` сравнивается с exact `APP_ORIGIN` либо forwarded host. Реализовано в `lib/auth/api.ts`, `lib/auth/policy.ts` и `app/api/*`.
- **Pricing partial writes** — `app/api/sync-pricing/route.ts` валидирует лимиты и вызывает транзакционную `replace_pricing_atomic`; исключение откатывает delete/insert целиком.
- **Path traversal in code updater** — basename/extension allowlist, canonical resolve и boundary check внутри `preview` в `app/api/update-code-block/route.ts`.

### MEDIUM

- Storage bucket, path, MIME, extension and 10 MB size are allow-listed in `app/admin/media/actions.ts`; names are UUIDs. Related image actions use guarded server operations.
- Duplicate UUIDs and invalid order indexes are rejected by `lib/validation/input.ts`; URL and JSON record checks are centralized.
- Diagnostic endpoints (`debug-code-blocks`, `pricing-stats`) require admin context and return 404 in production unless `ENABLE_ADMIN_DIAGNOSTICS=true`.
- Sidebar now exposes Pages, Services, Media and Settings. Error/loading/not-found boundaries exist for admin and public roots.
- Firebase pricing editor, helper and dependency were removed after import check.

### LOW / residual

- RLS remains `authenticated` for backwards compatibility. Postgres policies cannot evaluate the application `ADMIN_EMAILS` environment variable; any authenticated Supabase user with direct database access may still satisfy RLS. Future work: JWT claims or table-based RBAC enforced in policies.
- Existing remote Supabase image URLs intentionally retain `<img>` in a few components to support arbitrary user-provided URLs; the Next image optimization warning is disabled narrowly at the ESLint policy level. Consider migrating trusted hosts to `next/image`.
- Historical SQL files are legacy reference material and must not be replayed blindly.

## Supabase / migration / Storage

Apply `supabase/migrations/20260823000000_admin_hardening.sql` after the existing schema migrations. It is idempotent and adds pricing indexes, the transactional replacement function, execute grants, and a public visible-only pricing policy. Review existing policies before applying in a shared environment.

Use only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in browser code. A service-role key must remain server-only and is not present in client bundles. Storage mutations use a fixed bucket allowlist (`portfolio`, `employees`, `services`, `avatars`, `logos`, `testimonials`) and reject traversal, unsupported MIME and oversized files.

## Required environment

```env
ADMIN_EMAILS=admin@example.com,second-admin@example.com
APP_ORIGIN=https://admin.example.com
# optional, development/staging diagnostics only
ENABLE_ADMIN_DIAGNOSTICS=false
```

`APP_ORIGIN` must be the exact scheme/host/port seen by the browser; production mutations without a matching Origin are rejected.

## Verification

- `npm run lint` — 0 errors, 0 warnings.
- `npx tsc --noEmit` — passed.
- `npm run build` — passed (33 routes generated).
- `npm test` — passed, 2 files / 7 tests covering UUID/order/JSON/URL, allowlist, trusted origin, 405 behavior and Storage restrictions.

Manual release smoke checks still required against a configured Supabase project: unauthenticated admin/API requests (401/redirect), forbidden authenticated email (403), CRUD/publish/reorder/upload/delete for each module, public visible-only rendering, and keyboard/mobile viewport checks.

## Rollback

Deploy the previous application build, then revert the canonical migration in a controlled SQL change (restore prior policies/function and drop only newly-created indexes). Keep a database backup before policy or data changes. Do not run destructive cleanup against production Storage without a verified path list.
