import { describe, it, expect } from "vitest";
import {
  WORK_ORDER_STATUSES,
  WORK_ORDER_TYPES,
  WORK_ORDER_STATUS_TRANSITIONS,
} from "@/types";
import type { WorkOrderStatus, WorkOrderType } from "@/types";
import { WORK_ORDER_STATUS_COLORS, getStatusVariant } from "@/lib/status-utils";
import { STATUS_FLOWS } from "@/components/tasks/task-status-actions";
import { hasPermission } from "@/lib/permissions";

// ─── Status pipeline transitions ────────────────────────────────────
describe("Work order status transitions", () => {
  it("defines exactly 7 statuses", () => {
    expect(WORK_ORDER_STATUSES).toHaveLength(7);
    expect(WORK_ORDER_STATUSES).toEqual([
      "waiting_approval",
      "waiting_material",
      "approved",
      "scheduled",
      "in_progress",
      "completed",
      "cancelled",
    ]);
  });

  it("terminal statuses have no transitions", () => {
    expect(WORK_ORDER_STATUS_TRANSITIONS.completed).toEqual([]);
    expect(WORK_ORDER_STATUS_TRANSITIONS.cancelled).toEqual([]);
  });

  it("waiting_approval can transition to waiting_material, approved, or cancelled", () => {
    const next = WORK_ORDER_STATUS_TRANSITIONS.waiting_approval;
    expect(next).toContain("waiting_material");
    expect(next).toContain("approved");
    expect(next).toContain("cancelled");
    expect(next).toHaveLength(3);
  });

  it("waiting_material can transition to approved or cancelled", () => {
    const next = WORK_ORDER_STATUS_TRANSITIONS.waiting_material;
    expect(next).toContain("approved");
    expect(next).toContain("cancelled");
    expect(next).toHaveLength(2);
  });

  it("approved can transition to scheduled, in_progress, or cancelled", () => {
    const next = WORK_ORDER_STATUS_TRANSITIONS.approved;
    expect(next).toContain("scheduled");
    expect(next).toContain("in_progress");
    expect(next).toContain("cancelled");
    expect(next).toHaveLength(3);
  });

  it("scheduled can transition to in_progress or cancelled", () => {
    const next = WORK_ORDER_STATUS_TRANSITIONS.scheduled;
    expect(next).toContain("in_progress");
    expect(next).toContain("cancelled");
    expect(next).toHaveLength(2);
  });

  it("in_progress can transition to completed or cancelled", () => {
    const next = WORK_ORDER_STATUS_TRANSITIONS.in_progress;
    expect(next).toContain("completed");
    expect(next).toContain("cancelled");
    expect(next).toHaveLength(2);
  });

  it("every non-terminal status can be cancelled", () => {
    const nonTerminal: WorkOrderStatus[] = [
      "waiting_approval",
      "waiting_material",
      "approved",
      "scheduled",
      "in_progress",
    ];
    for (const status of nonTerminal) {
      expect(WORK_ORDER_STATUS_TRANSITIONS[status]).toContain("cancelled");
    }
  });

  it("no status transitions to waiting_approval (it is always the start)", () => {
    for (const [, targets] of Object.entries(WORK_ORDER_STATUS_TRANSITIONS)) {
      expect(targets).not.toContain("waiting_approval");
    }
  });
});

// ─── TaskStatusActions STATUS_FLOWS alignment ───────────────────────
describe("TaskStatusActions work-order flow alignment", () => {
  const woFlows = STATUS_FLOWS["work-order"];

  it("matches the types definition for all statuses", () => {
    for (const status of WORK_ORDER_STATUSES) {
      const flowNext = woFlows[status] ?? [];
      const typeNext = WORK_ORDER_STATUS_TRANSITIONS[status];
      expect(flowNext.sort()).toEqual([...typeNext].sort());
    }
  });

  it("does not contain the old 'requested' status", () => {
    expect(woFlows).not.toHaveProperty("requested");
  });
});

// ─── Work order types ───────────────────────────────────────────────
describe("Work order types", () => {
  it("defines exactly 5 types", () => {
    expect(WORK_ORDER_TYPES).toHaveLength(5);
  });

  it("includes all expected types", () => {
    const expected: WorkOrderType[] = [
      "preventive_maintenance",
      "corrective_maintenance",
      "emergency",
      "inspection",
      "service_request",
    ];
    for (const t of expected) {
      expect(WORK_ORDER_TYPES).toContain(t);
    }
  });
});

