-- Harmoniq Safety — Supabase Database Schema
-- Run this in Supabase SQL Editor to set up all tables.
-- This migration creates tables, indexes, and Row Level Security (RLS) policies.

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE company_status AS ENUM ('trial', 'active', 'suspended', 'cancelled');
CREATE TYPE user_status AS ENUM ('active', 'inactive');
CREATE TYPE user_role AS ENUM ('super_admin', 'company_admin', 'manager', 'employee');
CREATE TYPE incident_status AS ENUM ('new', 'in_progress', 'in_review', 'resolved', 'archived');
CREATE TYPE ticket_status AS ENUM ('new', 'in_progress', 'blocked', 'waiting', 'resolved', 'closed');
CREATE TYPE asset_status AS ENUM ('active', 'inactive', 'maintenance', 'retired');
CREATE TYPE content_status AS ENUM ('draft', 'published', 'scheduled');
CREATE TYPE severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE asset_category AS ENUM ('machinery', 'vehicle', 'safety_equipment', 'tool', 'electrical', 'hvac', 'plumbing', 'fire_safety', 'lifting_equipment', 'pressure_vessel', 'ppe', 'other');
CREATE TYPE asset_criticality AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE asset_condition AS ENUM ('excellent', 'good', 'fair', 'poor', 'failed');
CREATE TYPE location_type AS ENUM ('site', 'building', 'floor', 'zone', 'room');
CREATE TYPE country_code AS ENUM ('NL', 'SE', 'US');
CREATE TYPE language_code AS ENUM ('en', 'nl', 'sv');
CREATE TYPE currency_code AS ENUM ('USD', 'EUR', 'SEK');
CREATE TYPE subscription_tier AS ENUM ('starter', 'professional', 'enterprise', 'custom');

-- ============================================================
-- COMPANIES
-- ============================================================

CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  app_name TEXT,
  country country_code NOT NULL DEFAULT 'US',
  language language_code NOT NULL DEFAULT 'en',
  status company_status NOT NULL DEFAULT 'trial',
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#8B5CF6',
  secondary_color TEXT NOT NULL DEFAULT '#6D28D9',
  font_family TEXT NOT NULL DEFAULT 'Inter',
  ui_style TEXT NOT NULL DEFAULT 'rounded',
  tier subscription_tier NOT NULL DEFAULT 'starter',
  seat_limit INT NOT NULL DEFAULT 10,
  currency currency_code NOT NULL DEFAULT 'USD',
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  full_name TEXT GENERATED ALWAYS AS (
    COALESCE(first_name || ' ', '') || COALESCE(middle_name || ' ', '') || last_name
  ) STORED,
  role user_role NOT NULL DEFAULT 'employee',
  user_type TEXT NOT NULL DEFAULT 'internal',
  account_type TEXT NOT NULL DEFAULT 'standard',
  gender TEXT,
  department TEXT,
  job_title TEXT,
  employee_id TEXT,
  status user_status NOT NULL DEFAULT 'active',
  location_id UUID,
  language language_code NOT NULL DEFAULT 'en',
  theme TEXT NOT NULL DEFAULT 'system',
  two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  last_login_at TIMESTAMPTZ,
  avatar_url TEXT,
  notification_prefs JSONB DEFAULT '{"push": true, "email": true, "incidents": true, "tasks": true, "news": true}',
  team_ids UUID[] DEFAULT '{}',
  custom_permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TEAMS
-- ============================================================

CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  lead_id UUID REFERENCES users(id),
  member_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- LOCATIONS
-- ============================================================

CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES locations(id),
  type location_type NOT NULL DEFAULT 'site',
  name TEXT NOT NULL,
  address TEXT,
  gps_lat DOUBLE PRECISION,
  gps_lng DOUBLE PRECISION,
  qr_code TEXT,
  metadata JSONB DEFAULT '{}',
  employee_count INT NOT NULL DEFAULT 0,
  asset_count INT NOT NULL DEFAULT 0,
  emergency_contacts JSONB DEFAULT '[]',
  safety_notices JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INCIDENTS
-- ============================================================

CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  reference_number TEXT NOT NULL,
  reporter_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  type_other TEXT,
  severity severity NOT NULL DEFAULT 'low',
  priority priority NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  incident_date DATE NOT NULL,
  incident_time TEXT,
  lost_time BOOLEAN NOT NULL DEFAULT false,
  lost_time_amount NUMERIC,
  active_hazard BOOLEAN NOT NULL DEFAULT false,
  location_id UUID REFERENCES locations(id),
  building TEXT,
  floor TEXT,
  zone TEXT,
  room TEXT,
  gps_lat DOUBLE PRECISION,
  gps_lng DOUBLE PRECISION,
  location_description TEXT,
  asset_id UUID,
  media_urls TEXT[] DEFAULT '{}',
  status incident_status NOT NULL DEFAULT 'new',
  flagged BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  resolution_notes TEXT,
  investigation JSONB,
  actions JSONB DEFAULT '[]',
  comments JSONB DEFAULT '[]',
  timeline JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ASSETS
-- ============================================================

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
  category asset_category NOT NULL DEFAULT 'other',
  sub_category TEXT,
  criticality asset_criticality NOT NULL DEFAULT 'medium',
  manufacturer TEXT,
  model TEXT,
  model_number TEXT,
  specifications TEXT,
  manufactured_date DATE,
  purchase_date DATE,
  installation_date DATE,
  warranty_expiry DATE,
  expected_life_years INT,
  condition asset_condition NOT NULL DEFAULT 'good',
  condition_notes TEXT,
  last_condition_assessment DATE,
  purchase_cost NUMERIC,
  current_value NUMERIC,
  depreciation_rate NUMERIC,
  currency currency_code NOT NULL DEFAULT 'USD',
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
  status asset_status NOT NULL DEFAULT 'active',
  decommission_date DATE,
  disposal_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TICKETS (Work requests / support tickets)
-- ============================================================

CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status ticket_status NOT NULL DEFAULT 'new',
  priority priority NOT NULL DEFAULT 'medium',
  category TEXT,
  assigned_to UUID REFERENCES users(id),
  reporter_id UUID NOT NULL REFERENCES users(id),
  incident_id UUID REFERENCES incidents(id),
  asset_id UUID REFERENCES assets(id),
  due_date DATE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- WORK ORDERS
-- ============================================================

CREATE TABLE work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'requested',
  priority priority NOT NULL DEFAULT 'medium',
  type TEXT NOT NULL DEFAULT 'corrective',
  asset_id UUID REFERENCES assets(id),
  assigned_to UUID REFERENCES users(id),
  requester_id UUID REFERENCES users(id),
  estimated_hours NUMERIC,
  actual_hours NUMERIC,
  estimated_cost NUMERIC,
  actual_cost NUMERIC,
  parts_used JSONB DEFAULT '[]',
  notes TEXT,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CONTENT (News, documents, FAQs)
-- ============================================================

CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'news',
  status content_status NOT NULL DEFAULT 'draft',
  category TEXT,
  author_id UUID NOT NULL REFERENCES users(id),
  published_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  cover_image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CHECKLIST TEMPLATES & SUBMISSIONS
-- ============================================================

CREATE TABLE checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  created_by UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE checklist_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES checklist_templates(id),
  submitter_id UUID NOT NULL REFERENCES users(id),
  location_id UUID REFERENCES locations(id),
  asset_id UUID REFERENCES assets(id),
  status TEXT NOT NULL DEFAULT 'draft',
  responses JSONB DEFAULT '{}',
  score NUMERIC,
  notes TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- RISK EVALUATIONS
-- ============================================================

CREATE TABLE risk_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  form_type TEXT NOT NULL,
  submitter_id UUID NOT NULL REFERENCES users(id),
  location_id UUID REFERENCES locations(id),
  status TEXT NOT NULL DEFAULT 'draft',
  responses JSONB DEFAULT '{}',
  risk_score NUMERIC,
  notes TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PARTS INVENTORY
-- ============================================================

CREATE TABLE parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  category TEXT,
  quantity INT NOT NULL DEFAULT 0,
  min_quantity INT NOT NULL DEFAULT 0,
  unit_cost NUMERIC,
  location TEXT,
  supplier TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SITE ANALYTICS (for marketing website visitor tracking)
