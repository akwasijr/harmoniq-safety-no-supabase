# Harmoniq Safety — Component Code Audit Report

**Date:** 2026-02-09  
**Scope:** All shared, UI, layout, navigation, auth, chart, and PDF components  
**Total Issues Found:** 38

---

## 1. Layouts — `src/components/layouts/`

### 1.1 dashboard-layout.tsx

| # | Severity | Lines | Issue | Fix |
|---|----------|-------|-------|-----|
| L-1 | **LOW** | L4 | **Unused import:** `Link` from `next/link` is imported but never used in the component. | Remove the import. |
| L-2 | **MEDIUM** | L62–73 | **Mobile overlay missing focus trap:** When the mobile sidebar opens, keyboard focus is not trapped inside the overlay. Users can tab behind the overlay to inaccessible elements. | Add a focus-trap (e.g. `focus-trap-react`) or manage focus manually when `showMobileMenu` is true. |
| L-3 | **MEDIUM** | — | **No `<main>` landmark role** at this level. The root layout wraps `{children}` in `<main>`, and this layout nests another `<main>`. Screen readers will see duplicate `<main>` landmarks. | Change the inner wrapper to `<div role="main">` or remove the outer `<main>` wrapper in root layout and let each sub-layout define its own. |

### 1.2 employee-app-layout.tsx

| # | Severity | Lines | Issue | Fix |
|---|----------|-------|-------|-----|
| L-4 | **LOW** | L4 | **Unused import:** `Link` from `next/link` is imported but also used in JSX (L30) — *confirmed used*. However, `Shield` is imported but only used as a fallback icon — this is fine. | No action needed. |
| L-5 | **MEDIUM** | L31–36 | **XSS risk via `companyLogo`:** The `<img src={companyLogo}>` renders a user-provided URL directly. If the logo URL is controlled by a malicious admin, it could track users or trigger SSRF via image loading. | Validate/sanitize logo URLs server-side; consider an allow-list of image domains or use Next.js `<Image>` with configured `remotePatterns`. |
| L-6 | **LOW** | L46 | **Hard-coded `pb-20`:** The bottom padding assumes the bottom tabs are always exactly 80px tall. If font size or safe area changes, content may be hidden behind the tab bar. | Use a CSS variable or measure the tab bar height dynamically. |

### 1.3 index.ts (barrel)

| # | Severity | Lines | Issue | Fix |
|---|----------|-------|-------|-----|
| L-7 | **LOW** | — | **Barrel file never imported:** No file in the codebase imports from `@/components/layouts` (the barrel). All consumers import directly from `./dashboard-layout` or `./employee-app-layout`. The barrel export is dead code. | Either remove the barrel or update consumers to import from the barrel for consistency. |

---

## 2. Navigation — `src/components/navigation/`

### 2.1 header.tsx

| # | Severity | Lines | Issue | Fix |
|---|----------|-------|-------|-----|
| N-1 | **HIGH** | **Entire file** | **Component never imported anywhere.** No file in the app imports `Header` from navigation. The barrel re-exports it, but nothing uses the barrel either. This is 250+ lines of dead code. | Remove or plan integration. Currently the `DashboardLayout` builds its own inline header instead of using this component. |
| N-2 | **MEDIUM** | L10 | **Production mock data leak:** `MOCK_NOTIFICATIONS` is imported from `@/mocks/data` and rendered directly in the notification dropdown. In production, this would display fake notifications to real users. | Replace with real notification data from a store/API. |
| N-3 | **MEDIUM** | L192–211 | **Notification dropdown not keyboard-accessible:** The dropdown opens on click but has no `role="menu"`, no arrow-key navigation, and no focus management. `Escape` key doesn't close it. | Add proper ARIA menu pattern or use a library like Radix `DropdownMenu`. |
| N-4 | **MEDIUM** | L214–260 | **User dropdown menu missing `role="menu"` on container and `role="menuitem"` on items.** The button correctly has `aria-haspopup="menu"` and `aria-expanded`, but the dropdown `div` itself has no role. | Add `role="menu"` to the dropdown container and `role="menuitem"` to each link. |
| N-5 | **LOW** | L248 | **Dead-end link:** "Settings" links to `/settings` when `company` is falsy: `href={company ? ... : "/settings"}`. There is no `/settings` page in the app — it would 404. | Change fallback to `"/login"` or remove the fallback. |

### 2.2 sidebar.tsx

