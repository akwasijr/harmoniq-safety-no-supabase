# Cross-Platform Sync Test Report

**Date:** April 14, 2026  
**Branch:** `subtitle-feature-fixes`  
**Viewport:** Desktop 1280×900 / Mobile 375×812  
**Auth:** `demo@harmoniq.safety` / Admin role  

---

## Summary

| # | Test | Result | Notes |
|---|------|--------|-------|
| 1 | Mobile Checklist → Desktop | ⚠️ BLOCKED | No templates in mobile Available tab |
| 2 | Desktop Checklist → Mobile | ✅ PASS | Full sync verified |
| 3 | Desktop RA → Mobile | ❌ FAIL | RA shows in Checklists tab, not RA tab |
| 4 | Mobile RA → Desktop | ⚠️ BLOCKED | No templates in mobile Available tab |
| 5 | Desktop Procedure → Mobile | ✅ PASS | 4/4 steps completed, synced |
| 6 | Template Library → Field App | ❌ FAIL | Active templates not visible on mobile |
| 7 | Incident cross-platform | ✅ PASS | Mobile→Desktop sync verified |

**Pass: 3 | Fail: 2 | Blocked: 2**

---

## Bugs Found (Actionable, with Root Causes)

### BUG 1 — CRITICAL: Mobile field app shows no available templates despite templates being "Active for Field App"

**Where:** Mobile → Safety → Checklists → Available tab  
**Expected:** 5 checklist templates should appear (Preventive Maintenance, Corrective Maintenance, Emergency Response, General Inspection, Service Task)  
**Actual:** "No checklist templates available."  
**Same issue on:** Risk Assessment Available ("No risk assessment templates activated"), Procedures Available ("No active procedures")

**Root Cause Found:**  
File: `src/app/(app)/[company]/app/checklists/page.tsx` (line ~196)

```typescript
const templates = checklistTemplates.filter(
  (template) =>
    template.company_id === user?.company_id &&
    isVisibleToFieldApp(template),
);
```

The filter requires `template.company_id === user?.company_id`, but the 5 built-in templates have `company_id: "__built_in__"` while the user has `company_id: "comp_1"`. So `"__built_in__" === "comp_1"` is always `false`.

The desktop Template Library uses `itemsForCompany()` which explicitly includes `__built_in__` templates:
```typescript
(item as CompanyEntity).company_id === companyId ||
(item as CompanyEntity).company_id === "__built_in__"
```

**Fix:** In the mobile field app template filter, either:
- Use `itemsForCompany()` instead of raw `.items` + manual filtering, **OR**
- Add `|| template.company_id === "__built_in__"` to the company_id check

**Impact:** Blocks users from starting ANY checklist, RA, or procedure from the mobile field app (Tests 1, 4, 6 all blocked by this).

---

### BUG 2 — HIGH: Risk Assessment submissions appear in Checklists tab instead of RA tab

**Where:** Desktop → Safety Tasks → Risk Assessment tab → Start Assessment → Submit  
**Expected:** Submitted RA shows in the Risk Assessment tab table  
**Actual:** Submitted "5-Step Risk Assessment (HSE Method)" appears in the **Checklists tab** (13 records) but NOT in the **Risk Assessment tab** (still 8 records, all pre-existing)

**Reproduction:**
1. Desktop → Safety Tasks → Risk Assess. tab (8 records)
2. Click "Start Assessment" → Select "5-Step Risk Assessment (HSE Method)" → Fill 5 items → Submit
3. Navigate back to Risk Assess. tab → Still 8 records, no Apr 14 entry
4. Click Checklists tab → 13 records now, includes "5-Step Risk Assessment (HSE Method) Apr 14, 2026 100% completed"

**Same observed on mobile:** Mobile Checklists → History shows the RA submission, but Mobile Risk Assess. → History does not.

**Likely Root Cause:** The submission save logic doesn't correctly set the category/type field to route the submission to the RA tab filter. The RA submission is being stored as a regular checklist submission.

---

## Tests Detailed Results

### Test 1: Mobile Checklist → Desktop
⚠️ BLOCKED by BUG 1

| Step | Action | Result |
|------|--------|--------|
| 1.1 | Mobile → Safety → Checklists → Available | ❌ "No checklist templates available" |
| 1.2 | Check History tab | ✅ 11 previous submissions visible |
| 1.3-1.6 | Fill and submit, verify on desktop | ⬜ Blocked — no template to fill |

---

### Test 2: Desktop Checklist → Mobile
✅ PASS

| Step | Action | Result |
|------|--------|--------|
| 2.1 | Desktop → Safety Tasks → Start Checklist | ✅ Modal shows 5 templates |
| 2.2 | Select "Preventive Maintenance", fill 9 items, submit | ✅ All fields filled, submitted |
| 2.3 | Verify in desktop table | ✅ Row appears: "Preventive Maintenance Unassigned Demo Admin Apr 14, 2026 100% completed" |
| 2.4 | Desktop detail page loads | ✅ All 8 responses, 100% score, 5 Passed, 0 Failed |
| 2.5 | Switch to mobile → Checklists → History | ✅ "Preventive Maintenance Apr 14, 2026 Submitted" at top |
| 2.6 | Tap mobile detail | ✅ All 8 responses visible, 100% score |

