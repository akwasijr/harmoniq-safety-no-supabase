-- Migration 019: add direct location support to work orders
-- Allows a work order to keep its own selected location even when no asset is linked
-- or when the location differs from the asset's default location.

ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_location_id ON work_orders(location_id);