| # | Severity | Lines | Issue | Fix |
|---|----------|-------|-------|-----|
| N-6 | **MEDIUM** | L166–172 | **"Platform Admin" section heading not translated.** The text "Platform Admin" is hardcoded in English while the rest of the sidebar uses `t()` for i18n. | Use `t("nav.platformAdmin")` and add the key to all locale files. |
| N-7 | **MEDIUM** | L119–132 | **Platform nav items lack `titleKey` for i18n.** `platformNavItems` only has `title` (English) but no `titleKey`, so `getTitle()` falls back to the hardcoded English string. | Add `titleKey` to each platform nav item and corresponding translation keys. |
| N-8 | **LOW** | L338–341 | **Theme toggle button missing `aria-label`.** The theme toggle in the sidebar footer only has a `title` attribute but no `aria-label`. Screen readers won't announce the purpose. | Add `aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}`. |
| N-9 | **LOW** | L321–332 | **Notification link in sidebar has no `aria-label`.** The bell icon link only has `title="Notifications"` — `title` is not reliably announced by screen readers. | Add an explicit `aria-label="Notifications"`. |
| N-10 | **LOW** | L47–57 | **`NavItem.badge` is defined in the interface but never set on any nav item in `navItems` array.** The badge rendering code exists (L248–253) but will never execute. | Remove the `badge` property and rendering code if not needed, or populate it with real data. |

### 2.3 bottom-tabs.tsx

| # | Severity | Lines | Issue | Fix |
|---|----------|-------|-------|-----|
| N-11 | **LOW** | L72 | **`safe-area-inset-bottom` CSS class not defined.** The class is used on the `<nav>` but there's no corresponding CSS utility defined in `globals.css` or Tailwind config. On iOS devices, the tab bar may overlap the home indicator. | Add the CSS utility: `.safe-area-inset-bottom { padding-bottom: env(safe-area-inset-bottom); }` in globals.css. |

### 2.4 index.ts (barrel)

| # | Severity | Lines | Issue | Fix |
|---|----------|-------|-------|-----|
| N-12 | **LOW** | — | **Barrel file never imported.** Same as L-7 — no consumer uses `@/components/navigation`. All imports go directly to the source files. | Remove or standardize import paths. |

---

## 3. Auth Components — `src/components/auth/`

### 3.1 company-switcher.tsx

| # | Severity | Lines | Issue | Fix |
|---|----------|-------|-------|-----|
| A-1 | **MEDIUM** | L137–148 | **`CompanyBadge` is exported but never imported anywhere.** Dead export. | Remove or integrate into the dashboard header for non-super-admin users. |
| A-2 | **MEDIUM** | L74–80 | **Company switcher dropdown missing keyboard support.** No `Escape` to close, no arrow-key navigation, no `role="listbox"` on the container, no `role="option"` on items. | Add full ARIA listbox pattern and keyboard event handlers. |
| A-3 | **LOW** | L83 | **"Switch Company" text not translated.** Hardcoded English string in the dropdown header. | Use `t("auth.switchCompany")` and add the key. |

### 3.2 role-guard.tsx

| # | Severity | Lines | Issue | Fix |
|---|----------|-------|-------|-----|
| A-4 | **MEDIUM** | L147 | **`SuperAdminOnly` exported but never used anywhere.** Dead code. | Remove or plan usage. |
| A-5 | **MEDIUM** | L158 | **`CompanyAdminOnly` exported but never used anywhere.** Dead code. | Remove or plan usage. |
| A-6 | **MEDIUM** | L169 | **`ManagerOnly` exported but never used anywhere.** Dead code. | Remove or plan usage. |
| A-7 | **MEDIUM** | L180 | **`useRoleGuard` hook exported but never used anywhere.** Dead code. | Remove or plan usage. |
| A-8 | **HIGH** | L68–78 | **Client-side redirect on unauthenticated access calls `router.push()` inside a render function.** This triggers a navigation during render, which can cause React warnings. The redirect should be in a `useEffect`. | Move the redirect logic to a `useEffect` or return a component that triggers the redirect on mount. |

---

## 4. UI Components — `src/components/ui/`

### Usage Summary

| Component | File | Imported by app pages? |
|-----------|------|----------------------|
| Badge | badge.tsx | ✅ Yes (multiple pages) |
| Button | button.tsx | ✅ Yes (multiple pages) |
| Card (all parts) | card.tsx | ✅ Yes (multiple pages) |
| DateRangeDropdown | date-range-dropdown.tsx | ✅ Yes (via FilterPanel) |
| DetailTabs | detail-tabs.tsx | ✅ Yes (multiple pages) |
| EmptyState | empty-state.tsx | ✅ Yes (incident detail) |
| ErrorState | error-state.tsx | ✅ Yes (error boundaries) |
| FilterPanel | filter-panel.tsx | ✅ Yes (dashboard, analytics, incidents) |
| Input | input.tsx | ✅ Yes (multiple pages) |
| KPICard | kpi-card.tsx | ✅ Yes (dashboard, analytics) |
| Label | label.tsx | ✅ Yes (multiple pages) |
| Loading (LoadingPage) | loading.tsx | ✅ Yes (dashboard loading) |
| SearchFilterBar | search-filter-bar.tsx | ✅ Yes (incidents, users, assets) |
| Select (all parts) | select.tsx | ✅ Yes (incident new, user new) |
| Switch | switch.tsx | ✅ Yes (incident new, platform settings) |
| Textarea | textarea.tsx | ✅ Yes (incident new, work orders) |
| Toast | toast.tsx | ✅ Yes (layout.tsx + many pages) |

