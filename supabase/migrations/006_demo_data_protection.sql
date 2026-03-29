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
