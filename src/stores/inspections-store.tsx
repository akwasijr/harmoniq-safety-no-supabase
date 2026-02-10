"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import type { AssetInspection } from "@/types";

const store = createEntityStore<AssetInspection>("harmoniq_asset_inspections", []);

export const AssetInspectionsProvider = store.Provider;
export const useAssetInspectionsStore = store.useStore;
