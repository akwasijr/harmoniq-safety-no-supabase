-- Authentication Overhaul: Invitations, Email Verification, Audit Logs

-- ============================================================
-- NEW TABLES
-- ============================================================

-- User Invitations (for adding users to company)
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'employee',
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email Verification Tracking
CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit Log for Security Tracking
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ALTER USERS TABLE - Add OAuth Fields
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider TEXT; -- 'google' or 'microsoft'
ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_id TEXT;

-- Create unique constraint on oauth_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth_id ON users(oauth_id) WHERE oauth_id IS NOT NULL;

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_invitations_company ON invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_expires ON invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Invitations: company admins can view/manage, super admins see all
CREATE POLICY "invitations_company_isolation" ON invitations FOR ALL USING (
  public.is_super_admin() OR company_id = public.user_company_id()
);

-- Email verifications: users see their own
CREATE POLICY "email_verifications_own" ON email_verifications FOR SELECT USING (
  user_id = auth.uid() OR public.is_super_admin()
);

-- Audit logs: company isolation
CREATE POLICY "audit_logs_company_isolation" ON audit_logs FOR SELECT USING (
  public.is_super_admin() OR company_id = public.user_company_id()
);

-- ============================================================
-- FUNCTION: Generate secure invitation token
-- ============================================================

CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
  SELECT encode(gen_random_bytes(32), 'hex');
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: Log audit event
-- ============================================================

CREATE OR REPLACE FUNCTION log_audit_event(
  p_action TEXT,
  p_resource TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO audit_logs (company_id, user_id, action, resource, details, ip_address)
  VALUES (
    COALESCE(public.user_company_id(), NULL),
    auth.uid(),
    p_action,
    p_resource,
    COALESCE(p_details, '{}'),
    p_ip_address
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- AUTO-CLEANUP: Delete expired invitations (run via cron)
-- ============================================================
-- SELECT cron.schedule('cleanup-expired-invitations', '0 2 * * *',
--   $$DELETE FROM invitations WHERE expires_at < now()$$
-- );
