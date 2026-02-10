"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import type { Part } from "@/types";

const store = createEntityStore<Part>("harmoniq_parts", []);

export const PartsProvider = store.Provider;
export const usePartsStore = store.useStore;
