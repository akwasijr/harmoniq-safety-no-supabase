import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createCorrectiveActionFromInspection,
  createWorkOrderFromInspection,
  createWorkOrderFromMaintenance,
  getOverdueMaintenanceWorkOrders,
} from "@/lib/work-order-generator";
import type { Asset, WorkOrder } from "@/types";

// Stable UUID for deterministic tests
beforeEach(() => {
  vi.stubGlobal("crypto", {
    randomUUID: vi.fn(() => "test-uuid-1234"),
  });
});

function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: "asset-1",
    company_id: "company-1",
    location_id: null,
    parent_asset_id: null,
    is_system: false,
    name: "Test Asset",
    asset_tag: "TAG-001",
    serial_number: null,
    qr_code: null,
    category: "machinery",
    sub_category: null,
    asset_type: "fixed",
    criticality: "medium",
    department: null,
    manufacturer: null,
    model: null,
    purchase_date: null,
    installation_date: null,
    warranty_expiry: null,
    expected_life_years: null,
    condition: "good",
    last_condition_assessment: null,
    purchase_cost: null,
    current_value: null,
    depreciation_rate: null,
    currency: "USD",
    maintenance_frequency_days: null,
    last_maintenance_date: null,
    next_maintenance_date: null,
    requires_certification: false,
    safety_instructions: null,
    status: "active",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  } as Asset;
}

