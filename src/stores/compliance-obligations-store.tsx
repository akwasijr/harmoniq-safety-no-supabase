"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import type { ComplianceObligation } from "@/types";

const store = createEntityStore<ComplianceObligation>("harmoniq_compliance_obligations", [], {
  stripFields: [],
});

export const ComplianceObligationsProvider = store.Provider;
export const useComplianceObligationsStore = store.useStore;
