"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import type { SpillRecord } from "@/types";

const store = createEntityStore<SpillRecord>("harmoniq_spill_records", [], {
  stripFields: [],
});

export const SpillRecordsProvider = store.Provider;
export const useSpillRecordsStore = store.useStore;
