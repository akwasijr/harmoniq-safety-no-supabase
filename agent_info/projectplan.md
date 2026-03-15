# Harmoniq Safety — Critical Gaps Resolution Plan

**Created:** 2026-03-15
**Status:** Pending Approval
**Objective:** Resolve all critical gaps (data persistence, testing, monitoring, security, email, i18n) while keeping Supabase as the data layer, and prepare the Next.js application for deployment on Sevalla.

---

## Overview

### Architecture Decision

- **Supabase** — Retained as the data layer (PostgreSQL database, authentication, RLS policies, admin dashboard)
- **Sevalla** — Hosts the Next.js application (Docker container)
- **Rationale:** Supabase is already deeply integrated (auth, DB, RLS, middleware across 64 pages and 20 entity stores). Migrating away would require ~2 weeks of refactoring with zero new functionality and high risk. See `/dev_info/Supabase_vs_SelfManaged_Assessment.md` for full analysis.

### What This Plan Covers

| Phase | Scope | Priority |
|-------|-------|----------|
| Phase 1 | Data Persistence — Verify & fix Supabase tables, RLS, and store reliability | CRITICAL |
| Phase 2 | Testing — Add test coverage for critical flows | CRITICAL |
| Phase 3 | Monitoring — Sentry, structured logging, health checks | CRITICAL |
| Phase 4 | Security — Server-side enforcement, XSS fixes, CSP hardening | IMPORTANT |
| Phase 5 | Email — Transactional email for invitations, password resets | IMPORTANT |
| Phase 6 | i18n — Complete translation coverage | MODERATE |
| Deployment | Sevalla preparation — Docker, env config, verification | FINAL |

---

## Phase 1: Data Persistence Verification & Fixes

**Goal:** Ensure all 22 Supabase tables exist with correct schemas, RLS policies are active, entity stores reliably persist data, and mock data dependencies are eliminated from production paths.

### Checkpoint 1.1: Supabase Schema Verification
- [x] Verify all 22 tables exist in the Supabase project:
  - `companies`, `users`, `teams`, `locations`, `assets`, `incidents`
  - `tickets`, `work_orders`, `content`, `checklist_templates`, `checklist_submissions`
  - `risk_evaluations`, `corrective_actions`, `asset_inspections`, `meter_readings`
  - `parts`, `inspection_routes`, `inspection_rounds`, `invitations`
  - `audit_logs`, `site_analytics`, `inquiries`, `email_verifications`, `platform_settings`
- [x] Verify all 13 enums are created (`user_role`, `company_status`, `incident_status`, `ticket_status`, `asset_status`, `content_status`, `severity`, `priority`, `asset_category`, `asset_criticality`, `asset_condition`, `location_type`, and subscription/country/language/currency types)
- [x] Verify all indexes are in place (40+ indexes across tables)
- [x] Verify all triggers are active (13 `update_updated_at` triggers)
- [x] Verify helper functions exist (`user_company_id()`, `is_super_admin()`, `is_admin()`, `is_demo_user()`, `is_demo_company()`, `generate_invitation_token()`, `log_audit_event()`)
- [x] Run all migrations (001-008) against the Supabase project if not already applied
- [x] Build and verify — no TypeScript errors

### Checkpoint 1.2: RLS Policy Verification
- [x] Verify RLS is enabled on all tables
- [x] Verify company isolation policies are active on all company-scoped tables
- [x] Verify super_admin bypass policies work correctly
- [x] Verify anonymous insert policies for `site_analytics` and `inquiries`
- [x] Verify demo data protection policies (restrictive policies preventing demo user from modifying demo data)
- [x] Test RLS by querying as different roles (employee, manager, admin, super_admin)
- [x] Document any missing or incorrect policies and apply fixes

### Checkpoint 1.3: Entity Store Reliability Fixes
- [x] Audit `src/stores/create-entity-store.tsx` for data persistence issues:
  - Verify Supabase writes are properly awaited (not fire-and-forget)
  - Verify error handling and rollback on failed writes
  - Verify optimistic update pattern works correctly
  - Verify localStorage fallback only activates when Supabase is genuinely unavailable
- [x] Fix any stores that silently fail on write operations
- [x] Ensure all 19 entity stores have correct table name mappings
- [x] Verify column mapping configurations match actual Supabase column names
- [x] Build and verify — no TypeScript errors

### Checkpoint 1.4: Eliminate Mock Data Dependencies
- [x] Audit all pages/components for direct imports from `src/mocks/data.ts`
- [x] Remove or guard mock data usage so it only activates in development when Supabase is not configured
- [x] Fix dashboard stats to compute from real store data (verify previous fix is complete)
- [x] Fix settings page to use real company store data (verify previous fix is complete)
- [x] Fix profile page password change form — add proper submission handler
- [x] Address avatar upload (currently stores base64 — should use Supabase Storage or keep as-is with size limits)
- [x] Address content image upload (currently non-functional)
- [x] Build and verify — no TypeScript errors

