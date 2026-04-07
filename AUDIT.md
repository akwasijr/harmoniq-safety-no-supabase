# Harmoniq Safety — Code Audit Report

**Date:** 2026-04-07
**Branch:** `subtitle-feature-fixes`
**Scope:** Backend APIs, Security, Data Integrity

---

## Executive Summary

| Category | Critical | High | Medium | Total |
|----------|----------|------|--------|-------|
| Backend/API | 2 | 1 | 1 | 4 |
| Security | 1 | 1 | 1 | 3 |
| Data Integrity | 1 | 2 | 2 | 5 |
| **Total** | **4** | **4** | **4** | **12** |

---

## 🔴 CRITICAL Issues

### 1. Company Isolation Bypass via `/api/entity-upsert`

**Files:** `src/app/api/entity-upsert/route.ts:25-75`
**Category:** Backend + Security

The entity-upsert endpoint uses the Supabase `service_role` key to bypass Row Level Security but does **not validate** that the submitted `company_id` matches the authenticated user's company. Any authenticated user can create/modify data in any company's namespace.

**Attack vector:**
```json
POST /api/entity-upsert
{
  "table": "incidents",
  "data": { "company_id": "other_company_uuid", "title": "Injected" }
}
```

**Impact:** Complete multi-tenant isolation failure. Users can read/write/delete data across companies.

**Remediation:**
- Fetch user profile and enforce `data.company_id === profile.company_id`
- Only allow `super_admin` to specify a different company_id
- Force `company_id` on the server side instead of trusting client input

---

### 2. Unauthenticated Invitation Acceptance with User ID Spoofing

**File:** `src/app/api/invitations/validate/route.ts:48-118`
**Category:** Backend

The invitation acceptance POST handler accepts a `user_id` from the request body **without authentication**. An attacker can accept any invitation using an arbitrary user ID, creating accounts or hijacking invitations.

**Impact:** Account creation without proper authentication, privilege escalation via role-targeted invitations.

**Remediation:**
- Require authentication before accepting invitations
- Use the authenticated session's user ID, not a client-provided one
- Validate the invitation token hasn't been used

---

### 3. Database Constraint Conflict Blocks User Deletion

**File:** `supabase/migrations/003_auth_overhaul.sql:16`
**Category:** Data Integrity

The `invitations` table defines `invited_by` with conflicting constraints:
```sql
invited_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL
```
`NOT NULL` + `ON DELETE SET NULL` is a logical impossibility. Deleting a user who created invitations will fail with a constraint violation.

**Impact:** Users who have sent invitations can never be deleted from the database.

**Remediation:** Change to `ON DELETE CASCADE` or remove `NOT NULL`.

---

### 4. Silent Data Loss — Team Assignments Missing DB Columns

**Files:** `supabase/migrations/001_initial_schema.sql` (incidents, tickets, work_orders tables)
**Category:** Data Integrity

The `assigned_to_team_id` column exists in TypeScript types but **not in the database schema** for incidents, tickets, and work_orders. Stores strip this field before upserting to Supabase, causing team assignments to be saved to localStorage but **silently lost** on next Supabase refresh.

**Impact:** Team assignment data disappears after page refresh in Supabase mode with no error.

**Remediation:**
```sql
ALTER TABLE incidents ADD COLUMN assigned_to_team_id UUID REFERENCES teams(id);
ALTER TABLE tickets ADD COLUMN assigned_to_team_id UUID REFERENCES teams(id);
ALTER TABLE work_orders ADD COLUMN assigned_to_team_id UUID REFERENCES teams(id);
```
Then remove these fields from `stripFields` in the corresponding stores.

---

## 🟠 HIGH Issues

### 5. Race Condition in Team Member Assignment

**File:** `src/app/api/invitations/route.ts:213-247`
**Category:** Backend

Team membership uses a read-modify-write pattern. Concurrent invitation acceptances for the same team read the same `member_ids`, both append, and the last write wins — silently dropping the other user.

**Remediation:** Use PostgreSQL `array_append()` for atomic operations, or implement optimistic locking.

---

### 6. Mock Mode Production Exposure Risk

