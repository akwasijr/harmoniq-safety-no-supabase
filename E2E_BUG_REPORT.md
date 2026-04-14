# Comprehensive E2E Test Report — Harmoniq Safety

**Branch:** `subtitle-feature-fixes` | **Server:** `localhost:4500` | **Date:** Apr 13, 2026  
**Viewports:** Desktop 1280×900, Mobile 375×812 | **User:** Demo Admin (Admin role)

---

## 🔄 RETEST RESULTS (Apr 13, 2026 — after GitHub CLI fixes)

| # | Bug | Previous Status | Retest Result |
|---|-----|----------------|---------------|
| 1 | **"New Incident" button throws 134 errors** | ❌ BROKEN | ✅ **FIXED** — Button navigates to `/incidents/new`, form renders all fields |
| 2 | **RA status stuck at "in progress"** | ❌ BROKEN | ✅ **FIXED** — KPIs now show Total: 8, In Progress: 0, Completed: 8 |
| 3 | **"Start Assessment" → "No active templates"** | ❌ BROKEN | ✅ **FIXED** — Modal shows 5 built-in templates (HSE, JHA, COSHH, Manual Handling, General) |
| 4 | **Analytics ⓘ tooltips no popover** | ⚠️ NO POPOVER | ⚠️ **STILL OPEN** — Button becomes `[active]` on click but no popover content renders |
| 5 | **TRIR/LTIFR raw integer display** | ⚠️ "1050"/"2500" | ⚠️ **PARTIAL FIX** — Now shows "1050.00"/"2750.00" (decimal formatting added, but magnitude may still be off) |
| 6 | **i18n: "StartNew", "SelectType", "BasedOnRegulations"** | ❌ RAW KEYS | ✅ **FIXED** — Now shows translated text |
| 7 | **i18n: "AppDisplayName", "AppDisplayNameHint"** | ❌ RAW KEYS | ✅ **FIXED** — Shows "Display Name" + helper text |

### Summary: 5 of 7 bugs fixed, 2 remaining (tooltip popover + TRIR/LTIFR magnitude)

---

## Section 1 — Dashboard KPIs (`/nexus/dashboard`)

| Test | Result |
|------|--------|
| KPIs render (Incidents, TRIR, LTIFR, Avg resolution) | ✅ All 4 load |
| Incident Trend chart | ✅ Renders (bar chart, 7 months) |
| Incidents by Type pie chart | ✅ Renders with 8 categories |
| Incidents by Severity chart | ✅ Renders |
| ⓘ Tooltip buttons on dashboard KPIs | ❌ **Not present** — only trend arrows, no info tooltips (tooltips are on Analytics page only) |
| TRIR value display | ⚠️ Shows "1050" (raw integer, not formatted as "10.50") |
| LTIFR value display | ⚠️ Shows "2500" (should be "25.00") |

---

## Section 2 — Incidents (`/nexus/dashboard/incidents`)

| Test | Result |
|------|--------|
| Incidents list loads with KPIs | ✅ KPIs render (New: 30, In progress, Resolved, Avg Resolution) |
| "New Incident" button from list page | ❌ **Generates 134 console errors, no modal/page opens** |
| Direct navigate to `/incidents/new` | ✅ Form loads with all fields |
| Incident form fields (title, type, severity, description, date, time) | ✅ All editable, pre-populated date/time |
| Location modes (Select / GPS / Manual) | ✅ All 3 work — GPS shows "Getting your location…", Manual shows free text, Select shows dropdown |
| "Lost Time?" toggle | ✅ Reveals Days Away, Restricted Duty Days, Expected Return Date |
| Submit incident | ✅ Redirects to list, KPI count increments (29→30) |
| Incident appears in table | ✅ Found on page 2: INC-335069 |
| Incident detail page | ✅ Title, severity badge, status badge, breadcrumb |
| 8 tabs on detail (Details, Investigation, Timeline, Actions, Comments, Documents, Compliance, Settings) | ✅ All tabs render |
| Investigation tab | ✅ "Investigation Not Started" empty state + "Start Investigation" button |
| Actions tab | ✅ "No actions yet" + "Create First Action" button |
| Assign button | ✅ Shows "Unassigned" + "Assign" button |
| Export button | ✅ Present on detail page |
| Pagination (15 per page) | ✅ "Showing 1 to 15 of 30", Page 1 of 2 |
| Status/date column sorting | ✅ Column headers show sort icons |

---

## Section 3 — Safety Tasks: Checklists (`/nexus/dashboard/checklists`)

| Test | Result |
|------|--------|
| Checklists tab loads with KPIs | ✅ Completed This Week: 2, Pending: 0, Overdue: 0, Pass Rate: 100% |
| Search + filter controls | ✅ Search bar, date range, status filter, Apply button |
| "Start Checklist" → template picker modal | ✅ Shows 5 active templates (Preventive Maintenance 9, Corrective Maintenance 9, Emergency Response 9, General Inspection 8, Service Task 10) |
| Template Library link in modal footer | ✅ Present |
| Checklist history table | ✅ Shows 2 completed records |

