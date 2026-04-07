-- Migration 012: Audit Fixes
-- Fix invited_by NOT NULL + ON DELETE SET NULL conflict
-- Add assigned_to_team_id to incidents, tickets, work_orders

-- 1. Fix the constraint conflict on invitations.invited_by
-- NOT NULL combined with ON DELETE SET NULL is impossible — drop NOT NULL
ALTER TABLE invitations ALTER COLUMN invited_by DROP NOT NULL;

-- 2. Add assigned_to_team_id columns (currently saved to localStorage but lost on Supabase refresh)
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS assigned_to_team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS assigned_to_team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS assigned_to_team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- 3. Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_incidents_assigned_team ON incidents(assigned_to_team_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_team ON tickets(assigned_to_team_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_team ON work_orders(assigned_to_team_id);
