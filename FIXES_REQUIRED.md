# Required Code Fixes for Cross-Platform Sync

## Critical Fix #1: Initialize Corrective Actions Store with Mock Data

**File**: `src/stores/corrective-actions-store.tsx`

**Current**:
```typescript
const store = createEntityStore<CorrectiveAction>("harmoniq_corrective_actions", []);
```

**Fixed**:
```typescript
const mockCorrectiveActions: CorrectiveAction[] = [
  {
    id: "ca_1",
    company_id: "comp_1",
    asset_id: "asset_1",
    inspection_id: null,
    description: "Repair conveyor belt tension mechanism",
    severity: "high",
    assigned_to: "user_2",
    due_date: "2024-07-31",
    status: "open",
    resolution_notes: null,
    completed_at: null,
    created_at: "2024-06-15T10:00:00Z",
    updated_at: "2024-06-15T10:00:00Z",
  },
  {
    id: "ca_2",
    company_id: "comp_1",
    asset_id: "asset_4",
    inspection_id: null,
    description: "Replace fire extinguisher seals",
    severity: "medium",
    assigned_to: "user_3",
    due_date: "2024-07-15",
    status: "in_progress",
    resolution_notes: null,
    completed_at: null,
    created_at: "2024-06-10T14:30:00Z",
    updated_at: "2024-06-10T14:30:00Z",
  },
];

const store = createEntityStore<CorrectiveAction>(
  "harmoniq_corrective_actions",
  mockCorrectiveActions
);
```

---

## Critical Fix #2: Sync Corrective Actions from Dashboard Incident Page

**File**: `src/app/(app)/[company]/dashboard/incidents/[incidentId]/page.tsx`

**Location**: In the `IncidentDetailPage` component, import the store:

```typescript
// Add to imports at top
import { useCorrectiveActionsStore } from "@/stores/corrective-actions-store";
```

**In component body** (around line 145-155, in the destructuring):

```typescript
const { items: incidents, isLoading, update: updateIncident, remove: removeIncident } = useIncidentsStore();
const { items: tickets, add: addTicket } = useTicketsStore();
const { items: users } = useUsersStore();
// ADD THIS LINE:
const { add: addCorrectiveAction } = useCorrectiveActionsStore();
```

**In `handleAddAction` function** (around line 260-275), AFTER creating the ticket, ADD:

```typescript
const handleAddAction = () => {
  if (!newAction.title || !newAction.assignee || !newAction.dueDate) return;
  
  const actionId = `act-${Date.now()}`;
  const ticketId = `TKT-${Date.now()}`;
  
  const action: IncidentAction = {
    id: actionId,
    title: newAction.title,
    description: newAction.description,
    priority: newAction.priority,
    dueDate: newAction.dueDate,
    status: "pending",
    ticketId: ticketId,
    ticketStatus: "open",
    assignee: newAction.assignee,
    createdAt: new Date().toISOString(),
    actionType: newAction.actionType,
  };
  
  setActions([...actions, action]);

  // Create actual ticket in store
  addTicket({
    id: ticketId,
    company_id: incident.company_id,
    title: newAction.title,
    description: newAction.description || `${newAction.actionType === "corrective" ? "Corrective" : "Preventive"} action from incident`,
    priority: newAction.priority as any,
    status: "new",
    due_date: newAction.dueDate || null,
    assigned_to: newAction.assignee || null,
    assigned_groups: [],
    incident_ids: [incidentId],
    created_by: incident.reporter_id || "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // ADD THIS SECTION: Create corrective action in store
  if (newAction.actionType === "corrective") {
    const correctiveAction: CorrectiveAction = {
      id: actionId,
      company_id: incident.company_id,
      asset_id: incident.asset_id || "",
      inspection_id: null,
      description: newAction.description || newAction.title,
      severity: newAction.priority as Severity,
      assigned_to: newAction.assignee,
      due_date: newAction.dueDate,
      status: "open",
      resolution_notes: null,
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    addCorrectiveAction(correctiveAction);
  }

  setShowAddActionModal(false);
  setNewAction({ title: "", description: "", priority: "medium", dueDate: "", assignee: "", actionType: "corrective" });
  toast(`${action.actionType === 'corrective' ? 'Corrective' : 'Preventive'} action created.`, "success");
};
```

