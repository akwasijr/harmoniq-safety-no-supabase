-- Migration 018: Work order procedure links
-- Allows a work order to reference the checklist template selected at creation time
-- and the checklist submission completed by the field worker.

ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS checklist_template_id UUID REFERENCES checklist_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS checklist_submission_id UUID REFERENCES checklist_submissions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_checklist_template_id ON work_orders(checklist_template_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_checklist_submission_id ON work_orders(checklist_submission_id);
