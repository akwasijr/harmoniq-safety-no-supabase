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
    auth.uid() IN (SELECT id FROM public.users WHERE role IN ('super_admin', 'company_admin') AND company_id = public.get_user_company_id())
  );

-- ============================================
-- Company-scoped tables: same company OR super_admin
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

-- PARTS
DROP POLICY IF EXISTS "Company parts access" ON public.parts;
CREATE POLICY "Company parts access" ON public.parts
  FOR ALL USING (
    company_id = public.get_user_company_id()
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin')
  );

-- CORRECTIVE ACTIONS
DROP POLICY IF EXISTS "Company corrective actions access" ON public.corrective_actions;
CREATE POLICY "Company corrective actions access" ON public.corrective_actions
  FOR ALL USING (
    company_id = public.get_user_company_id()
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin')
  );

-- INSPECTION ROUTES
DROP POLICY IF EXISTS "Company inspection routes access" ON public.inspection_routes;
CREATE POLICY "Company inspection routes access" ON public.inspection_routes
  FOR ALL USING (
    company_id = public.get_user_company_id()
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin')
  );

-- INSPECTION ROUNDS
DROP POLICY IF EXISTS "Company inspection rounds access" ON public.inspection_rounds;
CREATE POLICY "Company inspection rounds access" ON public.inspection_rounds
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

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Company notifications access" ON public.notifications;
CREATE POLICY "Company notifications access" ON public.notifications
  FOR ALL USING (
    company_id = public.get_user_company_id()
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin')
  );

-- ============================================
-- Asset-scoped tables (no direct company_id, use asset FK)
-- ============================================

-- ASSET INSPECTIONS
DROP POLICY IF EXISTS "Company asset inspections access" ON public.asset_inspections;
CREATE POLICY "Company asset inspections access" ON public.asset_inspections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.assets a
      WHERE a.id = asset_inspections.asset_id
      AND (a.company_id = public.get_user_company_id()
           OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin'))
    )
  );

-- METER READINGS
DROP POLICY IF EXISTS "Company meter readings access" ON public.meter_readings;
CREATE POLICY "Company meter readings access" ON public.meter_readings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.assets a
      WHERE a.id = meter_readings.asset_id
      AND (a.company_id = public.get_user_company_id()
           OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin'))
    )
  );

-- ============================================
-- Platform-level tables
-- ============================================

-- SITE ANALYTICS (super admin read; anonymous insert for tracking)
DROP POLICY IF EXISTS "Super admin analytics access" ON public.site_analytics;
CREATE POLICY "Super admin analytics access" ON public.site_analytics
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin')
  );

DROP POLICY IF EXISTS "Anonymous analytics insert" ON public.site_analytics;
CREATE POLICY "Anonymous analytics insert" ON public.site_analytics
  FOR INSERT WITH CHECK (true);

-- INQUIRIES (super admin read; anonymous insert for contact form)
DROP POLICY IF EXISTS "Super admin inquiries access" ON public.inquiries;
CREATE POLICY "Super admin inquiries access" ON public.inquiries
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin')
  );

DROP POLICY IF EXISTS "Anonymous inquiries insert" ON public.inquiries;
CREATE POLICY "Anonymous inquiries insert" ON public.inquiries
  FOR INSERT WITH CHECK (true);

-- AUDIT LOGS (company-scoped read; authenticated insert)
DROP POLICY IF EXISTS "Company audit logs read" ON public.audit_logs;
CREATE POLICY "Company audit logs read" ON public.audit_logs
  FOR SELECT USING (
    company_id = public.get_user_company_id()
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin')
  );

DROP POLICY IF EXISTS "Authenticated audit log insert" ON public.audit_logs;
CREATE POLICY "Authenticated audit log insert" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- PLATFORM SETTINGS (super admin only)
DROP POLICY IF EXISTS "Super admin platform settings" ON public.platform_settings;
CREATE POLICY "Super admin platform settings" ON public.platform_settings
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin')
  );

-- EMAIL VERIFICATIONS (own records only)
DROP POLICY IF EXISTS "Own email verifications" ON public.email_verifications;
CREATE POLICY "Own email verifications" ON public.email_verifications
  FOR SELECT USING (
    user_id = auth.uid()
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin')
  );

-- ============================================
-- Service role always bypasses RLS (Supabase default)
-- ============================================
