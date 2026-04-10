"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import type { WasteLog } from "@/types";

const store = createEntityStore<WasteLog>("harmoniq_waste_logs", [], {
  stripFields: [],
});

export const WasteLogsProvider = store.Provider;
export const useWasteLogsStore = store.useStore;