**File:** `middleware.ts:6, 200-202`
**Category:** Security

Mock mode is controlled by `NEXT_PUBLIC_ENABLE_MOCK_MODE`. If accidentally set in production without Supabase config, **all authentication is bypassed**.

**Remediation:**
```typescript
const MOCK_MODE =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_ENABLE_MOCK_MODE === "true" &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL;
```

---

### 7. No Cascade Cleanup on User/Team Deletion

**Files:**
- `src/app/(app)/[company]/dashboard/users/[userId]/page.tsx:145-151`
- `src/app/(app)/[company]/dashboard/users/teams/[teamId]/page.tsx:106-117`
**Category:** Data Integrity

Deleting a user or team does not clear their `assigned_to` / `assigned_to_team_id` references in incidents, tickets, work orders, and corrective actions. This creates orphaned references that break UI displays and filters.

**Remediation:** Before deletion, iterate through entity stores and null out references. Or rely on database `ON DELETE SET NULL` constraints (requires the FK columns to exist first — see issue #4).

---

## 🟡 MEDIUM Issues

### 8. Cross-Company Resource References Not Validated

**File:** `src/app/api/work-orders/route.ts:95-122`
**Category:** Backend

Work order creation accepts `asset_id` and `assigned_to` UUIDs without verifying they belong to the user's company. Same issue exists in incidents and assets routes.

**Remediation:** Query the referenced entity's `company_id` and verify it matches the user's company before inserting.

---

### 9. Invitation Tokens Exposed in GET Listing

**File:** `src/app/api/invitations/route.ts:310, 325-327`
**Category:** Security

The GET endpoint returns raw invitation tokens and full `invite_url` to any company admin. Tokens should only be returned at creation time.

**Remediation:** Remove `token` from the SELECT query in the listing endpoint. Only return tokens in the POST response.

---

### 10. TTL Cache Race Condition with Cross-Tab Sync

**File:** `src/stores/create-entity-store.tsx:10-18`
**Category:** Data Integrity

The global TTL cache doesn't invalidate when receiving cross-tab `StorageEvent` updates. Tab A can display stale data for up to 5 minutes after Tab B makes changes.

**Remediation:** In the `handleStorageChange` listener, call `globalLoadedCache.delete(storageKey)` to invalidate the cache.

---

### 11. WorkOrder Column Map Creates Schema/Type Mismatch

**File:** `src/stores/work-orders-store.tsx:7-11`
**Category:** Data Integrity

TypeScript uses `requested_by`, `parts_cost`, `labor_cost` but DB uses `requester_id`, `estimated_cost`, `actual_cost`. The columnMap bridges them, but this creates confusion and risk of bugs in direct DB queries.

**Remediation:** Rename either DB columns or TypeScript fields to match. DB rename is cleaner since TS names are more intuitive.

---

## ✅ What's Working Well

- **XSS protection**: `sanitizeHtml` uses DOMPurify with strict whitelist
- **SQL injection**: No raw queries — all use Supabase client with parameterization
- **CSRF protection**: Properly implemented in middleware
- **Secrets handling**: `service_role` key only used server-side
- **Password validation**: Enforces 12+ chars, mixed case, numbers
- **File uploads**: Type validation with magic byte checks
- **RLS policies**: Correctly defined with `SECURITY DEFINER` functions
- **Input sanitization**: `src/lib/validation.ts` covers text sanitization
- **Optimistic updates**: Store layer handles rollbacks on failure

---

## Recommended Fix Priority

1. **Immediate** (before any production use):
   - Issue #1: Entity-upsert company isolation
   - Issue #2: Invitation auth bypass
   - Issue #6: Mock mode production guard

2. **Before launch**:
   - Issue #3: Database constraint fix (migration)
   - Issue #4: Add missing team assignment columns (migration)
   - Issue #5: Team member race condition
   - Issue #7: Cascade cleanup on deletion

3. **Soon after launch**:
   - Issue #8: Cross-company reference validation
   - Issue #9: Invitation token exposure
   - Issue #10: TTL cache cross-tab invalidation
   - Issue #11: Column map/schema alignment
