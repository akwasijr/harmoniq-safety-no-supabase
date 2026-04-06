-- ========== 001_initial_schema.sql ==========
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
CREATE OR REPLACE FUNCTION public.user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if current user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- COMPANIES: super admins see all, others see their own
CREATE POLICY "companies_select" ON companies FOR SELECT USING (
  public.is_super_admin() OR id = public.user_company_id()
);
CREATE POLICY "companies_all_super" ON companies FOR ALL USING (public.is_super_admin());

-- USERS: see users in your company (super admins see all)
CREATE POLICY "users_select" ON users FOR SELECT USING (
  public.is_super_admin() OR company_id = public.user_company_id()
);
CREATE POLICY "users_modify" ON users FOR ALL USING (
  public.is_super_admin() OR (company_id = public.user_company_id() AND id = auth.uid())
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
        public.is_super_admin() OR company_id = public.user_company_id()
      )', tbl, tbl
    );
  END LOOP;
END $$;

-- SITE ANALYTICS & INQUIRIES: super admins only
CREATE POLICY "analytics_super_only" ON site_analytics FOR ALL USING (public.is_super_admin());
CREATE POLICY "inquiries_super_only" ON inquiries FOR ALL USING (public.is_super_admin());

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


-- ========== 002_add_missing_tables.sql ==========
-- ============================================
-- HARMONIQ SAFETY — SCHEMA UPDATE MIGRATION
-- Adds missing tables, new columns, RLS policies
-- Run AFTER 001_initial_schema.sql
-- ============================================

-- ========================
-- Missing columns on existing tables
-- ========================

-- Assets: add asset_type, department (if not exist)
DO $$ BEGIN
  ALTER TABLE assets ADD COLUMN IF NOT EXISTS asset_type TEXT NOT NULL DEFAULT 'static';
  ALTER TABLE assets ADD COLUMN IF NOT EXISTS department TEXT;
EXCEPTION WHEN others THEN NULL;
END $$;

-- ========================
-- Missing tables
-- ========================

-- INVITATIONS
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

-- ASSET INSPECTIONS
CREATE TABLE IF NOT EXISTS asset_inspections (
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

-- CORRECTIVE ACTIONS
CREATE TABLE IF NOT EXISTS corrective_actions (
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

-- METER READINGS
CREATE TABLE IF NOT EXISTS meter_readings (
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

-- INSPECTION ROUTES
CREATE TABLE IF NOT EXISTS inspection_routes (
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

-- INSPECTION ROUNDS
CREATE TABLE IF NOT EXISTS inspection_rounds (
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

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
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

-- PLATFORM SETTINGS
CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========================
-- Indexes for new tables
-- ========================
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_company ON invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_asset_inspections_asset ON asset_inspections(asset_id);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_company ON corrective_actions(company_id);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_asset ON corrective_actions(asset_id);
CREATE INDEX IF NOT EXISTS idx_meter_readings_asset ON meter_readings(asset_id);
CREATE INDEX IF NOT EXISTS idx_inspection_routes_company ON inspection_routes(company_id);
CREATE INDEX IF NOT EXISTS idx_inspection_rounds_route ON inspection_rounds(route_id);
CREATE INDEX IF NOT EXISTS idx_inspection_rounds_company ON inspection_rounds(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id);

-- ========================
-- RLS for new tables
-- ========================
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE corrective_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meter_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Helper functions in public schema (Supabase does not allow writing to auth schema)
CREATE OR REPLACE FUNCTION public.user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT role::text = 'super_admin' FROM public.users WHERE id = auth.uid()), false)
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT role::text IN ('super_admin', 'company_admin') FROM public.users WHERE id = auth.uid()), false)
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Company-scoped RLS for new tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'invitations','corrective_actions','inspection_routes','inspection_rounds'
  ]) LOOP
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (public.is_super_admin() OR company_id = public.user_company_id())', tbl || '_sel', tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK (public.is_super_admin() OR company_id = public.user_company_id())', tbl || '_ins', tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE USING (public.is_super_admin() OR company_id = public.user_company_id())', tbl || '_upd', tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE USING (public.is_super_admin() OR (public.is_admin() AND company_id = public.user_company_id()))', tbl || '_del', tbl);
  END LOOP;
END $$;

-- Asset inspections (via asset's company)
CREATE POLICY asset_inspections_sel ON asset_inspections FOR SELECT USING (
  EXISTS (SELECT 1 FROM assets WHERE assets.id = asset_inspections.asset_id AND (public.is_super_admin() OR assets.company_id = public.user_company_id()))
);
CREATE POLICY asset_inspections_ins ON asset_inspections FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM assets WHERE assets.id = asset_inspections.asset_id AND (public.is_super_admin() OR assets.company_id = public.user_company_id()))
);
CREATE POLICY asset_inspections_upd ON asset_inspections FOR UPDATE USING (
  EXISTS (SELECT 1 FROM assets WHERE assets.id = asset_inspections.asset_id AND (public.is_super_admin() OR assets.company_id = public.user_company_id()))
);

