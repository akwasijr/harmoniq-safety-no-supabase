# Harmoniq Safety — Detailed Production Launch Plan

**Date:** 2026-02-14  
**Goal:** Take the app from demo (60% ready) to production-ready SaaS  
**Estimated effort:** 3–4 weeks  

---

## Phase 1: Data Layer (Days 1–3)

The #1 blocker. Nothing persists without this.

### Task 1.1: Create Supabase Tables

Run these SQL migrations in Supabase SQL Editor. Tables derived from TypeScript types in `src/types/index.ts`.

#### Core tables (Day 1)

```sql
-- 1. Companies
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  app_name TEXT,
  country TEXT NOT NULL DEFAULT 'US',
  language TEXT NOT NULL DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'active',
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#2563eb',
  secondary_color TEXT NOT NULL DEFAULT '#525252',
  font_family TEXT NOT NULL DEFAULT 'Inter',
  ui_style TEXT NOT NULL DEFAULT 'rounded',
  tier TEXT NOT NULL DEFAULT 'starter',
  seat_limit INT NOT NULL DEFAULT 10,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  trial_ends_at TIMESTAMPTZ
);

-- 2. Users
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee',
  user_type TEXT NOT NULL DEFAULT 'internal',
  account_type TEXT NOT NULL DEFAULT 'standard',
  gender TEXT,
  department TEXT,
  job_title TEXT,
  employee_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  location_id UUID,
  language TEXT NOT NULL DEFAULT 'en',
  theme TEXT NOT NULL DEFAULT 'system',
  two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  last_login_at TIMESTAMPTZ,
  avatar_url TEXT,
  notification_prefs JSONB DEFAULT '{"push":true,"email":true,"incidents":true,"tasks":true,"news":true}',
  team_ids TEXT[] DEFAULT '{}',
  custom_permissions TEXT[] DEFAULT '{}',
  asset_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Teams
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#2563eb',
  leader_id UUID,
  member_ids TEXT[] DEFAULT '{}',
  member_count INT NOT NULL DEFAULT 0,
  permissions TEXT[] DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Locations
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES locations(id),
  type TEXT NOT NULL DEFAULT 'site',
  name TEXT NOT NULL,
  address TEXT,
  gps_lat DOUBLE PRECISION,
  gps_lng DOUBLE PRECISION,
  qr_code TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  employee_count INT NOT NULL DEFAULT 0,
  asset_count INT NOT NULL DEFAULT 0
);

-- 5. Invitations (may already exist)
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee',
  invited_by UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### Asset & safety tables (Day 2)

```sql
-- 6. Assets
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id),
  parent_asset_id UUID REFERENCES assets(id),
  is_system BOOLEAN NOT NULL DEFAULT false,
  name TEXT NOT NULL,
  asset_tag TEXT NOT NULL,
  serial_number TEXT,
  barcode TEXT,
  qr_code TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  sub_category TEXT,
  asset_type TEXT NOT NULL DEFAULT 'static',
  criticality TEXT NOT NULL DEFAULT 'medium',
  department TEXT,
  manufacturer TEXT,
  model TEXT,
  model_number TEXT,
  specifications TEXT,
  manufactured_date DATE,
  purchase_date DATE,
  installation_date DATE,
  warranty_expiry DATE,
  expected_life_years INT,
  condition TEXT NOT NULL DEFAULT 'good',
  condition_notes TEXT,
  last_condition_assessment DATE,
  purchase_cost DECIMAL,
  current_value DECIMAL,
  depreciation_rate DECIMAL,
  currency TEXT NOT NULL DEFAULT 'USD',
  maintenance_frequency_days INT,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  maintenance_notes TEXT,
  requires_certification BOOLEAN NOT NULL DEFAULT false,
  requires_calibration BOOLEAN NOT NULL DEFAULT false,
  calibration_frequency_days INT,
  last_calibration_date DATE,
  next_calibration_date DATE,
  safety_instructions TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  decommission_date DATE,
  disposal_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Incidents
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  reference_number TEXT NOT NULL,
  reporter_id UUID NOT NULL,
  type TEXT NOT NULL,
  type_other TEXT,
  severity TEXT NOT NULL,
  priority TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  incident_date DATE NOT NULL,
  incident_time TEXT,
  lost_time BOOLEAN NOT NULL DEFAULT false,
  lost_time_amount INT,
  active_hazard BOOLEAN NOT NULL DEFAULT false,
  location_id UUID,
  building TEXT,
  floor TEXT,
  zone TEXT,
  room TEXT,
  gps_lat DOUBLE PRECISION,
  gps_lng DOUBLE PRECISION,
  location_description TEXT,
  asset_id UUID,
  media_urls TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'new',
  flagged BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Asset Inspections
