"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import type { WorkOrder } from "@/types";

const store = createEntityStore<WorkOrder>("harmoniq_work_orders", []);

export const WorkOrdersProvider = store.Provider;
export const useWorkOrdersStore = store.useStore;