### Checkpoint 1.5: Seed Data Verification
- [x] Verify seed data is applied to Supabase (demo company, user, locations, teams, assets, incidents, etc.)
- [x] Verify demo user can log in and see demo data
- [x] Verify demo data protection works (demo user cannot modify demo company data)
- [x] Build and verify — no TypeScript errors

---

## Phase 2: Testing

**Goal:** Add test coverage for critical flows — auth, API endpoints, authorization, and core business logic.

### Checkpoint 2.1: Testing Infrastructure Setup
- [ ] Install Vitest, `@testing-library/react`, `@testing-library/jest-dom`
- [ ] Install `msw` (Mock Service Worker) for API mocking
- [ ] Configure Vitest (`vitest.config.ts`) with Next.js support
- [ ] Add test scripts to `package.json` (`test`, `test:watch`, `test:coverage`)
- [ ] Create test utilities:
  - Render helper with all providers (Theme, Auth, i18n, AppData)
  - Mock Supabase client factory
  - Mock session/user factory
  - Mock entity data factories
- [ ] Build and verify — no TypeScript errors

### Checkpoint 2.2: Unit Tests — Auth & Authorization
- [ ] Test login flow with valid/invalid credentials (mock Supabase auth)
- [ ] Test session hydration (user profile fetch after auth)
- [ ] Test role-based permission helpers (`hasPermission`, `hasAllPermissions`, `hasAnyPermissions`)
- [ ] Test `<RoleGuard>` component behavior for different roles
- [ ] Test company switching for super_admin
- [ ] Test middleware route protection logic
- [ ] Test admin entry flag management

### Checkpoint 2.3: Unit Tests — API Routes
- [ ] Test `POST /api/contact` — valid submission, rate limiting, CAPTCHA validation
- [ ] Test `GET /api/health` — healthy and unhealthy states
- [ ] Test `POST /api/analytics` — event tracking
- [ ] Test `GET /api/analytics` — data retrieval with auth check
- [ ] Test `POST /api/invitations` — create invitation with auth
- [ ] Test `GET /api/invitations/validate` — valid token, expired token, used token
- [ ] Test `POST /api/setup` — initial setup flow

### Checkpoint 2.4: Unit Tests — Entity Stores
- [ ] Test `createEntityStore` factory:
  - Supabase mode: fetch, create, update, delete operations
  - localStorage fallback mode
  - Optimistic update and rollback behavior
  - Cross-tab sync
  - Error handling
- [ ] Test at least 3 specific stores (e.g., incidents, assets, users) with realistic data

### Checkpoint 2.5: Unit Tests — Core Business Logic
- [ ] Test incident creation and status transitions
- [ ] Test invitation token generation, validation, and expiration
- [ ] Test input validation and sanitization utilities
- [ ] Test date utilities and localization helpers
- [ ] Test CSV export functionality
- [ ] Test rate limiter logic

### Checkpoint 2.6: Integration Tests — Key User Flows
- [ ] Test login → session creation → dashboard redirect
- [ ] Test invitation creation → token validation → acceptance
- [ ] Test incident report submission → appears in dashboard list
- [ ] Test contact form → rate limiting enforcement
- [ ] Test company isolation — user A cannot see company B's data

### Checkpoint 2.7: E2E Tests (Optional — If Time Permits)
- [ ] Install Playwright
- [ ] Test login flow end-to-end
- [ ] Test incident reporting flow
- [ ] Test dashboard navigation and data display
- [ ] Run all tests and verify — no failures

---

## Phase 3: Monitoring & Error Tracking

**Goal:** Add production monitoring, error tracking, and structured logging.

### Checkpoint 3.1: Sentry Integration
- [ ] Install `@sentry/nextjs`
- [ ] Configure Sentry:
  - `sentry.client.config.ts` — browser error capture
  - `sentry.server.config.ts` — server-side error capture
  - `sentry.edge.config.ts` — edge/middleware error capture
  - `next.config.ts` — wrap with `withSentryConfig`
- [ ] Add `SENTRY_DSN` to environment variables
- [ ] Add global error boundary with Sentry reporting
- [ ] Configure source maps upload for readable stack traces
- [ ] Test error capture in development (trigger intentional error)
- [ ] Build and verify — no TypeScript errors

### Checkpoint 3.2: Structured Logging
- [ ] Create lightweight logger utility (`src/lib/logger.ts`):
  - Structured JSON output for production
  - Human-readable console output for development
  - Log levels: `debug`, `info`, `warn`, `error`
  - Context fields: `requestId`, `userId`, `companyId`