-- Meter readings (via asset's company)
CREATE POLICY meter_readings_sel ON meter_readings FOR SELECT USING (
  EXISTS (SELECT 1 FROM assets WHERE assets.id = meter_readings.asset_id AND (public.is_super_admin() OR assets.company_id = public.user_company_id()))
);
CREATE POLICY meter_readings_ins ON meter_readings FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM assets WHERE assets.id = meter_readings.asset_id AND (public.is_super_admin() OR assets.company_id = public.user_company_id()))
);

-- Audit logs
CREATE POLICY audit_logs_ins ON audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY audit_logs_sel ON audit_logs FOR SELECT USING (
  public.is_super_admin() OR company_id = public.user_company_id()
);

-- Platform settings
CREATE POLICY platform_settings_sel ON platform_settings FOR SELECT USING (public.is_admin());
CREATE POLICY platform_settings_all ON platform_settings FOR ALL USING (public.is_admin());

-- ============================================
-- DONE! Run this after 001_initial_schema.sql
-- ============================================


-- ========== 003_auth_overhaul.sql ==========
-- Authentication Overhaul: Invitations, Email Verification, Audit Logs

-- Enable pgcrypto for gen_random_bytes
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ============================================================
-- NEW TABLES
-- ============================================================

-- User Invitations (for adding users to company)
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'employee',
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email Verification Tracking
CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit Log for Security Tracking
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ALTER USERS TABLE - Add OAuth Fields
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider TEXT; -- 'google' or 'microsoft'
ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_id TEXT;

-- Create unique constraint on oauth_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth_id ON users(oauth_id) WHERE oauth_id IS NOT NULL;

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_invitations_company ON invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_expires ON invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Invitations: company admins can view/manage, super admins see all
CREATE POLICY "invitations_company_isolation" ON invitations FOR ALL USING (
  public.is_super_admin() OR company_id = public.user_company_id()
);

-- Email verifications: users see their own
CREATE POLICY "email_verifications_own" ON email_verifications FOR SELECT USING (
  user_id = auth.uid() OR public.is_super_admin()
);

-- Audit logs: company isolation
CREATE POLICY "audit_logs_company_isolation" ON audit_logs FOR SELECT USING (
  public.is_super_admin() OR company_id = public.user_company_id()
);

-- ============================================================
-- FUNCTION: Generate secure invitation token
-- ============================================================

CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
  SELECT encode(extensions.gen_random_bytes(32), 'hex');
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: Log audit event
-- ============================================================

