import type { WorkOrder, Asset, WorkOrderPriority } from "@/types";

/**
 * Map asset criticality to work order priority.
 */
function priorityFromCriticality(
  criticality: "critical" | "high" | "medium" | "low",
): WorkOrderPriority {
  return criticality; // AssetCriticality values map 1:1 to WorkOrderPriority
}

/**
 * Generate a work order from a failed / needs-attention inspection.
 */
export function createWorkOrderFromInspection(params: {
  inspection: { id: string; asset_id: string; result: string; notes?: string };
  asset: { id: string; name: string; company_id: string; criticality?: "critical" | "high" | "medium" | "low" };
  inspectorId: string;
}): WorkOrder {
  const { inspection, asset, inspectorId } = params;
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    company_id: asset.company_id,
    asset_id: asset.id,
    title: `Inspection Failed — ${asset.name}`,
    description: `Auto-generated from inspection ${inspection.id} (result: ${inspection.result}).${
      inspection.notes ? `\n\nNotes: ${inspection.notes}` : ""
    }`,
    priority: priorityFromCriticality(asset.criticality ?? "medium"),
    status: "requested",
    requested_by: inspectorId,
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
    description: `Auto-generated for overdue maintenance schedule "${schedule.name}" (schedule ${schedule.id}).`,
    priority,
    status: "requested",
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

const OPEN_STATUSES = new Set(["requested", "approved", "in_progress"]);

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