- [ ] Add request logging to all API routes:
  - Method, path, status code, response time
  - User ID and company ID when authenticated
- [ ] Add auth event logging:
  - Login success/failure (with anonymized identifier)
  - Logout events
  - Session refresh failures
  - Invitation creation and acceptance
- [ ] Build and verify — no TypeScript errors

### Checkpoint 3.3: Health Check Enhancement
- [ ] Update `/api/health` to report:
  - Database connectivity status (Supabase ping)
  - Auth service status
  - Application version (from package.json or build env)
  - Uptime
  - Memory usage
- [ ] Ensure health check is compatible with Sevalla's load balancer/health monitoring
- [ ] Add `HEAD` method support for lightweight health probes
- [ ] Build and verify — no TypeScript errors

---

## Phase 4: Security Hardening

**Goal:** Address remaining security gaps identified in audits.

### Checkpoint 4.1: Server-Side Authorization Enforcement
- [ ] Audit all API routes to ensure auth is checked before processing:
  - `/api/analytics GET` — verify super_admin check is enforced
  - `/api/invitations` — verify company_admin+ role check
  - `/api/setup` — verify first-run-only guard
- [ ] Ensure platform admin routes (`/dashboard/platform/*`) validate `super_admin` role server-side, not just via cookie
- [ ] Add rate limiting to auth-related endpoints:
  - Login: max 10 attempts per IP per 15 minutes
  - Password reset: max 5 per IP per hour
  - Invitation validation: max 10 per IP per minute (verify existing implementation)
- [ ] Build and verify — no TypeScript errors

### Checkpoint 4.2: XSS & Input Sanitization
- [ ] Audit all `dangerouslySetInnerHTML` usage:
  - Content editor/viewer — ensure DOMPurify sanitization is applied before rendering
  - Any other instances
- [ ] Validate all user inputs server-side in API routes (not just client-side Zod):
  - Email format validation
  - Text length limits
  - HTML/script tag stripping
- [ ] Sanitize company logo URLs (validate URL format, restrict to HTTPS)
- [ ] Build and verify — no TypeScript errors

### Checkpoint 4.3: CSP & Security Headers
- [ ] Review and tighten Content Security Policy in `next.config.ts`:
  - Assess if `unsafe-inline` can be removed (may need nonces for Tailwind)
  - Assess if `unsafe-eval` can be removed
  - Restrict `connect-src` to known domains (Supabase, Sentry, analytics)
  - Restrict `img-src` to known domains