// ─── Badge/status color mapping ─────────────────────────────────────
describe("Work order status colors", () => {
  it("has a color mapping for every status", () => {
    for (const status of WORK_ORDER_STATUSES) {
      expect(WORK_ORDER_STATUS_COLORS[status]).toBeDefined();
    }
  });

  it("does not have a mapping for the old 'requested' status", () => {
    expect(WORK_ORDER_STATUS_COLORS).not.toHaveProperty("requested");
  });

  it("getStatusVariant returns a valid variant for all statuses", () => {
    for (const status of WORK_ORDER_STATUSES) {
      const variant = getStatusVariant(status);
      expect(variant).toBeTruthy();
      expect(typeof variant).toBe("string");
    }
  });

  it("maps waiting_approval and waiting_material to pending", () => {
    expect(getStatusVariant("waiting_approval")).toBe("pending");
    expect(getStatusVariant("waiting_material")).toBe("pending");
  });

  it("maps completed to completed variant", () => {
    expect(getStatusVariant("completed")).toBe("completed");
  });

  it("maps cancelled to cancelled variant", () => {
    expect(getStatusVariant("cancelled")).toBe("cancelled");
  });
});

// ─── RBAC for work order status log ─────────────────────────────────
describe("Work order status log RBAC", () => {
  it("super_admin has full CRUD on work_order_status_log", () => {
    expect(hasPermission("super_admin", "work_order_status_log", "create")).toBe(true);
    expect(hasPermission("super_admin", "work_order_status_log", "read")).toBe(true);
    expect(hasPermission("super_admin", "work_order_status_log", "update")).toBe(true);
    expect(hasPermission("super_admin", "work_order_status_log", "delete")).toBe(true);
  });

  it("company_admin has full CRUD on work_order_status_log", () => {
    expect(hasPermission("company_admin", "work_order_status_log", "create")).toBe(true);
    expect(hasPermission("company_admin", "work_order_status_log", "read")).toBe(true);
    expect(hasPermission("company_admin", "work_order_status_log", "delete")).toBe(true);
  });

  it("manager can create, read, update but not delete status log", () => {
    expect(hasPermission("manager", "work_order_status_log", "create")).toBe(true);
    expect(hasPermission("manager", "work_order_status_log", "read")).toBe(true);
    expect(hasPermission("manager", "work_order_status_log", "update")).toBe(true);
    expect(hasPermission("manager", "work_order_status_log", "delete")).toBe(false);
  });

  it("employee can create and read but not update/delete status log", () => {
    expect(hasPermission("employee", "work_order_status_log", "create")).toBe(true);
    expect(hasPermission("employee", "work_order_status_log", "read")).toBe(true);
    expect(hasPermission("employee", "work_order_status_log", "update")).toBe(false);
    expect(hasPermission("employee", "work_order_status_log", "delete")).toBe(false);
  });

  it("viewer can only read status log", () => {
    expect(hasPermission("viewer", "work_order_status_log", "create")).toBe(false);
    expect(hasPermission("viewer", "work_order_status_log", "read")).toBe(true);
    expect(hasPermission("viewer", "work_order_status_log", "update")).toBe(false);
    expect(hasPermission("viewer", "work_order_status_log", "delete")).toBe(false);
  });
});

// ─── Status log entry shape ─────────────────────────────────────────
describe("WorkOrderStatusLogEntry type contract", () => {
  it("can construct a valid status log entry", () => {
    const entry = {
      id: "log-1",
      work_order_id: "wo-1",
      from_status: "waiting_approval" as WorkOrderStatus,
      to_status: "approved" as WorkOrderStatus,
      comment: "Approved after review",
      changed_by: "user-1",
      changed_at: "2026-04-08T12:00:00Z",
    };

    expect(entry.from_status).toBe("waiting_approval");
    expect(entry.to_status).toBe("approved");
    expect(entry.comment.length).toBeLessThanOrEqual(100);
  });

  it("allows null from_status for initial creation", () => {
    const entry = {
      id: "log-0",
      work_order_id: "wo-1",
      from_status: null,
      to_status: "waiting_approval" as WorkOrderStatus,
      comment: "",
      changed_by: "user-1",
      changed_at: "2026-04-08T12:00:00Z",
    };

    expect(entry.from_status).toBeNull();
    expect(entry.to_status).toBe("waiting_approval");
  });
});
