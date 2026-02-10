-- Harmoniq Safety — Seed Data
-- Run this AFTER creating your first user via Supabase Auth (dashboard or CLI).
--
-- Steps:
-- 1. Go to Supabase Dashboard → Authentication → Users → Add user
--    Email: admin@harmoniq.io  Password: (your choice)
-- 2. Copy the user's UUID from the dashboard
-- 3. Replace 'YOUR_AUTH_USER_UUID' below with that UUID
-- 4. Run this SQL in the SQL Editor

-- Create the default company
INSERT INTO companies (id, name, slug, app_name, country, language, status, primary_color, tier, seat_limit, currency)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Acme Industries',
  'acme',
  'Acme Safety',
  'US',
  'en',
  'active',
  '#8B5CF6',
  'professional',
  50,
  'USD'
);

-- Create the super admin user profile (replace UUID with your auth user's ID)
-- INSERT INTO users (id, company_id, email, first_name, last_name, role, status)
-- VALUES (
--   'YOUR_AUTH_USER_UUID',
--   'a0000000-0000-0000-0000-000000000001',
--   'admin@harmoniq.io',
--   'Admin',
--   'User',
--   'super_admin',
--   'active'
-- );

-- Example: Create a sample location
INSERT INTO locations (id, company_id, type, name, address, employee_count, asset_count)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'site',
  'Main Office',
  '123 Safety Street, Houston, TX 77001',
  25,
  50
);
