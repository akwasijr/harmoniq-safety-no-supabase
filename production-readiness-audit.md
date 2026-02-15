# Production Readiness Audit (Harmoniq Safety)

## Key highlights (what blocks “prod ready”)
- **Data not wired to prod**: Core stores (assets, incidents, inspection routes/rounds) default to mock data/localStorage via `createEntityStore` (see `src/stores/create-entity-store.tsx`); Supabase fetch is optional, has no pagination, and mutations go straight from the client with the anon key (no validation).
- **Analytics ephemeral & permissive**: `/api/analytics` keeps events in memory only (lost on restart), rate limits lightly, and allows `company_admin` to read; geo map and counters reset on deploy.
- **Auth/onboarding fragility**: Session is purely client-side (localStorage restore in `use-auth.tsx`); app chooser behavior is undefined in code; invites silently skip email when service role is missing.
- **Observability & reliability**: No Sentry/logging/metrics, no health checks, no conflict resolution for offline/optimistic writes.
- **Security posture unclear**: RLS is assumed but not asserted in code/tests; service role usage is opaque; CSP/rate limits exist only in a few places; “Nexus” naming still lingers.
- **Super-admin access & analytics**: Platform portal can be reached by company admins; analytics/map depend on ephemeral memory and auto-refresh; privacy/consent flows are absent.

## Cross-cutting gaps
### Auth & onboarding
- Session/init is client-only; relies on localStorage caches and retries but lacks server-side session validation and device binding.
- App chooser behavior isn’t enforced by role/device (chooser flow undefined; mobile vs dashboard vs super-admin not locked down).
- Invitation flow depends on Supabase service role; if unset, it silently skips email and falls back to a link—needs explicit admin warning and retry/backoff + audit log.
### Data layer
- `createEntityStore` loads everything client-side and upserts/deletes with anon key; no input/schema validation, no pagination or soft deletes, and no ETag/versioning.
- Most stores ship with mock seeds (`mockAssets`, `mockIncidents`, `mockRoutes`) so prod data isn’t guaranteed to load; offline fallback can mask Supabase failures.
- No background sync/rehydration strategy; optimistic writes can diverge from server without reconciliation or error surfacing.
### Security & privacy
- RLS assumptions are implicit—no policy checks in code, and no server-side filters beyond company_id in UI.
- Analytics collects hashed IPs but keeps them in memory; no retention controls or configurable consent banners across apps.
- No rate limits on most API routes (except a simple map-based limiter in `/api/analytics`); no CSRF protection on POST routes beyond same-origin check.
### Observability & reliability
- No Sentry/Logs/Metrics wiring; errors mostly `console.error`.
- No uptime/health checks or synthetic probes.
- Service worker registration was removed in app layout but could reappear; stale caches risk if re-enabled without versioning.

## App-by-app gaps
### Mobile app (employee)
- **Data**: Incident/asset/inspection flows run on `createEntityStore` mocks/localStorage; Supabase fetch is optional, unvalidated, and lacks pagination/filters.
- **Inspections**: Routes/rounds/checkpoints are static mocks; guided checkpoints and ranges exist in data but are not persisted or validated server-side.
- **Offline**: `use-sync` hook indicates offline, but no queued mutations, no conflict policy, and no per-entity last-sync timestamps.
- **UX**: Skip/stepper flow can hide later steps; limited error/loading/empty states; toasts use generic styling.

### Dashboard (company)
- **Users/Teams**: UI data comes from client store (mocks) while invites hit a server API → easy desync; no pagination/export.
- **Assets**: Schedule/warranty/reminders not wired to backend; updates use anon key with no validation.
- **Incidents/Work**: Same client-store pattern; no audit trail.
- **Analytics**: Platform analytics tab reads in-memory `/api/analytics`; resets on deploy; map uses ephemeral events.
- **Branding/Naming**: “Nexus” strings linger; toasts are low-contrast and inconsistent.

### Super-admin / platform
- **Access**: RoleGuard allows `company_admin`; needs super-admin-only enforcement and clearer routing entry point.
- **Analytics/Privacy**: Same ephemeral `/api/analytics`; no warehouse/log sink, no consent controls, no retention window.
- **App chooser**: No enforced default/remembered choice; super-admin landing not distinct.

## Current code evidence (Feb 14 snapshot)
- `src/stores/create-entity-store.tsx`: Defaults to mock/localStorage when Supabase env is missing; uses anon-key CRUD directly from the client with optimistic writes and no schema validation, pagination, or soft deletes; RLS is assumed only.
- `src/hooks/use-auth.tsx`: Auth init and profile hydrate are client-only with localStorage caches; no server-side validation or device binding; app chooser/default routing is not enforced.
- `src/app/api/analytics/route.ts`: Events stored in an in-memory array; read access allows company_admin; rate limiter is per-process only; no retention beyond simple purge; no consent/opt-out; resets on deploy.

