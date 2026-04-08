ALTER TABLE corrective_actions ADD COLUMN IF NOT EXISTS assigned_to_team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