function makeWorkOrder(overrides: Partial<WorkOrder> = {}): WorkOrder {
  return {
    id: "wo-existing",
    company_id: "company-1",
    asset_id: "asset-1",
    title: "Existing WO",
    description: "",
    priority: "medium",
    status: "requested",
    requested_by: "user-1",
    assigned_to: null,
    due_date: null,
    estimated_hours: null,
    actual_hours: null,
    parts_cost: null,
    labor_cost: null,
    corrective_action_id: null,
    completed_at: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("createWorkOrderFromInspection", () => {
  it("generates a work order with correct fields", () => {
    const wo = createWorkOrderFromInspection({
      inspection: { id: "insp-1", asset_id: "asset-1", result: "fail", notes: "Broken belt" },
      asset: { id: "asset-1", name: "Conveyor Belt", company_id: "company-1" },
      inspectorId: "user-42",
    });

    expect(wo.id).toBe("test-uuid-1234");
    expect(wo.company_id).toBe("company-1");
    expect(wo.asset_id).toBe("asset-1");
    expect(wo.title).toBe("Inspection Failed — Conveyor Belt");
    expect(wo.description).toContain("fail");
    expect(wo.description).toContain("Broken belt");
    expect(wo.status).toBe("requested");
    expect(wo.requested_by).toBe("user-42");
    expect(wo.assigned_to).toBeNull();
    expect(wo.priority).toBe("medium"); // default when no criticality
  });

  it("maps priority from asset criticality", () => {
    const wo = createWorkOrderFromInspection({
      inspection: { id: "insp-2", asset_id: "a", result: "fail" },
      asset: { id: "a", name: "Reactor", company_id: "c", criticality: "critical" },
      inspectorId: "u",
    });
    expect(wo.priority).toBe("critical");
  });

  it("sets high priority for high-criticality assets", () => {
    const wo = createWorkOrderFromInspection({
      inspection: { id: "insp-3", asset_id: "a", result: "needs_attention" },
      asset: { id: "a", name: "Pump", company_id: "c", criticality: "high" },
      inspectorId: "u",
    });
    expect(wo.priority).toBe("high");
  });

  it("links a generated work order to a corrective action when provided", () => {
    const wo = createWorkOrderFromInspection({
      inspection: { id: "insp-4", asset_id: "a", result: "needs_attention" },
      asset: { id: "a", name: "Pump", company_id: "c" },
      inspectorId: "u",
      correctiveActionId: "ca-123",
    });
    expect(wo.corrective_action_id).toBe("ca-123");
  });
});

describe("createCorrectiveActionFromInspection", () => {
  it("generates a corrective action with inspection linkage and due date", () => {
    const correctiveAction = createCorrectiveActionFromInspection({
      inspection: { id: "insp-1", asset_id: "asset-1", result: "needs_attention", notes: "Broken guard" },
      asset: { id: "asset-1", name: "Conveyor Belt", company_id: "company-1", criticality: "high" },
    });

    expect(correctiveAction.id).toBe("test-uuid-1234");
    expect(correctiveAction.company_id).toBe("company-1");
    expect(correctiveAction.asset_id).toBe("asset-1");
    expect(correctiveAction.inspection_id).toBe("insp-1");
    expect(correctiveAction.severity).toBe("high");
    expect(correctiveAction.status).toBe("open");
    expect(correctiveAction.assigned_to).toBeNull();
    expect(correctiveAction.description).toContain("needs attention");
    expect(correctiveAction.description).toContain("Broken guard");
    expect(correctiveAction.due_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("createWorkOrderFromMaintenance", () => {
  it("generates a work order with correct fields", () => {
    const wo = createWorkOrderFromMaintenance({
      schedule: { id: "sched-1", name: "Oil Change", asset_id: "asset-1", priority: "high" },
      asset: { id: "asset-1", name: "Generator", company_id: "company-1" },
    });

    expect(wo.id).toBe("test-uuid-1234");
    expect(wo.title).toBe("Scheduled Maintenance — Generator");
    expect(wo.description).toContain("Oil Change");
    expect(wo.priority).toBe("high");
    expect(wo.status).toBe("requested");
    expect(wo.requested_by).toBe("system");
  });

  it("defaults to medium priority when schedule has no priority", () => {
    const wo = createWorkOrderFromMaintenance({
      schedule: { id: "s", name: "Check", asset_id: "a" },
      asset: { id: "a", name: "Fan", company_id: "c" },
    });
    expect(wo.priority).toBe("medium");
  });

  it("defaults to medium for invalid priority strings", () => {
    const wo = createWorkOrderFromMaintenance({
      schedule: { id: "s", name: "Check", asset_id: "a", priority: "urgent" },
      asset: { id: "a", name: "Fan", company_id: "c" },
    });
    expect(wo.priority).toBe("medium");
  });
});

describe("getOverdueMaintenanceWorkOrders", () => {
  it("returns work orders for overdue assets", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const asset = makeAsset({
      id: "asset-overdue",
      name: "Old Pump",
      next_maintenance_date: yesterday.toISOString(),
      criticality: "high",
    });

    const result = getOverdueMaintenanceWorkOrders({
      assets: [asset],
      existingWorkOrders: [],
    });

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Scheduled Maintenance — Old Pump");
    expect(result[0].priority).toBe("high");
    expect(result[0].status).toBe("requested");
  });

  it("skips assets with no next_maintenance_date", () => {
    const asset = makeAsset({ next_maintenance_date: null });
    const result = getOverdueMaintenanceWorkOrders({
      assets: [asset],
      existingWorkOrders: [],
    });
    expect(result).toHaveLength(0);
  });

  it("skips assets whose maintenance is in the future", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const asset = makeAsset({ next_maintenance_date: tomorrow.toISOString() });
    const result = getOverdueMaintenanceWorkOrders({
      assets: [asset],
      existingWorkOrders: [],
    });
    expect(result).toHaveLength(0);
  });

  it("skips assets that already have an open work order", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const asset = makeAsset({
      id: "asset-1",
      next_maintenance_date: yesterday.toISOString(),
    });

    const existingWO = makeWorkOrder({
      asset_id: "asset-1",
      status: "in_progress",
    });

    const result = getOverdueMaintenanceWorkOrders({
      assets: [asset],
      existingWorkOrders: [existingWO],
    });
    expect(result).toHaveLength(0);
  });

  it("does NOT skip assets with completed/cancelled work orders", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const asset = makeAsset({
      id: "asset-1",
      next_maintenance_date: yesterday.toISOString(),
    });

    const completedWO = makeWorkOrder({ asset_id: "asset-1", status: "completed" });
    const cancelledWO = makeWorkOrder({ asset_id: "asset-1", status: "cancelled" });

    const result = getOverdueMaintenanceWorkOrders({
      assets: [asset],
      existingWorkOrders: [completedWO, cancelledWO],
    });
    expect(result).toHaveLength(1);
  });

  it("includes today as overdue (due today = overdue)", () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const asset = makeAsset({
      next_maintenance_date: today.toISOString(),
    });

    const result = getOverdueMaintenanceWorkOrders({
      assets: [asset],
      existingWorkOrders: [],
    });
    expect(result).toHaveLength(1);
  });
});
