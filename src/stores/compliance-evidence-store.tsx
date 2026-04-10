"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import type { ComplianceEvidence } from "@/types";

const store = createEntityStore<ComplianceEvidence>("harmoniq_compliance_evidence", [], {
  stripFields: [],
});

export const ComplianceEvidenceProvider = store.Provider;
export const useComplianceEvidenceStore = store.useStore;
