"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import type { Incident } from "@/types";

const store = createEntityStore<Incident>("harmoniq_incidents", [], {
  stripFields: ["reporter", "location", "asset", "assigned_to", "documents"],
  realtimeSubscribe: true,
});

export const IncidentsStoreProvider = store.Provider;
export const useIncidentsStore = store.useStore;
