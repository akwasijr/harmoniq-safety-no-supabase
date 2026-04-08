"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import type { ChecklistTemplate, ChecklistSubmission } from "@/types";

const templatesStore = createEntityStore<ChecklistTemplate>(
  "harmoniq_checklist_templates",
  [],
  { stripFields: ["creator"] }
);
const submissionsStore = createEntityStore<ChecklistSubmission>(
  "harmoniq_checklist_submissions",
  [],
  { stripFields: ["template", "submitter", "location"], columnMap: { general_comments: "notes" } }
);

export const ChecklistTemplatesProvider = templatesStore.Provider;
export const useChecklistTemplatesStore = templatesStore.useStore;

export const ChecklistSubmissionsProvider = submissionsStore.Provider;
export const useChecklistSubmissionsStore = submissionsStore.useStore;
