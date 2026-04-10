"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import type { ComplianceDocument } from "@/types";

const store = createEntityStore<ComplianceDocument>("harmoniq_compliance_documents", [], {
  stripFields: [],
});

export const ComplianceDocumentsProvider = store.Provider;
export const useComplianceDocumentsStore = store.useStore;