## Recommended actions (sequenced)
1) **Data wiring**: Remove mock defaults in prod, require Supabase fetch on mount, add pagination/filtering; move mutations to API routes with schema validation (zod) and server-side company scoping; return typed errors and audit logs.
2) **Auth & chooser**: Add pre-login chooser with role/device defaults (employee→mobile only; admin→remember last; super_admin→platform). Persist last choice, enforce on navigation, and add server-side session validation/refresh. Remove all “Nexus” naming.
3) **Invitations/onboarding**: Detect missing service_role and warn; add retry/backoff; provide copy-link with expiry and audit logging; ensure users/teams list hydrates from Supabase (no mock store) with pagination/export.
4) **Analytics/observability**: Persist events to Supabase (or a warehouse/log sink), add retention + consent toggles, and tighten rate limits. Wire Sentry/logging/metrics; add health checks and synthetic probes. Keep map but back it with stored geo events (no in-memory).
5) **Security**: Validate/record RLS for every table; add API rate limits; enforce company_id on server; add CSRF/Origin checks for POST; keep service role only on server; document secrets/backup/rotation.
6) **Offline/sync**: Add mutation queue with retry/backoff; conflict resolution (server wins with diff surfaced); per-entity last-sync + badges; deterministic seeds only for dev.
7) **UX polish**: Accessible toast theme, robust loading/empty/error states, inspection stepper that never hides required steps, manual refresh (no auto-refresh) for analytics, and consistent branding.

## Layered checklist (what “good” looks like)
- **Frontend (web/mobile)**: No mock data in prod; all CRUD goes through typed API routes; loaders/skeletons + retry states; toasts semantic and high-contrast; app chooser remembered and enforced; offline queue with badges; manual refresh for analytics; localization for new fields (asset type, warranty, inspections).
- **API/backend**: All mutations behind API routes with zod validation, company scoping, audit logging, and rate limits; analytics API persists events with retention; invite API requires service role and returns explicit errors when misconfigured; super-admin APIs require platform role.
- **Database/RLS**: Every tenant table has RLS enabled with company_id scoping and role checks; separate tables for inspection rounds/checkpoints, asset warranty/reminders, offline sync queue; migrations versioned and repeatable; PITR/backups enabled and tested.
- **Security/compliance**: CSP includes Supabase https/wss and tile CDN only; HSTS/X-Frame-Options/Referrer-Policy set; service-role key never shipped to client; file uploads validated and signed URLs short-lived; consent-friendly analytics with IP hashing and opt-out; GDPR flows for export/delete requests logged.
- **Observability/reliability**: Sentry (or equivalent) for web/mobile/API; structured logs with correlation IDs; metrics for auth errors, invite failures, sync queue depth; uptime/health checks; synthetic login + critical flows (incident, asset schedule, inspection submit); alerting on error rates and sync backlog.
- **Performance**: Paginate all list endpoints; avoid N+1 in Supabase queries; cache static config; image upload size limits and compression; remove auto-refresh polling; ensure mobile avoids heavy backgrounds/videos.

## App-by-app implementation starters
- **Mobile app**: Replace mock stores with Supabase-backed queries + pagination; fix stepper to keep steps accessible; add asset type/department/warranty fields to forms and detail; implement inspection rounds/checkpoints and auto-flag out-of-range; add offline queue + sync badges; localize new strings.
- **Dashboard**: Split Users vs Pending Invites tabs; wire invites to service-role email + copy-link; fix asset schedule “not found” by validating asset lookup and permissions; add warranty/reminder fields end-to-end; restyle toasts; remove “Nexus” text; manual refresh for analytics widgets.
- **Super-admin**: Enforce platform-admin role on routes/components; provide dedicated login entry; back analytics/map with persisted events; add tabs (Observability, Privacy/Compliance, Traffic Map); no auto-refresh—manual refresh only.

## Outstanding P0/P1 to close
1. Enforce app chooser + role gating across auth flows; remember last choice; mobile default to mobile app.
2. Replace mock data paths in prod; require Supabase fetch + validated API mutations for assets/incidents/inspections.
3. Fix invites (service role required) and split Users vs Pending Invites; add resend/revoke/audit log.
4. Repair asset schedule errors and add asset type/department/warranty/reminders with translations.
5. Persist analytics events, remove auto-refresh, and lock super-admin access; keep map backed by stored geo IP data with consent.
6. Add Sentry/logging/metrics, health checks, and rate limiting; verify RLS for all tenant tables; document backups/PITR.
