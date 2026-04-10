-- Add missing columns to checklist_templates
ALTER TABLE checklist_templates ADD COLUMN IF NOT EXISTS publish_status TEXT DEFAULT 'draft';
ALTER TABLE checklist_templates ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE checklist_templates ADD COLUMN IF NOT EXISTS assignment TEXT DEFAULT 'all';
ALTER TABLE checklist_templates ADD COLUMN IF NOT EXISTS recurrence TEXT DEFAULT 'once';
ALTER TABLE checklist_templates ADD COLUMN IF NOT EXISTS source_template_id TEXT;
ALTER TABLE checklist_templates ADD COLUMN IF NOT EXISTS regulation TEXT;
ALTER TABLE checklist_templates ADD COLUMN IF NOT EXISTS tags TEXT[];
