-- ============================================
-- Cleanup records with non-UUID IDs
-- These were created before the UUID enforcement fix
-- and cannot be updated via the entity-upsert API.
-- ============================================

-- Delete incidents with non-UUID IDs (e.g. "inc_1775637796275")
DELETE FROM incidents
WHERE id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Delete locations with non-UUID IDs (e.g. "loc_new_1775563591...")
DELETE FROM locations
WHERE id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Delete assets with non-UUID IDs
DELETE FROM assets
WHERE id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Delete tickets with non-UUID IDs
DELETE FROM tickets
WHERE id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Delete inspection_routes with non-UUID IDs
DELETE FROM inspection_routes
WHERE id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Delete parts with non-UUID IDs
DELETE FROM parts
WHERE id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Note: The regex above matches UUIDs of any version.
-- Records with short-string IDs will be removed.
-- If you need to preserve data, export first before running this.
