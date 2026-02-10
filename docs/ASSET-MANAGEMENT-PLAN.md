# Harmoniq Safety — Asset Management Enhancement Plan

## Executive Summary

This plan addresses gaps in asset management by looking at the problem from **two perspectives**:

1. **The Company** — Needs to stay on top of equipment compliance, costs, and availability. Must prevent regulatory fines, reduce unplanned downtime, and make data-driven decisions about repair vs. replace.
2. **The Field Worker** — Needs to quickly inspect, report problems, and get fixes done. Must be able to work in low-connectivity environments, scan a QR code and immediately act, and see what's urgent.

Benchmarked against: **IBM Maximo**, **SafetyCulture (iAuditor)**, **MaintainX**.

---

## Current State Assessment

### What's Working Well ✅
| Feature | Status | Notes |
|---------|--------|-------|
| Asset CRUD (list/detail) | ✅ Functional | 40+ fields per asset, hierarchy view, filters |
| Asset Alerts Tab | ✅ Functional | Critical/warning/info alerts with filtering |
| Maintenance Schedules | ✅ Functional | Create schedules, mark complete, log history |
| Downtime Tracking | ✅ Functional | Log downtime events with duration |
| Mobile Inspection Form | ✅ Functional | Step-by-step, photo upload, pass/fail, notes |
| Inspection Templates | ✅ Functional | 6 templates (24-200+ checkpoints each) |
| Certifications Display | ✅ Functional | Shows certs with expiry status badges |
| Mock Data | ✅ Rich | 38 assets with full field population |

### What's Broken or Stubbed ⚠️
| Feature | Status | Issue |
|---------|--------|-------|
| Asset Statistics Tab | ⚠️ Hardcoded | Shows "4 inspections, 75% pass rate" — not computed |
| Document Upload | ⚠️ Non-functional | Upload button exists but has no handler |
| QR → Asset Link | ⚠️ Missing | QR codes link to report form, not asset/inspection |
| Incident → Asset Link | ⚠️ Unused | `asset_id` field exists in type but form shows `null` |
| Expiry Alerts Dashboard | ⚠️ Incomplete | Cert expiry shown on detail but not on dashboard KPIs |

### What's Completely Missing ❌
| Feature | Industry Standard | Gap Impact |
|---------|------------------|------------|
| Work Orders | Core in Maximo, MaintainX | No way to track repair from request → completion |
| Corrective Actions | Core in SafetyCulture | Failed inspection has no follow-up workflow |
| Meter Readings | Maximo, MaintainX | No condition-based maintenance triggers |
| Parts/Inventory | Maximo | Can't track which parts were used or costs |
| Asset Health Score | Maximo | No computed condition trending |
| Bulk Import/Export | All competitors | Can't onboard assets at scale or extract reports |

---

## Implementation Plan

### Phase 1 — Quick Wins (Wire Existing Data)
*These features leverage data/UI that already exists but isn't connected.*

#### 1.1 — Asset Statistics Tab (Computed from Real Data)
**Company perspective:** "I need to see how my equipment is actually performing."
**Worker perspective:** "Is this machine safe to use today?"

- **What:** Replace hardcoded stats with computed values from inspection + maintenance stores
- **How:**
  - Count inspections for this asset from `AssetInspectionsStore`
  - Compute pass rate from inspection results
  - Find last/next inspection dates
  - Add a simple trend chart (inspections over time, like we did for inspection detail)
- **Files:** `src/app/[company]/dashboard/assets/[assetId]/page.tsx` (Statistics tab)
- **Depends on:** Inspection store (already exists)

#### 1.2 — QR Code → Asset Deep Link
**Company perspective:** "I printed QR codes on all our forklifts. Workers should scan and inspect."
**Worker perspective:** "I scan the sticker on the machine and I'm immediately in the inspection form."

