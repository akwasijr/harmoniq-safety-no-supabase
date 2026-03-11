# Harmoniq Safety — Full App Audit Report

**Date:** 2026-02-14  
**Scope:** 28 mobile app pages + 36 dashboard pages + security audit  
**Auditor:** Automated code audit  

---

## Summary

### Mobile App (28 pages)

| Severity | Count |
|----------|-------|
| 🔴 High | 1 |
| 🟡 Medium | 7 |
| 🟢 Low | 11 |
| ℹ️ Info | 3 |
| **Total** | **22** |

### Dashboard (36 pages)

| Severity | Count |
|----------|-------|
| 🟡 Medium | 5 |
| 🟢 Low | 10 |
| ℹ️ Info | 3 |
| **Total** | **18** |

### Combined: 40 findings (1 high, 12 medium, 21 low, 6 info)

### Security Audit

| Severity | Count |
|----------|-------|
| 🔴 High | 3 |
| 🟡 Medium | 7 |
| 🟢 Low | 5 |
| ℹ️ Info | 5 |
| **Total** | **20** |

### Grand Total: 60 findings across mobile + dashboard + security

---

## 🔴 High Severity

### F13 — Store data not persisted to Supabase
- **Area:** Data persistence
- **Pages affected:** All
- **Finding:** All entity stores (incidents, assets, users, etc.) use in-memory state with localStorage fallback. When Supabase tables don't exist or aren't connected, data resets on page reload. Users see mock data and lose any changes they make.
- **Impact:** Any data added via the app (incidents, assets, inspections) is lost on refresh.
- **Recommendation:** Ensure all Supabase tables match the type definitions, or add localStorage persistence as a reliable fallback.

---

## 🟡 Medium Severity

### F01 — Missing loading guard: incidents list
- **Page:** `incidents/page.tsx`
- **Finding:** No `isLoading` check before rendering the list. Shows empty "No incidents" state briefly before data loads.
- **Fix:** Destructure `isLoading` from `useIncidentsStore()` and show spinner while loading.

### F02 — Missing loading guard: news list
- **Page:** `news/page.tsx`
- **Finding:** No `isLoading` guard. Empty state flashes before content loads.
- **Fix:** Add `isLoading` spinner guard.

### F03 — Missing loading guard: news detail
- **Page:** `news/[newsId]/page.tsx`
- **Finding:** No `isLoading` check before not-found fallback. Shows "not found" momentarily.
- **Fix:** Add `isLoading` guard before the not-found check.

### F04 — Missing loading guard: location detail
- **Page:** `location/[locationId]/page.tsx`
- **Finding:** No `isLoading` check before not-found check.
- **Fix:** Add `isLoading` guard.

### F06 — Missing loading guard: asset inspection
- **Page:** `inspection/[assetId]/page.tsx`
- **Finding:** No `isLoading` check before not-found check for asset lookup.
- **Fix:** Add `isLoading` guard from `useAssetsStore()`.

### F09 — Hardcoded English strings in inspection round
- **Page:** `inspection-round/page.tsx`
- **Finding:** Several UI strings are hardcoded in English instead of using the `t()` translation function:
  - "Submit Inspection", "Next Checkpoint"
  - "Route not found", "Go Back"
  - Result labels: "pass", "fail", "needs attention"
  - "Photo (if abnormality found)", "Notes", "Take Photo"
  - "Value is out of acceptable range"
- **Fix:** Replace all hardcoded strings with `t("inspectionRounds.xxx")` keys (keys already exist in en/nl/sv).

### F14 — Scan page uses separate data hook
- **Page:** `scan/page.tsx`
- **Finding:** Uses `useCompanyData()` hook instead of individual stores. This hook may have different loading behavior and doesn't benefit from the lazy-loading optimization applied to stores.
- **Fix:** Verify `useCompanyData` handles loading states properly, or refactor to use individual stores.

---

## 🟢 Low Severity

