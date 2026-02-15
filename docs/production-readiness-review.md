# Harmoniq Safety — Production Readiness Review
**Date:** 2026-02-14  
**Scope:** Frontend (web + mobile surfaces), auth/session, Supabase data layer, security, observability/ops.

## Executive Highlights
- **Data source bifurcation:** Entity stores auto-fallback to localStorage when env keys are missing (`create-entity-store.tsx`). In production this risks stale/divergent data and client-side PII storage; force Supabase-only, add hard failures when env/config is absent.
- **XSS & headers:** `dangerouslySetInnerHTML` in content/news renderers is unsanitized (S-1/S-2). `next.config.ts` sets no security headers (CSP, HSTS, frame-ancestors, nosniff, Referrer-Policy, Permissions-Policy, poweredByHeader).
- **Auth/session robustness:** App still mixes mock/localStorage auth and Supabase auth; session persistence is client-only, no SSR protection, no refresh-token handling, and no role-based gating enforced server-side (middleware is minimal).
- **Offline/queue is dead:** `src/lib/offline-queue.ts` and inspection offline queueing are unused; offline promises in UI are not actually wired to persistence or sync.
- **Observability gaps:** No error reporting, logging, or uptime/analytics instrumentation on the app surfaces; platform analytics uses placeholder data and a client-only IP map without backend aggregation or rate limiting.
- **Branding/accessibility:** PWA manifest uses placeholder icon; toasts and theme tokens are hard-coded; no centralized design tokens for accessible contrast.
- **Testing/CI:** No automated tests (unit/e2e), no lint/type in CI, no audit checks.

## App-by-App Findings

### Mobile/Employee App (`src/app/(app)/[company]/app/*`)
- **Data pipeline:** All feature stores (incidents, assets, inspections, routes, tickets, work orders) rely on `create-entity-store` which defaults to localStorage with mock seeds. Risk: offline-only data, PII at rest in browser, no multi-device sync. Missing: Supabase-first fetch on mount with clear error when misconfigured.
- **Incident/report flow:** Attachments and GPS fields are stored client-side; no upload to object storage, no size/type validation, and skipping steps can drop prior input (state not persisted per step). Needs per-step draft persistence and required-field guards.
- **Inspections & routes:** “Offline” route support is not wired; offline queue utilities are unused. No per-checkpoint evidence capture enforcement, no calibration/threshold validation when entering numeric ranges.
- **Assets:** Category/type selection exists but warranty, department linkage, and static/movable flags are not persisted to backend. No audit trail for asset changes; no conflict resolution on concurrent edits.
- **Auth/role:** Client-side role checks only; no server-side guard for mobile-only users. If Supabase session expires, most pages fall back to spinner rather than re-auth.

### Company Dashboard (`src/app/(app)/[company]/dashboard/*`)
- **Users & invitations:** Invitations/API are present but email delivery and token lifecycle are not verified; invitation validation route lacks rate limiting and anti-bruteforce. Pending invites and users share UI with no separation tabs.
- **Content/news:** Uses `dangerouslySetInnerHTML` without sanitization; rich text needs DOMPurify or server-side cleaning.
- **Platform analytics/privacy:** Current charts/map use mock/client-side data; IP->geo mapping happens in the browser without backend aggregation, privacy controls, or DPAs. No consent gating for analytics.
- **Settings/branding:** PWA manifest icons are placeholders; no theme guardrails for contrast; toast styling is inconsistent and obscured (needs lighter surface, semantic colors).
- **Security settings pages:** UI toggles (2FA, session timeout) are not enforced server-side; no actual policy application.

### Platform Admin / Super Admin (`src/app/(auth)/admin`, `dashboard/platform/*`)
- **Access control:** Middleware doesn’t enforce super-admin only; relies on client checks. Needs server-side role gate and separate domain or path protection.
- **Analytics:** Metrics/map are mock; no backend event ingestion, retention, or alerting. Auto-refresh was client-timed; should be manual with backend pagination and date filters.
- **GDPR/Privacy:** No SAR/RTBF flows, no consent logs, no data retention policies wired to Supabase.