- **What:** When creating a QR code, allow linking to an asset (not just a location). Encode URL as `/{company}/app/inspection/{assetId}`
- **How:**
  - Add optional `asset_id` field to QR code creation form
  - If asset is selected, encode inspection deep link instead of report link
  - On scan, employee lands directly on the inspection form for that asset
- **Files:** `src/app/[company]/dashboard/qr-codes/page.tsx`
- **Depends on:** Asset store (exists), inspection page (exists)

#### 1.3 — Incident → Asset Linking
**Company perspective:** "When there's an injury involving a forklift, I need to see all incidents for that forklift."
**Worker perspective:** "I'm reporting an incident — it was caused by machine X."

- **What:** Add asset selector to incident creation form; show linked incidents on asset detail
- **How:**
  - Add asset dropdown to `incidents/new/page.tsx` (field exists in type, just unused)
  - On asset detail, add "Related Incidents" section to inspections or a new tab
  - On incident detail, show linked asset with link to asset page
- **Files:**
  - `src/app/[company]/dashboard/incidents/new/page.tsx`
  - `src/app/[company]/dashboard/incidents/page.tsx` (quick add modal)
  - `src/app/[company]/dashboard/assets/[assetId]/page.tsx`
- **Depends on:** Incident store + Asset store (both exist)

#### 1.4 — Certification & Warranty Expiry Alerts on Dashboard
**Company perspective:** "I can NOT let a certification expire. That's a regulatory violation and a fine."
**Worker perspective:** "Which machines are about to go out of compliance?"

- **What:** Surface upcoming expirations (warranty, calibration, certification) on the main dashboard and asset list
- **How:**
  - Scan all assets for `warranty_expiry`, `next_calibration_date` within 30 days
  - Add an "Expiring Soon" KPI card on the company dashboard
  - Show badge count on the Assets nav item in sidebar
  - Populate the existing Alerts tab with real computed alerts (not just mock)
- **Files:**
  - `src/app/[company]/dashboard/page.tsx` (company dashboard)
  - `src/app/[company]/dashboard/assets/page.tsx` (alerts tab)
  - `src/components/navigation/sidebar.tsx` (badge)
- **Depends on:** Asset store (exists)

#### 1.5 — Document Upload Handler
**Company perspective:** "I need to attach the safety certificate PDF to this asset."
**Worker perspective:** "Where's the manual for this machine?"

- **What:** Wire the existing upload button to store documents in localStorage (base64)
- **How:**
  - On file select, read as base64 data URL
  - Store in a per-asset document array in localStorage
  - Display uploaded docs alongside mock docs
  - Add download/view functionality
- **Files:** `src/app/[company]/dashboard/assets/[assetId]/page.tsx` (Documents tab)
- **Depends on:** None

#### 1.6 — Location Context on Asset Detail
**Company perspective:** "This forklift is at Warehouse B. I need to see the location's safety record alongside the asset."
**Worker perspective:** "Where exactly is this machine? What's the safety status of this area?"

- **What:** Enrich the asset detail page with a dedicated location context section. If an asset has a `location_id`, show a location card with link + safety stats. If not, show "Mobile/Unassigned asset" with a prompt to assign.
- **How:**
  - Replace the plain-text `location_id` field with a rich card:
    - Location name (linked to location page)
    - Location type, address
    - Recent incidents at this location (count)
    - Other assets at this location (count + link)
  - If `location_id` is null, show an "Unassigned" state:
    - "This asset is not tied to a fixed location"
    - "Assign Location" button (opens location selector)
  - On the location detail page, add an "Assets" section listing all assets at that location
- **Files:**
  - `src/app/[company]/dashboard/assets/[assetId]/page.tsx` (Info tab)
  - `src/app/[company]/dashboard/locations/[locationId]/page.tsx` (new Assets section)
- **Depends on:** Location store, Asset store (both exist)

