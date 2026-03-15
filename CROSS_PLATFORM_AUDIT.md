# HARMONIQ CROSS-PLATFORM DATA SYNCHRONIZATION AUDIT

## Executive Summary
The dashboard and mobile app share a **single unified Zustand store architecture** via the `AppDataProvider`. Both platforms use the same entity stores for all core entities, syncing data through:
- **Supabase** (when configured with public env vars)
- **localStorage** (fallback mode)
- **Cross-tab storage events** (when in localStorage mode)

However, there are **9 critical issues** identified in the cross-platform data flows.

---

## CRITICAL ISSUES FOUND

### 🔴 ISSUE 1: Corrective Actions NOT Synchronized to Mobile Tasks
**Flow**: Dashboard creates corrective actions from incidents → Mobile should see them as tasks  
**Status**: ❌ BROKEN  
**Severity**: HIGH  

**Root Cause**:
- Dashboard incident page stores corrective actions **ONLY within the incident object** (nested `IncidentAction[]` in store)
- Mobile tasks page filters from `useCorrectiveActionsStore()` which pulls from separate `"harmoniq_corrective_actions"` table
- Dashboard does NOT call `useCorrectiveActionsStore().add()` when creating actions from incidents

**Evidence**:
- File: `/Users/akwasifosuhene/harmoniq-safety-no-supabase/src/app/(app)/[company]/dashboard/incidents/[incidentId]/page.tsx` (line ~234-275)
  ```typescript
  const handleAddAction = () => {
    // Creates action object locally and adds to incident
    const action: IncidentAction = { ... };
    setActions([...actions, action]); // ← ONLY stored in incident.actions
    
    // Does create a ticket (good):
    addTicket({...}); 
    
    // ❌ But does NOT create corrective action:
    // add(correctiveAction); // ← MISSING
  };
  ```

- File: `/Users/akwasifosuhene/harmoniq-safety-no-supabase/src/app/(app)/[company]/app/tasks/page.tsx` (line 277)
  ```typescript
  const { items: correctiveActions, isLoading: actionsLoading } = useCorrectiveActionsStore();
  // ↑ This store pulls from harmoniq_corrective_actions table, not incident.actions
  ```

**Impact**: When dashboard user creates a corrective action from an incident:
- ✅ Mobile user SEES the ticket (because `addTicket()` is called)
- ❌ Mobile user does NOT see it in the "Actions" tab (because corrective action not in store)
- Mobile sees duplicate items: one ticket, one missing corrective action entry

**Fix Required**:
In dashboard incident page, after `setActions()`, also call:
```typescript
const correctiveAction = {
  id: actionId,
  company_id: incident.company_id,
  asset_id: incident.asset_id || "",
  inspection_id: null,
  description: newAction.description,
  severity: newAction.priority as Severity,
  assigned_to: newAction.assignee,
  due_date: newAction.dueDate,
  status: "open" as CorrectiveActionStatus,
  resolution_notes: null,
  completed_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};
addCorrectiveAction(correctiveAction);
```

---

### 🔴 ISSUE 2: Corrective Actions Store Initialized Empty
**Flow**: Dashboard corrective actions page ↔ Mobile tasks  
**Status**: ❌ BROKEN  
**Severity**: HIGH  

**Root Cause**:
- File: `/Users/akwasifosuhene/harmoniq-safety-no-supabase/src/stores/corrective-actions-store.tsx`
  ```typescript
  const store = createEntityStore<CorrectiveAction>("harmoniq_corrective_actions", []);
  // ↑ Empty initial data - no mock data like other stores
  ```
- Supabase table is empty (no seed data)
- Corrective actions can be created but only from dashboard incidents page
- Mobile tasks page can never show them unless created through proper store

**Evidence**: 
- Compare with tickets-store.tsx (has `mockTickets`)
- Compare with incidents-store.tsx (has `mockIncidents`)
- Only work-orders-store also starts empty (but work orders are created by users, so acceptable)

**Impact**: Corrective actions workflow is fundamentally broken for data persistence

---

