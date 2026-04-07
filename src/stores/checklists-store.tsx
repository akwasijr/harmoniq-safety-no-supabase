"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import type { ChecklistTemplate, ChecklistSubmission } from "@/types";

const templatesStore = createEntityStore<ChecklistTemplate>(
  "harmoniq_checklist_templates",
  [],
  { stripFields: ["creator", "assignment", "recurrence", "source_template_id", "regulation", "tags", "publish_status", "is_active"] }
);
const submissionsStore = createEntityStore<ChecklistSubmission>(
  "harmoniq_checklist_submissions",
  [],
  { stripFields: ["template", "submitter", "location", "general_comments"] }
);

export const ChecklistTemplatesProvider = templatesStore.Provider;
export const useChecklistTemplatesStore = templatesStore.useStore;

export const ChecklistSubmissionsProvider = submissionsStore.Provider;
export const useChecklistSubmissionsStore = submissionsStore.useStore;