#### 1.7 — Asset Activity Timeline
**Company perspective:** "I want one view that tells me everything that's happened to this asset — inspections, maintenance, downtime, incidents — in chronological order."
**Worker perspective:** "Before I use this crane, show me what's happened to it recently."

- **What:** A unified timeline tab on asset detail that merges all activity into a single chronological feed. Currently history is scattered across 3 separate tabs (Maintenance, Downtime, Inspections) in separate lists.
- **Event types in the timeline:**
  | Event | Icon | Color | Source |
  |-------|------|-------|--------|
  | Inspection passed | ✅ CheckCircle | Green | AssetInspections store |
  | Inspection failed | ❌ XCircle | Red | AssetInspections store |
  | Maintenance completed | 🔧 Wrench | Blue | Maintenance logs |
  | Maintenance overdue | ⏰ Clock | Orange | Maintenance schedules |
  | Downtime started | 🔴 ArrowDown | Red | Downtime logs |
  | Downtime ended | 🟢 ArrowUp | Green | Downtime logs |
  | Incident linked | ⚠️ AlertTriangle | Yellow | Incidents store |
  | Corrective action created | 📋 ClipboardList | Orange | Corrective actions (Phase 2) |
  | Corrective action resolved | ✅ CheckSquare | Green | Corrective actions (Phase 2) |
  | Condition changed | 📊 TrendingDown/Up | Varies | Asset updates |
  | Certificate expiring | 📄 FileWarning | Orange | Asset certifications |
  | Asset created | ➕ Plus | Gray | Asset record |
- **UI Design:**
  ```
  ┌─────────────────────────────────────────────────┐
  │  ● Feb 8, 2026                                  │
  │  │                                               │
  │  ├─ ✅ 10:30 AM  Inspection PASSED               │
  │  │   Inspector: Mike Chen · 24/24 checkpoints    │
  │  │   [View Inspection →]                         │
  │  │                                               │
  │  ├─ 🔧 2:15 PM  Maintenance Completed            │
  │  │   "Quarterly hydraulic service"               │
  │  │   Parts: Hydraulic filter × 1 ($45)           │
  │  │   Labor: 1.5 hours                            │
  │  │                                               │
  │  ● Feb 3, 2026                                   │
  │  │                                               │
  │  ├─ ❌ 9:00 AM  Inspection FAILED                │
  │  │   Inspector: Sarah Kim · 22/24 passed         │
  │  │   Failed: "Hydraulic hose leaking"            │
  │  │   📷 2 photos attached                        │
  │  │   [View Inspection →] [Corrective Action →]   │
  │  │                                               │
  │  ├─ 🔴 9:45 AM  Downtime Started                 │
  │  │   Reason: "Taken offline for repair"          │
  │  │                                               │
  │  ├─ 🟢 3:30 PM  Downtime Ended                   │
  │  │   Duration: 5h 45m                            │
  │  │                                               │
  │  ● Jan 28, 2026                                  │
  │  │                                               │
  │  ├─ ⚠️ 11:00 AM  Incident Linked                │
  │  │   INC-2026-0042: "Near miss — hydraulic leak" │
  │  │   Severity: Medium                            │
  │  │   [View Incident →]                           │
  │  │                                               │
  │  ● Jan 15, 2026                                  │
  │  │                                               │
  │  ├─ 📄 Certificate Expiring                      │
  │  │   "Annual Safety Certification"               │
  │  │   Expires: Feb 15, 2026 (31 days)             │
  │  │                                               │
  │  ● Dec 1, 2025                                   │
  │  │                                               │
  │  ├─ ➕ Asset Created                              │
  │  │   Added to system by Platform Admin           │
  │  └─────────────────────────────────────────────  │
  └─────────────────────────────────────────────────┘
  ```
- **Filters on timeline:**
  - Event type toggle: All | Inspections | Maintenance | Downtime | Incidents
  - Date range picker
