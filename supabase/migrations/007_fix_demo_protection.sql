-- Migration 007: Fix demo data protection using RESTRICTIVE policies
-- Previous migration 006 used permissive policies which don't block when
-- another permissive policy (company_isolation) allows the action.
-- RESTRICTIVE policies must ALL pass for an action to succeed.

-- Drop the old permissive demo policies from migration 006
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
    EXECUTE format('DROP POLICY IF EXISTS "%s_demo_no_insert" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_demo_no_update" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_demo_no_delete" ON %I', tbl, tbl);
  END LOOP;
END $$;

-- Create RESTRICTIVE policies that block demo user from modifying demo company data
-- A restrictive policy must pass IN ADDITION to any permissive policy
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
    -- Block demo user from INSERT on demo company
    EXECUTE format(
      'CREATE POLICY "%s_demo_restrict_insert" ON %I AS RESTRICTIVE FOR INSERT WITH CHECK (
        NOT (public.is_demo_user() AND public.is_demo_company(company_id))
      )', tbl, tbl
    );

    -- Block demo user from UPDATE on demo company
    EXECUTE format(
      'CREATE POLICY "%s_demo_restrict_update" ON %I AS RESTRICTIVE FOR UPDATE USING (
        NOT (public.is_demo_user() AND public.is_demo_company(company_id))
      )', tbl, tbl
    );

    -- Block demo user from DELETE on demo company
    EXECUTE format(
      'CREATE POLICY "%s_demo_restrict_delete" ON %I AS RESTRICTIVE FOR DELETE USING (
        NOT (public.is_demo_user() AND public.is_demo_company(company_id))
      )', tbl, tbl
    );
  END LOOP;
END $$;
