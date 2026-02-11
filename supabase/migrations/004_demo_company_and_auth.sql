-- Migration 004: Add is_demo flag, seed demo company + safe demo data
-- Incidents/tickets require a demo user (created later via Supabase Auth CLI)

-- ============================================================
-- SCHEMA CHANGES
-- ============================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_companies_is_demo ON companies(is_demo) WHERE is_demo = true;

-- ============================================================
-- DEMO COMPANY: Nexus Manufacturing
-- Already inserted by partial run — use ON CONFLICT to set is_demo
-- ============================================================

INSERT INTO companies (id, name, slug, app_name, country, language, status, primary_color, secondary_color, font_family, ui_style, tier, seat_limit, currency, is_demo, created_at, updated_at)
VALUES (
  'd0000000-0000-0000-0000-000000000001',
  'Nexus Manufacturing',
  'nexus',
  'Nexus Safety',
  'US', 'en', 'active',
  '#1a1a1a', '#525252', 'Geist Sans', 'rounded',
  'professional', 50, 'USD',
  true,
  '2024-01-15T10:00:00Z', '2024-06-20T14:30:00Z'
) ON CONFLICT (slug) DO UPDATE SET is_demo = true;

-- ============================================================
-- DEMO LOCATIONS (already inserted — ON CONFLICT safety)
-- ============================================================

INSERT INTO locations (id, company_id, type, name, address, employee_count, asset_count)
VALUES
  ('d1000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'site', 'Houston Main Plant', '4200 Industrial Blvd, Houston, TX 77001', 120, 85),
  ('d1000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'building', 'Assembly Building A', '4200 Industrial Blvd, Building A, Houston, TX 77001', 45, 30),
  ('d1000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'site', 'Dallas Warehouse', '890 Commerce St, Dallas, TX 75201', 35, 25),
  ('d1000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001', 'building', 'Quality Control Lab', '4200 Industrial Blvd, Building C, Houston, TX 77001', 15, 20),
  ('d1000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000001', 'site', 'Austin R&D Center', '500 Innovation Way, Austin, TX 78701', 30, 15)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- DEMO TEAMS (already inserted — ON CONFLICT safety)
-- ============================================================

INSERT INTO teams (id, company_id, name, description)
VALUES
  ('d2000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Safety & Compliance', 'Oversees safety protocols, audits, and regulatory compliance'),
  ('d2000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'Maintenance', 'Equipment maintenance, repairs, and preventive work'),
  ('d2000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'Production Floor', 'Manufacturing line operations and assembly'),
  ('d2000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001', 'Quality Assurance', 'Product quality testing and compliance')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- DEMO ASSETS (include required asset_tag field)
-- ============================================================

INSERT INTO assets (id, company_id, name, asset_tag, category, status, condition, criticality, location_id, manufacturer, model, serial_number, purchase_date, warranty_expiry)
VALUES
  ('d3000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'CNC Machine Alpha-1', 'AST-NXS-001', 'machinery', 'active', 'good', 'critical', 'd1000000-0000-0000-0000-000000000001', 'Haas Automation', 'VF-2SS', 'HAAS-2024-001', '2023-03-15', '2026-03-15'),
  ('d3000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'Forklift FL-200', 'AST-NXS-002', 'vehicle', 'active', 'good', 'high', 'd1000000-0000-0000-0000-000000000003', 'Toyota', '8FGU25', 'TOY-FL-2024-005', '2023-06-01', '2026-06-01'),
  ('d3000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'Emergency Eye Wash Station', 'AST-NXS-003', 'safety_equipment', 'active', 'excellent', 'critical', 'd1000000-0000-0000-0000-000000000002', 'Bradley Corp', 'S19-310', 'BC-EW-2023-012', '2023-01-10', '2028-01-10'),
  ('d3000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001', 'Overhead Crane OC-5T', 'AST-NXS-004', 'lifting_equipment', 'maintenance', 'fair', 'critical', 'd1000000-0000-0000-0000-000000000001', 'Demag', 'KBK II', 'DMG-OC-2022-003', '2022-08-20', '2025-08-20'),
  ('d3000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000001', 'HVAC Unit - Plant Floor', 'AST-NXS-005', 'hvac', 'active', 'good', 'medium', 'd1000000-0000-0000-0000-000000000001', 'Carrier', '50XC', 'CAR-HVAC-2023-007', '2023-04-01', '2028-04-01'),
  ('d3000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000001', 'Fire Suppression System', 'AST-NXS-006', 'fire_safety', 'active', 'excellent', 'critical', 'd1000000-0000-0000-0000-000000000001', 'Kidde', 'SAPPHIRE', 'KID-FS-2023-001', '2023-02-15', '2033-02-15')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- DEMO WORK ORDERS (no user FK required)
-- ============================================================

INSERT INTO work_orders (id, company_id, title, description, status, priority, type, asset_id, created_at, updated_at)
VALUES
  ('d6000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'CNC Machine Alpha-1 preventive maintenance', 'Scheduled PM: oil change, filter replacement, axis calibration, coolant flush.', 'in_progress', 'high', 'preventive', 'd3000000-0000-0000-0000-000000000001', '2026-02-01T08:00:00Z', '2026-02-05T10:00:00Z'),
  ('d6000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'Overhead crane brake inspection', 'Emergency inspection of crane OC-5T braking system after malfunction incident.', 'in_progress', 'critical', 'corrective', 'd3000000-0000-0000-0000-000000000004', '2026-02-02T09:00:00Z', '2026-02-03T14:00:00Z'),
  ('d6000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'HVAC filter replacement', 'Quarterly filter replacement for plant floor HVAC unit.', 'completed', 'medium', 'preventive', 'd3000000-0000-0000-0000-000000000005', '2026-01-15T08:00:00Z', '2026-01-16T15:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- NOTE: Incidents and tickets require reporter_id (FK to users).
-- The demo user will be created via `supabase auth create-user` CLI,
-- then migration 005 will seed incidents/tickets referencing that user.
-- ============================================================