CREATE OR REPLACE FUNCTION log_audit_event(
  p_action TEXT,
  p_resource TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO audit_logs (company_id, user_id, action, resource, details, ip_address)
  VALUES (
    COALESCE(public.user_company_id(), NULL),
    auth.uid(),
    p_action,
    p_resource,
    COALESCE(p_details, '{}'),
    p_ip_address
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- AUTO-CLEANUP: Delete expired invitations (run via cron)
-- ============================================================
-- SELECT cron.schedule('cleanup-expired-invitations', '0 2 * * *',
--   $$DELETE FROM invitations WHERE expires_at < now()$$
-- );


-- ========== 004_demo_company_and_auth.sql ==========
-- Migration 004: Add is_demo flag, seed demo company + safe demo data
-- Incidents/tickets require a demo user (created later via Supabase Auth CLI)

-- ============================================================
-- SCHEMA CHANGES
-- ============================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_companies_is_demo ON companies(is_demo) WHERE is_demo = true;

-- ============================================================
-- DEMO COMPANY: Nexus Manufacturing
-- Already inserted by partial run — use ON CONFLICT to set is_demo
-- ============================================================

INSERT INTO companies (id, name, slug, app_name, country, language, status, primary_color, secondary_color, font_family, ui_style, tier, seat_limit, currency, is_demo, created_at, updated_at)
VALUES (
  'd0000000-0000-0000-0000-000000000001',
  'Nexus Manufacturing',
  'nexus',
  'Nexus Safety',
  'US', 'en', 'active',
  '#1a1a1a', '#525252', 'Geist Sans', 'rounded',
  'professional', 50, 'USD',
  true,
  '2024-01-15T10:00:00Z', '2024-06-20T14:30:00Z'
) ON CONFLICT (slug) DO UPDATE SET is_demo = true;

-- ============================================================
-- DEMO LOCATIONS (already inserted — ON CONFLICT safety)
-- ============================================================

INSERT INTO locations (id, company_id, type, name, address, employee_count, asset_count)
VALUES
  ('d1000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'site', 'Houston Main Plant', '4200 Industrial Blvd, Houston, TX 77001', 120, 85),
  ('d1000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'building', 'Assembly Building A', '4200 Industrial Blvd, Building A, Houston, TX 77001', 45, 30),
  ('d1000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'site', 'Dallas Warehouse', '890 Commerce St, Dallas, TX 75201', 35, 25),
  ('d1000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001', 'building', 'Quality Control Lab', '4200 Industrial Blvd, Building C, Houston, TX 77001', 15, 20),
  ('d1000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000001', 'site', 'Austin R&D Center', '500 Innovation Way, Austin, TX 78701', 30, 15)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- DEMO TEAMS (already inserted — ON CONFLICT safety)
-- ============================================================

INSERT INTO teams (id, company_id, name, description)
VALUES
  ('d2000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Safety & Compliance', 'Oversees safety protocols, audits, and regulatory compliance'),
  ('d2000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'Maintenance', 'Equipment maintenance, repairs, and preventive work'),
  ('d2000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'Production Floor', 'Manufacturing line operations and assembly'),
  ('d2000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001', 'Quality Assurance', 'Product quality testing and compliance')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- DEMO ASSETS (include required asset_tag field)
-- ============================================================

INSERT INTO assets (id, company_id, name, asset_tag, category, status, condition, criticality, location_id, manufacturer, model, serial_number, purchase_date, warranty_expiry)
VALUES
  ('d3000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'CNC Machine Alpha-1', 'AST-NXS-001', 'machinery', 'active', 'good', 'critical', 'd1000000-0000-0000-0000-000000000001', 'Haas Automation', 'VF-2SS', 'HAAS-2024-001', '2023-03-15', '2026-03-15'),
  ('d3000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'Forklift FL-200', 'AST-NXS-002', 'vehicle', 'active', 'good', 'high', 'd1000000-0000-0000-0000-000000000003', 'Toyota', '8FGU25', 'TOY-FL-2024-005', '2023-06-01', '2026-06-01'),
  ('d3000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'Emergency Eye Wash Station', 'AST-NXS-003', 'safety_equipment', 'active', 'excellent', 'critical', 'd1000000-0000-0000-0000-000000000002', 'Bradley Corp', 'S19-310', 'BC-EW-2023-012', '2023-01-10', '2028-01-10'),
  ('d3000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001', 'Overhead Crane OC-5T', 'AST-NXS-004', 'lifting_equipment', 'maintenance', 'fair', 'critical', 'd1000000-0000-0000-0000-000000000001', 'Demag', 'KBK II', 'DMG-OC-2022-003', '2022-08-20', '2025-08-20'),
  ('d3000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000001', 'HVAC Unit - Plant Floor', 'AST-NXS-005', 'hvac', 'active', 'good', 'medium', 'd1000000-0000-0000-0000-000000000001', 'Carrier', '50XC', 'CAR-HVAC-2023-007', '2023-04-01', '2028-04-01'),
  ('d3000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000001', 'Fire Suppression System', 'AST-NXS-006', 'fire_safety', 'active', 'excellent', 'critical', 'd1000000-0000-0000-0000-000000000001', 'Kidde', 'SAPPHIRE', 'KID-FS-2023-001', '2023-02-15', '2033-02-15')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- DEMO WORK ORDERS (no user FK required)
-- ============================================================

INSERT INTO work_orders (id, company_id, title, description, status, priority, type, asset_id, created_at, updated_at)
VALUES
  ('d6000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'CNC Machine Alpha-1 preventive maintenance', 'Scheduled PM: oil change, filter replacement, axis calibration, coolant flush.', 'in_progress', 'high', 'preventive', 'd3000000-0000-0000-0000-000000000001', '2026-02-01T08:00:00Z', '2026-02-05T10:00:00Z'),
  ('d6000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'Overhead crane brake inspection', 'Emergency inspection of crane OC-5T braking system after malfunction incident.', 'in_progress', 'critical', 'corrective', 'd3000000-0000-0000-0000-000000000004', '2026-02-02T09:00:00Z', '2026-02-03T14:00:00Z'),
  ('d6000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'HVAC filter replacement', 'Quarterly filter replacement for plant floor HVAC unit.', 'completed', 'medium', 'preventive', 'd3000000-0000-0000-0000-000000000005', '2026-01-15T08:00:00Z', '2026-01-16T15:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- NOTE: Incidents and tickets require reporter_id (FK to users).
-- The demo user will be created via `supabase auth create-user` CLI,
-- then migration 005 will seed incidents/tickets referencing that user.
-- ============================================================


-- ========== 005_demo_user_and_data.sql ==========
-- Migration 005: Create demo user profile and seed data requiring user FK
-- Demo user auth ID: f4e8e643-a56c-4755-a533-01fa8ed64d69

-- ============================================================
-- DEMO USER PROFILE
-- ============================================================

INSERT INTO users (id, company_id, email, first_name, last_name, role, status, department, job_title, location_id, email_verified_at, oauth_provider)
VALUES (
  'f4e8e643-a56c-4755-a533-01fa8ed64d69',
  'd0000000-0000-0000-0000-000000000001',
  'demo@harmoniq.safety',
  'Demo',
  'User',
  'company_admin',
  'active',
  'Safety & Compliance',
  'Safety Manager',
  'd1000000-0000-0000-0000-000000000001',
  now(),
  'email'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- DEMO INCIDENTS (require reporter_id FK)
-- ============================================================

INSERT INTO incidents (id, company_id, reference_number, reporter_id, type, title, description, status, severity, priority, incident_date, location_id, created_at, updated_at)
VALUES
  ('d4000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'INC-2026-001', 'f4e8e643-a56c-4755-a533-01fa8ed64d69', 'environmental', 'Chemical spill in Assembly Area B', 'Approximately 2 gallons of hydraulic fluid leaked from CNC machine during routine operation. Area cordoned off, cleanup initiated.', 'in_progress', 'high', 'high', '2026-01-28', 'd1000000-0000-0000-0000-000000000002', '2026-01-28T09:15:00Z', '2026-01-28T14:30:00Z'),
  ('d4000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'INC-2026-002', 'f4e8e643-a56c-4755-a533-01fa8ed64d69', 'near_miss', 'Near-miss: Forklift collision at dock', 'Forklift nearly collided with pedestrian at loading dock 3. No injuries. Visibility obstruction from stacked pallets identified as cause.', 'in_review', 'medium', 'medium', '2026-01-25', 'd1000000-0000-0000-0000-000000000003', '2026-01-25T14:20:00Z', '2026-01-27T10:00:00Z'),
  ('d4000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'INC-2026-003', 'f4e8e643-a56c-4755-a533-01fa8ed64d69', 'injury', 'Worker hand injury on press machine', 'Operator sustained minor laceration on left hand while clearing material jam from hydraulic press. First aid administered on-site.', 'resolved', 'high', 'high', '2026-01-20', 'd1000000-0000-0000-0000-000000000001', '2026-01-20T11:45:00Z', '2026-01-22T16:00:00Z'),
  ('d4000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001', 'INC-2026-004', 'f4e8e643-a56c-4755-a533-01fa8ed64d69', 'fire', 'Fire alarm false trigger - Warehouse', 'Fire alarm activated in Dallas warehouse zone C. Investigation confirmed dust accumulation on detector. No actual fire.', 'resolved', 'low', 'low', '2026-01-18', 'd1000000-0000-0000-0000-000000000003', '2026-01-18T08:30:00Z', '2026-01-18T12:00:00Z'),
  ('d4000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000001', 'INC-2026-005', 'f4e8e643-a56c-4755-a533-01fa8ed64d69', 'equipment_failure', 'Overhead crane malfunction during lift', 'Crane OC-5T experienced unexpected braking during 3-ton load lift. Load safely lowered. Crane taken out of service for inspection.', 'in_progress', 'critical', 'critical', '2026-02-01', 'd1000000-0000-0000-0000-000000000001', '2026-02-01T07:00:00Z', '2026-02-02T09:00:00Z'),
  ('d4000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000001', 'INC-2026-006', 'f4e8e643-a56c-4755-a533-01fa8ed64d69', 'injury', 'Slip and fall in breakroom', 'Employee slipped on wet floor in breakroom. Wet floor sign was not posted after mopping. Minor bruising reported.', 'new', 'medium', 'medium', '2026-02-05', 'd1000000-0000-0000-0000-000000000004', '2026-02-05T12:15:00Z', '2026-02-05T12:15:00Z'),
  ('d4000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000001', 'INC-2026-007', 'f4e8e643-a56c-4755-a533-01fa8ed64d69', 'equipment_failure', 'Electrical panel overheating detected', 'Thermal imaging during routine check revealed Panel E-12 operating at 85°C. Immediate shutdown ordered.', 'in_progress', 'critical', 'critical', '2026-02-08', 'd1000000-0000-0000-0000-000000000001', '2026-02-08T15:30:00Z', '2026-02-09T08:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- DEMO TICKETS (require reporter_id FK)
-- ============================================================

INSERT INTO tickets (id, company_id, title, description, status, priority, reporter_id, created_at, updated_at)
VALUES
  ('d5000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Replace safety signage at dock area', 'Faded warning signs at loading docks 1-4 need replacement per OSHA requirements.', 'new', 'medium', 'f4e8e643-a56c-4755-a533-01fa8ed64d69', '2026-02-01T10:00:00Z', '2026-02-01T10:00:00Z'),
  ('d5000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'Install additional emergency lighting', 'Emergency lighting needed in corridor between buildings A and C per recent safety audit.', 'in_progress', 'high', 'f4e8e643-a56c-4755-a533-01fa8ed64d69', '2026-01-28T14:00:00Z', '2026-02-03T09:00:00Z'),
  ('d5000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'Update lockout/tagout procedures', 'LOTO procedures for CNC machines need updating after equipment modifications.', 'waiting', 'critical', 'f4e8e643-a56c-4755-a533-01fa8ed64d69', '2026-01-15T11:00:00Z', '2026-01-20T16:00:00Z')
ON CONFLICT (id) DO NOTHING;


-- ========== 006_demo_data_protection.sql ==========
-- Migration 006: Demo data protection
-- Prevent demo user from permanently modifying demo company data
-- Demo user can READ all demo data but cannot INSERT/UPDATE/DELETE

-- Helper function: check if current user is the demo account
CREATE OR REPLACE FUNCTION public.is_demo_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND email = 'demo@harmoniq.safety'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: check if a company is a demo company
CREATE OR REPLACE FUNCTION public.is_demo_company(cid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.companies
    WHERE id = cid AND is_demo = true
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Demo protection for tables WITH company_id column
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'incidents', 'assets', 'tickets', 'work_orders', 'locations',
    'teams', 'content', 'checklist_templates', 'checklist_submissions',
    'risk_evaluations', 'parts', 'corrective_actions'
  ])
  LOOP
    EXECUTE format(
      'CREATE POLICY "%s_demo_no_insert" ON %I FOR INSERT WITH CHECK (
        NOT (public.is_demo_user() AND public.is_demo_company(company_id))
      )', tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "%s_demo_no_update" ON %I FOR UPDATE USING (
        NOT (public.is_demo_user() AND public.is_demo_company(company_id))
      )', tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "%s_demo_no_delete" ON %I FOR DELETE USING (
        NOT (public.is_demo_user() AND public.is_demo_company(company_id))
      )', tbl, tbl
    );
  END LOOP;
END $$;

-- Demo protection for asset_inspections (no company_id — join via assets)
CREATE POLICY "asset_inspections_demo_no_insert" ON asset_inspections FOR INSERT WITH CHECK (
  NOT (public.is_demo_user() AND EXISTS (
    SELECT 1 FROM assets WHERE assets.id = asset_inspections.asset_id AND public.is_demo_company(assets.company_id)
  ))
);
CREATE POLICY "asset_inspections_demo_no_update" ON asset_inspections FOR UPDATE USING (
  NOT (public.is_demo_user() AND EXISTS (
    SELECT 1 FROM assets WHERE assets.id = asset_inspections.asset_id AND public.is_demo_company(assets.company_id)
  ))
);
CREATE POLICY "asset_inspections_demo_no_delete" ON asset_inspections FOR DELETE USING (
  NOT (public.is_demo_user() AND EXISTS (
    SELECT 1 FROM assets WHERE assets.id = asset_inspections.asset_id AND public.is_demo_company(assets.company_id)
  ))
);

-- Demo protection for meter_readings (no company_id — join via assets)
CREATE POLICY "meter_readings_demo_no_insert" ON meter_readings FOR INSERT WITH CHECK (
  NOT (public.is_demo_user() AND EXISTS (
    SELECT 1 FROM assets WHERE assets.id = meter_readings.asset_id AND public.is_demo_company(assets.company_id)
  ))
);
CREATE POLICY "meter_readings_demo_no_update" ON meter_readings FOR UPDATE USING (
  NOT (public.is_demo_user() AND EXISTS (
    SELECT 1 FROM assets WHERE assets.id = meter_readings.asset_id AND public.is_demo_company(assets.company_id)
  ))
);
CREATE POLICY "meter_readings_demo_no_delete" ON meter_readings FOR DELETE USING (
  NOT (public.is_demo_user() AND EXISTS (
    SELECT 1 FROM assets WHERE assets.id = meter_readings.asset_id AND public.is_demo_company(assets.company_id)
  ))
);


-- ========== 007_fix_demo_protection.sql ==========
-- Migration 007: Fix demo data protection using RESTRICTIVE policies
-- Previous migration 006 used permissive policies which don't block when
-- another permissive policy (company_isolation) allows the action.
-- RESTRICTIVE policies must ALL pass for an action to succeed.

-- Drop the old permissive demo policies from migration 006
DO $$
DECLARE
  tbl TEXT;
BEGIN
  -- Tables with company_id
  FOR tbl IN SELECT unnest(ARRAY[
    'incidents', 'assets', 'tickets', 'work_orders', 'locations',
    'teams', 'content', 'checklist_templates', 'checklist_submissions',
    'risk_evaluations', 'parts', 'corrective_actions'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_demo_no_insert" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_demo_no_update" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_demo_no_delete" ON %I', tbl, tbl);
  END LOOP;

  -- Tables without company_id (asset_inspections, meter_readings)
  FOR tbl IN SELECT unnest(ARRAY['asset_inspections', 'meter_readings'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_demo_no_insert" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_demo_no_update" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_demo_no_delete" ON %I', tbl, tbl);
  END LOOP;
END $$;

-- Create RESTRICTIVE policies for tables WITH company_id
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'incidents', 'assets', 'tickets', 'work_orders', 'locations',
    'teams', 'content', 'checklist_templates', 'checklist_submissions',
    'risk_evaluations', 'parts', 'corrective_actions'
  ])
  LOOP
    EXECUTE format(
      'CREATE POLICY "%s_demo_restrict_insert" ON %I AS RESTRICTIVE FOR INSERT WITH CHECK (
        NOT (public.is_demo_user() AND public.is_demo_company(company_id))
      )', tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "%s_demo_restrict_update" ON %I AS RESTRICTIVE FOR UPDATE USING (
        NOT (public.is_demo_user() AND public.is_demo_company(company_id))
      )', tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "%s_demo_restrict_delete" ON %I AS RESTRICTIVE FOR DELETE USING (
        NOT (public.is_demo_user() AND public.is_demo_company(company_id))
      )', tbl, tbl
    );
  END LOOP;
END $$;

-- RESTRICTIVE policies for asset_inspections (join via assets for company_id)
CREATE POLICY "asset_inspections_demo_restrict_insert" ON asset_inspections AS RESTRICTIVE FOR INSERT WITH CHECK (
  NOT (public.is_demo_user() AND EXISTS (
    SELECT 1 FROM assets WHERE assets.id = asset_inspections.asset_id AND public.is_demo_company(assets.company_id)
  ))
);
CREATE POLICY "asset_inspections_demo_restrict_update" ON asset_inspections AS RESTRICTIVE FOR UPDATE USING (
  NOT (public.is_demo_user() AND EXISTS (
    SELECT 1 FROM assets WHERE assets.id = asset_inspections.asset_id AND public.is_demo_company(assets.company_id)
  ))
);
CREATE POLICY "asset_inspections_demo_restrict_delete" ON asset_inspections AS RESTRICTIVE FOR DELETE USING (
  NOT (public.is_demo_user() AND EXISTS (
    SELECT 1 FROM assets WHERE assets.id = asset_inspections.asset_id AND public.is_demo_company(assets.company_id)
  ))
);

-- RESTRICTIVE policies for meter_readings (join via assets for company_id)
CREATE POLICY "meter_readings_demo_restrict_insert" ON meter_readings AS RESTRICTIVE FOR INSERT WITH CHECK (
  NOT (public.is_demo_user() AND EXISTS (
    SELECT 1 FROM assets WHERE assets.id = meter_readings.asset_id AND public.is_demo_company(assets.company_id)
  ))
);
CREATE POLICY "meter_readings_demo_restrict_update" ON meter_readings AS RESTRICTIVE FOR UPDATE USING (
  NOT (public.is_demo_user() AND EXISTS (
    SELECT 1 FROM assets WHERE assets.id = meter_readings.asset_id AND public.is_demo_company(assets.company_id)
  ))
);
CREATE POLICY "meter_readings_demo_restrict_delete" ON meter_readings AS RESTRICTIVE FOR DELETE USING (
  NOT (public.is_demo_user() AND EXISTS (
    SELECT 1 FROM assets WHERE assets.id = meter_readings.asset_id AND public.is_demo_company(assets.company_id)
  ))
);


-- ========== 008_extend_site_analytics.sql ==========
ALTER TABLE site_analytics
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS ip_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_site_analytics_created_at ON site_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_analytics_path ON site_analytics(path);


-- ========== 009_schema_fixes.sql ==========
-- =============================================================
-- 009: Schema Fixes
-- - Create missing notifications table
-- - Add missing columns to teams, work_orders
-- - Reconcile TS type ↔ DB column mismatches
-- =============================================================

-- 1. notifications table (used by notifications-store.tsx)
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL DEFAULT '',
  type        TEXT NOT NULL DEFAULT 'info',
  source      TEXT,
  source_id   TEXT,
  read        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_company ON public.notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_company_isolation ON public.notifications
  FOR ALL USING (
    public.is_super_admin() OR company_id = public.user_company_id()
  );

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. teams: add columns that TS type expects but DB is missing
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS color       TEXT NOT NULL DEFAULT '#6366f1';
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS member_count INT  NOT NULL DEFAULT 0;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT '{}';
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS is_default  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS status      TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ NOT NULL DEFAULT now();

-- add update trigger to teams (was missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at' AND tgrelid = 'public.teams'::regclass
  ) THEN
    CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.teams
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- 3. work_orders: add columns that TS type expects
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS corrective_action_id UUID;

-- 4. company: add hero_image_url used in TS type
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS hero_image_url TEXT;

-- 5. risk_evaluations: add columns that TS type expects
ALTER TABLE public.risk_evaluations ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.risk_evaluations ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.users(id);
ALTER TABLE public.risk_evaluations ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;


-- ========== 010_fix_grants_and_policies.sql ==========
-- =============================================================
-- 010: Fix table grants and remove legacy recursive RLS policies
-- =============================================================

-- Grant table access to authenticated and anon roles.
-- Required for RLS policies to work — without these, all queries
-- return "permission denied" even when RLS policies would allow access.
-- (These grants were lost when the schema was recreated.)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Apply to future tables automatically
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT ON TABLES TO anon;

-- Drop ALL legacy policies from migrations 001 and 002 that conflict with
-- the corrected rls-policies.sql. These cause infinite recursion because
-- they reference functions that query the users table inside users/companies
-- RLS policies. The corrected policies use SECURITY DEFINER functions.
DO $$
DECLARE
  pol RECORD;
  legacy_policies TEXT[] := ARRAY[
    -- From migration 001
    'users_select', 'users_modify',
    'companies_select', 'companies_all_super',
    'analytics_super_only', 'inquiries_super_only',
    'analytics_insert_anon', 'inquiries_insert_anon',
    -- From migration 001 (dynamic company_isolation loop)
    'incidents_company_isolation', 'assets_company_isolation',
    'tickets_company_isolation', 'work_orders_company_isolation',
    'locations_company_isolation', 'content_company_isolation',
    'teams_company_isolation', 'checklist_templates_company_isolation',
    'checklist_submissions_company_isolation', 'risk_evaluations_company_isolation',
    'parts_company_isolation', 'notifications_company_isolation',
    -- From migration 002 (dynamic loop)
    'invitations_sel', 'invitations_ins', 'invitations_upd', 'invitations_del',
    'corrective_actions_sel', 'corrective_actions_ins', 'corrective_actions_upd', 'corrective_actions_del',
    'inspection_routes_sel', 'inspection_routes_ins', 'inspection_routes_upd', 'inspection_routes_del',
    'inspection_rounds_sel', 'inspection_rounds_ins', 'inspection_rounds_upd', 'inspection_rounds_del',
    'asset_inspections_sel', 'asset_inspections_ins', 'asset_inspections_upd',
    'meter_readings_sel', 'meter_readings_ins',
    'audit_logs_ins', 'audit_logs_sel',
    'platform_settings_sel', 'platform_settings_all'
  ];
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname = ANY(legacy_policies)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    RAISE NOTICE 'Dropped legacy policy: % on %', pol.policyname, pol.tablename;
  END LOOP;
END $$;


-- ========== 011_relax_demo_insert_restrictions.sql ==========
-- Migration 011: Allow demo user to INSERT new data into demo company tables
-- The demo user should be able to create new incidents, assessments, etc.
-- We only keep restrictions on UPDATE/DELETE of existing demo seed data.

-- Drop INSERT-restrictive policies for tables WITH company_id
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'incidents', 'assets', 'tickets', 'work_orders', 'locations',
    'teams', 'content', 'checklist_templates', 'checklist_submissions',
    'risk_evaluations', 'parts', 'corrective_actions'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_demo_restrict_insert" ON %I', tbl, tbl);
  END LOOP;
END $$;

-- Drop INSERT-restrictive policies for join tables
DROP POLICY IF EXISTS "asset_inspections_demo_restrict_insert" ON asset_inspections;
DROP POLICY IF EXISTS "meter_readings_demo_restrict_insert" ON meter_readings;


-- ========== rls-policies.sql ==========
-- ============================================
-- RLS Policies for Harmoniq Safety
-- Run this in Supabase SQL Editor to reset/apply all policies
-- ============================================

-- Enable RLS on all tables (if not already)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corrective_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meter_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SECURITY DEFINER helper functions
-- These bypass RLS when called inside policies, preventing infinite recursion
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role::text = 'super_admin' FROM public.users WHERE id = auth.uid()),
    false
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role::text IN ('super_admin', 'company_admin') FROM public.users WHERE id = auth.uid()),
    false
  )
$$;

-- Alias for backward compatibility
CREATE OR REPLACE FUNCTION public.user_company_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid()
$$;

-- ============================================
-- COMPANIES
-- ============================================
DROP POLICY IF EXISTS "Users can read own company" ON public.companies;
CREATE POLICY "Users can read own company" ON public.companies
  FOR SELECT USING (
    id = public.get_user_company_id()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Super admins can manage companies" ON public.companies;
CREATE POLICY "Super admins can manage companies" ON public.companies
  FOR ALL USING (public.is_super_admin());

-- ============================================
-- USERS: use auth.uid() directly to avoid recursion
-- ============================================
DROP POLICY IF EXISTS "Users can read company users" ON public.users;
CREATE POLICY "Users can read company users" ON public.users
  FOR SELECT USING (
    id = auth.uid()
    OR company_id = public.get_user_company_id()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage company users" ON public.users;
CREATE POLICY "Admins can manage company users" ON public.users
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete company users" ON public.users;
CREATE POLICY "Admins can delete company users" ON public.users
  FOR DELETE USING (public.is_admin());

-- ============================================
-- Company-scoped tables: same company OR super_admin
-- All use SECURITY DEFINER functions (no inline subqueries on users table)
-- ============================================

DROP POLICY IF EXISTS "Company content access" ON public.content;
CREATE POLICY "Company content access" ON public.content
  FOR ALL USING (
    company_id = public.get_user_company_id() OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Company incidents access" ON public.incidents;
CREATE POLICY "Company incidents access" ON public.incidents
  FOR ALL USING (
    company_id = public.get_user_company_id() OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Company assets access" ON public.assets;
CREATE POLICY "Company assets access" ON public.assets
  FOR ALL USING (
    company_id = public.get_user_company_id() OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Company tickets access" ON public.tickets;
CREATE POLICY "Company tickets access" ON public.tickets
  FOR ALL USING (
    company_id = public.get_user_company_id() OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Company teams access" ON public.teams;
CREATE POLICY "Company teams access" ON public.teams
  FOR ALL USING (
    company_id = public.get_user_company_id() OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Company locations access" ON public.locations;
CREATE POLICY "Company locations access" ON public.locations
  FOR ALL USING (
    company_id = public.get_user_company_id() OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Company checklist templates access" ON public.checklist_templates;
CREATE POLICY "Company checklist templates access" ON public.checklist_templates
  FOR ALL USING (
    company_id = public.get_user_company_id() OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Company checklist submissions access" ON public.checklist_submissions;
CREATE POLICY "Company checklist submissions access" ON public.checklist_submissions
  FOR ALL USING (
    company_id = public.get_user_company_id() OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Company risk evaluations access" ON public.risk_evaluations;
CREATE POLICY "Company risk evaluations access" ON public.risk_evaluations
  FOR ALL USING (
    company_id = public.get_user_company_id() OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Company work orders access" ON public.work_orders;
CREATE POLICY "Company work orders access" ON public.work_orders
  FOR ALL USING (
    company_id = public.get_user_company_id() OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Company parts access" ON public.parts;
CREATE POLICY "Company parts access" ON public.parts
  FOR ALL USING (
    company_id = public.get_user_company_id() OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Company corrective actions access" ON public.corrective_actions;
CREATE POLICY "Company corrective actions access" ON public.corrective_actions
  FOR ALL USING (
    company_id = public.get_user_company_id() OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Company inspection routes access" ON public.inspection_routes;
CREATE POLICY "Company inspection routes access" ON public.inspection_routes
  FOR ALL USING (
    company_id = public.get_user_company_id() OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Company inspection rounds access" ON public.inspection_rounds;
CREATE POLICY "Company inspection rounds access" ON public.inspection_rounds
  FOR ALL USING (
    company_id = public.get_user_company_id() OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Company invitations access" ON public.invitations;
CREATE POLICY "Company invitations access" ON public.invitations
  FOR ALL USING (
    company_id = public.get_user_company_id() OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Company notifications access" ON public.notifications;
CREATE POLICY "Company notifications access" ON public.notifications
  FOR ALL USING (
    company_id = public.get_user_company_id() OR public.is_super_admin()
  );

-- ============================================
-- Asset-scoped tables (no direct company_id, use asset FK)
-- ============================================

DROP POLICY IF EXISTS "Company asset inspections access" ON public.asset_inspections;
CREATE POLICY "Company asset inspections access" ON public.asset_inspections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.assets a
      WHERE a.id = asset_inspections.asset_id
      AND (a.company_id = public.get_user_company_id() OR public.is_super_admin())
    )
  );

DROP POLICY IF EXISTS "Company meter readings access" ON public.meter_readings;
CREATE POLICY "Company meter readings access" ON public.meter_readings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.assets a
      WHERE a.id = meter_readings.asset_id
      AND (a.company_id = public.get_user_company_id() OR public.is_super_admin())
    )
  );

-- ============================================
-- Platform-level tables
-- ============================================

-- SITE ANALYTICS (super admin read; anonymous insert for tracking)
DROP POLICY IF EXISTS "Super admin analytics access" ON public.site_analytics;
CREATE POLICY "Super admin analytics access" ON public.site_analytics
  FOR SELECT USING (public.is_super_admin());

DROP POLICY IF EXISTS "Anonymous analytics insert" ON public.site_analytics;
CREATE POLICY "Anonymous analytics insert" ON public.site_analytics
  FOR INSERT WITH CHECK (true);

-- INQUIRIES (super admin read; anonymous insert for contact form)
DROP POLICY IF EXISTS "Super admin inquiries access" ON public.inquiries;
CREATE POLICY "Super admin inquiries access" ON public.inquiries
  FOR SELECT USING (public.is_super_admin());

DROP POLICY IF EXISTS "Anonymous inquiries insert" ON public.inquiries;
CREATE POLICY "Anonymous inquiries insert" ON public.inquiries
  FOR INSERT WITH CHECK (true);

-- AUDIT LOGS (company-scoped read; authenticated insert)
DROP POLICY IF EXISTS "Company audit logs read" ON public.audit_logs;
CREATE POLICY "Company audit logs read" ON public.audit_logs
  FOR SELECT USING (
    company_id = public.get_user_company_id() OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Authenticated audit log insert" ON public.audit_logs;
CREATE POLICY "Authenticated audit log insert" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- PLATFORM SETTINGS (super admin only)
DROP POLICY IF EXISTS "Super admin platform settings" ON public.platform_settings;
CREATE POLICY "Super admin platform settings" ON public.platform_settings
  FOR ALL USING (public.is_super_admin());

-- EMAIL VERIFICATIONS (own records only)
DROP POLICY IF EXISTS "Own email verifications" ON public.email_verifications;
CREATE POLICY "Own email verifications" ON public.email_verifications
  FOR SELECT USING (
    user_id = auth.uid() OR public.is_super_admin()
  );

-- ============================================
-- Service role always bypasses RLS (Supabase default)
-- ============================================


-- ========== seed.sql ==========
-- Harmoniq Safety — Seed Data
-- Run this AFTER creating your first user via Supabase Auth (dashboard or CLI).
--
-- Steps:
-- 1. Go to Supabase Dashboard → Authentication → Users → Add user
--    Email: admin@harmoniq.io  Password: (your choice)
-- 2. Copy the user's UUID from the dashboard
-- 3. Replace 'YOUR_AUTH_USER_UUID' below with that UUID
-- 4. Run this SQL in the SQL Editor

-- Create the default company
INSERT INTO companies (id, name, slug, app_name, country, language, status, primary_color, tier, seat_limit, currency)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Acme Industries',
  'acme',
  'Acme Safety',
  'US',
  'en',
  'active',
  '#8B5CF6',
  'professional',
  50,
  'USD'
);

-- Create the super admin user profile (replace UUID with your auth user's ID)
-- INSERT INTO users (id, company_id, email, first_name, last_name, role, status)
-- VALUES (
--   'YOUR_AUTH_USER_UUID',
--   'a0000000-0000-0000-0000-000000000001',
--   'admin@harmoniq.io',
--   'Admin',
--   'User',
--   'super_admin',
--   'active'
-- );

-- Example: Create a sample location
INSERT INTO locations (id, company_id, type, name, address, employee_count, asset_count)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'site',
  'Main Office',
  '123 Safety Street, Houston, TX 77001',
  25,
  50
);
