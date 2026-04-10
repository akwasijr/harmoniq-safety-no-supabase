"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import type { PermitToWork } from "@/types";

const store = createEntityStore<PermitToWork>("harmoniq_permits", [], {
  stripFields: [],
});

export const PermitsProvider = store.Provider;
export const usePermitsStore = store.useStore;