### F07 — Hardcoded DEFAULT_COMPANY_ID in report
- **Page:** `report/page.tsx`
- **Finding:** Falls back to `DEFAULT_COMPANY_ID` from mocks when `user.company_id` is missing. Should never happen in production but creates a dependency on mock data.
- **Fix:** Remove mock import; use empty string or throw if user has no company.

### F08 — Hardcoded DEFAULT_COMPANY_ID in checklists
- **Page:** `checklists/[checklistId]/page.tsx`
- **Finding:** Same as F07 — uses mock company ID as fallback.
- **Fix:** Same as F07.

### F10 — Low i18n coverage: incidents list
- **Page:** `incidents/page.tsx`
- **Finding:** Only 4 translation calls — section headers and labels likely hardcoded in English.
- **Fix:** Audit all visible strings and replace with `t()` calls.

### F11 — Low i18n coverage: incident detail
- **Page:** `incidents/[incidentId]/page.tsx`
- **Finding:** Only 2 translation calls — most labels and status text are hardcoded English.
- **Fix:** Add translation keys for all visible strings.

### F05 — Missing loading guard: profile
- **Page:** `profile/page.tsx`
- **Finding:** No loading state — profile fields (name, email, department) may flash empty before user data loads.
- **Fix:** Add loading spinner while stores are loading.

### F12 — Missing Suspense wrapper for searchParams
- **Page:** `report/page.tsx`
- **Finding:** Uses `useSearchParams()` without a `<Suspense>` boundary. May cause hydration warnings in production with Next.js 16.
- **Fix:** Wrap the component in `<Suspense>` (like other pages already do).

### F15 — Profile page no loading state
- **Page:** `profile/page.tsx`
- **Finding:** Profile fields render empty momentarily before auth/store data loads.
- **Fix:** Show skeleton or spinner while `user` or stores are loading.

### F16 — Inspection round requires all checkpoints
- **Page:** `inspection-round/page.tsx`
- **Finding:** Submit button is disabled until ALL checkpoints have a result. No way to submit a partial inspection round.
- **Fix:** Consider allowing partial submission with a warning, or show which checkpoints are missing.

### F17 — Sync queue is in-memory only
- **Page:** `inspection-round/page.tsx`
- **Finding:** `addToQueue` from `useSync()` stores items in React state + localStorage, but the sync itself doesn't actually POST to any backend. Synced items are just marked as "synced" in state.
- **Fix:** Implement actual sync POST to a Supabase endpoint when online.

### F20 — No pull-to-refresh on mobile
- **Pages:** All list pages
- **Finding:** No pull-to-refresh gesture support on mobile list pages (incidents, news, assets, checklists).
- **Fix:** Add pull-to-refresh using a touch gesture library or custom implementation.

### F21 — No skeleton loading states
- **Pages:** All
- **Finding:** All loading states use a simple spinner. No skeleton/shimmer placeholders that match the page layout.
- **Fix:** Add skeleton components for key pages (home dashboard, lists, detail pages).

---

## ℹ️ Info (Working Well)

### F18 — Bottom navigation
- **Component:** `bottom-tabs.tsx`
- **Status:** ✅ 5 tabs with proper i18n: Home, Report, Tasks, Assets, Profile
- **Note:** Good coverage of primary user flows.

### F19 — Auth guard
- **Component:** `app/layout.tsx`
- **Status:** ✅ Redirects unauthenticated users to `/login`, shows spinner while checking auth.
- **Note:** Uses `useAuth()` hook with profile caching for fast restore.

### F22 — No push notifications
- **Status:** ℹ️ Only in-app toast notifications exist. No push notification infrastructure.
- **Note:** Acceptable for current stage. Future enhancement for incident alerts and inspection reminders.

---

## Pages Audited (28)

