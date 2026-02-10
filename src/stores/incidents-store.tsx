"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import { mockIncidents } from "@/mocks/data";
import type { Incident } from "@/types";

const store = createEntityStore<Incident>("harmoniq_incidents", mockIncidents);

export const IncidentsStoreProvider = store.Provider;
export const useIncidentsStore = store.useStore;
