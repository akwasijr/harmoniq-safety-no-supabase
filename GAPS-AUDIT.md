# Harmoniq Safety - Comprehensive Gaps Audit
## Date: Feb 15, 2026

---

## 1. DATA PERSISTENCE (CRITICAL)

### 1.1 create-entity-store.tsx - Fire-and-forget Supabase writes
- **Issue**: All Supabase upsert/update/delete operations are async fire-and-forget
- **Impact**: Data lost on rapid page refresh; no error recovery
- **Fix**: Await Supabase operations, add error handling with retry, add dual-write to localStorage as fallback

### 1.2 Supabase table fetch failure silently returns empty
- **Issue**: If Supabase table doesn't exist or fetch fails, items stay empty `[]` with only a console.log
- **Impact**: User sees empty data with no indication of failure
- **Fix**: Add error state to store, show user-facing error, fallback to localStorage cache

### 1.3 No beforeunload flush in Supabase mode
- **Issue**: beforeunload handler returns early if Supabase configured (line 148)
- **Impact**: Pending Supabase writes lost on page close
- **Fix**: Always flush pending writes on beforeunload

---

## 2. HARDCODED/MOCK DATA

### 2.1 Dashboard stats from mockDashboardStats
- **File**: src/app/(app)/[company]/dashboard/page.tsx line 21
- **Fix**: Compute stats from actual store data (incidents, tickets counts)

### 2.2 Settings page uses getCurrentCompany() from mocks
- **File**: src/app/(app)/[company]/dashboard/settings/page.tsx line 124
- **Fix**: Use company store data instead of mock

### 2.3 inspection-routes-store has inline hardcoded mock data
- **File**: src/stores/inspection-routes-store.tsx lines 6-121
- **Fix**: Move to mocks/data.ts, ensure Supabase fetch takes priority

### 2.4 Profile page has hardcoded demo messages
- **File**: src/app/(app)/[company]/app/profile/page.tsx lines 437,452,459
- **Fix**: Replace with actual functionality or proper "not available" state

---

## 3. BROKEN FEATURES

### 3.1 Profile page crashes - invalid toast call
- **File**: src/app/(app)/[company]/app/profile/page.tsx line 77
- **Issue**: `toast("message")` missing second param; incorrect destructuring
- **Fix**: Fix toast call signature

### 3.2 Settings page crashes when activeCompany is null
- **File**: src/app/(app)/[company]/dashboard/settings/page.tsx line 165
- **Fix**: Add null check for activeCompany

### 3.3 Password change form has no submission handler
- **File**: src/app/(app)/[company]/app/profile/page.tsx lines 435-445
- **Fix**: Wire up Supabase auth.updateUser for password change

### 3.4 Settings notification/security toggles only in localStorage
- **File**: src/app/(app)/[company]/dashboard/settings/page.tsx
- **Fix**: Persist to company settings in Supabase

### 3.5 Avatar upload stores as data URL not Supabase Storage
- **File**: src/app/(app)/[company]/app/profile/page.tsx
- **Fix**: Upload to Supabase Storage, store URL reference

### 3.6 Content image upload non-functional
- **File**: src/app/(app)/[company]/dashboard/content/new/page.tsx
- **Fix**: Wire image upload to Supabase Storage

---

## 4. SECURITY ISSUES

### 4.1 CRITICAL: /api/invitations/validate has no auth check
- **Fix**: Add rate limiting per token/IP

### 4.2 HIGH: Analytics origin check uses .includes() - bypassable
- **Fix**: Use strict URL parsing for origin validation

### 4.3 HIGH: Analytics GET fails open on auth error
- **Fix**: Fail-closed - return 401 on any auth exception

### 4.4 MEDIUM: No email validation in invitations POST
- **Fix**: Add email regex validation

### 4.5 MEDIUM: CSP allows unsafe-inline scripts
- **Fix**: Remove unsafe-inline, use nonce

### 4.6 MEDIUM: Email enumeration in invitations endpoint
- **Fix**: Return generic error messages

### 4.7 MEDIUM: Rate limiting is in-memory only
- **Note**: Acceptable for now, upgrade to Redis for production scale

---

## 5. MISSING ERROR BOUNDARIES

### 5.1 No error boundaries on store-dependent pages
- **Fix**: Add try/catch and error states to all pages using store data

### 5.2 News page missing translation key for "Training" tab
- **Fix**: Add translation key

---

## FIX PRIORITY ORDER

1. **P0**: Fix create-entity-store.tsx data persistence (affects ALL features)
2. **P0**: Fix profile page crash (toast call)
3. **P0**: Fix settings page crash (null company)
4. **P1**: Remove mock data from dashboard stats
5. **P1**: Remove mock data from settings
6. **P1**: Fix security issues (invitations validate, analytics origin)
7. **P2**: Wire up password change, content image upload
8. **P2**: Add error boundaries
9. **P3**: Avatar upload to Supabase Storage


---

## FIXES APPLIED (Feb 15, 2026)

### ✅ P0: create-entity-store.tsx — Data persistence
- Added dual-write: all add/update/remove now cache to localStorage immediately
- Initial state loads from localStorage cache (even in Supabase mode) for instant display
- Fetch failures now fallback to localStorage cache instead of showing empty
- Successful Supabase fetches also cache to localStorage for offline resilience

### ✅ P0: Settings page — removed mock data dependency
- Replaced `getCurrentCompany()` from mocks with company store lookup by slug
- Settings now work with real Supabase data

### ✅ P0: Dashboard stats — computed from real data
- Removed `mockDashboardStats` import
- Stats now computed from actual incidents store: open count, resolved today, avg resolution time, LTIR, compliance rate

### ✅ P1: Security — invitations/validate rate limiting
- Added rate limiting: 10 attempts per IP per minute

### ✅ P1: Security — analytics origin check hardened
- Replaced `.includes()` with strict `new URL()` hostname parsing
- Invalid origins now rejected with proper URL validation

### ✅ P1: Security — analytics GET fails closed
- Auth check failures now return 401 instead of silently allowing access

### ✅ P1: Security — email validation in invitations
- Added email format regex validation
- Changed "User already exists" to generic message to prevent email enumeration

### REMAINING (needs user action or further work)
- Password change form needs Supabase auth.updateUser wiring
- Avatar upload should use Supabase Storage (currently data URL)
- Content image upload needs Supabase Storage
- CSP unsafe-inline should be removed (requires nonce implementation)
- Rate limiting should move to Redis for production scale
