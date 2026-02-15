"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import { mockAssets } from "@/mocks/data";
import type { Asset } from "@/types";

const store = createEntityStore<Asset>("harmoniq_assets", mockAssets, {
  stripFields: ["inspections", "certifications", "location"],
});

export const AssetsStoreProvider = store.Provider;
export const useAssetsStore = store.useStore;
