-- ============================================
-- RLS Policies for Harmoniq Safety
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable RLS on all tables (if not already)
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's company_id from users table
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid()
$$;

-- ============================================
-- COMPANIES: authenticated users can read their own company
-- ============================================
DROP POLICY IF EXISTS "Users can read own company" ON public.companies;
CREATE POLICY "Users can read own company" ON public.companies
  FOR SELECT USING (
    id = public.get_user_company_id()
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin')
  );

DROP POLICY IF EXISTS "Super admins can manage companies" ON public.companies;
CREATE POLICY "Super admins can manage companies" ON public.companies
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin')
  );

-- ============================================
-- USERS: can read users in their company
-- ============================================
DROP POLICY IF EXISTS "Users can read company users" ON public.users;
CREATE POLICY "Users can read company users" ON public.users
  FOR SELECT USING (
    company_id = public.get_user_company_id()
    OR id = auth.uid()
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin')
  );

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage company users" ON public.users;
CREATE POLICY "Admins can manage company users" ON public.users
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM public.users WHERE role IN ('super_admin', 'admin') AND company_id = public.get_user_company_id())
  );

-- ============================================
-- Generic company-scoped policies (read/write for same company)
-- Apply to: content, incidents, assets, tickets, teams, locations, etc.
-- ============================================

-- CONTENT
DROP POLICY IF EXISTS "Company content access" ON public.content;
CREATE POLICY "Company content access" ON public.content
  FOR ALL USING (
    company_id = public.get_user_company_id()
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin')
  );

-- INCIDENTS
DROP POLICY IF EXISTS "Company incidents access" ON public.incidents;
CREATE POLICY "Company incidents access" ON public.incidents
  FOR ALL USING (
    company_id = public.get_user_company_id()
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin')
  );

-- ASSETS
DROP POLICY IF EXISTS "Company assets access" ON public.assets;
CREATE POLICY "Company assets access" ON public.assets
  FOR ALL USING (
    company_id = public.get_user_company_id()
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin')
  );

-- TICKETS
DROP POLICY IF EXISTS "Company tickets access" ON public.tickets;
CREATE POLICY "Company tickets access" ON public.tickets
  FOR ALL USING (
    company_id = public.get_user_company_id()
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin')
  );

-- TEAMS
DROP POLICY IF EXISTS "Company teams access" ON public.teams;
CREATE POLICY "Company teams access" ON public.teams
  FOR ALL USING (
    company_id = public.get_user_company_id()
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin')
  );

-- LOCATIONS
DROP POLICY IF EXISTS "Company locations access" ON public.locations;
CREATE POLICY "Company locations access" ON public.locations
  FOR ALL USING (
    company_id = public.get_user_company_id()
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin')
  );

-- CHECKLIST TEMPLATES
DROP POLICY IF EXISTS "Company checklist templates access" ON public.checklist_templates;
CREATE POLICY "Company checklist templates access" ON public.checklist_templates
  FOR ALL USING (
    company_id = public.get_user_company_id()
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin')
  );

-- CHECKLIST SUBMISSIONS
DROP POLICY IF EXISTS "Company checklist submissions access" ON public.checklist_submissions;
CREATE POLICY "Company checklist submissions access" ON public.checklist_submissions
  FOR ALL USING (
    company_id = public.get_user_company_id()
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin')
  );

-- RISK EVALUATIONS
DROP POLICY IF EXISTS "Company risk evaluations access" ON public.risk_evaluations;
CREATE POLICY "Company risk evaluations access" ON public.risk_evaluations
  FOR ALL USING (
    company_id = public.get_user_company_id()
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin')
  );

-- WORK ORDERS
DROP POLICY IF EXISTS "Company work orders access" ON public.work_orders;
CREATE POLICY "Company work orders access" ON public.work_orders
  FOR ALL USING (
    company_id = public.get_user_company_id()
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin')
  );

-- INVITATIONS
DROP POLICY IF EXISTS "Company invitations access" ON public.invitations;
CREATE POLICY "Company invitations access" ON public.invitations
  FOR ALL USING (
    company_id = public.get_user_company_id()
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin')
  );

-- SITE ANALYTICS (super admin only)
DROP POLICY IF EXISTS "Super admin analytics access" ON public.site_analytics;
CREATE POLICY "Super admin analytics access" ON public.site_analytics
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin')
  );

-- AUDIT LOGS
DROP POLICY IF EXISTS "Company audit logs access" ON public.audit_logs;
CREATE POLICY "Company audit logs access" ON public.audit_logs
  FOR ALL USING (
    company_id = public.get_user_company_id()
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin')
  );

-- ============================================
-- Service role always bypasses RLS (already default)
-- ============================================