### 🟡 ISSUE 3: Asset Fields Stripped Before Sync - Data Loss
**Flow**: Dashboard edits asset → Mobile should see all asset details  
**Status**: ⚠️ DATA LOSS  
**Severity**: MEDIUM  

**Root Cause**:
- File: `/Users/akwasifosuhene/harmoniq-safety-no-supabase/src/stores/assets-store.tsx` (line 8)
  ```typescript
  stripFields: ["inspections", "certifications", "location"],
  ```
  These fields are STRIPPED before sending to Supabase
- When mobile app loads assets, these fields are `undefined`

**Impact**:
- Mobile can see basic asset info (name, tag, status, category)
- Mobile CANNOT see `location`, `certifications`, or `inspections` field data
- Mobile location filter won't work if it relies on this field
- Mobile can't show asset certifications/inspection history

**Evidence**: 
- When dashboard creates/updates asset with location, mobile won't see it in the asset object
- Mobile must fetch location separately via `useLocationsStore()` and match by parent

---

### 🟡 ISSUE 4: Incident Fields Stripped - Reporter/Location/Asset Hidden
**Flow**: Dashboard reports incident → Mobile should see incident details  
**Status**: ⚠️ DATA LOSS  
**Severity**: MEDIUM  

**Root Cause**:
- File: `/Users/akwasifosuhene/harmoniq-safety-no-supabase/src/stores/incidents-store.tsx` (line 8)
  ```typescript
  stripFields: ["reporter", "location", "asset"],
  ```

**Impact**:
- Mobile mobile incident list won't have inline reporter/location/asset names
- Mobile must fetch these separately and join manually
- If user is offline or API is slow, incident appears incomplete

**Evidence**: Mobile report page stores incident with full relations, but when loaded from store they're gone:
- File: `/Users/akwasifosuhene/harmoniq-safety-no-supabase/src/app/(app)/[company]/app/report/page.tsx` creates incident
- But when retrieved from store later, reporter/location/asset fields are undefined

---

### 🟡 ISSUE 5: Ticket Fields Stripped - Assignee/Creator Hidden  
**Flow**: Dashboard creates ticket → Mobile tasks can't show who created it inline  
**Status**: ⚠️ DATA LOOKUP REQUIRED  
**Severity**: MEDIUM  

**Root Cause**:
- File: `/Users/akwasifosuhene/harmoniq-safety-no-supabase/src/stores/tickets-store.tsx` (line 8)
  ```typescript
  stripFields: ["assignee", "creator"],
  ```

**Impact**:
- Mobile tasks page must do manual lookup: `getUserName(tk.created_by)` (line 306)
- This causes N+1 queries on every render
- If users store isn't loaded, names don't appear

---

### 🔴 ISSUE 6: Content (News) Store Uses Column Mapping - Potential Mismatch
**Flow**: Dashboard publishes news → Mobile should see it  
**Status**: ⚠️ RISKY  
**Severity**: MEDIUM  

**Root Cause**:
- File: `/Users/akwasifosuhene/harmoniq-safety-no-supabase/src/stores/content-store.tsx` (lines 9-12)
  ```typescript
  columnMap: {
    featured_image: "cover_image_url",
    created_by: "author_id",
  },
  stripFields: ["file_url", "video_url", "question", "answer", "event_date", "event_time", "event_location", "creator"],
  ```
- App uses `featured_image` but Supabase has `cover_image_url`
- App uses `created_by` but Supabase has `author_id`
- If dashboard creates content with wrong field names, mobile can't read it

**Evidence**: 
- Mobile news page tries to display featured images
- If dashboard directly inserted with `cover_image_url` instead of mapping, mobile won't see image

**Risk**: Inconsistent writes from different sources could break the mapping

---

### 🟡 ISSUE 7: Notification Store Exists But Not Used Anywhere
**Flow**: Cross-platform notifications  
**Status**: ⚠️ UNUSED  
**Severity**: LOW  

