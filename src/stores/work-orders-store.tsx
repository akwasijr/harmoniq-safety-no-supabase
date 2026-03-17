"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import type { WorkOrder } from "@/types";
import { mockWorkOrders } from "@/mocks/data";

const store = createEntityStore<WorkOrder>("harmoniq_work_orders", mockWorkOrders);

export const WorkOrdersProvider = store.Provider;
export const useWorkOrdersStore = store.useStore;