### Marketing / Login
- **App picker & auth:** App-choice cookie/localStorage used pre-login; not validated server-side. Login flows (magic link/password/OAuth) lack robust error handling and retry telemetry.
- **Service worker:** Registration removed; confirm SW is disabled in production to avoid stale caches.

## Security & Compliance
- **Headers/CSP:** Add CSP (script-src/style-src/img-src/connect-src including Supabase), HSTS, frame-ancestors DENY/SAMEORIGIN, nosniff, Referrer-Policy, Permissions-Policy, and disable `X-Powered-By`.
- **XSS:** Sanitize all HTML renders (`content/new`, `news/[newsId]`) with DOMPurify (server-side or client-side). Avoid `dangerouslySetInnerHTML` where possible.
- **Auth:** Enforce SSR auth checks in middleware for both dashboard and mobile. Use HttpOnly cookies for sessions, refresh flows, and rotate tokens. Remove mock/localStorage auth in production builds.
- **RLS:** Migrations define RLS, but client still uses anon key for writes. Use service-role on server routes for privileged actions (invites, setup), and ensure client writes are constrained by RLS and `company_id` checks.
- **Data minimization:** Remove localStorage persistence of entities in production; use indexed DB only for explicitly offline features with encryption-at-rest if required.
- **Rate limiting:** Add API rate limits for auth callbacks, invitations, analytics ingestion, and search endpoints.

## Data & Backend
- **Single source of truth:** Force Supabase for CRUD; remove mock seeds from production bundle or gate by env flag (e.g., `USE_MOCK_DATA=false`).
- **Migrations:** Ensure all migrations (001–007) are applied; add production seeds only through admin workflows, not client bundles.
- **Storage:** Configure Supabase Storage buckets for media (incidents, assets, inspections) with signed URLs and size/type validation.
- **Background jobs:** Add hooks for reminder emails (warranty expiry, inspection due), invite expiry cleanup, and analytics aggregation.

## Observability & Reliability
- **Logging/metrics:** Add client error logging (e.g., Sentry), API structured logs, and request tracing. Instrument Core flows (auth, invite, incident submit, inspection submit).
- **Health checks:** Add `/api/health` with DB + storage checks; wire uptime monitoring.
- **Analytics:** Move IP geo lookup and traffic metrics to backend; store coarse-grained data with retention caps. Provide manual refresh controls and time range filters.

## Performance
- **Data fetching:** Add SWR/react-query with caching and retry/backoff for Supabase calls instead of bespoke fetch/timeout logic.
- **Images:** Configure `next.config.ts` `images.remotePatterns` and use `<Image>` for remote assets. Optimize heavy deps (`@react-pdf/renderer`) via dynamic import only where needed.
- **Bundles:** Review tree-shaking for mock data; exclude large mock files from production builds.

## Testing & CI
- **Automated checks:** Add CI for `lint`, `tsc --noEmit`, `next build`, and `npm audit`.
- **E2E:** Add Playwright/Cypress smoke for login, invite accept, incident submit, inspection submit, asset CRUD.
- **Load testing:** Minimal k6/Artillery checks for critical APIs (auth callback, incidents, inspections).

## PWA & UX
- **Manifest:** Add branded icons (192/512), maskable variants, `id`, `start_url`, `display`. Ensure offline pages are intentional.
- **Toasts & theming:** Standardize toast component with semantic success/warn/error colors, shadow, and z-index; respect theme tokens for contrast.
- **Accessibility:** Add focus states, aria labels on interactive components (sidebar toggles, toasts, forms).

## Recommended Next Steps (Actionable)
1. **Security hardening:** Implement CSP/headers, sanitize HTML renders, disable mock/localStorage auth/data in prod, enforce middleware role gates.
2. **Data correctness:** Force Supabase as source of truth; add storage-backed uploads; wire RLS-aware CRUD in stores; remove mock seeds from prod build.
3. **Auth reliability:** Add SSR session checks + refresh handling; unify app-choice/role gating server-side; finalize invite flow with email delivery and token expiry.
4. **Observability:** Add error logging (Sentry or similar), health checks, and backend analytics ingestion with manual refresh.
5. **UX polish:** Fix toast styling, manifest icons, and split Users vs Pending Invitations tabs.
6. **Testing/CI:** Stand up lint/tsc/build pipelines and e2e smoke tests for core flows.
