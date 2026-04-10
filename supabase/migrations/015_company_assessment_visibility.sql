ALTER TABLE companies ADD COLUMN IF NOT EXISTS hidden_assessment_types TEXT[] DEFAULT '{}';