**Root Cause**:
- Store exists: `/Users/akwasifosuhene/harmoniq-safety-no-supabase/src/stores/notifications-store.tsx`
- Mobile has `/app/notifications/page.tsx` but doesn't import notifications store
- Check: `grep -r "useNotificationsStore\|NotificationsStoreProvider" /src/app` returns 0 matches

**Impact**: Push notifications feature is not implemented on either platform

---

### 🟡 ISSUE 8: Mobile Has "Inspection Rounds" - Dashboard Only Has "Inspection Routes"
**Flow**: Inspection data synchronization  
**Status**: ⚠️ NAMING MISMATCH  
**Severity**: LOW  

**Root Cause**:
- Mobile: `/app/inspection-round/page.tsx` uses `useInspectionRoundsStore`
- Dashboard: `/dashboard/inspection-routes/page.tsx` uses `useInspectionRoutesStore`
- These are DIFFERENT entities
  - InspectionRoutes = recurring inspection templates (e.g., "Daily Morning Walk")
  - InspectionRounds = actual execution instances of a route

**Impact**: 
- ✅ Data flow is correct (routes on dashboard, rounds on mobile)
- ⚠️ But terminology is confusing for cross-platform understanding

**Note**: This is a design choice, not a bug. Just documenting for clarity.

---

### 🟡 ISSUE 9: Parts Store Stripped of Key Fields
**Flow**: Dashboard work orders reference parts → Mobile should see cost/details  
**Status**: ⚠️ INCOMPLETE  
**Severity**: LOW  

**Root Cause**:
- File: `/Users/akwasifosuhene/harmoniq-safety-no-supabase/src/stores/parts-store.tsx` has no stripFields defined
- But parts are fetched and used in work orders
- Work order UI calculates costs but may fail if part details are incomplete

---

## ENTITY TYPE COVERAGE ANALYSIS