- **How to build:**
  - New tab: `{ id: "timeline", label: "Timeline", icon: Clock }` — insert between Info and Maintenance
  - Collect events from all stores (inspections, maintenance logs, downtime, incidents)
  - Normalize into `{ date, type, icon, color, title, description, links }[]`
  - Sort by date descending
  - Group by day
  - Render with vertical line + dot connector pattern (already used in other apps)
- **Files:**
  - `src/app/[company]/dashboard/assets/[assetId]/page.tsx` (new Timeline tab)
- **Depends on:** Inspection store, Incident store, Asset store (all exist)

---

### Phase 2 — Corrective Actions & Work Orders
*These are the biggest functional gaps vs. competitors.*

#### 2.1 — Corrective Actions (from Failed Inspections)
**Company perspective:** "When an inspection fails, I need to know: who's fixing it, by when, and is it done?"
**Worker perspective:** "I found a broken safety guard. What happens next?"

- **What:** When an inspection checkpoint fails, auto-create a corrective action item
- **Data model:**
  ```
  CorrectiveAction {
    id, asset_id, inspection_id, checkpoint_id
    description (from inspection notes)
    severity: critical | high | medium | low
    assigned_to: user_id
    due_date
    status: open | in_progress | completed | overdue
    resolution_notes
    completed_at
    created_at
  }
  ```
- **UI:**
  - New store: `corrective-actions-store.tsx`
  - On inspection submission with failures → auto-create actions
  - Dashboard widget: "Open Corrective Actions" count
  - Asset detail: "Corrective Actions" section showing open/resolved
  - List view under Safety Tasks tab (alongside checklists)
- **Files:**
  - New: `src/stores/corrective-actions-store.tsx`
  - Modify: `src/app/[company]/app/inspection/[assetId]/page.tsx` (on submit)
  - Modify: `src/app/[company]/dashboard/checklists/page.tsx` (new sub-tab)
  - Modify: `src/app/[company]/dashboard/assets/[assetId]/page.tsx`
- **Depends on:** Inspection store, Asset store

#### 2.2 — Work Orders (Lightweight)
**Company perspective:** "I need a formal process: request → approve → assign → complete → close."
**Worker perspective:** "The conveyor belt is making a weird noise. I need to request maintenance."

- **What:** A simple work order system that can be created from:
  - Manual creation (dashboard)
  - Failed inspection (auto-suggested)
  - Maintenance schedule overdue (auto-suggested)
  - Employee request (mobile app)
- **Data model:**
  ```
  WorkOrder {
    id, company_id, asset_id, location_id
    title, description
    type: preventive | corrective | emergency | request
    priority: critical | high | medium | low
    status: requested | approved | in_progress | on_hold | completed | cancelled
    requested_by: user_id
    assigned_to: user_id
    assigned_team: team_id
    estimated_hours, actual_hours
    parts_used: { name, quantity, cost }[]
    due_date, started_at, completed_at
    related_inspection_id, related_incident_id
    notes
    created_at, updated_at
  }
  ```
- **UI:**
  - New pages: `dashboard/work-orders/page.tsx`, `dashboard/work-orders/[workOrderId]/page.tsx`
  - New nav item in sidebar (between Incidents and Safety Tasks)
  - Employee app: "Request Maintenance" button on asset/location pages
  - KPI cards: Open, In Progress, Overdue, Completed This Week
  - Kanban or list view with filters
- **Depends on:** Asset store, User store, Team store

---

### Phase 3 — Advanced Asset Intelligence
*These features differentiate Harmoniq from basic tools.*

#### 3.1 — Meter Readings & Condition-Based Maintenance
**Company perspective:** "I want to service the compressor every 500 hours, not every 30 days."
**Worker perspective:** "I log the hour meter reading when I inspect. The system tells me when service is due."

- **What:** Track numeric readings per asset over time; trigger maintenance based on thresholds
- **Data model:**
  ```
  MeterReading {
    id, asset_id, meter_type (hours | miles | psi | temperature | cycles)
    value: number, unit: string
    recorded_by: user_id
    recorded_at
  }
  ```
