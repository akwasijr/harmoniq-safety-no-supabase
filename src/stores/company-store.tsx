"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import { mockCompanies } from "@/mocks/data";
import type { Company } from "@/types";

const store = createEntityStore<Company>("harmoniq_companies", mockCompanies);

export const CompanyStoreProvider = store.Provider;
export const useCompanyStore = store.useStore;