---

## Section 4 — Safety Tasks: Risk Assessment

| Test | Result |
|------|--------|
| Risk Assessment tab loads with KPIs | ✅ Total: 8, High Risk: 0, In Progress: 8, Completed: 0 |
| "Start Assessment" modal | ❌ **"No active templates available. Push templates to the field app from the Template Library first."** — despite having JHA and RI&E templates |
| All 8 assessments stuck "in progress" | ❌ **Status bug — submitted RAs never transition to "completed"** |
| Direct navigation to `/risk-assessments/new` | ⚠️ Page loads but displays untranslated i18n keys ("StartNew", "SelectType", "BasedOnRegulations") |
| JHA form fill & submit at `/risk-assessments/form/jha` | ✅ Form loads, all items answerable, submits successfully |

---

## Section 5 — Safety Tasks: Procedures

| Test | Result |
|------|--------|
| Procedures tab with KPIs | ✅ Total: 1, In Progress: 1, Completed: 0 |
| Crane Lift Procedure detail page | ✅ 4-step procedure (1 RA + 3 checklists), step-by-step progression |
| Complete step 2 (Crane Em385, 10 items) | ✅ All items answerable, submitted, redirect to overview |
| Complete step 3 (Crane/Hoist Pre-Operation, 7 items) | ✅ Submitted successfully |
| Complete step 4 (Crane Em385, 10 items) | ✅ Submitted successfully |
| Procedure completion status | ✅ 4/4 steps, status "completed", "Procedure completed" message shown |
| "Open completed step" buttons | ✅ Present for each completed step |

---

## Section 6 — Template Library (`/nexus/dashboard/checklists/my-templates`)

| Test | Result |
|------|--------|
| Checklists tab | ✅ **89 templates** across 12 industry categories (Generic, Airports, Construction, Education, Food & Beverage, Healthcare, Manufacturing, Mining, Oil & Gas, Transportation, Utilities, Warehousing) |
| Risk Assessments tab | ✅ **69 templates** across same 12 categories |
| Import button | ✅ Present |
| Active for Field App / Drafts filters | ✅ Both buttons present |

---

## Section 7 — Analytics (`/nexus/dashboard/analytics`)

| Test | Result |
|------|--------|
| 6 KPI cards render | ✅ LTIR/LTIFR, TRIR, Severity Rate, DART, Avg Resolution, Compliance Rate |
| ⓘ Info tooltips on KPIs | ⚠️ Button exists, becomes "active" on click, but **no visible popover content appears in DOM** |
| KPIs show "—" without workforce hours | ✅ Shows "Set workforce in Settings" guidance |
| "Total Hours Worked" override field | ✅ Spinbutton present for manual override |
| 4 charts (Incident Trend, Resolution Time, Incidents by Type, Compliance Trend) | ✅ All render with data |
| Date range filter (Last 6 months) | ✅ Dropdown present |
| Location/Type/Severity filters | ✅ All 3 dropdowns with proper options |
| Export PDF button | ✅ Present |
| "Buildin C" in location dropdown | ❌ **Typo** — should be "Building C" |

---

## Section 8 — Users & Teams (`/nexus/dashboard/users`)

| Test | Result |
|------|--------|
| Page loads, 3 tabs (Teams/Groups, Users, Invitations) | ✅ |
| Teams KPIs (Total: 0, Active: 0, Members: 0) | ✅ |
| "Create Team" button | ✅ Present |
| Users tab: 2 users | ✅ Field Worker (field@mail.com, employee) + Demo Admin (demo@harmoniq.safety, company admin) |
| "Add User" button | ✅ Present |
| Invitations tab | ✅ Accessible |

---

## Section 9 — Settings (`/nexus/dashboard/settings`)

| Test | Result |
|------|--------|
| **8 tabs** (General, Branding, Modules & Sidebar, Field App, Access Control, Notifications, Security, Billing) | ✅ All accessible |
| General: Company name, URL slug | ✅ "Nexus Manufacturing", slug "nexus" (disabled) |
| General: "AppDisplayName" field label | ❌ **Untranslated i18n key** (should be "Display Name" or similar) |
| General: "AppDisplayNameHint" helper text | ❌ **Untranslated i18n key** |
| General: Country & Regulations (7 countries) | ✅ US/UK/NL/SE/DE/FR/ES with regulation frameworks |
| General: Localization (language, currency, date format, timezone, measurement) | ✅ All dropdowns present with options |
| Field App: Home Screen toggles (Tip, News, Anonymous Reporting, Camera Only) | ✅ All toggle switches present |
| Field App: Quick Actions (6 active + 2 optional) | ✅ Reorderable grid |
| Field App: Live Preview | ✅ Shows mobile preview |
| Access Control: RBAC matrix | ✅ 7 sections (Incidents 9 perms, Checklists 4, RA 3, Reports 4, Users 7, Work Orders 4, Corrective Actions 3) |
| Access Control: "Edit permissions" button | ✅ Present |
| "Save changes" global button | ✅ Present |