---

### Test 3: Desktop RA → Mobile
❌ FAIL (BUG 2)

| Step | Action | Result |
|------|--------|--------|
| 3.1 | Desktop → Risk Assess. → Start Assessment | ✅ Modal shows 5 RA templates |
| 3.2 | Select "5-Step Risk Assessment (HSE Method)", fill 5 items, submit | ✅ Submitted successfully |
| 3.3 | Check Risk Assess. tab on desktop | ❌ Still 8 records, no Apr 14 entry |
| 3.4 | Check Checklists tab on desktop | ⚠️ Found there instead — "5-Step Risk Assessment (HSE Method) Apr 14, 2026 100% completed" |
| 3.5 | Switch to mobile → Risk Assess. → History | ❌ Not found (8 old entries) |
| 3.6 | Check mobile Checklists → History | ⚠️ Found there instead — wrong tab |

---

### Test 4: Mobile RA → Desktop
⚠️ BLOCKED by BUG 1

| Step | Action | Result |
|------|--------|--------|
| 4.1 | Mobile → Risk Assess. → Available | ❌ "No risk assessment templates activated" |
| 4.2-4.6 | Fill and submit, verify on desktop | ⬜ Blocked |

---

### Test 5: Desktop Procedure → Mobile
✅ PASS

| Step | Action | Result |
|------|--------|--------|
| 5.1 | Desktop → Procedures → Start Procedure | ✅ Modal shows 6 templates |
| 5.2 | Select "Machine Changeover (LOTO)" — 4 steps | ✅ Procedure overview loads |
| 5.3 | Step 1: LOTO Risk Assessment (8 items) | ✅ All filled, submitted |
| 5.4 | Step 2: LOTO Verification (8 items) | ✅ All filled, submitted |
| 5.5 | Step 3: LOTO Verification (8 items) | ✅ All filled, submitted |
| 5.6 | Step 4: Machine Guarding Inspection (7 items) | ✅ All filled, submitted |
| 5.7 | Procedure status: 4/4 steps, "completed" | ✅ Confirmed |
| 5.8 | Desktop table: 3 records, Machine Changeover shown | ✅ "Step 4 of 4 Demo Admin 4/14/2026 completed" |
| 5.9 | Mobile → Procedures → History | ✅ "Machine Changeover (LOTO) Apr 14, 2026 completed" at top |

---

### Test 6: Template Library → Field App
❌ FAIL (BUG 1)

| Step | Action | Result |
|------|--------|--------|
| 6.1 | Desktop → Template Library → "Active for Field App" filter | ✅ Shows 5 active templates (Preventive Maintenance, Corrective Maintenance, Emergency Response, General Inspection, Service Task) |
| 6.2 | Switch to mobile → Checklists → Available | ❌ "No checklist templates available" |
| 6.3 | Mobile → Risk Assess. → Available | ❌ "No risk assessment templates activated" |
| 6.4 | Mobile → Procedures → Available | ❌ "No active procedures" |

---

### Test 7: Incident Mobile → Desktop
✅ PASS

| Step | Action | Result |
|------|--------|--------|
| 7.1 | Mobile → Report Incident → Step 1: Near miss | ✅ |
| 7.2 | Step 2: Severity = High | ✅ |
| 7.3 | Step 3: Title = "Compressed air line burst near maintenance bay" | ✅ |
| 7.4 | Step 4: Description filled, active hazard/lost time toggles available | ✅ |
| 7.5 | Step 5: Location = Campus B | ✅ |
| 7.6 | Step 6: Date/Time pre-filled (2026-04-14) | ✅ |
| 7.7 | Step 7: Photos (skipped) → Submit | ✅ Success page: INC-2026-0032 |
| 7.8 | Desktop → Incidents → Search "Compressed air" | ✅ Found: INC-2026-0032, Near Miss, high, Campus B, Apr 14 |
| 7.9 | Desktop detail page | ✅ Full incident detail with follow-up ticket auto-created |

---

## What Works Well
- Desktop → Mobile checklist sync (history, detail pages)
- Desktop → Mobile procedure sync (multi-step, all 4 steps)
- Mobile → Desktop incident reporting (7-step flow, detail page, auto-ticket)
- Template Library "Active for Field App" filter correctly identifies activated templates
- Mobile History tabs for all categories show correct past submissions
- Procedure multi-step workflow (sequential step unlock, progress tracking)
- Incident submission flow (7 clean steps, validation, success with reference)

## What Needs Fixing (Priority Order)

1. **CRITICAL — BUG 1:** Mobile `company_id` filter excludes `__built_in__` templates  
   File: `src/app/(app)/[company]/app/checklists/page.tsx` ~line 196  
   Fix: Add `|| template.company_id === "__built_in__"` to the filter  
   Impact: Unlocks mobile Available tabs for checklists, RAs, and procedures

2. **HIGH — BUG 2:** RA submissions routed to Checklists tab instead of Risk Assessment tab  
   Investigate: The submission save logic and/or the tab filter query for what makes a submission show under "Risk Assessment" vs "Checklists"  
   Impact: RA submissions invisible in their expected location on both desktop and mobile
