"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import { mockChecklistTemplates, mockChecklistSubmissions } from "@/mocks/data";
import type { ChecklistTemplate, ChecklistSubmission } from "@/types";

const templatesStore = createEntityStore<ChecklistTemplate>(
  "harmoniq_checklist_templates",
  mockChecklistTemplates,
  { stripFields: ["creator"] }
);
const submissionsStore = createEntityStore<ChecklistSubmission>(
  "harmoniq_checklist_submissions",
  mockChecklistSubmissions,
  { stripFields: ["template", "submitter", "location"] }
);

export const ChecklistTemplatesProvider = templatesStore.Provider;
export const useChecklistTemplatesStore = templatesStore.useStore;

export const ChecklistSubmissionsProvider = submissionsStore.Provider;
export const useChecklistSubmissionsStore = submissionsStore.useStore;
