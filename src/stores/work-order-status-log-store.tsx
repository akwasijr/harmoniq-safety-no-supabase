"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import type { WorkOrderStatusLogEntry } from "@/types";

const store = createEntityStore<WorkOrderStatusLogEntry>(
  "harmoniq_work_order_status_log",
  [],
  {
    allowMissingTable: true,
    columnMap: {
      work_order_id: "work_order_id",
      from_status: "from_status",
      to_status: "to_status",
      changed_by: "changed_by",
      changed_at: "changed_at",
    },
  },
);

export const WorkOrderStatusLogProvider = store.Provider;
export const useWorkOrderStatusLogStore = store.useStore;
