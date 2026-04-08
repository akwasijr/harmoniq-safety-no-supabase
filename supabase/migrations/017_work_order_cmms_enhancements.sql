-- Migration 017: Work Order CMMS Enhancements
-- Adds work order types, expanded status pipeline, and status change audit log

-- 1. Add type column to work_orders (default to service_request for existing records)
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'service_request';

-- 2. Migrate existing statuses to new pipeline values
-- "requested" → "waiting_approval" (same semantic meaning)
UPDATE work_orders SET status = 'waiting_approval' WHERE status = 'requested';

-- 3. Create status change audit log table
CREATE TABLE IF NOT EXISTS work_order_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  comment TEXT DEFAULT '',
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_wo_status_log_work_order ON work_order_status_log(work_order_id);
CREATE INDEX IF NOT EXISTS idx_wo_status_log_changed_at ON work_order_status_log(changed_at DESC);

-- RLS
ALTER TABLE work_order_status_log ENABLE ROW LEVEL SECURITY;

-- Company isolation policy (join through work_orders)
CREATE POLICY work_order_status_log_company_isolation ON work_order_status_log
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = work_order_status_log.work_order_id
      AND wo.company_id = (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Grant access to service_role
GRANT ALL ON work_order_status_log TO service_role;