CREATE TABLE asset_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  inspector_id UUID NOT NULL,
  checklist_id UUID,
  result TEXT NOT NULL DEFAULT 'pass',
  notes TEXT,
  media_urls TEXT[] DEFAULT '{}',
  incident_id UUID,
  inspected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Tickets
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'new',
  due_date DATE,
  assigned_to UUID,
  assigned_groups TEXT[] DEFAULT '{}',
  incident_ids TEXT[] DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Content
CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'news',
  title TEXT NOT NULL,
  content TEXT,
  file_url TEXT,
  video_url TEXT,
  question TEXT,
  answer TEXT,
  event_date DATE,
  event_time TEXT,
  event_location TEXT,
  category TEXT,
  featured_image TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### Extended tables (Day 3)

```sql
-- 11. Checklist Templates
CREATE TABLE checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  assignment TEXT DEFAULT 'all',
  recurrence TEXT DEFAULT 'once',
  items JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Checklist Submissions
CREATE TABLE checklist_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES checklist_templates(id),
  submitter_id UUID NOT NULL,
  location_id UUID,
  responses JSONB NOT NULL DEFAULT '[]',
  general_comments TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. Risk Evaluations
CREATE TABLE risk_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  submitter_id UUID NOT NULL,
  country TEXT NOT NULL,
  form_type TEXT NOT NULL,
  location_id UUID,
  responses JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. Corrective Actions
CREATE TABLE corrective_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL,
  inspection_id UUID,
  description TEXT NOT NULL,
  severity TEXT NOT NULL,
  assigned_to UUID,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  resolution_notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. Work Orders
CREATE TABLE work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  asset_id UUID,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'requested',
  requested_by UUID NOT NULL,
  assigned_to UUID,
  due_date DATE,
  estimated_hours DECIMAL,
  actual_hours DECIMAL,
  parts_cost DECIMAL,
  labor_cost DECIMAL,
  corrective_action_id UUID,
  parts_used JSONB DEFAULT '[]',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. Meter Readings
CREATE TABLE meter_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  meter_type TEXT NOT NULL,
  unit TEXT NOT NULL,
  value DECIMAL NOT NULL,
  recorded_by UUID NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 17. Parts
CREATE TABLE parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  part_number TEXT NOT NULL,
  unit_cost DECIMAL NOT NULL DEFAULT 0,
  quantity_in_stock INT NOT NULL DEFAULT 0,
  minimum_stock INT NOT NULL DEFAULT 0,
  supplier TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 18. Inspection Routes
CREATE TABLE inspection_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  recurrence TEXT NOT NULL DEFAULT 'daily',
  assigned_to_user_id UUID,
  assigned_to_team_id UUID,
  checkpoints JSONB NOT NULL DEFAULT '[]',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 19. Inspection Rounds
CREATE TABLE inspection_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES inspection_routes(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  inspector_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  checkpoint_results JSONB NOT NULL DEFAULT '[]',
  alerts_created TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 20. Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  resource TEXT,
  entity_type TEXT,
  entity_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_incidents_company ON incidents(company_id);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_assets_company ON assets(company_id);
CREATE INDEX idx_assets_location ON assets(location_id);
CREATE INDEX idx_tickets_company ON tickets(company_id);
CREATE INDEX idx_locations_company ON locations(company_id);
CREATE INDEX idx_locations_parent ON locations(parent_id);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_work_orders_asset ON work_orders(asset_id);
CREATE INDEX idx_inspection_rounds_route ON inspection_rounds(route_id);
```

