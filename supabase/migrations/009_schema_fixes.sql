-- =============================================================
-- 009: Schema Fixes
-- - Create missing notifications table
-- - Add missing columns to teams, work_orders
-- - Reconcile TS type ↔ DB column mismatches
-- =============================================================

-- 1. notifications table (used by notifications-store.tsx)
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL DEFAULT '',
  type        TEXT NOT NULL DEFAULT 'info',
  source      TEXT,
  source_id   TEXT,
  read        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_company ON public.notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_company_isolation ON public.notifications
  FOR ALL USING (
    public.is_super_admin() OR company_id = public.user_company_id()
  );

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. teams: add columns that TS type expects but DB is missing
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS color       TEXT NOT NULL DEFAULT '#6366f1';
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS member_count INT  NOT NULL DEFAULT 0;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT '{}';
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS is_default  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS status      TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ NOT NULL DEFAULT now();

-- add update trigger to teams (was missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at' AND tgrelid = 'public.teams'::regclass
  ) THEN
    CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.teams
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- 3. work_orders: add columns that TS type expects
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS corrective_action_id UUID;

-- 4. company: add hero_image_url used in TS type
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS hero_image_url TEXT;

-- 5. risk_evaluations: add columns that TS type expects
ALTER TABLE public.risk_evaluations ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.risk_evaluations ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.users(id);
ALTER TABLE public.risk_evaluations ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
