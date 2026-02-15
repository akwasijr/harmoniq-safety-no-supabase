"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import { mockLocations } from "@/mocks/data";
import type { Location } from "@/types";

const store = createEntityStore<Location>("harmoniq_locations", mockLocations, {
  stripFields: ["children", "parent", "emergency_contacts"],
});

export const LocationsStoreProvider = store.Provider;
export const useLocationsStore = store.useStore;
