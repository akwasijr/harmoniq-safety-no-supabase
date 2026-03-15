"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import type { Part } from "@/types";

const store = createEntityStore<Part>("harmoniq_parts", [], {
  columnMap: {
    part_number: "sku",
    quantity_in_stock: "quantity",
    minimum_stock: "min_quantity",
  },
});

export const PartsProvider = store.Provider;
export const usePartsStore = store.useStore;
