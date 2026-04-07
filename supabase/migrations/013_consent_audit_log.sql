-- Migration 013: Consent audit logging for GDPR compliance
CREATE TABLE IF NOT EXISTS consent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash TEXT NOT NULL,
  user_agent TEXT,
  necessary BOOLEAN NOT NULL DEFAULT true,
  analytics BOOLEAN NOT NULL DEFAULT false,
  marketing BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consent_logs_created ON consent_logs(created_at DESC);

-- Allow authenticated users to insert consent records
ALTER TABLE consent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert consent" ON consent_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Super admins can read consent" ON consent_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
  );
