# Harmoniq Safety — Overall Development Status

**Last Updated:** 2026-03-15
**Branch:** `sevalla-migration-prep`

---

## Architecture Decision

- **Supabase** retained as data layer (PostgreSQL, Auth, RLS, admin dashboard)
- **Sevalla** hosts the Next.js application (Docker container)
- See `/dev_info/Supabase_vs_SelfManaged_Assessment.md` for rationale

---

## Phase Progress

| Phase | Status | Commit | Summary |
|-------|--------|--------|---------|
| **Phase 1: Data Persistence** | COMPLETE | `b3ea758` | Schema fixes, column mappings, RLS policies, mock data cleanup |
| **Phase 2: Testing** | COMPLETE | `eeaabc7` | Vitest + 136 tests (validation, permissions, stores, isolation) |
| **Phase 3: Monitoring** | COMPLETE | `1f18997` | Sentry, structured logging, enhanced health check |
| **Phase 4: Security** | PENDING | — | Server-side auth enforcement, XSS fixes, CSP, dead code |
| **Phase 5: Email** | PENDING | — | Supabase SMTP config, templates, DNS records |
| **Phase 6: i18n** | PENDING | — | Audit hardcoded strings, complete NL/SV translations |
| **Deployment** | PENDING | — | Docker, env config, Sevalla deployment |

---

## Key Changes Made

### Phase 1 — Data Persistence
- Removed conflicting duplicate migration `002_missing_tables.sql`
- Created `009_schema_fixes.sql`: `notifications` table, missing columns on `teams`, `work_orders`, `companies`, `risk_evaluations`
- Added `columnMap` to stores: teams (`leader_id`→`lead_id`), tickets (`created_by`→`reporter_id`), parts (`part_number`→`sku`), work-orders (`requested_by`→`requester_id`)
- Added `mapFromSupabase()` for reverse column mapping on reads
- Fixed error fallback to use `[]` instead of mock data in Supabase mode
- Fixed RLS: `'admin'`→`'company_admin'` bug, added 10 missing tables, anonymous insert policies
- Replaced mock data in location page with store JSONB data

### Phase 2 — Testing
- Vitest + jsdom + React Testing Library
- 9 test files, 136 tests covering: validation, sanitization, permissions, column mapping, localStorage, company isolation, date utils
- Test factories for all core entities

### Phase 3 — Monitoring
- Sentry integration (client, server, edge configs)
- Error boundary captures exceptions to Sentry
- Structured logger: JSON in production, readable in development
- Health check: uptime, memory, DB latency, Sentry DSN status

---

## Remaining Known Issues

- **Mock data in pages**: asset detail uses mock maintenance/downtime (no DB tables yet), risk assessment uses mock templates (static reference data)
- **Dead code**: 250-line `header.tsx` never imported (Phase 4 cleanup)
- **XSS**: `dangerouslySetInnerHTML` in content editor needs DOMPurify audit (Phase 4)
- **CSP**: `unsafe-inline` still required for Tailwind CSS (Phase 4)
- **Email**: SMTP not configured, invitation emails need testing (Phase 5)
- **i18n**: ~25% of strings still hardcoded English (Phase 6)

---

## Environment Variables Required

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_SITE_URL=

# Sentry (optional, recommended for production)
NEXT_PUBLIC_SENTRY_DSN=

# Cloudflare Turnstile (optional, for contact form CAPTCHA)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```