### ✅ Cross-Platform Entities (Both Dashboard & Mobile)
1. **Tickets** - ✅ Both sides (but see Issues #5)
2. **Work Orders** - ✅ Both sides (mobile requests, dashboard approves)
3. **Incidents** - ✅ Both sides (but see Issue #4)
4. **Assets** - ✅ Both sides (but see Issue #3)
5. **Locations** - ✅ Both sides (dashboard manages, mobile navigates)
6. **Checklists** - ✅ Both sides (templates + submissions)
7. **Users & Teams** - ✅ Both sides (filtering by team works)
8. **Content/News** - ✅ Both sides (but see Issue #6)

### ⚠️ Partial Coverage
9. **Corrective Actions** - ❌ Only stored in incidents on dashboard (see Issues #1, #2)
10. **Risk Assessments** - ⚠️ Both sides but named differently (mobile: checklists, dashboard: risk-assessments)
11. **Inspections** - ⚠️ Desktop has inspection details, mobile redirects to checklists

### ⚠️ Dashboard-Only (No Mobile Equivalent)
- Analytics page
- Platform settings  
- QR code management
- Parts management (mobile doesn't manage parts, only work orders use them)
- Settings & user management (admin features)

### ⚠️ Mobile-Only Features
- Maintenance request creation (shown on dashboard as work orders ✓ - actually not isolated)
- Incident reporting wizard (dashboard has different form structure)
- Inspection round execution (mobile-specific, not on dashboard)
- Mobile-specific navigation (news feed, profile, notifications)

---

## STORE HEALTH CHECK

### All Registered Stores (17 total)
| Store | Initial Data | Used By | Status |
|-------|--------------|---------|--------|
| company-store | mockCompanies | Both | ✅ |
| users-store | mockUsers | Both | ✅ |
| teams-store | mockTeams | Both | ✅ |
| locations-store | mockLocations | Both | ✅ |
| assets-store | mockAssets | Both | ⚠️ Issue #3 |
| incidents-store | mockIncidents | Both | ⚠️ Issue #4 |
| tickets-store | mockTickets | Both | ⚠️ Issue #5 |
| content-store | mockContent | Both | ⚠️ Issue #6 |
| checklists-store | mocks | Both | ✅ |
| inspections-store | mockInspections | Dashboard | ✅ |
| risk-evaluations-store | mockRiskEvaluations | Both | ✅ |
| **corrective-actions-store** | **[] EMPTY** | Both | 🔴 Issue #2 |
| work-orders-store | [] (user-created) | Both | ✅ |
| meter-readings-store | mocks | Dashboard | ✅ |
| parts-store | mocks | Dashboard | ✅ |
| inspection-routes-store | mockRoutes | Both | ✅ |
| inspection-rounds-store | [] | Mobile | ✅ |
| notifications-store | [] | - | ⚠️ Issue #7 |

---

## CROSS-PLATFORM DATA FLOW VALIDATION

### Flow 1: TICKETS (Dashboard ↔ Mobile Tasks) 
**Status**: ✅ WORKING (with caveats)

- Dashboard creates ticket → stored in `harmoniq_tickets` table → mobile loads and shows
- Mobile user updates ticket status → updates `harmoniq_tickets` → dashboard sees change
- **Issue**: Creator name stripped (Issue #5), must lookup separately

**Files**:
- Dashboard create: `/dashboard/tickets/page.tsx:~120`
- Mobile view: `/app/tasks/page.tsx:~316`
- Store: `stores/tickets-store.tsx`

---

### Flow 2: WORK ORDERS (Mobile ↔ Dashboard)
**Status**: ✅ WORKING

- Mobile requests maintenance → `addWorkOrder()` → `harmoniq_work_orders` table
- Dashboard approves/assigns → `update()` → state syncs back to mobile
- Mobile user can see updated status

**Files**:
- Mobile request: `/app/maintenance/page.tsx:~60`
- Dashboard manage: `/dashboard/work-orders/page.tsx:~100`
- Store: `stores/work-orders-store.tsx`

---

### Flow 3: INCIDENTS (Mobile ↔ Dashboard)
**Status**: ⚠️ PARTIALLY BROKEN

- Mobile reports incident → `addIncident()` → `harmoniq_incidents` table ✅
- Dashboard sees incident ✅
- Dashboard creates corrective actions → **NOT synced to mobile tasks** ❌ (Issue #1)
- Incident fields (reporter, location) stripped before sync ⚠️ (Issue #4)

**Files**:
- Mobile report: `/app/report/page.tsx:~200`
- Dashboard view: `/dashboard/incidents/[incidentId]/page.tsx`
- Store: `stores/incidents-store.tsx`

---

### Flow 4: ASSETS (Dashboard ↔ Mobile)
**Status**: ⚠️ WORKING WITH DATA LOSS

- Dashboard creates asset → `harmoniq_assets` table
- Mobile can browse assets ✅
- **Problem**: location, inspections, certifications fields stripped ⚠️ (Issue #3)
- Mobile can't show asset location inline, must fetch separately

**Files**:
- Dashboard: `/dashboard/assets/page.tsx`
- Mobile browse: `/app/assets/page.tsx`
- Store: `stores/assets-store.tsx` (with stripFields)

---

### Flow 5: LOCATIONS (Dashboard ↔ Mobile)
**Status**: ✅ WORKING

- Dashboard creates location → `harmoniq_locations` table
- Mobile navigates to location detail → loads from store
- Emergency contacts & safety notices stored in mock data (not synced)

**Files**:
- Mobile detail: `/app/location/[locationId]/page.tsx`
- Dashboard: `/dashboard/locations/`
- Store: `stores/locations-store.tsx`

---

### Flow 6: CHECKLISTS (Dashboard Templates ↔ Mobile Submissions)
**Status**: ✅ WORKING

- Dashboard creates template → `harmoniq_checklist_templates`
- Mobile submits checklist → `harmoniq_checklist_submissions`
- Dashboard sees submission

**Files**:
- Mobile: `/app/checklists/page.tsx`
- Dashboard: `/dashboard/checklists/`
- Stores: `stores/checklists-store.tsx` (two stores)

---

### Flow 7: USERS/TEAMS (Filtering)
**Status**: ✅ WORKING

- Dashboard assigns user to team → stored
- Mobile filters tasks by user's team_ids ✓ (line 316 of tasks/page.tsx)
- User sees only assigned items

**Evidence**: `/app/tasks/page.tsx`
```typescript
(user.team_ids?.length && tk.assigned_groups?.some((g) => user.team_ids!.includes(g)))
```

---

### Flow 8: CONTENT/NEWS (Dashboard ↔ Mobile)
**Status**: ⚠️ PARTIALLY WORKING

- Dashboard publishes content → `harmoniq_content` table
- Mobile news feed filters `status === "published"` ✅
- **Risk**: Column mapping could break (Issue #6)

**Files**:
- Mobile: `/app/news/page.tsx:~70`
- Dashboard: `/dashboard/content/`
- Store: `stores/content-store.tsx` (with columnMap)

---

### Flow 9: RISK ASSESSMENTS (Dashboard Config ↔ Mobile Checklists)
**Status**: ⚠️ WORKING WITH CONFUSION

- Dashboard has `/risk-assessments/` section
- Mobile has `/risk-assessment/` but redirects to `/checklists/`
- Risk assessment forms (JHA, JSA, RIE, SAM, etc.) are country-specific
- Data flow: ✅ Works, but terminology is confusing

**Files**:
- Mobile redirect: `/app/risk-assessment/page.tsx`
- Mobile actual UI: `/app/checklists/page.tsx:~160`
- Dashboard: `/dashboard/risk-assessments/`

---

## SUMMARY TABLE: Data Flow Status

| Flow | Dashboard → Mobile | Mobile → Dashboard | Data Integrity | Status |
|------|-------------------|-------------------|-----------------|--------|
| Tickets | ✅ | ✅ | ⚠️ Names stripped | ✅ |
| Work Orders | ✅ | ✅ | ✅ | ✅ |
| Incidents | ✅ | ✅ | ⚠️ Fields stripped, Actions not synced | 🔴 |
| Assets | ✅ | ⚠️ Not writable | ⚠️ Fields stripped | ⚠️ |
| Locations | ✅ | ✅ | ✅ | ✅ |
| Checklists | ✅ | ✅ | ✅ | ✅ |
| Users/Teams | ✅ | ✅ | ✅ | ✅ |
| Content/News | ✅ | N/A | ⚠️ Column mapping risk | ⚠️ |
| Corrective Actions | ❌ | N/A | ❌ Not in store | 🔴 |

---

## RECOMMENDATIONS (Priority Order)

### 🔴 CRITICAL (Fix Immediately)
1. **Fix Corrective Actions Store** - Initialize with mock data or seed data
2. **Sync Dashboard Corrective Actions to Store** - When creating actions from incidents, also call `useCorrectiveActionsStore().add()`
3. **Remove stripFields for relationship data** - Keep reporter, location, asset, assignee, creator fields in store (only exclude if they're complex objects)

### 🟡 HIGH (Fix Soon)
4. **Fix Content Store Column Mapping** - Ensure dashboard and mobile use consistent field names
5. **Add Corrective Action Store to Mobile** - Mobile tasks page already imports it; just needs data
6. **Implement Notifications** - Notification store exists but is unused

### 🟢 MEDIUM (Consider)
7. **Optimize N+1 User Lookups** - Cache or denormalize user names in store
8. **Reconcile Risk Assessment Terminology** - Clarify if "risk-assessment" and "checklists" are the same or different
9. **Document Field Stripping** - Make stripFields decisions explicit in code comments

---

## CONCLUSION

The unified Zustand store architecture provides **good cross-platform sync for basic flows**, but has **critical gaps**:

- ✅ **Working**: Tickets, Work Orders, Locations, Checklists, Teams
- ⚠️ **Partially Working**: Incidents (no corrective actions), Assets (fields stripped), News (mapping risk)
- 🔴 **Broken**: Corrective Actions (not in store), full incident reporting workflow

**Total Critical Issues**: 2  
**Total Medium Issues**: 5  
**Total Low Issues**: 2  

Estimated fix time: **2-4 hours** for critical issues, **4-8 hours** for all issues.

