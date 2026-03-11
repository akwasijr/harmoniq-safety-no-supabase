ALTER TABLE site_analytics
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS ip_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_site_analytics_created_at ON site_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_analytics_path ON site_analytics(path);