### Individual Issues

| # | Severity | File | Lines | Issue | Fix |
|---|----------|------|-------|-------|-----|
| U-1 | **MEDIUM** | badge.tsx | L56 | **`badgeVariants` is exported but never imported externally.** Only used internally. | Remove from export or keep if public API is intended. |
| U-2 | **LOW** | button.tsx | L73 | **`buttonVariants` is exported but never imported externally.** Only used internally. | Same as U-1. |
| U-3 | **LOW** | card.tsx | L64–76 | **`CardFooter` is exported but never used by any page in the app.** | Remove or keep for future use. |
| U-4 | **MEDIUM** | empty-state.tsx | L86 | **`NoDataEmptyState` exported but never imported anywhere.** Dead code. | Remove or integrate. |
| U-5 | **MEDIUM** | empty-state.tsx | L111 | **`OfflineEmptyState` exported but never imported anywhere.** Dead code. | Remove or integrate. |
| U-6 | **MEDIUM** | empty-state.tsx | L128 | **`LoadFailedEmptyState` exported but never imported anywhere.** Dead code. | Remove or integrate. |
| U-7 | **MEDIUM** | error-state.tsx | L265 | **`NetworkError` convenience export never imported anywhere.** Dead code. | Remove or integrate. |
| U-8 | **MEDIUM** | error-state.tsx | L273 | **`SessionExpired` convenience export never imported anywhere.** Dead code. | Remove or integrate. |
| U-9 | **MEDIUM** | error-state.tsx | L277 | **`ServerError` convenience export never imported anywhere.** Dead code. | Remove or integrate. |
| U-10 | **MEDIUM** | error-state.tsx | L281 | **`MaintenancePage` convenience export never imported anywhere.** Dead code (naming conflicts with `app/maintenance/page.tsx` which is a different component). | Remove. |
| U-11 | **LOW** | loading.tsx | L15 | **`LoadingSpinner` is exported but never imported by any page.** Only used internally by `LoadingPage`. | Remove from export or keep as utility. |
| U-12 | **MEDIUM** | detail-tabs.tsx | L104–155 | **`commonTabs` config exported but never used anywhere.** The icon values are strings (`"Info"`, `"BarChart3"`) instead of actual Lucide icon components, so they wouldn't even work with the `Tab.icon` property which expects `LucideIcon`. This is both dead code and broken code. | Remove or fix the icon references to use actual Lucide components. |
| U-13 | **MEDIUM** | select.tsx | L76–89 | **`SelectValue` display logic is incomplete.** The component tries to show a display value but `setDisplayValue` is never called with actual content. The `useEffect` only clears it when `value` is empty. The selected item's label text is never captured, so it always shows the raw `value` string instead of the human-readable label. | Pass selected label text through context or traverse children to find the matching SelectItem's text. |
| U-14 | **LOW** | date-range-dropdown.tsx | L94–105 | **Keyboard handler in date dropdown calls `handleSelect` on arrow keys.** This immediately selects the option on arrow key, rather than just highlighting it. Standard listbox behavior should only select on Enter/Space. | Change arrow keys to only update a highlighted index, and select on Enter. |
| U-15 | **LOW** | toast.tsx | L73 | **`crypto.randomUUID()` may not be available in older browsers/environments.** While modern browsers support it, it requires HTTPS in some contexts. | Add a fallback: `crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)`. |

---

## 5. Shared Components — `src/components/shared/`

### 5.1 network-status.tsx

| # | Severity | Lines | Issue | Fix |
|---|----------|-------|-------|-----|
| S-1 | **MEDIUM** | L19 | **`useNetworkStatus` hook exported but never imported anywhere.** The provider works (used in root layout), but the consumer hook is dead code. | Remove or integrate into components that should react to offline state. |

### 5.2 theme-provider.tsx

No issues found. Clean wrapper around `next-themes`.

### 5.3 theme-toggle.tsx