| # | Page | Lines | Stores | i18n | Loading | Status |
|---|------|-------|--------|------|---------|--------|
| 1 | app/page.tsx (Home) | 490 | 5 | 38 | ✅ | OK |
| 2 | app/layout.tsx | 71 | 1 | 4 | ✅ | OK |
| 3 | report/page.tsx | 671 | 1 | 55 | ⚠️ | F07, F12 |
| 4 | report/success/page.tsx | 92 | 0 | 20 | ✅ | OK |
| 5 | incidents/page.tsx | 201 | 2 | 4 | ❌ | F01, F10 |
| 6 | incidents/[incidentId]/page.tsx | 283 | 3 | 2 | ✅ | F11 |
| 7 | assets/page.tsx | 422 | 4 | 24 | ✅ | OK |
| 8 | assets/new/page.tsx | 717 | 2 | 60 | ✅ | OK |
| 9 | asset/page.tsx | 226 | 3 | 21 | ✅ | OK |
| 10 | scan/page.tsx | 567 | 0* | 34 | ⚠️ | F14 |
| 11 | inspection/page.tsx | 41 | 0 | 3 | ✅ | OK |
| 12 | inspection/[assetId]/page.tsx | 406 | 2 | 30 | ❌ | F06 |
| 13 | inspection-round/page.tsx | 440 | 2 | 15 | ✅ | F09, F16, F17 |
| 14 | checklists/page.tsx | 541 | 6 | 29 | ✅ | OK |
| 15 | checklists/[checklistId]/page.tsx | 415 | 2 | 29 | ⚠️ | F08 |
| 16 | news/page.tsx | 143 | 1 | 10 | ❌ | F02 |
| 17 | news/[newsId]/page.tsx | 307 | 1 | 20 | ❌ | F03 |
| 18 | maintenance/page.tsx | 144 | 2 | 16 | ✅ | OK |
| 19 | location/page.tsx | 24 | 0 | 1 | ✅ | OK |
| 20 | location/[locationId]/page.tsx | 361 | 2 | 22 | ❌ | F04 |
| 21 | profile/page.tsx | 470 | 3 | 12 | ❌ | F05, F15 |
| 22 | risk-assessment/page.tsx | 24 | 0 | 1 | ✅ | OK |
| 23 | risk-assessment/[formId]/page.tsx | — | — | — | — | Not audited |
| 24 | risk-assessment/arbowet/page.tsx | — | — | — | — | Not audited |
| 25 | risk-assessment/jha/page.tsx | — | — | — | — | Not audited |
| 26 | risk-assessment/jsa/page.tsx | — | — | — | — | Not audited |
| 27 | risk-assessment/osa/page.tsx | — | — | — | — | Not audited |
| 28 | risk-assessment/rie/page.tsx | — | — | — | — | Not audited |

*Scan page uses `useCompanyData()` hook instead of individual stores.

---

## Recommended Priority Order

1. **Fix missing loading guards** (F01–F06) — quick wins, prevents "not found" flash
2. **Add i18n to inspection round** (F09) — keys already exist, just wire them
3. **Remove mock ID fallbacks** (F07, F08) — prevents mock data dependency
4. **Add Suspense to report** (F12) — prevents hydration warnings
5. **Improve i18n coverage** (F10, F11) — audit remaining hardcoded strings
6. **UX improvements** (F16, F20, F21) — partial submit, pull-to-refresh, skeletons
7. **Backend sync** (F13, F17) — requires Supabase table setup

---
---

# Part 2: Dashboard Audit (36 pages)

`src/app/(app)/[company]/dashboard/`

---

## 🟡 Medium Severity (Dashboard)

### D01 — Mock data fallbacks across 13 pages
- **Pages:** assets, assets/[assetId], incidents, incidents/new, tickets, tickets/new, checklists/new, content/new, locations, inspection-routes, platform/users, users, users/new
- **Finding:** 13 dashboard pages import and use `DEFAULT_COMPANY_ID` or `DEFAULT_USER_ID` from `src/mocks/data.ts` as fallback values. This creates a hard dependency on mock data and can cause incorrect data associations.
- **Fix:** Replace with `user.company_id` from auth context. Remove mock imports where not needed.

### D07 — Inspection routes: hardcoded English
- **Page:** `inspection-routes/page.tsx`
- **Finding:** Most UI strings are hardcoded English: "Create Route", "Add Checkpoint", "Deactivate", "Activate", "Delete", "No inspection routes yet", checkpoint labels. Only 14 `t()` calls for 415 lines.
- **Fix:** Add translation keys and wire to `t()`.

