-- Migration 011: Allow demo user to INSERT new data into demo company tables
-- The demo user should be able to create new incidents, assessments, etc.
-- We only keep restrictions on UPDATE/DELETE of existing demo seed data.
-- Also grants table access to service_role (needed for server-side API routes).

-- 1. Grant full table access to service_role (PostgREST uses this role for admin operations)
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;

-- 2. Drop INSERT-restrictive policies for tables WITH company_id
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

-- 3. Drop INSERT-restrictive policies for join tables
DROP POLICY IF EXISTS "asset_inspections_demo_restrict_insert" ON asset_inspections;
DROP POLICY IF EXISTS "meter_readings_demo_restrict_insert" ON meter_readings;