- **UI:**
  - Asset detail: new "Meters" section showing current readings + history chart
  - Inspection form: optional meter reading field at end
  - Maintenance trigger: "Every 500 hours" in addition to "Every 30 days"
- **Depends on:** Asset store

#### 3.2 — Asset Health Score
**Company perspective:** "Give me a single number that tells me if this machine is healthy."
**Worker perspective:** "Red/yellow/green — should I use this machine today?"

- **What:** Computed score (0–100) based on weighted factors:
  - Inspection pass rate (last 5 inspections) — 30%
  - Maintenance compliance (on-time vs. overdue) — 25%
  - Age vs. expected life — 15%
  - Condition assessment — 15%
  - Open corrective actions count — 15%
- **UI:**
  - Color-coded badge on asset list (green ≥80, yellow 50–79, red <50)
  - Gauge chart on asset detail overview
  - Dashboard: "Assets at Risk" widget showing red/yellow assets
  - Trend line: health score over last 6 months

#### 3.3 — Parts & Inventory Tracking (Lightweight)
**Company perspective:** "I need to know total maintenance cost per asset and when to reorder parts."
**Worker perspective:** "I replaced the hydraulic filter. I need to log that."

- **What:** Simple parts log per maintenance completion
- **Data model:**
  ```
  Part {
    id, name, part_number, category
    quantity_in_stock, reorder_level
    unit_cost, currency
    supplier
  }
  
  PartUsage {
    id, work_order_id | maintenance_log_id
    part_id, quantity_used, cost
  }
  ```
- **UI:**
  - Maintenance completion modal: add parts used (name, qty, cost)
  - Asset detail: "Total Maintenance Cost" on statistics tab
  - Optional: simple parts inventory list under Assets

#### 3.4 — Bulk Import / Export
**Company perspective:** "I have 500 assets in a spreadsheet. I need to get them into the system."
**Worker perspective:** "My manager needs a report of all inspections this month."

- **What:** CSV import for assets; PDF/CSV export for inspections, maintenance history, asset lists
- **UI:**
  - Asset list: "Import CSV" button → column mapping → preview → confirm
  - Asset list: "Export" button → CSV of filtered view
  - Inspection detail: "Export PDF" button → formatted report
  - Maintenance history: "Export" button → CSV with all logs

---

### Phase 4 — Field Worker Experience
*These features make the mobile app indispensable in the field.*

#### 4.1 — "Request Maintenance" from Employee App
**Worker perspective:** "The fire extinguisher pressure gauge is in the red. I need someone to fix this NOW."

- **What:** Simple form on the employee app to request maintenance
- **UI:**
  - Button on employee home page: "Request Maintenance"
  - Select asset (or scan QR) → describe issue → set urgency → submit
  - Creates a work order with status `requested`
  - Shows in dashboard work orders for manager to approve/assign
- **Depends on:** Work Orders (Phase 2.2)

#### 4.2 — Asset Quick-View from QR Scan
**Worker perspective:** "I scanned the QR code. Show me everything about this machine before I start my shift."

- **What:** After scanning asset QR, show an asset summary card:
  - Name, condition, last inspection date/result
  - Quick actions: Start Inspection, Report Issue, View History, Request Maintenance
- **UI:** New page `src/app/[company]/app/asset/[assetId]/page.tsx`
- **Depends on:** QR deep links (Phase 1.2)

#### 4.3 — Offline Inspection Queue
**Company perspective:** "Our warehouse has dead spots. Inspections can't stop because of WiFi."
**Worker perspective:** "I completed the inspection but had no signal. It should sync when I'm back."

- **What:** Queue completed inspections in localStorage when offline; sync when online
- **UI:**
  - Detect `navigator.onLine` status
  - Show "Offline — inspections will sync when connected" banner
  - On reconnect, process queue and show "3 inspections synced" toast