---

## Section 10 — Sidebar Navigation

| Test | Result |
|------|--------|
| **Operations** group: Dashboard, Incidents, Safety Tasks, Template Library, Permits to Work | ✅ All links work |
| **Reporting** group: Analytics, Documents | ✅ |
| **Management** group: Training & Competency, Environment, Compliance | ✅ |
| **Admin** group: Asset Management, Locations, Users & Teams, Settings | ✅ |
| User info footer (DA, Demo Admin, Admin) | ✅ |
| Light/Dark mode toggle | ✅ |
| Sign out button | ✅ |
| Collapse sidebar button | ✅ |

---

## Section 11 — Permits to Work (`/nexus/dashboard/permits`)

| Test | Result |
|------|--------|
| Page loads with "Create Permit" button | ✅ |
| KPIs (Active Permits, Pending Approval) | ✅ |
| Tabs (Permits created, Active Permits, All Permits) | ✅ |
| Table + filters | ✅ "No permits found" empty state |

---

## Section 12 — Asset Management (`/nexus/dashboard/assets`)

| Test | Result |
|------|--------|
| 5 tabs (Assets, Work Orders, Parts, Corrective Actions, Alerts) | ✅ |
| Sub-filters (Active 1, Maintenance 0, Retired 0) | ✅ |
| Import/Export buttons | ✅ |
| 1 asset listed (Forklift) | ✅ |

---

## Section 13 — Locations (`/nexus/dashboard/locations`)

| Test | Result |
|------|--------|
| Tree view with hierarchy | ✅ Campus D, Campus B (expandable) |
| Map view toggle | ✅ Button present |
| "Add Campus" / "Add Building" buttons | ✅ |
| Detail panel | ✅ "Select a location" placeholder |

---

## Sections 14-21 — Mobile Field App (375×812, `/nexus/app`)

### Section 14 — Home Screen

| Test | Result |
|------|--------|
| Login at 375px → auto-routes to `/nexus/app` | ✅ |
| "Choose app" radio (Admin/Field Worker) | ❌ **Missing on mobile** — mobile login omits the app selector radio group |
| Greeting, stats (Safe Days, Pending, This Week) | ✅ |
| Tip of the Day | ✅ Shows daily safety tip |
| Quick actions (Report incident, My Tasks, Risk assessment, Browse assets) | ✅ 4 shown |
| Quick actions count | ⚠️ Only 4 quick actions visible (dashboard "Start Checklist" equivalent not available) |
| Field Focus: Urgent/Upcoming/Good to Know tabs | ✅ Tabs filter incidents |
| Featured news: "Staus Updates" | ❌ **Typo** — should be "Status Updates" |
| "Head injruy" in incident list | ❌ **Typo** — should be "Head injury" |
| Bottom nav: Home, Safety, Assets, News, Profile | ✅ All 5 tabs render, route correctly |
| Notification badge (38) | ✅ Shown on bell icon |

### Section 15 — Mobile Safety Tabs

| Test | Result |
|------|--------|
| 4 tabs: Incidents, Checklists, Risk Assess., Procedures | ✅ |
| Incidents tab: list + "Report an Incident" CTA | ✅ |
| Checklists: Assigned/Available/History sub-tabs | ✅ |
| Checklists Assigned: "All checklists completed. Great work!" | ✅ |
| Checklists Available: "No checklist templates available" | ⚠️ No templates pushed to field app yet |
| Risk Assess.: "No assessments assigned to you" | ✅ Empty state |
| Procedures: "No procedures assigned to you" | ✅ Empty state |

### Section 16 — Mobile Report Incident (7-step wizard)

| Test | Result |
|------|--------|
| Step 1: Type (8 options + anonymous) | ✅ |
| Step 2: Severity (4 levels with descriptions) | ✅ |
| Step 3: Title (5 char min validation) | ✅ |
| Step 4: Description (10 char min) + Active hazard + Lost time toggles | ✅ |
| Step 5: Location (Select/GPS/Manual) | ✅ + "Skip optional steps" button |
| Step 6: Date/Time (pre-populated) | ✅ |
| Step 7: Photos (Take/Gallery, max 4, 10MB) | ✅ |
| "Report anonymously" option | ✅ Present on step 1 |
| Progress bar | ✅ Updates per step |
| Back button | ✅ Works on each step |
| "Buildin C" in location dropdown | ❌ **Typo** (same as desktop) |

