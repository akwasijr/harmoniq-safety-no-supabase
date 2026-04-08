import type { WorkOrder, Asset, WorkOrderPriority, CorrectiveAction, Severity } from "@/types";

/**
 * Map asset criticality to work order priority.
 */
function priorityFromCriticality(
  criticality: "critical" | "high" | "medium" | "low",
): WorkOrderPriority {
  return criticality; // AssetCriticality values map 1:1 to WorkOrderPriority
}

function dueInDays(priority: WorkOrderPriority): number {
  switch (priority) {
    case "critical":
      return 1;
    case "high":
      return 3;
    case "medium":
      return 7;
    case "low":
    default:
      return 14;
  }
}

function toDateOnly(isoDate: string): string {
  return isoDate.split("T")[0];
}

/**
 * Generate a work order from a failed / needs-attention inspection.
 */
export function createWorkOrderFromInspection(params: {
  inspection: { id: string; asset_id: string; result: string; notes?: string };
  asset: { id: string; name: string; company_id: string; criticality?: "critical" | "high" | "medium" | "low" };
  inspectorId: string;
  correctiveActionId?: string | null;
}): WorkOrder {
  const { inspection, asset, inspectorId, correctiveActionId = null } = params;
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    company_id: asset.company_id,
    asset_id: asset.id,
    title: `Inspection Failed — ${asset.name}`,
    description: `Inspection result: ${inspection.result.replace(/_/g, " ")}.${
      inspection.notes ? `\nNotes: ${inspection.notes}` : ""
    }`,
    priority: priorityFromCriticality(asset.criticality ?? "medium"),
    type: "inspection",
    status: "waiting_approval",
    requested_by: inspectorId,
    assigned_to: null,
    due_date: null,
    estimated_hours: null,
    actual_hours: null,
    parts_cost: null,
    labor_cost: null,
    corrective_action_id: correctiveActionId,
    completed_at: null,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Generate a corrective action from a failed / needs-attention inspection.
 */
export function createCorrectiveActionFromInspection(params: {
  inspection: { id: string; asset_id: string; result: string; notes?: string };
  asset: { id: string; name: string; company_id: string; criticality?: "critical" | "high" | "medium" | "low" };
}): CorrectiveAction {
  const { inspection, asset } = params;
  const now = new Date().toISOString();
  const severity: Severity = priorityFromCriticality(asset.criticality ?? "medium");
  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + dueInDays(severity));

  return {
    id: crypto.randomUUID(),
    company_id: asset.company_id,
    asset_id: asset.id,
    inspection_id: inspection.id,
    description: `Follow-up required for ${asset.name}: inspection result ${inspection.result.replace(/_/g, " ")}.${
      inspection.notes ? `\nNotes: ${inspection.notes}` : ""
    }`,
    severity,
    assigned_to: null,
    assigned_to_team_id: null,
    due_date: toDateOnly(dueDate.toISOString()),
    status: "open",
    resolution_notes: null,
    completed_at: null,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Generate a work order from an overdue maintenance schedule.
 */
export function createWorkOrderFromMaintenance(params: {
  schedule: { id: string; name: string; asset_id: string; priority?: string };
  asset: { id: string; name: string; company_id: string };
}): WorkOrder {
  const { schedule, asset } = params;
  const now = new Date().toISOString();

  const priority: WorkOrderPriority =
    (["low", "medium", "high", "critical"] as const).find(
      (p) => p === schedule.priority,
    ) ?? "medium";

  return {
    id: crypto.randomUUID(),
    company_id: asset.company_id,
    asset_id: asset.id,
    title: `Scheduled Maintenance — ${asset.name}`,
    description: `Overdue scheduled maintenance: "${schedule.name}".`,
    priority,
    type: "preventive_maintenance",
    status: "waiting_approval",
    requested_by: "system",
    assigned_to: null,
    due_date: null,
    estimated_hours: null,
    actual_hours: null,
    parts_cost: null,
    labor_cost: null,
    corrective_action_id: null,
    completed_at: null,
    created_at: now,
    updated_at: now,
  };
}

const OPEN_STATUSES = new Set(["waiting_approval", "waiting_material", "approved", "scheduled", "in_progress"]);

/**
 * Check which assets have overdue maintenance and return work orders to create.
 *
 * Skips assets that already have an open (non-completed/cancelled) work order.
 */
export function getOverdueMaintenanceWorkOrders(params: {
  assets: Asset[];
  existingWorkOrders: WorkOrder[];
}): WorkOrder[] {
  const { assets, existingWorkOrders } = params;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build set of asset IDs that already have an open work order
  const assetsWithOpenWO = new Set(
    existingWorkOrders
      .filter((wo) => wo.asset_id !== null && OPEN_STATUSES.has(wo.status))
      .map((wo) => wo.asset_id),
  );

  const workOrders: WorkOrder[] = [];

  for (const asset of assets) {
    if (!asset.next_maintenance_date) continue;
    if (assetsWithOpenWO.has(asset.id)) continue;

    const dueDate = new Date(asset.next_maintenance_date);
    dueDate.setHours(0, 0, 0, 0);

    if (dueDate <= today) {
      workOrders.push(
        createWorkOrderFromMaintenance({
          schedule: {
            id: `maint_${asset.id}`,
            name: "Scheduled Maintenance",
            asset_id: asset.id,
            priority: asset.criticality,
          },
          asset: { id: asset.id, name: asset.name, company_id: asset.company_id },
        }),
      );
    }
  }

  return workOrders;
}
