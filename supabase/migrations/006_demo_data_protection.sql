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

-- Add restrictive policies to prevent demo user from modifying demo data
-- These are added as additional restrictive policies (WITH CHECK)
-- The demo user can still SELECT but not INSERT/UPDATE/DELETE on demo company data

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'incidents', 'assets', 'tickets', 'work_orders', 'locations',
    'teams', 'content', 'checklist_templates', 'checklist_submissions',
    'risk_evaluations', 'parts', 'corrective_actions', 'asset_inspections',
    'meter_readings'
  ])
  LOOP
    -- Prevent demo user from inserting into demo company
    EXECUTE format(
      'CREATE POLICY "%s_demo_no_insert" ON %I FOR INSERT WITH CHECK (
        NOT (public.is_demo_user() AND public.is_demo_company(company_id))
      )', tbl, tbl
    );

    -- Prevent demo user from updating demo company data
    EXECUTE format(
      'CREATE POLICY "%s_demo_no_update" ON %I FOR UPDATE USING (
        NOT (public.is_demo_user() AND public.is_demo_company(company_id))
      )', tbl, tbl
    );

    -- Prevent demo user from deleting demo company data
    EXECUTE format(
      'CREATE POLICY "%s_demo_no_delete" ON %I FOR DELETE USING (
        NOT (public.is_demo_user() AND public.is_demo_company(company_id))
      )', tbl, tbl
    );
  END LOOP;
END $$;
