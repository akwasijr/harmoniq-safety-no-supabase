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

-- Helper functions (if not exist from 001)
CREATE OR REPLACE FUNCTION auth.company_id()
RETURNS UUID AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION auth.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT role::text = 'super_admin' FROM public.users WHERE id = auth.uid()), false)
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION auth.is_admin()
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
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (auth.is_super_admin() OR company_id = auth.company_id())', tbl || '_sel', tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK (auth.is_super_admin() OR company_id = auth.company_id())', tbl || '_ins', tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE USING (auth.is_super_admin() OR company_id = auth.company_id())', tbl || '_upd', tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE USING (auth.is_super_admin() OR (auth.is_admin() AND company_id = auth.company_id()))', tbl || '_del', tbl);
  END LOOP;
END $$;

-- Asset inspections (via asset's company)
CREATE POLICY asset_inspections_sel ON asset_inspections FOR SELECT USING (
  EXISTS (SELECT 1 FROM assets WHERE assets.id = asset_inspections.asset_id AND (auth.is_super_admin() OR assets.company_id = auth.company_id()))
);
CREATE POLICY asset_inspections_ins ON asset_inspections FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM assets WHERE assets.id = asset_inspections.asset_id AND (auth.is_super_admin() OR assets.company_id = auth.company_id()))
);
CREATE POLICY asset_inspections_upd ON asset_inspections FOR UPDATE USING (
  EXISTS (SELECT 1 FROM assets WHERE assets.id = asset_inspections.asset_id AND (auth.is_super_admin() OR assets.company_id = auth.company_id()))
);

-- Meter readings (via asset's company)
CREATE POLICY meter_readings_sel ON meter_readings FOR SELECT USING (
  EXISTS (SELECT 1 FROM assets WHERE assets.id = meter_readings.asset_id AND (auth.is_super_admin() OR assets.company_id = auth.company_id()))
);
CREATE POLICY meter_readings_ins ON meter_readings FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM assets WHERE assets.id = meter_readings.asset_id AND (auth.is_super_admin() OR assets.company_id = auth.company_id()))
);

-- Audit logs
CREATE POLICY audit_logs_ins ON audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY audit_logs_sel ON audit_logs FOR SELECT USING (
  auth.is_super_admin() OR company_id = auth.company_id()
);

-- Platform settings
CREATE POLICY platform_settings_sel ON platform_settings FOR SELECT USING (auth.is_admin());
CREATE POLICY platform_settings_all ON platform_settings FOR ALL USING (auth.is_admin());

-- ============================================
-- DONE! Run this after 001_initial_schema.sql
-- ============================================