### Task 1.2: Row Level Security (RLS)

Enable RLS on every table and add policies:

```sql
-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE corrective_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE meter_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's company_id
CREATE OR REPLACE FUNCTION auth.company_id()
RETURNS UUID AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function: check if user is super_admin
CREATE OR REPLACE FUNCTION auth.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT role = 'super_admin' FROM public.users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function: check if user is admin (company_admin or super_admin)
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
  SELECT role IN ('super_admin', 'company_admin') FROM public.users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- COMPANIES: super_admin sees all, others see own company only
CREATE POLICY companies_select ON companies FOR SELECT USING (
  auth.is_super_admin() OR id = auth.company_id()
);
CREATE POLICY companies_modify ON companies FOR ALL USING (
  auth.is_super_admin() OR (auth.is_admin() AND id = auth.company_id())
);

-- USERS: see own company, super_admin sees all
CREATE POLICY users_select ON users FOR SELECT USING (
  auth.is_super_admin() OR company_id = auth.company_id()
);
CREATE POLICY users_insert ON users FOR INSERT WITH CHECK (
  auth.is_super_admin() OR (auth.is_admin() AND company_id = auth.company_id())
);
CREATE POLICY users_update ON users FOR UPDATE USING (
  auth.is_super_admin() OR id = auth.uid() OR (auth.is_admin() AND company_id = auth.company_id())
);

-- GENERIC COMPANY-SCOPED TABLES: same pattern for all
-- Apply to: teams, locations, assets, incidents, tickets, content,
--           checklist_templates, checklist_submissions, risk_evaluations,
--           corrective_actions, work_orders, parts, inspection_routes, inspection_rounds

-- Template (repeat for each table):
-- CREATE POLICY {table}_select ON {table} FOR SELECT USING (
--   auth.is_super_admin() OR company_id = auth.company_id()
-- );
-- CREATE POLICY {table}_modify ON {table} FOR ALL USING (
--   auth.is_super_admin() OR company_id = auth.company_id()
-- );

-- Generate all company-scoped policies:
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'teams','locations','assets','incidents','tickets','content',
    'checklist_templates','checklist_submissions','risk_evaluations',
    'corrective_actions','work_orders','parts','inspection_routes',
    'inspection_rounds','invitations'
  ]) LOOP
    EXECUTE format('CREATE POLICY %I_select ON %I FOR SELECT USING (auth.is_super_admin() OR company_id = auth.company_id())', tbl, tbl);
    EXECUTE format('CREATE POLICY %I_modify ON %I FOR ALL USING (auth.is_super_admin() OR company_id = auth.company_id())', tbl, tbl);
  END LOOP;
END $$;

-- ASSET_INSPECTIONS: based on asset's company
CREATE POLICY inspections_select ON asset_inspections FOR SELECT USING (
  EXISTS (SELECT 1 FROM assets WHERE assets.id = asset_inspections.asset_id AND (auth.is_super_admin() OR assets.company_id = auth.company_id()))
);
CREATE POLICY inspections_modify ON asset_inspections FOR ALL USING (
  EXISTS (SELECT 1 FROM assets WHERE assets.id = asset_inspections.asset_id AND (auth.is_super_admin() OR assets.company_id = auth.company_id()))
);

-- METER_READINGS: based on asset's company
CREATE POLICY readings_select ON meter_readings FOR SELECT USING (
  EXISTS (SELECT 1 FROM assets WHERE assets.id = meter_readings.asset_id AND (auth.is_super_admin() OR assets.company_id = auth.company_id()))
);
CREATE POLICY readings_modify ON meter_readings FOR ALL USING (
  EXISTS (SELECT 1 FROM assets WHERE assets.id = meter_readings.asset_id AND (auth.is_super_admin() OR assets.company_id = auth.company_id()))
);

-- AUDIT_LOGS: read own company, super_admin reads all
CREATE POLICY audit_select ON audit_logs FOR SELECT USING (
  auth.is_super_admin() OR company_id = auth.company_id()
);
CREATE POLICY audit_insert ON audit_logs FOR INSERT WITH CHECK (true);
```

