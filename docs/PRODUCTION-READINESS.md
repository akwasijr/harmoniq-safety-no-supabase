# Harmoniq Safety — Production Readiness Report

**Date:** 2026-02-14  
**Current state:** Feature-complete demo deployed on Vercel  
**Target:** Production-ready SaaS for paying customers  

---

## Executive Summary

The app has 64 pages (28 mobile + 36 dashboard), working auth, invitation system, inspection rounds, asset management, analytics, and i18n in 3 languages. The core UX flows work. However, **data does not persist** (the #1 blocker) and several security, reliability, and operational gaps remain.

### Production Readiness Score: ~60%

| Category | Status | Score |
|----------|--------|-------|
| Features | ✅ Feature-complete for MVP | 90% |
| Auth & login | ✅ Working with fallbacks | 80% |
| Security | 🟡 Critical fixes done, medium gaps remain | 65% |
| Data persistence | 🔴 Mock data only — nothing persists | 20% |
| Testing | 🔴 Zero tests | 0% |
| Monitoring | 🔴 No error tracking or APM | 10% |
| i18n | 🟡 ~80% covered, some hardcoded strings | 75% |
| SEO & marketing | 🟡 Sitemap exists, no robots.txt | 60% |
| DevOps | 🟡 Vercel deployed, no staging env | 50% |

---

## 🔴 Blockers (Must fix before production)

### 1. Data Persistence — Supabase Tables
**Status:** BLOCKER  
**Effort:** 1–2 days  

All 18 entity stores read/write to Supabase when configured, but the tables don't exist yet. Without them, all data resets on page reload.

**Tables needed (derived from store keys):**

| Supabase Table | Store Key | Type |
|----------------|-----------|------|
| `companies` | harmoniq_companies | Company |
| `users` | harmoniq_users | User |
| `teams` | harmoniq_teams | Team |
| `locations` | harmoniq_locations | Location |
| `assets` | harmoniq_assets | Asset |
| `incidents` | harmoniq_incidents | Incident |
| `tickets` | harmoniq_tickets | Ticket |
| `content` | harmoniq_content | Content |
| `checklist_templates` | harmoniq_checklist_templates | ChecklistTemplate |
| `checklist_submissions` | harmoniq_checklist_submissions | ChecklistSubmission |
| `asset_inspections` | harmoniq_asset_inspections | AssetInspection |
| `risk_evaluations` | harmoniq_risk_evaluations | RiskEvaluation |
| `corrective_actions` | harmoniq_corrective_actions | CorrectiveAction |
| `work_orders` | harmoniq_work_orders | WorkOrder |
| `meter_readings` | harmoniq_meter_readings | MeterReading |
| `parts` | harmoniq_parts | Part |
| `inspection_routes` | harmoniq_inspection_routes | InspectionRoute |
| `inspection_rounds` | harmoniq_inspection_rounds | InspectionRound |
| `invitations` | — | Already exists |

**Action:** Generate SQL migration from TypeScript types → create tables in Supabase → add RLS policies.

### 2. Row Level Security (RLS)
**Status:** BLOCKER  
**Effort:** 1 day  

No RLS policies exist. Without them:
- Any authenticated user can read/modify any company's data
- No tenant isolation between companies

**Policies needed:**
- All tables: `company_id = auth.jwt()->>'company_id'`
- Users table: can read own profile, admins can read company users
- Platform tables: super_admin only

### 3. Zero Test Coverage
**Status:** BLOCKER for quality  
**Effort:** 2–3 days minimum  

No unit tests, integration tests, or E2E tests exist. At minimum need:
- Auth flow tests (login, session restore, role routing)
- API endpoint tests (invitations, analytics, contact)
- Critical UI flow tests (incident report, asset creation, inspection round)

---

## 🟡 Important (Fix before or shortly after launch)

### 4. Remaining Security Gaps
| ID | Finding | Effort |
|----|---------|--------|
| S04 | Rate limit invite token validation | 30 min |
| S08 | Verify HttpOnly on Supabase cookies | 1 hour |
| S15 | Server-side role check for platform routes | 2 hours |
| S16 | CSRF protection (Origin header check) | 1 hour |
| S19 | Remove localStorage session (rely on cookies) | 1 hour |

### 5. i18n Completion
| ID | Finding | Effort |
|----|---------|--------|
| F09 | Inspection round hardcoded strings | 1 hour |
| D07 | Inspection routes page hardcoded | 1 hour |
| D08 | Observability page hardcoded | 1 hour |
| F10/F11 | Incidents list/detail low coverage | 2 hours |
| D09/D10 | Content/checklists low coverage | 1 hour |

### 6. Settings Persistence
| ID | Finding | Effort |
|----|---------|--------|
| D11 | Platform settings not persisted | 2 hours |
| D12 | GDPR toggles not persisted | 1 hour |
| D13 | Company settings may not persist | 1 hour |

### 7. Email Infrastructure
- Invitation emails require `SUPABASE_SERVICE_ROLE_KEY` in Vercel
- SMTP needs configuration in Supabase Auth settings
- Email templates not customized (using Supabase defaults)
- Password reset flow works but email delivery unverified

### 8. Error Monitoring
- No Sentry, Datadog, or LogRocket integration
- Errors only visible in Vercel function logs
- No alerting on error spikes
- **Recommendation:** Add Sentry (free tier) with ~30 min setup

---

## 🟢 Nice to Have (Post-launch improvements)

### 9. UX Polish
| ID | Finding |
|----|---------|
| F16 | Allow partial inspection round submission |
| F20 | Pull-to-refresh on mobile lists |
| F21 | Skeleton loading states instead of spinners |
| D15 | Empty state illustrations |
| D16 | Breadcrumb navigation on detail pages |

### 10. Performance
- No image optimization beyond Next.js defaults
- All 18 stores load lazily (good) but no data caching between sessions
- Analytics API is in-memory only — loses data on cold start
- Consider Redis/Upstash for analytics persistence and rate limiting

### 11. DevOps & CI/CD
- No staging environment (only production on Vercel)
- No GitHub Actions CI pipeline (lint, type-check, test)
- No database migrations tooling
- No backup strategy for Supabase data

### 12. Missing Features for Production SaaS
| Feature | Status | Priority |
|---------|--------|----------|
| Billing/subscriptions | Not implemented | High for paid plans |
| Email notifications | Partial (invitation only) | High |
| Audit log UI | Backend exists, no dashboard view | Medium |
| Data export (GDPR) | Toggle exists, no actual export | Medium |
| Multi-tenant data isolation | Needs RLS | High |
| File/image storage | Base64 in localStorage | Medium — use Supabase Storage |
| Push notifications | Not implemented | Low |
| Search (full-text) | Client-side filter only | Low |
| PDF report generation | react-pdf installed but limited use | Low |

### 13. SEO & Legal
- ✅ Sitemap exists (`src/app/sitemap.ts`)
- ❌ No `robots.txt` in public/
- ✅ Privacy policy page exists
- ✅ Cookie policy page exists
- ✅ Terms of service page exists
- ❌ Cookie consent banner shows but consent doesn't gate analytics anymore
- ❌ No GDPR data processing agreement template

---

## Recommended Launch Plan

### Phase 1: Data Layer (Week 1)
1. Create all 18 Supabase tables from TypeScript types
2. Add RLS policies for tenant isolation
3. Set `SUPABASE_SERVICE_ROLE_KEY` in Vercel
4. Configure SMTP in Supabase for invitation emails
5. Test end-to-end: create company → invite user → user accepts → login → create incident

### Phase 2: Security Hardening (Week 1)
6. Rate limit invite token validation (S04)
7. Server-side role check for platform routes (S15)
8. Add Origin header CSRF check (S16)
9. Remove localStorage session cache (S19)
10. Add Sentry error monitoring

### Phase 3: Quality (Week 2)
11. Add E2E tests for critical flows (auth, incident, inspection)
12. Complete i18n for all remaining pages
13. Persist platform/company settings
14. Add robots.txt
15. Set up staging environment on Vercel

### Phase 4: Launch (Week 2–3)
16. Manual QA pass on all 64 pages
17. Performance audit (Lighthouse)
18. Security penetration test (basic)
19. Launch to beta users

---

## What's Already Working Well

- ✅ 64 pages built and functional
- ✅ Auth with Supabase (password, magic link, OAuth ready)
- ✅ Pre-login app choice (Dashboard vs Mobile)
- ✅ Role-based access (employee, manager, admin, super admin)
- ✅ Invitation flow with email + manual link fallback
- ✅ 3-language i18n (EN/NL/SV) ~80% complete
- ✅ Mobile incident reporting with GPS/photos
- ✅ Asset management with type/department/warranty
- ✅ Inspection rounds with guided checkpoints
- ✅ Offline sync infrastructure (queue + indicator)
- ✅ Analytics tracking with Leaflet map
- ✅ GDPR controls UI
- ✅ Security headers (X-Frame, CSP, Referrer-Policy)
- ✅ Rate limiting on analytics + contact APIs
- ✅ DOMPurify XSS sanitization
- ✅ Lazy-loading stores for performance
- ✅ Error boundaries and 404 pages
