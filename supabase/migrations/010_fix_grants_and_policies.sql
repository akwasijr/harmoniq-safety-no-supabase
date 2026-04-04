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