### D08 — Observability page: hardcoded English
- **Page:** `platform/analytics/page.tsx`
- **Finding:** Tab labels, card titles, GDPR labels, compliance checklist — all hardcoded English. Only 9 `t()` calls for 372 lines.
- **Fix:** Add translation keys for all visible strings.

### D11 — Platform settings not persisted
- **Page:** `platform/settings/page.tsx`
- **Finding:** Platform settings (feature toggles, security options, notification preferences) are UI-only. Changes reset on page reload.
- **Fix:** Persist to Supabase `platform_settings` table or localStorage.

### D12 — GDPR compliance toggles not persisted
- **Page:** `platform/analytics/page.tsx` (Compliance tab)
- **Finding:** GDPR toggles (cookie consent, right to erasure, data export, IP anonymization, retention days, DPO email) reset on reload.
- **Fix:** Persist to Supabase or localStorage.

---

## 🟢 Low Severity (Dashboard)

### D02–D06 — Missing loading guards on list pages
- **Pages:** `analytics`, `corrective-actions`, `parts`, `work-orders`, `qr-codes`
- **Finding:** These list pages don't check `isLoading` from their stores. Data may briefly show as empty before lazy-load completes.
- **Fix:** Add `isLoading` spinner guard or skeleton loading.

### D09 — Low i18n: content list
- **Page:** `content/page.tsx` (235 lines, 3 `t()` calls)
- **Finding:** Most labels and buttons hardcoded in English.

### D10 — Low i18n: new checklist
- **Page:** `checklists/new/page.tsx` (112 lines, 4 `t()` calls)
- **Finding:** Form labels partially hardcoded.

### D13 — Company settings may not persist
- **Page:** `settings/page.tsx`
- **Finding:** Settings form has 43 save-related references but persistence depends on store → Supabase sync working correctly.

### D15 — No empty state illustrations
- **Pages:** All dashboard list pages
- **Finding:** Empty states show text only ("No incidents", "No assets"). No illustrations or helpful graphics.