- [ ] Verify all security headers are present:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy` (camera, microphone, geolocation as needed for QR scanning)
  - `Strict-Transport-Security` (HSTS)
- [ ] Build and verify — no TypeScript errors

### Checkpoint 4.4: Dead Code & Unused Exports Cleanup
- [ ] Remove unused Header component (250+ lines)
- [ ] Remove dead code exports identified in SECURITY-DEADCODE-AUDIT.md (11 exports, 4 barrel files)
- [ ] Remove unused utilities (`offline-queue.ts`, `slugify`, `truncate`, `generateRefNumber`, `formatCurrency`)
- [ ] Fix `RoleGuard` calling `router.push()` in render (React anti-pattern)
- [ ] Build and verify — no TypeScript errors

---

## Phase 5: Email Infrastructure

**Goal:** Configure and test email delivery for invitations, password resets, and notifications.

### Checkpoint 5.1: Supabase Email Configuration
- [ ] Configure SMTP in Supabase Auth settings:
  - Choose provider (Resend, SendGrid, or custom SMTP)
  - Set SMTP host, port, credentials
  - Set sender address and name
- [ ] Customize Supabase email templates:
  - Invitation email template
  - Password reset email template
  - Email verification template (if used)
  - Magic link email template
- [ ] Configure DNS records:
  - SPF record for email domain
  - DKIM record for email authentication
  - DMARC record for email policy
- [ ] Test email delivery with a test invitation

### Checkpoint 5.2: Application Email Integration
- [ ] Verify invitation flow sends emails via Supabase `admin.inviteUserByEmail()`
- [ ] Verify password reset flow sends emails via Supabase `resetPasswordForEmail()`
- [ ] Verify magic link flow sends emails via Supabase `signInWithOtp()`
- [ ] Add fallback UX when email delivery fails (display invitation link for manual sharing)
- [ ] Test end-to-end: invitation email → click link → account creation
- [ ] Build and verify — no TypeScript errors

### Checkpoint 5.3: Additional Email Notifications (Optional)
- [ ] Create email service for app-level notifications (`src/lib/email.ts`):
  - Incident reported notification (to managers)
  - Incident resolved notification (to reporter)
  - Checklist due reminder
- [ ] Wire up to existing notification store
- [ ] Build and verify — no TypeScript errors

---

## Phase 6: i18n Completion

**Goal:** Complete translation coverage — eliminate all hardcoded English strings.

### Checkpoint 6.1: Audit Hardcoded Strings
- [ ] Scan all employee app pages (28 pages) for hardcoded English strings
- [ ] Scan all dashboard pages (~30 pages) for hardcoded English strings
- [ ] Scan all shared/navigation components for hardcoded strings
- [ ] Scan marketing pages for hardcoded strings
- [ ] Create comprehensive list of missing translation keys organized by page/component
- [ ] Build and verify — no TypeScript errors

### Checkpoint 6.2: Add Missing Translation Keys
- [ ] Add all missing keys to `src/i18n/messages/en.json`
- [ ] Add all missing keys to `src/i18n/messages/nl.json`
- [ ] Add all missing keys to `src/i18n/messages/sv.json`
- [ ] Replace hardcoded strings with `t()` calls in all affected components
- [ ] Priority pages (known gaps from MOBILE-APP-AUDIT.md):
  - Inspection round page (~15 hardcoded strings)
  - Inspection routes dashboard
  - Incidents list/detail
  - Content/checklists pages
  - Platform admin navigation
- [ ] Build and verify — no TypeScript errors

### Checkpoint 6.3: Translation Verification
- [ ] Verify all 28 mobile pages render correctly in EN, NL, SV
- [ ] Verify all dashboard pages render correctly in EN, NL, SV
- [ ] Verify marketing pages render correctly in EN, NL, SV
- [ ] Verify date/number formatting respects locale settings
- [ ] Verify no broken translation keys (missing `t()` lookups)
- [ ] Build and verify — no TypeScript errors

---

## Deployment Preparation (Sevalla)

**Goal:** Prepare the Next.js application for deployment on Sevalla with Supabase as the backend.

### Checkpoint D.1: Docker Configuration
- [ ] Review and update `Dockerfile`:
  - Ensure multi-stage build is optimized (install → build → runtime)
  - Verify Node.js version matches `.nvmrc` (20.9+)
  - Ensure all environment variables are properly passed at build/runtime
  - Optimize image size (use `node:20-alpine`)
- [ ] Test Docker build locally:
  - `docker build -t harmoniq-safety .`
  - `docker run -p 3000:3000 --env-file .env harmoniq-safety`
  - Verify app starts and connects to Supabase
- [ ] Build and verify — no errors

### Checkpoint D.2: Environment Configuration
- [ ] Create `.env.example` documenting all required variables:
  - `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous/publishable key
  - `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-only)
  - `NEXT_PUBLIC_SITE_URL` — Production URL
  - `SENTRY_DSN` — Sentry error tracking DSN
  - `SENTRY_AUTH_TOKEN` — Sentry source map upload token
  - `TURNSTILE_SECRET_KEY` — Cloudflare Turnstile secret
  - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — Cloudflare Turnstile site key
  - Email service credentials (provider-specific)
- [ ] Verify `src/lib/env.ts` validates all required variables at startup
- [ ] Build and verify — no TypeScript errors

### Checkpoint D.3: Sevalla Deployment
- [ ] Configure Sevalla project:
  - Connect GitHub repository
  - Set build command (`npm run build`)
  - Set start command (`npm run start`)
  - Configure environment variables
  - Set health check endpoint (`/api/health`)
- [ ] Deploy to Sevalla staging (if available) or production
- [ ] Verify:
  - Application starts without errors
  - Supabase connection works (health check returns 200)
  - Auth flows work (login, signup, OAuth)
  - Data loads correctly from Supabase
  - All pages render without errors
- [ ] Monitor Sentry for any errors post-deployment
- [ ] Build and verify — deployment successful

---

## Risk Considerations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Supabase tables not created | App falls back to mock data, no real persistence | Verify all migrations applied before other phases |
| RLS policies misconfigured | Data leaks between tenants | Test with multiple user roles before deployment |
| Test infrastructure conflicts with Next.js 16 | Delays in Phase 2 | Research Vitest + Next.js 16 compatibility early |
| Sentry increases bundle size | Performance impact | Use tree-shaking, lazy-load Sentry client |
| Email deliverability issues | Invitations don't reach users | Configure SPF/DKIM/DMARC, test with multiple providers |
| i18n changes break layouts | UI rendering issues | Visual verification in all 3 languages |

---

## Phase Execution Order

```
Phase 1 (Data Persistence)
    │
    ▼
Phase 2 (Testing)
    │
    ▼
Phase 3 (Monitoring)
    │
    ▼
Phase 4 (Security)
    │
    ▼
Phase 5 (Email)
    │
    ▼
Phase 6 (i18n)
    │
    ▼
Deployment Prep (Sevalla)
```

All phases are sequential. Each phase builds on the stability established by previous phases. Commit after each major checkpoint completion.