- **Note:** This is the hardest feature but the most impactful for field adoption

---

## Implementation Priority & Sequencing

```
Phase 1 (Quick Wins) ─────────────────────────────
  1.1 Asset Stats Tab          ██░░░░░░  Low effort
  1.2 QR → Asset Deep Link     ██░░░░░░  Low effort
  1.3 Incident → Asset Link    ██░░░░░░  Low effort
  1.4 Expiry Alerts Dashboard  ███░░░░░  Low-Med effort
  1.5 Document Upload          ██░░░░░░  Low effort
  1.6 Location Context         ███░░░░░  Low-Med effort
  1.7 Asset Activity Timeline  ████░░░░  Medium effort  ★ NEW

Phase 2 (Core EAM) ───────────────────────────────
  2.1 Corrective Actions       ████░░░░  Medium effort
  2.2 Work Orders              █████░░░  Medium-High effort

Phase 3 (Intelligence) ───────────────────────────
  3.1 Meter Readings           ████░░░░  Medium effort
  3.2 Asset Health Score       ███░░░░░  Medium effort
  3.3 Parts Tracking           ████░░░░  Medium effort
  3.4 Bulk Import/Export       ████░░░░  Medium effort

Phase 4 (Field Experience) ───────────────────────
  4.1 Request Maintenance      ███░░░░░  Low-Med effort
  4.2 Asset Quick-View         ███░░░░░  Low-Med effort
  4.3 Offline Inspections      ███████░  High effort
```

### Recommended Order:
1. **Phase 1** first (all 5 items) — immediate value, low risk
2. **Phase 2.1** Corrective Actions — bridges inspection → resolution
3. **Phase 2.2** Work Orders — the biggest missing EAM feature
4. **Phase 3.2** Health Score — high-visibility dashboard feature
5. **Phase 4.1** Request Maintenance — field worker adoption driver
6. **Phase 4.2** Asset Quick-View — complements QR deep links
7. **Phase 3.1** Meter Readings — enables condition-based maintenance
8. **Phase 3.3** Parts Tracking — cost visibility
9. **Phase 3.4** Bulk Import/Export — operational efficiency
10. **Phase 4.3** Offline — save for last (complex, high reward)

---

## User Journey: How It All Connects

### Company Admin Journey
```
Dashboard → See "3 assets at risk" + "5 certs expiring" + "12 open work orders"
  → Click "Assets at Risk" → See red/yellow health scores
    → Click forklift → See health trending down, 2 failed inspections
      → See corrective actions: "Replace hydraulic hose — assigned to Mike, due Friday"
      → See work order: "Emergency repair — in progress"
      → See parts used: "$240 in parts this month"
      → See related incident: "Near miss on Jan 15"
      → Export PDF report for safety committee meeting
```

### Field Worker Journey
```
Arrive at warehouse → Scan QR code on forklift
  → See asset card: "Last inspected 2 days ago — PASSED"
  → Tap "Start Inspection" → Step through 24 checkpoints
    → Item 7 FAIL: "Hydraulic hose leaking" + take photo
    → Complete inspection → Auto-creates corrective action
  → Back to asset card → Tap "Request Maintenance"
    → "Hydraulic hose needs replacement — URGENT"
    → Creates work order → Manager gets notified
  → Next day: maintenance tech completes work order
    → Logs parts used: "Hydraulic hose × 1, $85"
    → Marks complete → Asset health score updates
```

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Assets with active inspection schedules | Unknown | 100% |
| Average time from failed inspection → resolution | Not tracked | < 48 hours |
| Overdue maintenance schedules | Not tracked | < 5% |
| Certification expiry compliance | Not tracked | 100% |
| Mean time between failures (MTBF) | Not tracked | Trending up |
| Maintenance cost per asset | Not tracked | Tracked & visible |
| Field inspection completion rate | Not tracked | > 95% |
