"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import type { ProcedureTemplate } from "@/types";
import { getBuiltInProcedureTemplates } from "@/data/procedure-templates";

const store = createEntityStore<ProcedureTemplate>(
  "harmoniq_procedure_templates",
  getBuiltInProcedureTemplates(),
  { stripFields: [] }
);

export const ProcedureTemplatesProvider = store.Provider;
export const useProcedureTemplatesStore = store.useStore;
