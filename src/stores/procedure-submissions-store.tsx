"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import type { ProcedureSubmission } from "@/types";

const store = createEntityStore<ProcedureSubmission>(
  "harmoniq_procedure_submissions",
  [],
  { stripFields: [] }
);

export const ProcedureSubmissionsProvider = store.Provider;
export const useProcedureSubmissionsStore = store.useStore;
