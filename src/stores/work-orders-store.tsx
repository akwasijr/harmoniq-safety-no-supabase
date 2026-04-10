"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import type { WorkOrder } from "@/types";

const store = createEntityStore<WorkOrder>("harmoniq_work_orders", [], {
  columnMap: {
    requested_by: "requester_id",
    parts_cost: "estimated_cost",
    labor_cost: "actual_cost",
  },
  stripFields: ["parts_used", "declined_reason", "declined_at", "declined_by", "injury_locations"],
  realtimeSubscribe: true,
});

export const WorkOrdersProvider = store.Provider;
export const useWorkOrdersStore = store.useStore;
