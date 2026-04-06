"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import { mockIncidents } from "@/mocks/data";
import type { Incident } from "@/types";

const store = createEntityStore<Incident>("harmoniq_incidents", mockIncidents, {
  stripFields: ["reporter", "location", "asset", "assigned_to", "assigned_to_team_id", "documents"],
});

export const IncidentsStoreProvider = store.Provider;
export const useIncidentsStore = store.useStore;