### Section 17 — Mobile Assets

| Test | Result |
|------|--------|
| Tabs: Assets, Rounds, Work Orders (1) | ✅ |
| Search + QR scan | ✅ |
| 1 asset: Forklift AST-242109 at "Buildin C" | ✅ but **typo in location** |
| Status/category filters | ✅ |
| Floating "Scan asset QR code" button | ✅ |

### Section 18 — Mobile News & Updates

| Test | Result |
|------|--------|
| 4 tabs: News, Events, Documents, Training | ✅ |
| 1 article: "Staus Updates" | ❌ **Typo** |

### Section 19 — Mobile Profile

| Test | Result |
|------|--------|
| Avatar, name, role | ✅ DA, Demo Admin, company_admin |
| Contact info (email, phone, location, department) | ✅ |
| Settings: Notifications, Appearance (theme toggle), Language, Privacy & Security | ✅ |
| About: Terms & Conditions, Privacy Policy | ✅ |
| Sign Out button | ✅ |
| Version: v1.0.0 | ✅ |

### Section 20 — Mobile Notifications

| Test | Result |
|------|--------|
| Notifications page loads | ✅ |
| "Mark all read" button | ✅ |
| "All" / "Unread (38)" filter tabs | ✅ |

---

## Sections 22-24 — Cross-Cutting

### Section 22 — PDF Export

| Test | Result |
|------|--------|
| Export PDF button on incident detail | ✅ Present |
| Export PDF button on Analytics | ✅ Present |
| CSP blocks yoga-layout WASM | ⚠️ Console warning: `data:` URI blocked by Content-Security-Policy for WASM (PDF may still render with fallback) |

### Section 23 — Data Persistence

| Test | Result |
|------|--------|
| New incident created on dashboard visible in list | ✅ KPI count incremented, found in table |
| Procedure completion persists across page navigations | ✅ 4/4 steps, status "completed" |
| Checklist submissions appear in history | ✅ 2 records in table |

### Section 24 — Localization / i18n

| Test | Result |
|------|--------|
| 6 languages available in Settings | ✅ EN, NL, SV, DE, FR, ES |
| Untranslated keys on `/risk-assessments/new` | ❌ "StartNew", "SelectType", "BasedOnRegulations" |
| Untranslated keys in Settings General tab | ❌ "AppDisplayName", "AppDisplayNameHint" |

---

## Bug Summary (Priority Order)

### ❌ Critical / Blocking

1. **"New Incident" button generates 134 console errors** — Clicking button on `/nexus/dashboard/incidents` fails to open modal; direct URL `/incidents/new` works as workaround
2. **Risk Assessment status never transitions to "completed"** — All 8 submitted RAs stuck at "in progress"; Completed KPI always shows 0
3. **"Start Assessment" modal shows "No active templates"** — Despite having RA templates in the library

### ❌ i18n / Untranslated Keys

4. `"StartNew"`, `"SelectType"`, `"BasedOnRegulations"` on `/risk-assessments/new`
5. `"AppDisplayName"`, `"AppDisplayNameHint"` on Settings General tab

### ❌ Typos

6. **"Staus Updates"** → "Status Updates" (home screen + news page)
7. **"Head injruy"** → "Head injury" (field app incident list)
8. **"Buildin C"** → "Building C" (location dropdown on Analytics, Assets, and mobile)

### ⚠️ Warnings / Minor

9. **TRIR displays "1050" / LTIFR "2500"** on main dashboard — likely raw integer, missing decimal formatting (should be "10.50" / "25.00")
10. **Analytics ⓘ tooltips** — Button activates on click but no popover content appears in DOM
11. **Dashboard KPIs have no ⓘ tooltips** (only Analytics page has them)
12. **CSP blocks yoga-layout WASM** via `data:` URI — PDF generation may be impacted
13. **Mobile login omits "Choose app" radio group** — Field worker login only available from desktop login form
14. **Mobile field app shows only 4 quick actions** — "Checklists" and "Request Fix" not in mobile quick action grid (only Report incident, My Tasks, Risk assessment, Browse assets)

### 📝 Observations

- **89 checklist templates + 69 RA templates** across 12 industry categories — comprehensive library
- **7-step mobile incident wizard** with anonymous reporting is well-designed
- **4-step procedure completion flow** works end-to-end flawlessly
- **8 settings tabs** (General, Branding, Modules & Sidebar, Field App, Access Control, Notifications, Security, Billing) — extensive admin configuration
- **RBAC matrix** covers 7 sections with granular permissions across 5 roles
- All sidebar navigation links route correctly (16 pages tested)
- Bottom nav on mobile (5 tabs) all work
- Notifications: 38 unread with mark-all-read functionality
- Profile page has theme toggle, language selector, privacy settings
