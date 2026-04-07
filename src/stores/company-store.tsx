"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import type { Company } from "@/types";

const store = createEntityStore<Company>("harmoniq_companies", []);

export const CompanyStoreProvider = store.Provider;
export const useCompanyStore = store.useStore;
