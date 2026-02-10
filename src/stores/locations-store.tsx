"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import { mockLocations } from "@/mocks/data";
import type { Location } from "@/types";

const store = createEntityStore<Location>("harmoniq_locations", mockLocations);

export const LocationsStoreProvider = store.Provider;
export const useLocationsStore = store.useStore;