**Add import**:
```typescript
import type { CorrectiveAction, Severity } from "@/types";
```

---

## Medium Fix #1: Remove Field Stripping (Optional but Recommended)

These stores strip fields to avoid sending joined objects to Supabase. If your Supabase schema doesn't have these columns, KEEP the stripFields. If it does, REMOVE them.

### Option A: KEEP stripFields (Current approach - Safer)
- Pros: Smaller payloads, no Supabase schema conflicts
- Cons: Mobile must do extra lookups to get names/details

### Option B: REMOVE stripFields (Better UX)
- Pros: Mobile gets full context immediately
- Cons: Larger payloads, requires Supabase schema to match

**If choosing Option B, update these files**:

**`src/stores/assets-store.tsx`**:
```typescript
// REMOVE this line:
stripFields: ["inspections", "certifications", "location"],

// Replace with:
stripFields: ["inspections", "certifications"], // Keep only if these are arrays, remove if flat objects
```

**`src/stores/incidents-store.tsx`**:
```typescript
// REMOVE this line:
stripFields: ["reporter", "location", "asset"],

// OR keep it if these need lookup - just document why
```

**`src/stores/tickets-store.tsx`**:
```typescript
// REMOVE this line:
stripFields: ["assignee", "creator"],

// This affects mobile tasks performance (N+1 lookups)
```

---

## Medium Fix #2: Verify Content Store Column Mapping

**File**: `src/stores/content-store.tsx`

**Verify with your Supabase schema**:
```typescript
columnMap: {
  featured_image: "cover_image_url",  // ← Verify this mapping exists in DB
  created_by: "author_id",            // ← Verify this mapping exists in DB
},
```

If your Supabase schema doesn't have these exact column names, update the mapping or use consistent names everywhere.

---

## Optional Fix: Implement Notifications

**File**: `src/stores/notifications-store.tsx` (already exists, just needs to be wired)

The store exists but is never imported. To implement:

1. Import in `src/stores/app-data-provider.tsx`
2. Create mobile page at `/app/notifications/page.tsx` (already exists)
3. Implement notification creation hooks

---

## Testing Checklist After Fixes

- [ ] Dashboard: Create incident
- [ ] Dashboard: Add corrective action to incident
- [ ] Mobile: Load tasks page
- [ ] Mobile: Verify corrective action appears in "Actions" tab
- [ ] Dashboard: Create ticket assigned to user
- [ ] Mobile: Verify ticket appears in "Tickets" tab
- [ ] Mobile: Request maintenance for asset
- [ ] Dashboard: Verify work order appears
- [ ] Dashboard: Approve and assign work order
- [ ] Mobile: Verify work order shows updated status
- [ ] Dashboard: Create asset with location
- [ ] Mobile: Browse assets (verify location is visible if stripFields removed)

---

## Performance Impact

| Fix | Performance Impact | Notes |
|-----|-------------------|-------|
| Add corrective action mock data | Negligible | ~2KB more localStorage |
| Sync corrective actions to store | Negligible | One extra `add()` call per action |
| Remove stripFields | Medium | Larger store payloads, but fewer lookups |
| Verify column mapping | None | Just validation |

---

## Rollback Strategy

If something breaks after fixes:

1. **Corrective actions fix is safe** - just adds data, no existing code changes
2. **stripFields removal is safe** - just store more data, all code uses same APIs
3. **Column mapping** - verify schema before making changes

---

## Questions to Answer

1. **Does your Supabase schema have**: `cover_image_url` (or `featured_image`)?
2. **Does your Supabase schema have**: `author_id` (or `created_by`)?
3. **Can your Supabase schema store**: full related objects (user, location, asset) or just IDs?
4. **Are you running in Supabase mode or localStorage mode?**

Answers will determine if/how to remove stripFields.

