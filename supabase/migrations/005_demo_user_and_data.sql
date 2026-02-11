-- Migration 005: Create demo user profile and seed data requiring user FK
-- Demo user auth ID: f4e8e643-a56c-4755-a533-01fa8ed64d69

-- ============================================================
-- DEMO USER PROFILE
-- ============================================================

INSERT INTO users (id, company_id, email, first_name, last_name, role, status, department, job_title, location_id, email_verified_at, oauth_provider)
VALUES (
  'f4e8e643-a56c-4755-a533-01fa8ed64d69',
  'd0000000-0000-0000-0000-000000000001',
  'demo@harmoniq.safety',
  'Demo',
  'User',
  'company_admin',
  'active',
  'Safety & Compliance',
  'Safety Manager',
  'd1000000-0000-0000-0000-000000000001',
  now(),
  'email'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- DEMO INCIDENTS (require reporter_id FK)
-- ============================================================

INSERT INTO incidents (id, company_id, reference_number, reporter_id, type, title, description, status, severity, priority, incident_date, location_id, created_at, updated_at)
VALUES
  ('d4000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'INC-2026-001', 'f4e8e643-a56c-4755-a533-01fa8ed64d69', 'environmental', 'Chemical spill in Assembly Area B', 'Approximately 2 gallons of hydraulic fluid leaked from CNC machine during routine operation. Area cordoned off, cleanup initiated.', 'in_progress', 'high', 'high', '2026-01-28', 'd1000000-0000-0000-0000-000000000002', '2026-01-28T09:15:00Z', '2026-01-28T14:30:00Z'),
  ('d4000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'INC-2026-002', 'f4e8e643-a56c-4755-a533-01fa8ed64d69', 'near_miss', 'Near-miss: Forklift collision at dock', 'Forklift nearly collided with pedestrian at loading dock 3. No injuries. Visibility obstruction from stacked pallets identified as cause.', 'in_review', 'medium', 'medium', '2026-01-25', 'd1000000-0000-0000-0000-000000000003', '2026-01-25T14:20:00Z', '2026-01-27T10:00:00Z'),
  ('d4000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'INC-2026-003', 'f4e8e643-a56c-4755-a533-01fa8ed64d69', 'injury', 'Worker hand injury on press machine', 'Operator sustained minor laceration on left hand while clearing material jam from hydraulic press. First aid administered on-site.', 'resolved', 'high', 'high', '2026-01-20', 'd1000000-0000-0000-0000-000000000001', '2026-01-20T11:45:00Z', '2026-01-22T16:00:00Z'),
  ('d4000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001', 'INC-2026-004', 'f4e8e643-a56c-4755-a533-01fa8ed64d69', 'fire', 'Fire alarm false trigger - Warehouse', 'Fire alarm activated in Dallas warehouse zone C. Investigation confirmed dust accumulation on detector. No actual fire.', 'resolved', 'low', 'low', '2026-01-18', 'd1000000-0000-0000-0000-000000000003', '2026-01-18T08:30:00Z', '2026-01-18T12:00:00Z'),
  ('d4000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000001', 'INC-2026-005', 'f4e8e643-a56c-4755-a533-01fa8ed64d69', 'equipment_failure', 'Overhead crane malfunction during lift', 'Crane OC-5T experienced unexpected braking during 3-ton load lift. Load safely lowered. Crane taken out of service for inspection.', 'in_progress', 'critical', 'critical', '2026-02-01', 'd1000000-0000-0000-0000-000000000001', '2026-02-01T07:00:00Z', '2026-02-02T09:00:00Z'),
  ('d4000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000001', 'INC-2026-006', 'f4e8e643-a56c-4755-a533-01fa8ed64d69', 'injury', 'Slip and fall in breakroom', 'Employee slipped on wet floor in breakroom. Wet floor sign was not posted after mopping. Minor bruising reported.', 'new', 'medium', 'medium', '2026-02-05', 'd1000000-0000-0000-0000-000000000004', '2026-02-05T12:15:00Z', '2026-02-05T12:15:00Z'),
  ('d4000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000001', 'INC-2026-007', 'f4e8e643-a56c-4755-a533-01fa8ed64d69', 'equipment_failure', 'Electrical panel overheating detected', 'Thermal imaging during routine check revealed Panel E-12 operating at 85°C. Immediate shutdown ordered.', 'in_progress', 'critical', 'critical', '2026-02-08', 'd1000000-0000-0000-0000-000000000001', '2026-02-08T15:30:00Z', '2026-02-09T08:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- DEMO TICKETS (require reporter_id FK)
-- ============================================================

INSERT INTO tickets (id, company_id, title, description, status, priority, reporter_id, created_at, updated_at)
VALUES
  ('d5000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Replace safety signage at dock area', 'Faded warning signs at loading docks 1-4 need replacement per OSHA requirements.', 'new', 'medium', 'f4e8e643-a56c-4755-a533-01fa8ed64d69', '2026-02-01T10:00:00Z', '2026-02-01T10:00:00Z'),
  ('d5000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'Install additional emergency lighting', 'Emergency lighting needed in corridor between buildings A and C per recent safety audit.', 'in_progress', 'high', 'f4e8e643-a56c-4755-a533-01fa8ed64d69', '2026-01-28T14:00:00Z', '2026-02-03T09:00:00Z'),
  ('d5000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'Update lockout/tagout procedures', 'LOTO procedures for CNC machines need updating after equipment modifications.', 'waiting', 'critical', 'f4e8e643-a56c-4755-a533-01fa8ed64d69', '2026-01-15T11:00:00Z', '2026-01-20T16:00:00Z')
ON CONFLICT (id) DO NOTHING;
