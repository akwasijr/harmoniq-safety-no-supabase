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
