"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import type { ChecklistTemplate, ChecklistSubmission } from "@/types";
import { mockChecklistTemplates, mockChecklistSubmissions } from "@/mocks/data";
import { WORK_ORDER_PROCEDURE_TEMPLATES } from "@/data/work-order-procedure-templates";

const builtInAndMock = [
  ...WORK_ORDER_PROCEDURE_TEMPLATES,
  ...mockChecklistTemplates.filter(
    (t) => !WORK_ORDER_PROCEDURE_TEMPLATES.some((b) => b.id === t.id),
  ),
];

const templatesStore = createEntityStore<ChecklistTemplate>(
  "harmoniq_checklist_templates",
  builtInAndMock,
  { stripFields: ["creator", "work_order_type"] }
);
const submissionsStore = createEntityStore<ChecklistSubmission>(
  "harmoniq_checklist_submissions",
  mockChecklistSubmissions,
  { stripFields: ["template", "submitter", "location"], columnMap: { general_comments: "notes" } }
);

export const ChecklistTemplatesProvider = templatesStore.Provider;
export const useChecklistTemplatesStore = templatesStore.useStore;

export const ChecklistSubmissionsProvider = submissionsStore.Provider;
export const useChecklistSubmissionsStore = submissionsStore.useStore;
