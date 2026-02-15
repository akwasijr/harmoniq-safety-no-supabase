# Harmoniq Safety — App-by-App Production Gap Audit

**Scope:** Full product (Auth, Mobile app, Company dashboard, Platform admin, Marketing)  
**Goal:** Identify remaining gaps to production readiness across features, data, security, and operations

---

## Executive Summary
- Core UX flows are present, but production blockers remain: **data persistence & RLS**, **testing/monitoring**, and **security hardening**.  
- Gaps differ by surface; the lists below are actionable per app, followed by cross-cutting items.

---

## Authentication & Account Lifecycle
- **Persistence:** Ensure Supabase tables exist for users/companies/invitations; enforce RLS on all tables (company_id = JWT claim) and disable localStorage session fallback once cookies are stable.
- **Email flows:** Invitation and password reset rely on SMTP + `SERVICE_ROLE` in Vercel; add DKIM/SPF, custom templates, and rate limiting on invite acceptance.
- **App choice routing:** Pre-login selector exists; add server-side enforcement on `/auth/callback` to reject disallowed roles for the chosen surface.
- **Session robustness:** Add refresh-token handling, idle timeout, device list + revoke, and audit log entries for login/logout/invite accept.

---

## Mobile App (Employee)
- **Data integrity:** All list/detail views still backed by client stores; verify Supabase sync for incidents, inspections, checklists, assets, and offline queues. Prevent default-company fallbacks when slug resolution fails.
- **Accessibility:** Toggle switches, photo actions, and bottom nav need `aria-*` labels and keyboard support; focus-trap modals.
- **Navigation safety:** Remove stale cross-links to dashboard routes; ensure params are validated and hydrated before render (no empty company links).
- **Offline:** Confirm background sync queues, conflict resolution (server wins + surface to user), and sync badges for pending items.
- **Observability:** Capture client errors (Sentry) and attach device/network metadata for offline flows.

---

## Company Dashboard (Admin/Manager)
- **Authorization:** Enforce role guard on all dashboard routes (employees redirected to mobile). Validate company slug against store; no DEFAULT_COMPANY fallbacks.
- **Dead functionality:** QR codes (search/download/print), Add Incident/Asset/Ticket modals, Suspend company, Save user detail—ensure they persist to Supabase and show confirmations.
- **Data consistency:** Replace mock/inline data with store-backed queries; unify checklist/inspection/risk templates from a single source.
- **Charts & KPIs:** Use theme-aware colors, correct legend icons, and filtered data; avoid hydration mismatches.
- **Content safety:** Sanitize any `dangerouslySetInnerHTML` (news/content) with DOMPurify on the server.
- **i18n:** Finish translation coverage for dashboard tabs, toasts, table headers, and forms.

---

## Platform Admin (Super Admin)
- **Access control:** Server-side checks for platform routes; require super_admin claim, not just client state. Hide platform nav for non-super users.
- **Analytics & privacy:** Ensure trackers fire without cookie-consent dependency; persist metrics (not in-memory). Add map with IP-to-geo via open-source provider and rate limit ingestion.
- **Settings/GDPR:** Wire toggles to persisted storage; add data export/delete workflows and legal audit log entries.
- **Multi-tenant hygiene:** Company switcher must navigate URL + update context; forbid fallback to default company on creation/update flows.

---

## Marketing Site
- **Performance:** Remove heavy assets on mobile, lazy-load non-critical imagery, and add image optimization.
- **SEO/legal:** Add `robots.txt`, verify sitemap, include structured data, and ensure policy pages link in footer.
- **Security:** Harden CSP to include only required origins; ensure forms post to HTTPS endpoints with CSRF protections.

---

## Data Layer & Backend
- **Supabase schema:** Create all entity tables (companies, users, teams, locations, assets, incidents, tickets, content, checklist_templates/submissions, asset_inspections, risk_evaluations, corrective_actions, work_orders, meter_readings, parts, inspection_routes/rounds, invitations).
- **RLS:** Tenant isolation on all tables; role-based policies for admin vs employee; super_admin-only for platform tables. Deny by default.
- **Migrations:** Add repeatable SQL migrations; block deploy when migration fails. Seed minimal data per company for demos.
- **Storage:** Move file/photo blobs to Supabase Storage; store URLs + metadata. Add antivirus scanning if possible.

---

## Security & Privacy
- **Input sanitization:** DOMPurify for any HTML render; server-side validation for all API routes. Remove `dangerouslySetInnerHTML` without sanitize.
- **Secrets & headers:** Verify Supabase keys have no trailing newline; enforce HTTPS, HSTS, Referrer-Policy, X-Frame-Options (SAMEORIGIN), X-Content-Type-Options.
- **CSRF & rate limiting:** Origin/Referer checks on POST/PUT/PATCH/DELETE; per-IP rate limits on auth, invites, contact, analytics ingest.
- **Auth tokens:** Prefer HttpOnly cookies; avoid storing sessions in localStorage. Add device/session revocation and login notifications.
- **Audit logging:** Record security events (login, invite create/accept, role changes, data export/delete) and expose to admins.

---

## Reliability & Operations
- **Testing:** Add unit tests for stores and helpers; E2E (Playwright) for auth, invite acceptance, incident report, inspection round, asset creation. Run in CI.
- **Monitoring:** Integrate Sentry/LogRocket; add uptime + API latency checks. Surface backend errors in UI to admins.
- **Deployments:** Add staging environment, feature flags for risky changes, and canary deploys. Enable CI (lint, typecheck, test) on PRs.
- **Backups:** Configure Supabase PITR or scheduled backups; document restore drills.

---

## Performance
- **Client:** Remove unused imports, split large components, and avoid inline mock data; ensure suspense boundaries around searchParams usage.
- **Network:** Cache static assets via SW; leverage incremental static regeneration where safe; batch Supabase requests and add timeouts.
- **Mobile:** Avoid video backgrounds; defer heavy charts; add skeleton loaders instead of spinners.

---

## Priority Checklist (Next 10)
1) Create Supabase tables + RLS; set `SERVICE_ROLE_KEY` in Vercel.  
2) Remove localStorage session fallback; rely on secure cookies + refresh.  
3) Add server-side role guard for platform/dashboard routes.  
4) Sanitize all HTML (news/content) with DOMPurify.  
5) Persist invitations + email delivery (SMTP, DKIM/SPF).  
6) Wire all “Add” modals (incident/asset/ticket) to Supabase and confirm with toast.  
7) Fix QR codes page actions (search/download/print) with real data.  
8) Finish i18n for dashboard/mobile toasts and tab labels.  
9) Add Sentry + uptime checks; remove auto-refresh polling unless user-triggered.  
10) Add E2E tests for auth, invite accept, incident report, inspection round, asset create.
