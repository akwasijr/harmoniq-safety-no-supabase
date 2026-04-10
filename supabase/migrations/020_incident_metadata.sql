-- Migration 020: add injury body map and incident metadata columns

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS injury_locations JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS escalated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;

-- Also add investigation/comments/actions as JSONB for full persistence
ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS investigation JSONB,
  ADD COLUMN IF NOT EXISTS actions JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS timeline JSONB DEFAULT '[]';