| # | Severity | Lines | Issue | Fix |
|---|----------|-------|-------|-----|
| S-2 | **LOW** | L42–43 | **Duplicate `sr-only` span.** The button has both `aria-label` and a `<span className="sr-only">Toggle theme</span>`. Both will be announced, potentially confusing screen readers with redundant announcements. | Remove the `sr-only` span since `aria-label` is already set. |

---

## 6. PDF Components — `src/components/pdf/`

| # | Severity | Lines | Issue | Fix |
|---|----------|-------|-------|-----|
| P-1 | **LOW** | index.ts | — | **Barrel re-exports are never imported.** The barrel at `pdf/index.ts` exports all PDF templates and `PdfExportButton`, but the only consumer (`risk-assessments/[assessmentId]/page.tsx`) uses a direct dynamic import: `import("@/components/pdf/pdf-export-button")`. The barrel is dead code. | Remove barrel or update consumer to use it. |

PDF templates (JHA, JSA, RIE, Arbowet, SAM, OSA) are all correctly used internally by `PdfExportButton`, and `PdfExportButton` is used by the risk assessment detail page via dynamic import. **No unused PDF templates.**

---

## 7. Charts — `src/components/charts/index.tsx`

| # | Severity | Lines | Issue | Fix |
|---|----------|-------|-------|-----|
| C-1 | **LOW** | — | **`LineChart` only imported by analytics page; `BarChart` by dashboard + inspection detail; `AreaChart` by dashboard + analytics; `DonutChart` by dashboard + analytics.** All chart types are used. No dead chart components. | No action needed. |
| C-2 | **LOW** | L308 | **`COLORS` export uses CSS `hsl(var(--...))` which may not render correctly in Recharts tooltips in all environments.** Recharts expects hex/rgb colors in some edge cases. | Test tooltip rendering; consider providing hex fallbacks. |

---

## 8. App Layout Files

### 8.1 `src/app/layout.tsx`

| # | Severity | Lines | Issue | Fix |
|---|----------|-------|-------|-----|
| R-1 | **LOW** | L78–82 | **Nested `<main>` landmark.** The root layout wraps all children in `<main id="main-content">`, but `DashboardLayout` and `EmployeeAppLayout` both render their own `<main>` element. This creates nested `<main>` landmarks, which is invalid HTML and confuses screen readers. | Remove the `<main>` wrapper from root layout and let sub-layouts define their own `<main>`. Use a `<div id="main-content">` for the skip-link target instead. |

### 8.2 `src/app/[company]/dashboard/layout.tsx`

| # | Severity | Lines | Issue | Fix |
|---|----------|-------|-------|-----|
| R-2 | **LOW** | L7 | **Unused store import potential:** `useTicketsStore` is imported and used correctly for notification count. No issue. | — |

### 8.3 `src/app/[company]/app/layout.tsx`

No issues found. Clean layout with proper auth checks and company validation.

### 8.4 `src/app/error.tsx`

| # | Severity | Lines | Issue | Fix |
|---|----------|-------|-------|-----|
| R-3 | **LOW** | L25 | **`window.location.href` used in `onGoBack` callback.** This triggers a full page reload instead of using Next.js router for client-side navigation. | Use `router.push("/")` for smoother UX, but note that error boundaries have limited access to hooks — current approach is acceptable as fallback. |

### 8.5 `src/app/not-found.tsx`

No issues found. Clean 404 page with proper links and accessibility.

---

## Summary by Severity

| Severity | Count | Description |
|----------|-------|-------------|
| **CRITICAL** | 0 | — |
| **HIGH** | 2 | Header component entirely unused (N-1); RoleGuard redirect during render (A-8) |
| **MEDIUM** | 19 | Dead exports (7), missing accessibility (5), missing i18n (3), mock data in prod (1), XSS risk (1), broken code (1), focus trap (1) |
| **LOW** | 17 | Unused exports, minor a11y, CSS issues, dead barrels |

---

## Top Priority Fixes

1. **N-1:** Remove or integrate the unused `Header` component (250+ lines of dead code with mock data)
2. **A-8:** Move `router.push()` out of render path in `RoleGuard`
3. **R-1 / L-3:** Fix nested `<main>` landmark violation
4. **N-2:** Remove `MOCK_NOTIFICATIONS` from production header
5. **U-12:** Fix or remove broken `commonTabs` config with string icons
6. **U-13:** Fix `SelectValue` display text logic
7. **N-6/N-7:** Add i18n for platform admin nav items
8. **L-2 / A-2:** Add keyboard accessibility to mobile sidebar overlay and company switcher dropdown
9. **L-5:** Validate/sanitize company logo URLs (XSS/SSRF risk)
10. **N-11:** Add `safe-area-inset-bottom` CSS utility for iOS support
