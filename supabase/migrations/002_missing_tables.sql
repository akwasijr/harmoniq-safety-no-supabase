-- Add missing tables: corrective_actions, asset_inspections, meter_readings

CREATE TABLE IF NOT EXISTS corrective_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  incident_id UUID REFERENCES incidents(id),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS asset_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES assets(id),
  inspector_id UUID REFERENCES users(id),
  type TEXT NOT NULL DEFAULT 'routine',
  status TEXT NOT NULL DEFAULT 'scheduled',
  scheduled_date DATE,
  completed_date DATE,
  condition TEXT,
  notes TEXT,
  findings JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meter_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES assets(id),
  reading_type TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT,
  recorded_by UUID REFERENCES users(id),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE corrective_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE meter_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "corrective_actions_company_isolation" ON corrective_actions FOR ALL USING (
  public.is_super_admin() OR company_id = public.user_company_id()
);
CREATE POLICY "asset_inspections_company_isolation" ON asset_inspections FOR ALL USING (
  public.is_super_admin() OR company_id = public.user_company_id()
);
CREATE POLICY "meter_readings_company_isolation" ON meter_readings FOR ALL USING (
  public.is_super_admin() OR company_id = public.user_company_id()
);

CREATE INDEX idx_corrective_actions_company ON corrective_actions(company_id);
CREATE INDEX idx_asset_inspections_company ON asset_inspections(company_id);
CREATE INDEX idx_meter_readings_company ON meter_readings(company_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON corrective_actions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON asset_inspections FOR EACH ROW EXECUTE FUNCTION update_updated_at();