### Task 1.3: Seed Demo Data

```sql
-- Create demo company
INSERT INTO companies (id, name, slug, app_name, country, language, status, tier, seat_limit, primary_color)
VALUES (
  'demo-company-001',
  'Harmoniq Safety',
  'harmoniq',
  'Harmoniq Safety',
  'US', 'en', 'active', 'enterprise', 999,
  '#09864c'
);

-- Create demo user (must match Supabase auth user ID)
-- Run after the demo user signs up via /login
```

### Task 1.4: Vercel Environment Variables

Set in Vercel Dashboard → Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://pvcykszmsaavrnjwuqrw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>  (no trailing newline!)
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
NEXT_PUBLIC_SITE_URL=https://harmoniq-safety.vercel.app
```

---

## Phase 2: Security Hardening (Days 4–5)

### Task 2.1: Rate Limit Invite Validation
- File: `src/app/api/invitations/validate/route.ts`
- Add rate limiter: max 10 attempts per IP per minute
- Log failed validation attempts

### Task 2.2: Server-Side Role Check for Platform Routes
- File: `middleware.ts`
- For paths matching `/*/dashboard/platform/*`, verify user role is `super_admin` or `company_admin`
- Requires fetching profile from Supabase in middleware

### Task 2.3: CSRF Protection
- Add Origin/Referer header check to all state-changing API routes
- Reject requests where Origin doesn't match the app domain

### Task 2.4: Clean Up Session Storage
- Remove `harmoniq_auth_session` localStorage usage
- Rely solely on Supabase SSR HttpOnly cookies
- Keep `harmoniq_auth_profile` as a cache (non-sensitive)

### Task 2.5: Add Sentry Error Monitoring
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```
- Configure DSN in Vercel env vars
- Add to `next.config.ts`
- Wrap app with Sentry error boundary

---

## Phase 3: Email & Invitations (Days 5–6)

### Task 3.1: Configure SMTP in Supabase
- Supabase Dashboard → Auth → SMTP Settings
- Options: Resend, SendGrid, Postmark, or custom SMTP
- Test with a real email address

### Task 3.2: Customize Email Templates
- Supabase Dashboard → Auth → Email Templates
- Customize: Invitation, Confirmation, Password Reset
- Add Harmoniq branding (logo, colors)

### Task 3.3: Test Full Invitation Flow
1. Admin creates user in dashboard
2. Invitation email sent with link
3. User clicks link → `/invite?token=xxx`
4. User sets password → account created
5. User logs in → sees correct app based on role

---

## Phase 4: i18n Completion (Days 6–7)

### Task 4.1: Inspection Round Page (F09)
- File: `src/app/(app)/[company]/app/inspection-round/page.tsx`
- Translation keys already exist in `inspectionRounds.*`
- Replace ~15 hardcoded strings with `t()` calls

### Task 4.2: Inspection Routes Dashboard (D07)
- File: `src/app/(app)/[company]/dashboard/inspection-routes/page.tsx`
- Add new keys to en/nl/sv for: Create Route, Add Checkpoint, Delete, etc.

### Task 4.3: Observability Page (D08)
- File: `src/app/(app)/[company]/dashboard/platform/analytics/page.tsx`
- Add keys for tab labels, card titles, GDPR labels, compliance checklist

### Task 4.4: Remaining Low-i18n Pages
- `incidents/page.tsx` (mobile) — audit all visible strings
- `incidents/[incidentId]/page.tsx` (mobile) — add labels
- `content/page.tsx` (dashboard) — add strings
- `checklists/new/page.tsx` (dashboard) — add form labels

---

## Phase 5: Settings Persistence (Days 7–8)

### Task 5.1: Platform Settings Table
```sql
CREATE TABLE platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY platform_settings_admin ON platform_settings FOR ALL USING (auth.is_admin());
```

### Task 5.2: Wire Platform Settings Page
- Load settings from `platform_settings` on mount
- Save on change with debounce
- Keys: `gdpr_config`, `feature_flags`, `notification_config`

### Task 5.3: Wire Company Settings
- Verify `settings/page.tsx` saves to `companies` table via store
- Test: change branding → reload → verify persisted

---

## Phase 6: Testing (Days 8–12)

### Task 6.1: Set Up Testing Framework
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

### Task 6.2: Critical Path Tests
| Test | File | What to verify |
|------|------|----------------|
| Auth login | `__tests__/auth.test.ts` | Password login, session persistence, role routing |
| Invitation API | `__tests__/api/invitations.test.ts` | Create, validate, accept flow |
| Analytics API | `__tests__/api/analytics.test.ts` | Auth check, rate limiting, data collection |
| Contact API | `__tests__/api/contact.test.ts` | Validation, rate limiting |
| Incident report | `__tests__/report.test.tsx` | Step navigation, form validation, submission |
| Asset creation | `__tests__/asset.test.tsx` | Create with new fields, store update |
| Inspection round | `__tests__/inspection.test.tsx` | Checkpoint flow, out-of-range alerts |

### Task 6.3: E2E Tests (Optional but Recommended)
```bash
npm install -D playwright
npx playwright install
```
- Login → Dashboard → Create incident → Verify in list
- Login → Assets → Create asset → Verify warranty alert
- Admin → Invite user → Accept invite → Login

---

## Phase 7: DevOps & QA (Days 12–15)

### Task 7.1: Staging Environment
- Create Vercel preview branch: `staging`
- Separate Supabase project for staging
- Separate env vars

### Task 7.2: CI/CD Pipeline
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm test
```

### Task 7.3: robots.txt
Create `public/robots.txt`:
```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin
Sitemap: https://harmoniq-safety.vercel.app/sitemap.xml
```

### Task 7.4: Performance Audit
- Run Lighthouse on: landing page, login, dashboard home, mobile home
- Target scores: Performance >80, Accessibility >90, Best Practices >90
- Fix any critical findings

### Task 7.5: Manual QA Checklist
- [ ] Landing page loads on mobile and desktop
- [ ] Login with demo account → Dashboard
- [ ] Login with demo account → Mobile App
- [ ] Admin login at /admin
- [ ] Create incident (all 7 steps)
- [ ] Create asset with type/department/warranty
- [ ] Start inspection round → complete all checkpoints
- [ ] View asset detail → add maintenance schedule
- [ ] Invite user → copy link → accept
- [ ] Switch language NL/SV → verify translations
- [ ] Observability → all 5 tabs load
- [ ] Settings → branding → save → verify
- [ ] Offline indicator shows when disconnected
- [ ] Toast notifications visible and styled

---

## Phase 8: Launch (Days 15–17)

### Task 8.1: Production Checklist
- [ ] All Supabase tables created with RLS
- [ ] Service role key set in Vercel
- [ ] SMTP configured for email
- [ ] Sentry DSN configured
- [ ] robots.txt deployed
- [ ] All critical tests passing
- [ ] Manual QA checklist complete
- [ ] Staging tested by 2+ people
- [ ] Custom domain configured (if applicable)

### Task 8.2: Launch Steps
1. Final `vercel --prod` deploy
2. Run seed SQL for production company
3. Create first admin user
4. Test login end-to-end
5. Invite first batch of users
6. Monitor Sentry for errors
7. Monitor Vercel analytics for performance

### Task 8.3: Post-Launch Monitoring (Week 1)
- Check Sentry daily for new errors
- Monitor Vercel function logs
- Check analytics dashboard for traffic
- Respond to user feedback within 24h
- Hot-fix any blocking issues same-day

---

## Future Roadmap (Post-Launch)

| Feature | Priority | Effort |
|---------|----------|--------|
| Billing/subscriptions (Stripe) | High | 1 week |
| Email notifications (incidents, tasks) | High | 3 days |
| Push notifications (PWA) | Medium | 3 days |
| Full-text search (Supabase) | Medium | 2 days |
| File storage (Supabase Storage) | Medium | 2 days |
| PDF report export | Medium | 2 days |
| Data export for GDPR | Medium | 1 day |
| Audit log dashboard | Low | 2 days |
| Dashboard theming (dark mode) | Low | 1 day |
| Mobile app (React Native / Capacitor) | Low | 2 weeks |

---

## Appendix A: Account & Login Architecture Fix

### Current State

```
Super Admin ─── /admin ──── password login ──── dashboard
                                                     │
                                              Users > Add User
                                                     │
                                              POST /api/invitations
                                                     │
                                    ┌────────────────┼──────────────────┐
                                    │                                    │
                          SERVICE_ROLE_KEY exists?              Fallback: manual token
                                    │                                    │
                          inviteUserByEmail()                  Create invitation record
                          + create profile row                 + generate invite URL
                          + Supabase sends email               + copy link to clipboard
                                    │                                    │
                          User clicks email link               Admin shares link manually
                                    │                                    │
                          /auth/callback?code=xxx              /invite?token=xxx
                          exchangeCodeForSession()             User sets password
                          Profile already exists ✅             signUp() + signIn()
                                    │                          redirect to /auth/callback
                                    │                                    │
                          Route by role + app choice           Profile may not exist ❌
```

### Problems to Fix

#### Problem 1: Invite accept page doesn't create profile
- `/invite` page calls `signUp()` then `signIn()` then redirects to `/auth/callback?source=email`
- The callback checks for existing profile or pending invitation, but the invitation token is in the URL of `/invite`, not in `/auth/callback`
- **Fix:** After successful signUp+signIn on `/invite`, create the profile directly using the invitation data (email, role, company_id) instead of relying on the callback

#### Problem 2: Email confirmation blocks immediate login
- Supabase default: `signUp()` requires email confirmation before `signInWithPassword()` works
- On the invite page, we call signIn immediately after signUp → fails if confirmation required
- **Fix:** Either:
  - (a) Disable email confirmation for invited users (they were already verified via the invite)
  - (b) Use the admin client (`inviteUserByEmail`) which pre-confirms the email
  - (c) After signUp, show "Check your email to confirm" instead of auto-sign-in

#### Problem 3: Magic link requires SMTP
- Magic link calls `supabase.auth.signInWithOtp()` which sends an email
- If SMTP is not configured in Supabase, the email never arrives
- **Fix:** Configure SMTP in Supabase Auth settings (Resend, SendGrid, or custom)

#### Problem 4: No way to create the very first super admin
- The `/admin` login requires an existing Supabase auth user + profile with `super_admin` role
- But the profile is only created via invitation or `/auth/callback`
- **Chicken-and-egg:** Who creates the first admin?
- **Fix:** Add a setup script or API endpoint that:
  1. Creates the first company in Supabase
  2. Creates the first auth user via admin API
  3. Creates the profile with `super_admin` role
  4. Only works if zero companies exist (first-time setup)

### Recommended Architecture

```
                          ┌──────────────────────────────┐
                          │     First-Time Setup          │
                          │  /api/setup (one-time only)   │
                          │  Creates company + admin user  │
                          └──────────────┬───────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                                         │
              Super Admin                              Company Admin
              /admin login                             /login
                    │                                         │
           Dashboard > Platform                      Dashboard > Users
           Companies / Users                         Add User (invite)
                    │                                         │
              Invite company admin                    Invite employee
              POST /api/invitations                   POST /api/invitations
                    │                                         │
           ┌───────┴───────────┐                    ┌────────┴──────────┐
           │ SERVICE_ROLE_KEY  │                    │ SERVICE_ROLE_KEY   │
           │ exists?           │                    │ exists?            │
           ├───── YES ─────────┤                    ├───── YES ──────────┤
           │ inviteUserByEmail │                    │ inviteUserByEmail  │
           │ + create profile  │                    │ + create profile   │
           │ + auto-send email │                    │ + auto-send email  │
           ├───── NO ──────────┤                    ├───── NO ───────────┤
           │ Create invitation │                    │ Create invitation  │
           │ + show link       │                    │ + show link        │
           └───────┬───────────┘                    └────────┬──────────┘
                   │                                          │
           User receives invite                      User receives invite
                   │                                          │
           /invite?token=xxx                         /invite?token=xxx
                   │                                          │
           ┌───────┴───────────┐                    ┌────────┴──────────┐
           │ Set password      │                    │ Set password       │
           │ Create auth user  │                    │ Create auth user   │
           │ Create profile ←──── FIX: do this     │ Create profile     │
           │ Accept invitation │   directly here    │ Accept invitation  │
           │ Sign in + route   │                    │ Sign in + route    │
           └───────────────────┘                    └───────────────────┘
```

### Implementation Tasks

#### A1: Fix /invite page — create profile directly
**File:** `src/app/invite/page.tsx`  
**Change:** After successful `signUp()`, fetch the invitation by token, create the profile row, mark invitation as accepted, then sign in and route.

```typescript
// After signUp succeeds:
// 1. Sign in
const { data: signInData } = await supabase.auth.signInWithPassword({ email, password });
// 2. Fetch invitation details
const { data: inv } = await fetch(`/api/invitations/validate?token=${token}`).then(r => r.json());
// 3. Create profile
await supabase.from("users").insert({
  id: signInData.user.id,
  company_id: inv.company_id,
  email, first_name, last_name, role: inv.role,
  status: "active", ...
});
// 4. Mark invitation accepted
await fetch(`/api/invitations/accept`, { method: "POST", body: JSON.stringify({ token }) });
// 5. Route to app
```

#### A2: Create first-time setup endpoint
**File:** `src/app/api/setup/route.ts` (new)  
**Purpose:** Bootstrap the first company + super admin  
**Security:** Only works when zero companies exist  

#### A3: Configure Supabase email settings
- Go to Supabase Dashboard → Auth → Settings
- Set "Confirm email" to false for invited users OR use admin invite API
- Configure SMTP provider
- Test with a real email

#### A4: Add invitation accept API
**File:** `src/app/api/invitations/accept/route.ts` (new)  
**Purpose:** Mark invitation as accepted + create profile if needed  
**Auth:** Requires valid Supabase session  

#### A5: Update invitation flow in dashboard
- When admin clicks "Add User" and service role is available: one-step invite (email sent)
- When service role not available: show invite link + "Email not configured" warning
- Show invitation status in pending invitations tab

#### A6: Remove magic link from login page (optional)
- Magic link requires SMTP to be configured
- If SMTP not configured, hide the magic link option
- Add check: `if (!process.env.SMTP_CONFIGURED) hide magic link`
- Or: always show but display "Email not configured" if it fails

### Environment Requirements for Full Auth Flow

```
# Required for email invitations:
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Required in Supabase Dashboard:
Auth → SMTP Settings → Configure provider (Resend/SendGrid/Postmark)
Auth → Email Templates → Customize invitation email
Auth → Settings → "Confirm email" → OFF (for invited users)
```
