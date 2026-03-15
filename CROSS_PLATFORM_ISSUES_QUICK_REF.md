# Cross-Platform Data Sync Issues - Quick Reference

## 🔴 CRITICAL ISSUES (2)

### Issue 1: Corrective Actions NOT Synced to Mobile
- **What**: Dashboard creates corrective actions from incidents → mobile doesn't see them
- **Where**: `/dashboard/incidents/[incidentId]/page.tsx` line ~260 (handleAddAction)
- **Why**: Only stored in incident.actions, never added to `useCorrectiveActionsStore()`
- **Fix**: Add `addCorrectiveAction()` call after `setActions()`
- **Impact**: HIGH - Incident corrective action workflow broken

### Issue 2: Corrective Actions Store Empty
- **What**: `harmoniq_corrective_actions` table/store starts empty with no mock data
- **Where**: `/stores/corrective-actions-store.tsx` line 6
- **Why**: Initialized with `[]` instead of mock data
- **Fix**: Add `mockCorrectiveActions` and initialize store
- **Impact**: HIGH - No corrective actions persist anywhere

---

## 🟡 MEDIUM ISSUES (5)

### Issue 3: Asset Fields Stripped - Data Loss
- **Fields Lost**: location, inspections, certifications
- **Where**: `/stores/assets-store.tsx` line 8
- **Impact**: Mobile can't show asset location inline, must lookup separately
- **Workaround**: Fetch from `useLocationsStore()` and join manually

### Issue 4: Incident Fields Stripped  
- **Fields Lost**: reporter, location, asset
- **Where**: `/stores/incidents-store.tsx` line 8
- **Impact**: Mobile incident list incomplete without user/location/asset names

### Issue 5: Ticket Fields Stripped
- **Fields Lost**: assignee, creator
- **Where**: `/stores/tickets-store.tsx` line 8
- **Impact**: Mobile tasks do N+1 lookups via `getUserName()` on every render
- **Evidence**: `/app/tasks/page.tsx` line 306

### Issue 6: Content Store Uses Column Mapping
- **Risk**: featured_image → cover_image_url, created_by → author_id
- **Where**: `/stores/content-store.tsx` lines 9-12
- **Impact**: Potential mismatch if dashboard writes with wrong field names
- **Status**: Currently working but fragile

### Issue 7: Notifications Store Unused
- **What**: Store exists but never imported anywhere
- **Where**: `/stores/notifications-store.tsx` exists, never used
- **Impact**: LOW - Feature not implemented on either platform

---

## ✅ WORKING FLOWS

| Flow | Status | Notes |
|------|--------|-------|
| Tickets Dashboard → Mobile | ✅ | Works but names stripped |
| Work Orders Mobile → Dashboard | ✅ | Full bidirectional sync |
| Incidents Mobile → Dashboard | ✅ | Except corrective actions |
| Assets Dashboard → Mobile | ✅ | Except location/inspections |
| Locations Both Ways | ✅ | Fully synced |
| Checklists Both Ways | ✅ | Fully synced |
| News Dashboard → Mobile | ✅ | Column mapping risk |
| Users/Teams Filtering | ✅ | Mobile filters by team_ids |

---

## DATA FLOW CHECKLIST

- [x] Dashboard creates ticket → Mobile sees it
- [x] Mobile updates ticket → Dashboard sees change
- [x] Mobile requests maintenance → Dashboard sees it
- [x] Dashboard approves work order → Mobile sees it
- [x] Mobile reports incident → Dashboard sees it  
- [x] Dashboard creates incident actions → Mobile sees TICKETS from them
- [ ] Dashboard creates incident actions → Mobile sees CORRECTIVE ACTIONS (BROKEN)
- [x] Dashboard creates asset → Mobile can browse it
- [ ] Dashboard sets asset location → Mobile shows it inline (needs lookup)
- [x] Dashboard publishes news → Mobile sees it
- [ ] Dashboard assigns user to team → Mobile sees only their team's items (WORKS but verify)

---

## ENTITY STORE COVERAGE

| Entity | Dashboard | Mobile | Synced | Notes |
|--------|-----------|--------|--------|-------|
| Tickets | ✅ | ✅ | ✅ | Except names |
| Work Orders | ✅ | ✅ | ✅ | Full |
| Incidents | ✅ | ✅ | ✅ | Except location/reporter |
| Corrective Actions | ✅ | ✅ | ❌ | BROKEN - not in store |
| Assets | ✅ | ✅ | ⚠️ | No location/certs |
| Locations | ✅ | ✅ | ✅ | Full |
| Users | ✅ | ✅ | ✅ | Full |
| Teams | ✅ | ✅ | ✅ | Full |
| Content/News | ✅ | ✅ | ✅ | Column mapping risk |
| Checklists | ✅ | ✅ | ✅ | Full |
| Inspection Routes | ✅ | ❌ | N/A | Mobile only has rounds |
| Risk Assessments | ✅ | ✅ | ✅ | Confusing naming |

---

## QUICK FIXES (Estimated Hours)

| Issue | Complexity | Time | Impact |
|-------|-----------|------|--------|
| Fix corrective actions store init | Easy | 0.5h | CRITICAL |
| Add corrective action sync | Easy | 0.5h | CRITICAL |
| Remove stripFields | Medium | 1h | HIGH |
| Fix content column mapping | Medium | 1h | MEDIUM |
| Implement notifications | Hard | 3h | LOW |
| **Total** | - | **6h** | - |

---

## FILES TO CHECK/MODIFY

### Stores Layer
- [ ] `/stores/corrective-actions-store.tsx` - Add init data
- [ ] `/stores/incidents-store.tsx` - Consider removing stripFields  
- [ ] `/stores/assets-store.tsx` - Consider removing stripFields
- [ ] `/stores/tickets-store.tsx` - Consider removing stripFields
- [ ] `/stores/content-store.tsx` - Verify column mapping

### Dashboard Pages
- [ ] `/dashboard/incidents/[incidentId]/page.tsx:~260` - Add corrective action store sync

### Mobile Pages
- [ ] `/app/tasks/page.tsx` - Should already work once store is fixed
- [ ] `/app/report/page.tsx` - Verify incident creation

---

## TEST SCENARIOS

### Scenario 1: Create Ticket → See on Mobile
1. Dashboard: Create ticket, assign to user
2. Mobile: Load tasks page
3. Expected: Ticket appears in "All Tasks" and "Tickets" tab
4. Current: ✅ WORKS

### Scenario 2: Create Incident → See Corrective Actions on Mobile  
1. Dashboard: Create incident
2. Dashboard: Go to incident detail, add corrective action
3. Mobile: Load tasks page, go to "Actions" tab
4. Expected: Corrective action appears
5. Current: ❌ BROKEN - appears only as ticket, not corrective action

### Scenario 3: Edit Asset → Mobile Sees Location
1. Dashboard: Create asset with location
2. Mobile: Browse assets
3. Expected: Asset shows location name inline
4. Current: ⚠️ Location field is stripped, must fetch separately

### Scenario 4: Request Maintenance → Approve in Dashboard
1. Mobile: Go to maintenance page, submit request for Asset X
2. Dashboard: Go to work orders, see the request
3. Dashboard: Approve and assign to user
4. Mobile: Refresh tasks page
5. Expected: Work order appears in updated state
6. Current: ✅ WORKS

