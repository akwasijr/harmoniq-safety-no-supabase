"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import type { Asset } from "@/types";

const store = createEntityStore<Asset>("harmoniq_assets", [], {
  stripFields: ["location", "inspections", "certifications"],
});

export const AssetsStoreProvider = store.Provider;
export const useAssetsStore = store.useStore;
