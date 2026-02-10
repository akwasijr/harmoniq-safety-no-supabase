# Harmoniq Safety — Security & Dead-Code Audit Report

**Date:** 2026-02-09  
**Scope:** `/harmoniq-safety/src/`, config files, `public/`

---

## Part A — Security Sweep

### A-1 · `dangerouslySetInnerHTML` — XSS Risk

| # | File | Line | Content Rendered | Severity | Risk |
|---|------|------|------------------|----------|------|
| S-1 | [content/new/page.tsx](src/app/[company]/dashboard/content/new/page.tsx#L489) | 489 | `formData.content` — user-supplied rich-text from the "new content" form | **CRITICAL** | SECURITY |
| S-2 | [news/[newsId]/page.tsx](src/app/[company]/app/news/[newsId]/page.tsx#L228) | 228 | `article.content` — HTML string from mock data store, but in production would come from API/DB | **HIGH** | SECURITY |

**Assessment:**  
- **S-1** is the most dangerous: it renders the content a user has just typed into a `<textarea>` / rich-text editor directly as HTML with zero sanitization. An attacker (or even an unaware admin) can inject `<script>`, `<img onerror=...>`, or `<iframe>` tags. **This is a textbook stored XSS vector.**
- **S-2** renders content that was stored earlier (same pipeline). Even though mock data is safe today, once connected to a real backend this becomes a stored XSS issue.

**Suggested fix:** Install `dompurify` (≈ 10 KB gzipped) and sanitize before rendering:
```tsx
import DOMPurify from "dompurify";
dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formData.content) }}
```

---

### A-2 · `localStorage` Usage — Sensitive Data Check

| # | File | Line | Key | What's Stored | Severity | Risk |
|---|------|------|-----|---------------|----------|------|
| S-3 | [settings/page.tsx](src/app/[company]/dashboard/settings/page.tsx#L92) | 92, 108 | `harmoniq_settings` | App settings (language, theme, session timeout, password policy label) | **LOW** | SECURITY |
| S-4 | [i18n/index.tsx](src/i18n/index.tsx#L114) | 114, 134 | Locale preference | Language code (`en`, `nl`, `sv`) | **LOW** | SECURITY |
| S-5 | [mocks/data.ts](src/mocks/data.ts#L3199) | 3199, 3211 | `harmoniq_mock_user_id` | Current mock user ID (string like `user_super_admin`) | **MEDIUM** | SECURITY |
| S-6 | [news/[newsId]/page.tsx](src/app/[company]/app/news/[newsId]/page.tsx#L37) | 37, 82, 90, 94 | `harmoniq_bookmarks` | Array of bookmarked news IDs | **LOW** | SECURITY |
| S-7 | [local-storage.ts](src/lib/local-storage.ts) | All | Generic `loadFromStorage` / `saveToStorage` | All entity stores (incidents, users, assets, etc.) | **MEDIUM** | SECURITY |

**Assessment:**
- **No tokens, passwords, or session secrets are stored in localStorage.** Auth is currently mock-only.
- **S-5** stores which user is "logged in" in localStorage. An attacker with physical/XSS access could switch to `user_super_admin` by editing localStorage. This is expected for a demo app but **must be replaced with server-side sessions before production**.
- **S-7**: All mock entity data (users, incidents, assets, etc.) is persisted in localStorage. In production, PII (employee names, emails, phone numbers) stored client-side is a GDPR concern.
- **Positive:** `clearAllHarmoniqStorage()` is called on logout, which correctly wipes all `harmoniq_*` keys.

---

### A-3 · `window.location` — Open Redirect Check

| # | File | Line | Usage | Severity |
|---|------|------|-------|----------|
| S-8 | [login/page.tsx](src/app/login/page.tsx#L52) | 52 | Redirect to `/${companySlug}/app` or `/${companySlug}/dashboard` | **LOW** |
| S-9 | [use-auth.tsx](src/hooks/use-auth.tsx#L126) | 126 | `window.location.href = "/login"` on logout | **LOW** |
| S-10 | [error.tsx](src/app/error.tsx#L28) | 28 | `window.location.href = "/"` on error | **LOW** |
| S-11 | [error-state.tsx](src/components/ui/error-state.tsx#L177) | 177, 181 | Redirect to `/login` or `window.location.reload()` | **LOW** |
| S-12 | [news/[newsId]/page.tsx](src/app/[company]/app/news/[newsId]/page.tsx#L50) | 50, 65 | `window.location.href` for clipboard/share — reads, does not write | **LOW** |
| S-13 | [locations/page.tsx](src/app/[company]/dashboard/locations/page.tsx#L592) | 592, 604 | `window.location.origin` for QR code URL generation | **LOW** |
| S-14 | [qr-codes/page.tsx](src/app/[company]/dashboard/qr-codes/page.tsx#L115) | 115 | `window.location.origin` for QR code URL | **LOW** |

**Assessment:**  
- **No open redirect vulnerabilities found.** All `window.location.href` assignments use hardcoded paths (`"/login"`, `"/"`) or are derived from route params in `companySlug` (which is a constant `"acme"` in the mock).
- **S-8** in production should validate `companySlug` against an allowlist to prevent path-injection if the slug ever comes from user input.
- Use of `window.location.href` instead of Next.js `router.push()` is a UX concern (full-page reload) but not a security issue.

---

### A-4 · `eval()` / `new Function()` — **PASS ✅**

No occurrences of `eval(` or `new Function(` found anywhere in the codebase. **Clean.**

---

### A-5 · Hardcoded API Keys / Secrets — **PASS ✅**

- No API keys, bearer tokens, or secrets found in source code.
- Password fields exist only in the login form UI and are not stored or transmitted.
- The word "token" appears only in UI labels ("Token expiry settings") and comments, not as actual secrets.

---

### A-6 · `next.config.ts` — Security Headers

| # | File | Issue | Severity | Category |
|---|------|-------|----------|----------|
| S-15 | [next.config.ts](next.config.ts) | **Config is completely empty** — no security headers configured | **HIGH** | SECURITY |

**Assessment:**  
The file contains only `const nextConfig: NextConfig = {};`. Missing:
- **Content Security Policy (CSP)** — critical for mitigating XSS
- **X-Frame-Options** / `frame-ancestors` — prevents clickjacking
- **X-Content-Type-Options: nosniff**
- **Referrer-Policy**
- **Permissions-Policy**
- **Strict-Transport-Security (HSTS)**

**Suggested fix:** Add a `headers()` function to `next.config.ts`:
```ts
const nextConfig: NextConfig = {
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    }];
  },
};
```

---

### A-7 · `package.json` — Dependency Review

| # | Package | Issue | Severity | Category |
|---|---------|-------|----------|----------|
| S-16 | Overall | No `npm audit` run / no lockfile auditing in CI | **MEDIUM** | SECURITY |
| S-17 | `@react-pdf/renderer` | Large dependency (500KB+); ensure it's only loaded dynamically | **LOW** | CONFIG |
| S-18 | `eslint-config-prettier` + `eslint-plugin-prettier` | Both present but no `.prettierrc` or prettier config visible — may be unused | **LOW** | CONFIG |

**Assessment:**  
- No known critically vulnerable packages at the listed versions.
- Dependencies are lean and reasonable for the app's scope.
- `@react-pdf/renderer` is correctly loaded via `next/dynamic` (lazy-loaded) at `risk-assessments/[assessmentId]/page.tsx`.

---

## Part B — Dead Code Sweep

### B-1 · Unused Exported Functions/Constants

| # | File | Export | Imported By | Severity | Category |
|---|------|--------|-------------|----------|----------|
| D-1 | [src/lib/utils.ts](src/lib/utils.ts#L107) | `slugify()` | **Nothing** — 0 imports | **MEDIUM** | DEAD_CODE |
| D-2 | [src/lib/utils.ts](src/lib/utils.ts#L96) | `truncate()` | **Nothing** — 0 imports | **MEDIUM** | DEAD_CODE |
| D-3 | [src/lib/utils.ts](src/lib/utils.ts#L89) | `generateRefNumber()` | **Nothing** — 0 imports | **MEDIUM** | DEAD_CODE |
| D-4 | [src/lib/utils.ts](src/lib/utils.ts#L64) | `formatCurrency()` | **Nothing** — 0 imports | **MEDIUM** | DEAD_CODE |
| D-5 | [src/lib/utils.ts](src/lib/utils.ts#L45) | `formatRelativeTime()` | **Nothing** — 0 imports | **MEDIUM** | DEAD_CODE |
| D-6 | [src/lib/utils.ts](src/lib/utils.ts#L35) | `formatTime()` | **Nothing** — 0 imports | **MEDIUM** | DEAD_CODE |
| D-7 | [src/lib/offline-queue.ts](src/lib/offline-queue.ts) | **Entire file** (`getOfflineQueue`, `addToOfflineQueue`, `clearOfflineQueue`, `removeFromOfflineQueue`, `getQueueSize`, `isOnline`) | **Nothing** — 0 external imports | **HIGH** | DEAD_CODE |
| D-8 | [src/lib/branding.ts](src/lib/branding.ts#L14) | `hexToHslValue()` | Only called internally by `applyPrimaryColor`; **exported but never imported externally** | **LOW** | DEAD_CODE |
| D-9 | [src/hooks/use-auth.tsx](src/hooks/use-auth.tsx#L163) | `usePermission()` | **Nothing** — 0 imports | **LOW** | DEAD_CODE |
| D-10 | [src/mocks/data.ts](src/mocks/data.ts#L123) | `mockCompany` | **Nothing** — 0 imports | **LOW** | DEAD_CODE |
| D-11 | [src/mocks/data.ts](src/mocks/data.ts#L2644) | `mockPlatformStats` | **Nothing** — 0 imports | **MEDIUM** | DEAD_CODE |
| D-12 | [src/mocks/data.ts](src/mocks/data.ts#L2670) | `mockRiskAssessmentTemplates` | **Nothing** — 0 imports | **MEDIUM** | DEAD_CODE |
| D-13 | [src/mocks/data.ts](src/mocks/data.ts#L3283) | `getIncidentsByStatus()` | **Nothing** — 0 imports | **LOW** | DEAD_CODE |
| D-14 | [src/mocks/data.ts](src/mocks/data.ts#L3287) | `getUsersByCompany()` | **Nothing** — 0 imports | **LOW** | DEAD_CODE |
| D-15 | [src/mocks/data.ts](src/mocks/data.ts#L3291) | `getLocationsByCompany()` | **Nothing** — 0 imports | **LOW** | DEAD_CODE |
| D-16 | [src/mocks/data.ts](src/mocks/data.ts#L3295) | `getAssetsByCompany()` | **Nothing** — 0 imports | **LOW** | DEAD_CODE |
| D-17 | [src/mocks/data.ts](src/mocks/data.ts#L3299) | `getContentByType()` | **Nothing** — 0 imports | **LOW** | DEAD_CODE |
| D-18 | [src/mocks/data.ts](src/mocks/data.ts#L3303) | `getUserById()` | **Nothing** — 0 imports from mocks (a local version exists in users/page.tsx) | **LOW** | DEAD_CODE |
| D-19 | [src/mocks/data.ts](src/mocks/data.ts#L3307) | `getCompanyById()` | **Nothing** — 0 imports | **LOW** | DEAD_CODE |

---

### B-2 · Orphan Files (Never Imported)

| # | File | Issue | Severity | Category |
|---|------|-------|----------|----------|
| D-20 | [src/components/navigation/header.tsx](src/components/navigation/header.tsx) | **250+ line component never imported anywhere.** Barrel `index.ts` exports it, but no file imports from the barrel or directly. | **HIGH** | DEAD_CODE |
| D-21 | [src/components/layouts/index.ts](src/components/layouts/index.ts) | Barrel file re-exports `DashboardLayout` + `EmployeeAppLayout`, but consumers import directly from the concrete files. **Barrel is dead code.** | **LOW** | DEAD_CODE |
| D-22 | [src/components/navigation/index.ts](src/components/navigation/index.ts) | Barrel file re-exports `Sidebar`, `BottomTabs`, `Header`, but consumers import directly. **Barrel is dead code.** | **LOW** | DEAD_CODE |
| D-23 | [src/components/pdf/index.ts](src/components/pdf/index.ts) | Barrel file re-exports all PDF templates + `PdfExportButton`, but consumer uses direct dynamic import. **Barrel is dead code.** | **LOW** | DEAD_CODE |
| D-24 | [src/lib/offline-queue.ts](src/lib/offline-queue.ts) | Entire file (52 lines) — never imported. Offline inspection queue feature was planned but never connected. | **HIGH** | DEAD_CODE |

---

### B-3 · TODO/FIXME/HACK Comments

**None found.** ✅  
No `TODO`, `FIXME`, or `HACK` comments exist in any `.ts` / `.tsx` files under `src/`.

---

### B-4 · PDF Directory Usage

| # | Component | Used By | Status |
|---|-----------|---------|--------|
| `PdfExportButton` | `risk-assessments/[assessmentId]/page.tsx` (dynamic import) | ✅ Active |
| `JHAPdfDocument` | `PdfExportButton` internal switch | ✅ Active |
| `JSAPdfDocument` | `PdfExportButton` internal switch | ✅ Active |
| `RIEPdfDocument` | `PdfExportButton` internal switch | ✅ Active |
| `ArbowetPdfDocument` | `PdfExportButton` internal switch | ✅ Active |
| `SAMPdfDocument` | `PdfExportButton` internal switch | ✅ Active |
| `OSAPdfDocument` | `PdfExportButton` internal switch | ✅ Active |
| `shared-styles.ts` | All PDF templates | ✅ Active |
| `index.ts` (barrel) | **Nothing** | ❌ Dead |

**Assessment:** All PDF templates are actively used through `PdfExportButton`. Only the barrel `index.ts` is dead.

---

### B-5 · `public/manifest.json` Issues

| # | Issue | Severity | Category |
|---|-------|----------|----------|
| D-25 | **Icon uses `/globe.svg`** — a generic Next.js placeholder, not a Harmoniq-branded icon | **MEDIUM** | CONFIG |
| D-26 | **Only one icon entry** — PWA best practice requires multiple sizes (192×192, 512×512 minimum as PNG) | **MEDIUM** | CONFIG |
| D-27 | **`purpose: "any maskable"`** should be split into two separate icon entries per PWA spec | **LOW** | CONFIG |
| D-28 | **No `id` field** — recommended for PWA identity | **LOW** | CONFIG |

---

## Part C — Build & Config Sweep

### C-1 · `tsconfig.json`

| # | Setting | Issue | Severity | Category |
|---|---------|-------|----------|----------|
| C-1 | `strict: true` | ✅ **Good** — strict mode is enabled | — | — |
| C-2 | `skipLibCheck: true` | Standard for Next.js; acceptable | **LOW** | CONFIG |
| C-3 | `jsx: "react-jsx"` | Correct for React 19 + Next.js 16 | — | — |
| C-4 | `noUnusedLocals` | **Missing** — would catch dead variables at compile time | **MEDIUM** | CONFIG |
| C-5 | `noUnusedParameters` | **Missing** — would catch dead parameters at compile time | **MEDIUM** | CONFIG |
| C-6 | `noFallthroughCasesInSwitch` | **Missing** — prevents accidental switch fallthrough | **LOW** | CONFIG |

**Suggested fix:** Add to `compilerOptions`:
```json
"noUnusedLocals": true,
"noUnusedParameters": true,
"noFallthroughCasesInSwitch": true
```

---

### C-2 · `eslint.config.mjs`

| # | Issue | Severity | Category |
|---|-------|----------|----------|
| C-7 | Only uses `core-web-vitals` + `typescript` presets — no custom rules | **LOW** | CONFIG |
| C-8 | No `no-console` rule — `console.warn` / `console.log` will ship to production | **LOW** | CONFIG |
| C-9 | `eslint-config-prettier` and `eslint-plugin-prettier` are in `devDependencies` but **not referenced** in the ESLint config | **MEDIUM** | DEAD_CODE |

**Assessment:** ESLint config is reasonable but minimal. The prettier ESLint packages are installed but unused.

---

### C-3 · `next.config.ts`

| # | Issue | Severity | Category |
|---|-------|----------|----------|
| C-10 | **Completely empty config** — no security headers (see S-15) | **HIGH** | SECURITY |
| C-11 | No `images.remotePatterns` — if remote images are ever used, they'll fail | **LOW** | CONFIG |
| C-12 | No `poweredBy: false` — the `X-Powered-By: Next.js` header leaks framework info | **LOW** | SECURITY |

**Suggested fix:**
```ts
const nextConfig: NextConfig = {
  poweredByHeader: false,
  // ... security headers from S-15
};
```

---

### C-4 · `postcss.config.mjs`

**PASS ✅** — Clean config using only `@tailwindcss/postcss`. No issues.

---

## Summary by Severity

| Severity | Count | Items |
|----------|-------|-------|
| **CRITICAL** | 1 | S-1 (XSS via `dangerouslySetInnerHTML` in content editor) |
| **HIGH** | 4 | S-2 (XSS in news reader), S-15/C-10 (no security headers), D-20 (dead header.tsx 250+ lines), D-7/D-24 (dead offline-queue.ts) |
| **MEDIUM** | 10 | S-5, S-7, S-16, D-1–D-6, D-11, D-12, D-25, D-26, C-4, C-5, C-9 |
| **LOW** | 19 | All remaining |

## Priority Action Items

1. **🔴 CRITICAL — Sanitize HTML** before every `dangerouslySetInnerHTML` call. Install `dompurify` and wrap both occurrences (S-1, S-2).
2. **🟠 HIGH — Add security headers** in `next.config.ts`. At minimum: CSP, X-Frame-Options, X-Content-Type-Options, `poweredByHeader: false`.
3. **🟠 HIGH — Delete dead code**: Remove [src/lib/offline-queue.ts](src/lib/offline-queue.ts), [src/components/navigation/header.tsx](src/components/navigation/header.tsx), and all 3 dead barrel `index.ts` files.
4. **🟡 MEDIUM — Remove unused utils**: `slugify`, `truncate`, `generateRefNumber`, `formatCurrency`, `formatRelativeTime`, `formatTime` from [src/lib/utils.ts](src/lib/utils.ts). Remove unused mock exports (`mockCompany`, `mockPlatformStats`, `mockRiskAssessmentTemplates`, helper functions).
5. **🟡 MEDIUM — Tighten tsconfig**: Add `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`.
6. **🟡 MEDIUM — Clean devDeps**: Either configure `eslint-plugin-prettier` + `eslint-config-prettier` in ESLint config or remove from `package.json`.
7. **🟢 LOW — Fix manifest.json**: Add proper Harmoniq icons at multiple sizes; split `purpose` field.