### D16 — No breadcrumb navigation
- **Pages:** All dashboard detail pages
- **Finding:** Detail pages (asset detail, incident detail, user detail) use a back button but no breadcrumb trail showing the hierarchy (e.g., Assets → Forklift #1 → Maintenance).

---

## ℹ️ Info (Dashboard — Working Well)

### D14 — Location detail is a redirect
- **Page:** `locations/[locationId]/page.tsx`
- **Status:** ✅ Redirects to `locations?selected=id` — intentional design, locations managed in a single page with selection.

### D17 — Auth guard
- **Component:** `dashboard/layout.tsx`
- **Status:** ✅ Redirects employees to `/app`, unauthenticated to `/login`. Company slug validation deferred until companies load.

### D18 — Sidebar navigation
- **Component:** `sidebar.tsx`
- **Status:** ✅ 11 nav items with i18n `titleKey` mappings. Platform admin section shown for super_admin and company_admin. Collapse/expand with hover-to-expand.

---

## Dashboard Pages Audited (36)

| # | Page | Lines | Stores | i18n | Loading | Hardcoded | Status |
|---|------|-------|--------|------|---------|-----------|--------|
| 1 | page.tsx (Home) | 458 | 1 | 18 | ⚠️ | 0 | D02 |
| 2 | analytics/page.tsx | 384 | 2 | 20 | ❌ | 0 | D02 |
| 3 | incidents/page.tsx | 833 | 4 | 42 | ✅ | 3 | D01 |
| 4 | incidents/[incidentId]/page.tsx | 1584 | 3 | 39 | ✅ | 0 | OK |
| 5 | incidents/new/page.tsx | 481 | 3 | 25 | ✅ | 3 | D01 |
| 6 | checklists/page.tsx | 983 | 7 | 25 | ✅ | 0 | OK |
| 7 | checklists/[checklistId]/page.tsx | 861 | 4 | 31 | ✅ | 0 | OK |
| 8 | checklists/new/page.tsx | 112 | 2 | 4 | ✅ | 2 | D01, D10 |
| 9 | assets/page.tsx | 1016 | 3 | 72 | ✅ | 3 | D01 |
| 10 | assets/[assetId]/page.tsx | 1669 | 8 | 87 | ✅ | 2 | D01 |
| 11 | corrective-actions/page.tsx | 296 | 4 | 24 | ❌ | 0 | D03 |
| 12 | work-orders/page.tsx | 366 | 1 | 27 | ❌ | 0 | D05 |
| 13 | parts/page.tsx | 187 | 1 | 26 | ❌ | 0 | D04 |
| 14 | qr-codes/page.tsx | 413 | 2 | 34 | ❌ | 0 | D06 |
| 15 | content/page.tsx | 235 | 1 | 3 | ✅ | 0 | D09 |
| 16 | content/[contentId]/page.tsx | 472 | 2 | 17 | ✅ | 0 | OK |
| 17 | content/new/page.tsx | 634 | 2 | 20 | ✅ | 3 | D01 |
| 18 | tickets/page.tsx | 408 | 3 | 34 | ✅ | 3 | D01 |
| 19 | tickets/[ticketId]/page.tsx | 502 | 1 | 21 | ✅ | 0 | OK |
| 20 | tickets/new/page.tsx | 256 | 3 | 15 | ✅ | 3 | D01 |
| 21 | users/page.tsx | 831 | 3 | 66 | ✅ | 2 | D01 |
| 22 | users/[userId]/page.tsx | 680 | 2 | 68 | ✅ | 0 | OK |
| 23 | users/new/page.tsx | 363 | 4 | 32 | ✅ | 2 | D01 |
| 24 | users/teams/[teamId]/page.tsx | 539 | 2 | 45 | ✅ | 0 | OK |
| 25 | locations/page.tsx | 1093 | 5 | 69 | ✅ | 2 | D01 |
| 26 | locations/[locationId]/page.tsx | 25 | 0 | 1 | ✅ | 0 | Redirect |
| 27 | settings/page.tsx | 804 | 1 | 72 | ✅ | 0 | D13 |
| 28 | inspection-routes/page.tsx | 415 | 3 | 14 | ✅ | 2 | D01, D07 |
| 29 | inspections/[inspectionId]/page.tsx | 827 | 1 | 10 | ✅ | 0 | OK |
| 30 | risk-assessments/[assessmentId]/page.tsx | 1099 | 3 | 10 | ✅ | 0 | OK |
| 31 | platform/analytics/page.tsx | 372 | 4 | 9 | ✅ | 0 | D08, D12 |
| 32 | platform/companies/page.tsx | 480 | 3 | 35 | ✅ | 0 | OK |
| 33 | platform/companies/[companyId]/page.tsx | 346 | 3 | 15 | ✅ | 0 | OK |
| 34 | platform/users/page.tsx | 441 | 0 | 21 | ✅ | 2 | D01 |
| 35 | platform/users/[userId]/page.tsx | 470 | 1 | 35 | ✅ | 0 | OK |
| 36 | platform/settings/page.tsx | 863 | 1 | 14 | ✅ | 0 | D11 |

---

## Combined Recommended Priority Order

### Quick Wins (1–2 hours)
1. **Fix all missing loading guards** (F01–F06, D02–D06) — 11 pages, prevents empty/not-found flash
2. **Wire inspection round i18n** (F09) — translation keys already exist
3. **Wire inspection routes i18n** (D07) — add keys and `t()` calls
4. **Add Suspense to report page** (F12) — one-line wrapper

### Medium Effort (half day)
5. **Remove all DEFAULT_COMPANY_ID imports** (F07, F08, D01) — 15 pages, replace with `user.company_id`
6. **Wire observability page i18n** (D08) — add keys to en/nl/sv
7. **Improve i18n coverage** (F10, F11, D09, D10) — audit hardcoded strings in incidents, content, checklists

### Larger Effort (1+ day)
8. **Persist GDPR/platform settings** (D11, D12) — requires Supabase table or localStorage
9. **Persist company settings** (D13) — verify Supabase sync works
10. **UX improvements** (F16, F20, F21, D15, D16) — partial submit, pull-to-refresh, skeletons, breadcrumbs, empty state illustrations
11. **Backend data persistence** (F13) — ensure all Supabase tables exist and match types
12. **Offline sync backend** (F17) — implement actual POST to Supabase on reconnect

---
---

# Part 3: Security Audit

---

## 🔴 High Severity (Security)

### S01 — Analytics GET endpoint unauthenticated
- **File:** `src/app/api/analytics/route.ts`
- **Finding:** The GET endpoint that returns all analytics data (page views, visitor IPs/locations, referrers) has no authentication check. Anyone can call `/api/analytics?days=30` and get full traffic data.
- **Impact:** Sensitive visitor data exposed publicly.
- **Fix:** Add auth check — verify Supabase session and require `super_admin` or `company_admin` role.

### S05 — CSP allows unsafe-inline and unsafe-eval
- **File:** `next.config.ts`
- **Finding:** Content Security Policy includes `'unsafe-inline'` and `'unsafe-eval'` in `script-src`. This effectively disables XSS protection from CSP since injected scripts can execute.
- **Impact:** XSS attacks can execute arbitrary JavaScript.
- **Fix:** Remove `'unsafe-eval'`. Replace `'unsafe-inline'` with nonce-based approach or hashes for required inline scripts. Next.js supports nonce-based CSP.

### S07 — No rate limiting on any API endpoint
- **Files:** All 4 API routes
- **Finding:** No rate limiting exists on any endpoint. The analytics POST, contact form, invitation API, and token validation can all be called unlimited times.
- **Impact:** DoS attacks, brute-force on invite tokens, contact form spam, analytics data pollution.
- **Fix:** Add middleware-level rate limiting (e.g., `@upstash/ratelimit` with Redis, or in-memory token bucket). Priority endpoints: `/api/contact`, `/api/invitations/validate`, `/api/analytics` POST.

---

## 🟡 Medium Severity (Security)

### S02 — Analytics POST unauthenticated
- **File:** `src/app/api/analytics/route.ts`
- **Finding:** Anyone can POST fake page views to `/api/analytics`. No origin check, no CAPTCHA, no auth.
- **Fix:** Add origin validation (`Referer` header check), or simple API key/token for the tracker script.

### S03 — Contact form no rate limiting or CAPTCHA
- **File:** `src/app/api/contact/route.ts`
- **Finding:** No auth, no rate limiting, no CAPTCHA on contact form submission.
- **Fix:** Add rate limiting (max 5 per IP per hour) and optional CAPTCHA integration.

### S04 — Invite token brute-force risk
- **File:** `src/app/api/invitations/validate/route.ts`
- **Finding:** Token validation has no rate limiting. Tokens are 64-char hex (256 bits) so brute-force is impractical, but repeated failed attempts should still be limited.
- **Fix:** Add rate limiting and log failed validation attempts.

### S06 — API routes skip middleware auth
- **File:** `middleware.ts`
- **Finding:** All paths starting with `/api` are in `STATIC_PREFIXES` and skip the middleware auth check entirely. This means API routes must implement their own auth — but only `/api/invitations` does.
- **Fix:** Remove `/api` from `STATIC_PREFIXES`. Add auth in middleware for API routes, or ensure each API route checks auth individually.

### S08 — Session cookie HttpOnly not verified
- **Finding:** Supabase SSR should set HttpOnly cookies, but this isn't explicitly verified. If cookies are accessible to JavaScript, XSS could steal sessions.
- **Fix:** Verify Supabase SSR cookie settings include `HttpOnly: true`, `Secure: true`, `SameSite: Lax`.

### S15 — RoleGuard is client-side only
- **Files:** All platform admin pages
- **Finding:** `RoleGuard` component checks `user.role` from client-side auth context. A user could manipulate localStorage (`harmoniq_auth_profile`) to set `role: "super_admin"` and bypass the guard. The middleware checks auth but not role.
- **Fix:** Add server-side role verification in the middleware for `/dashboard/platform/*` routes, or use server components that verify the role via Supabase.

### S16 — No CSRF protection
- **Finding:** Form submissions (contact, invitations, settings) use fetch/POST with cookie-based auth but no CSRF token. Supabase uses JWT bearer tokens which partially mitigate this, but the app also relies on cookies.
- **Fix:** Implement CSRF tokens for state-changing operations, or verify `Origin`/`Referer` headers in API routes.

---

## 🟢 Low Severity (Security)

### S09 — No account lockout
- **Finding:** No client-side or server-side lockout after repeated failed login attempts. Supabase has basic rate limiting on auth endpoints but it's not configurable.
- **Fix:** Implement progressive delay or lockout after 5+ failed attempts. Show "Too many attempts" message.

### S10 — Invite tokens in URL params
- **Finding:** Invite tokens appear in URLs (`/invite?token=abc123`) which are logged in server access logs, browser history, and potentially referrer headers.
- **Fix:** Consider using short-lived JWTs or consuming the token immediately on first load (one-time use via POST).

### S18 — Passwords transmitted in plaintext to SDK
- **Finding:** Passwords are sent from the login form directly to `supabase.auth.signInWithPassword()`. This goes over HTTPS so is encrypted in transit, but there's no client-side hashing.
- **Status:** Acceptable for TLS-protected deployments. No action needed unless targeting high-security compliance (e.g., SOC2).

### S19 — Auth session in localStorage
- **Finding:** `harmoniq_auth_session` (access token + refresh token) is stored in localStorage. If an XSS vulnerability exists, tokens can be stolen.
- **Fix:** Prefer HttpOnly cookies for session tokens (Supabase SSR does this). Remove the localStorage session cache, or encrypt it.

### S20 — Geolocation permission
- **Finding:** `Permissions-Policy: geolocation=(self)` allows the app to request GPS. This is needed for incident reporting GPS feature.
- **Status:** ✅ Appropriate and correctly scoped.

---

## ℹ️ Info (Security — Working Well)

### S11 — Service role key server-only ✅
- The `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SECRET_KEY` is only used in `src/lib/supabase/admin.ts` (server-side). Never exposed to the client bundle.

### S12 — XSS sanitization with DOMPurify ✅
- All `dangerouslySetInnerHTML` usage goes through `sanitizeHtml()` which uses DOMPurify with a strict allowlist.

### S13 — Good security headers ✅
- `X-Frame-Options: DENY` — clickjacking protection
- `X-Content-Type-Options: nosniff` — MIME type sniffing prevention
- `X-XSS-Protection: 1; mode=block` — legacy XSS protection
- `Referrer-Policy: strict-origin-when-cross-origin` — referrer leakage prevention
- `Permissions-Policy` — camera/mic/geo properly scoped

### S14 — Platform pages have RoleGuard ✅
- All platform admin pages (analytics, companies, users, settings) use `RoleGuard` component.

### S17 — No secret leaks ✅
- No secrets, tokens, or API keys found in console.log statements or client-side code.

---

## Security Priority Fix Order

### Critical (do before production)
1. **Add auth to analytics GET** (S01) — 5 min fix, prevents data leak
2. **Remove unsafe-eval from CSP** (S05) — test for breakage, then remove
3. **Add rate limiting** (S07) — use Upstash or in-memory limiter on all API routes

### Important (do soon)
4. **Fix API auth bypass in middleware** (S06) — remove `/api` from static prefixes
5. **Add origin check to analytics POST** (S02) — prevent spam
6. **Add rate limit to contact form** (S03) — prevent spam
7. **Server-side role check for platform routes** (S15) — prevent localStorage manipulation
8. **Add CSRF protection** (S16) — verify Origin header at minimum

### Nice to have
9. **Account lockout** (S09) — progressive delay
10. **Short-lived invite tokens** (S10) — convert to JWTs
11. **Remove localStorage session** (S19) — rely on HttpOnly cookies only
