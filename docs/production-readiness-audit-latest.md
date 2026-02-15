# Harmoniq Safety — Production Readiness Audit (Apps & Stack)
**Date:** 2026-02-14  
**Scope:** Mobile/employee app, company dashboard, platform admin, auth/onboarding, data, security, observability, operations.

## Executive Highlights
- Data is split between Supabase and client-local mocks (`create-entity-store`); this risks stale PII and divergence—production must be Supabase-first with hard failures when misconfigured.
- Auth/session is client-heavy: no SSR guard, refresh-token handling, or server-side role enforcement; invitations/email delivery are unverified.
- Security hardening is pending: CSP/headers, HTML sanitization, CSRF/rate limiting, and consistent RLS/service-role usage.
- Observability is minimal: analytics/maps use client mock data; no error logging, health checks, or uptime; offline queues are not wired to persistence/sync.
- UX gaps: toasts lack semantic theming, “Users vs Pending Invitations” share a view, “Nexus” naming lingers, and auto-refresh analytics should be manual.

## App-by-App Gaps
### Mobile / Employee App
- Persist incidents/inspections/assets to Supabase (no localStorage in prod); move photos to Supabase Storage with size/type validation and signed URLs.
- Fix stepper skip-loss: persist per-step drafts (location/photos/details) and restore on navigation; enforce required checkpoints before submit.
- Inspections/routes: wire offline queue + sync badge, per-checkpoint evidence (photo + pass/fail/notes), threshold validation, and “next asset” navigation with progress.
- Assets: persist static vs movable flag, department linkage, warranty data, and reminder jobs; add audit trail on edits and conflict resolution (server wins + surface to user).
- Offline: download assigned work when online, allow full completion offline, queue for sync with count badge, and show offline/unsynced indicators.

### Company Dashboard (Admin/Manager)
- Users & invitations: separate tabs for Users vs Pending Invites; verify invite email delivery, token expiry, and rate limiting on acceptance.
- Content/news: sanitize `dangerouslySetInnerHTML` with DOMPurify; avoid inline HTML without cleaning.
- Assets: ensure “Add Schedule” and warranty fields persist to Supabase; remove mock/inline data and hydrate from RLS-backed queries.
- Analytics/privacy: move traffic/IP map ingestion to backend with retention + consent; manual refresh (no auto polling); rename “Nexus” strings to company name.
- UX polish: standardize toast colors/z-index/shadows; complete i18n coverage for toasts and tab labels.

### Platform Admin (Super Admin)
- Enforce server-side gate (super_admin claim) on platform routes; hide platform nav for others; provide explicit login link for super admin.
- Analytics: backend ingestion with rate limits, date filters, and manual refresh; map via open-source tiles with coarse geolocation; add privacy/observability tabs instead of single page.
- GDPR/privacy: add SAR/RTBF requests, consent logs, retention settings, and audit log of admin actions.

### Auth, Marketing, App Chooser
- App chooser: user selects surface; remember last choice; on mobile default to mobile; enforce choice server-side on `/auth/callback` + middleware.
- Sessions: use HttpOnly cookies + refresh; remove localStorage fallback in prod; add idle timeout and device/session revocation.
- Email flows: configure SMTP with DKIM/SPF, invite/password templates, and rate limiting; log invite create/accept events.

## Data & Backend
- Complete Supabase tables with RLS (deny by default) keyed by company_id and role: users, teams, locations, assets, incidents, tickets, inspection templates/checkpoints/submissions, routes/rounds, work orders, parts, invitations, analytics events.
- Use service-role keys only in server routes for privileged actions (invites, analytics ingest); clients use anon key constrained by RLS.
- Storage: dedicated buckets for incidents/assets/inspections; signed URLs, MIME/size validation, and optional AV scanning.
- Background jobs: warranty-expiry reminders, inspection-due reminders, invite expiry cleanup, analytics aggregation.

## Security & Privacy
- Headers: CSP (script/style/img/connect-src with Supabase + tiles), HSTS, frame-ancestors SAMEORIGIN, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, disable X-Powered-By.
- Sanitization: DOMPurify for all HTML renders; server-side validation on API routes; CSRF via Origin/Referer + anti-replay.
- Tokens: rotate refresh tokens; avoid storing sessions in localStorage; add audit logs for auth, role changes, data export/delete.
- Rate limiting: auth callbacks, invite acceptance, analytics ingest, contact/forms.

## Observability, Performance, Testing
- Instrument client/server logging (e.g., Sentry) with request IDs; add `/api/health` (DB + storage) and uptime checks.
- Replace bespoke fetch/timeout logic with react-query/SWR (caching, retry/backoff); batch Supabase requests and add timeouts.
- Optimize assets: Next/Image with remotePatterns; no video on mobile; code-split heavy deps.
- CI: lint, tsc --noEmit, next build, npm audit; E2E (Playwright) for auth, invite accept, incident submit, inspection round, asset create; load tests for auth callbacks and submissions.

## Priority Actions (P1)
1) Force Supabase as source of truth; remove/mock gating for production bundles; wire storage uploads.  
2) Add server-side auth/role middleware + app-choice enforcement; remove localStorage session fallback; handle refresh/idle timeout.  
3) Sanitize all HTML renders and add security headers/CSP; enable RLS everywhere with service-role only on server routes.  
4) Deliver invite/password emails via SMTP with DKIM/SPF + rate limits; log invite lifecycle.  
5) Wire offline/queue for inspections/routes with sync badge and conflict handling.  
6) Separate Users vs Pending Invites tabs; fix asset schedules/warranty persistence and reminders.  
7) Backend analytics ingest + open-source map; manual refresh and retention/consent controls.  
8) Standardize toast component (semantic colors, contrast, z-index); remove “Nexus” naming.  
9) Add observability (Sentry, health check, uptime) and remove client-only analytics mocks.  
10) Stand up CI lint/type/build + E2E smoke for auth, invite, incident, inspection, asset.