-- ============================================================

CREATE TABLE site_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL,
  referrer TEXT DEFAULT 'direct',
  country TEXT DEFAULT 'unknown',
  browser TEXT DEFAULT 'Other',
  device TEXT DEFAULT 'desktop',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CONTACT INQUIRIES (from website contact form)
-- ============================================================

CREATE TABLE inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_incidents_company ON incidents(company_id);
CREATE INDEX idx_incidents_status ON incidents(company_id, status);
CREATE INDEX idx_incidents_reporter ON incidents(reporter_id);
CREATE INDEX idx_assets_company ON assets(company_id);
CREATE INDEX idx_assets_tag ON assets(asset_tag);
CREATE INDEX idx_assets_location ON assets(location_id);
CREATE INDEX idx_tickets_company ON tickets(company_id);
CREATE INDEX idx_tickets_assigned ON tickets(assigned_to);
CREATE INDEX idx_locations_company ON locations(company_id);
CREATE INDEX idx_locations_parent ON locations(parent_id);
CREATE INDEX idx_work_orders_company ON work_orders(company_id);
CREATE INDEX idx_work_orders_asset ON work_orders(asset_id);
CREATE INDEX idx_content_company ON content(company_id);
CREATE INDEX idx_checklist_templates_company ON checklist_templates(company_id);
CREATE INDEX idx_checklist_submissions_company ON checklist_submissions(company_id);
CREATE INDEX idx_teams_company ON teams(company_id);
CREATE INDEX idx_site_analytics_created ON site_analytics(created_at);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's company_id
CREATE OR REPLACE FUNCTION auth.user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if current user is super_admin
CREATE OR REPLACE FUNCTION auth.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- COMPANIES: super admins see all, others see their own
CREATE POLICY "companies_select" ON companies FOR SELECT USING (
  auth.is_super_admin() OR id = auth.user_company_id()
);
CREATE POLICY "companies_all_super" ON companies FOR ALL USING (auth.is_super_admin());

-- USERS: see users in your company (super admins see all)
CREATE POLICY "users_select" ON users FOR SELECT USING (
  auth.is_super_admin() OR company_id = auth.user_company_id()
);
CREATE POLICY "users_modify" ON users FOR ALL USING (
  auth.is_super_admin() OR (company_id = auth.user_company_id() AND id = auth.uid())
);

-- COMPANY DATA TABLES: company isolation pattern
-- Each table with company_id gets the same policy: see/modify only your company's data

DO $$ 
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'teams', 'locations', 'incidents', 'assets', 'tickets',
    'work_orders', 'content', 'checklist_templates', 'checklist_submissions',
    'risk_evaluations', 'parts'
  ])
  LOOP
    EXECUTE format(
      'CREATE POLICY "%s_company_isolation" ON %I FOR ALL USING (
        auth.is_super_admin() OR company_id = auth.user_company_id()
      )', tbl, tbl
    );
  END LOOP;
END $$;

-- SITE ANALYTICS & INQUIRIES: super admins only
CREATE POLICY "analytics_super_only" ON site_analytics FOR ALL USING (auth.is_super_admin());
CREATE POLICY "inquiries_super_only" ON inquiries FOR ALL USING (auth.is_super_admin());

-- Allow anonymous inserts for analytics and inquiries (from website)
CREATE POLICY "analytics_insert_anon" ON site_analytics FOR INSERT WITH CHECK (true);
CREATE POLICY "inquiries_insert_anon" ON inquiries FOR INSERT WITH CHECK (true);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'companies', 'users', 'incidents', 'assets', 'tickets',
    'work_orders', 'content', 'checklist_templates', 'parts'
  ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at()', tbl
    );
  END LOOP;
END $$;

-- ============================================================
-- AUTO-PURGE: site_analytics older than 90 days
-- Run this as a Supabase cron job (pg_cron):
-- SELECT cron.schedule('purge-old-analytics', '0 3 * * *', 
--   $$DELETE FROM site_analytics WHERE created_at < now() - interval '90 days'$$
-- );
-- ============================================================
