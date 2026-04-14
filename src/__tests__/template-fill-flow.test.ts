import { describe, it, expect } from "vitest";
import { activateIndustryTemplate, getTemplatePublishStatus, isVisibleToFieldApp } from "@/lib/template-activation";
import { getBuiltInProcedureTemplates } from "@/data/procedure-templates";
import { getTemplateById } from "@/data/industry-templates";
import { getRiskAssessmentTemplateById, getRiskAssessmentTemplatesByIndustry } from "@/data/risk-assessment-templates";
import { completeProcedureStep, resolveProcedureStepTemplateId } from "@/lib/procedure-flow";
import type { ChecklistTemplate, ProcedureSubmission } from "@/types";

const makeTemplate = (overrides: Partial<ChecklistTemplate> = {}): ChecklistTemplate => ({
  id: "tpl-1",
  company_id: "company-1",
  name: "Test Checklist",
  description: null,
  category: "general",
  assignment: "all",
  recurrence: "daily",
  publish_status: "published",
  is_active: true,
  items: [{ id: "item-1", question: "Test?", type: "yes_no_na", required: true, order: 1 }],
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

describe("Template activation and visibility", () => {
  describe("getTemplatePublishStatus", () => {
    it("returns published when publish_status is published", () => {
      expect(getTemplatePublishStatus(makeTemplate({ publish_status: "published" }))).toBe("published");
    });

    it("returns draft when publish_status is draft", () => {
      expect(getTemplatePublishStatus(makeTemplate({ publish_status: "draft" }))).toBe("draft");
    });

    it("defaults to draft when publish_status is missing", () => {
      expect(getTemplatePublishStatus(makeTemplate({ publish_status: undefined }))).toBe("draft");
    });
  });

  describe("isVisibleToFieldApp", () => {
    it("returns true for published + active template", () => {
      expect(isVisibleToFieldApp(makeTemplate({ publish_status: "published", is_active: true }))).toBe(true);
    });

    it("returns false for published but disabled template", () => {
      expect(isVisibleToFieldApp(makeTemplate({ publish_status: "published", is_active: false }))).toBe(false);
    });

    it("returns false for draft template", () => {
      expect(isVisibleToFieldApp(makeTemplate({ publish_status: "draft", is_active: true }))).toBe(false);
    });

    it("returns false for archived template", () => {
      expect(isVisibleToFieldApp(makeTemplate({ publish_status: "archived", is_active: true }))).toBe(false);
    });
  });

  describe("Template fill flow prerequisites", () => {
    it("published + active template should be findable by ID in store items", () => {
      const templates = [
        makeTemplate({ id: "tpl-1", company_id: "company-1", publish_status: "published", is_active: true }),
        makeTemplate({ id: "tpl-2", company_id: "company-2", publish_status: "draft" }),
      ];
      
      // Simulates fill page lookup — finds by ID in all items
      const found = templates.find((t) => t.id === "tpl-1");
      expect(found).toBeDefined();
      expect(found!.name).toBe("Test Checklist");
    });

    it("template should be findable even when companyId filter would exclude it", () => {
      const allItems = [
        makeTemplate({ id: "tpl-1", company_id: "company-a" }),
        makeTemplate({ id: "tpl-2", company_id: "company-b" }),
      ];
      
      // Simulates the bug: company filter returns empty because companyId is different
      const companyFiltered = allItems.filter((t) => t.company_id === "company-x"); // wrong company
      expect(companyFiltered.length).toBe(0);
      
      // But direct lookup in allItems works (the fix)
      const found = allItems.find((t) => t.id === "tpl-1");
      expect(found).toBeDefined();
    });

    it("active checklist templates should exclude risk assessments", () => {
      const templates = [
        makeTemplate({ id: "cl-1", category: "general", publish_status: "published", is_active: true }),
        makeTemplate({ id: "ra-1", category: "risk_assessment", publish_status: "published", is_active: true }),
        makeTemplate({ id: "cl-2", category: "fire_safety", publish_status: "published", is_active: true }),
        makeTemplate({ id: "draft-1", category: "general", publish_status: "draft", is_active: false }),
      ];

      const published = templates.filter(
        (t) => getTemplatePublishStatus(t) === "published" && t.is_active !== false
      );
      expect(published.length).toBe(3);

      const checklistsOnly = published.filter((t) => t.category !== "risk_assessment");
      expect(checklistsOnly.length).toBe(2);
      expect(checklistsOnly.map((t) => t.id)).toEqual(["cl-1", "cl-2"]);

      const assessmentsOnly = published.filter((t) => t.category === "risk_assessment");
      expect(assessmentsOnly.length).toBe(1);
      expect(assessmentsOnly[0].id).toBe("ra-1");
    });

    it("can materialize built-in checklist and risk assessment templates for the shared dashboard fill page", () => {
      const checklistTemplate = activateIndustryTemplate(
        getTemplateById("construction_jha")!,
        "company-1",
        "US",
        (key) => key,
      );
      const assessmentTemplate = activateIndustryTemplate(
        getRiskAssessmentTemplateById("ra_construction_confined_space")!,
        "company-1",
        "US",
        (key) => key,
      );

      expect(checklistTemplate.id).toBe("activated:company-1:construction_jha");
      expect(checklistTemplate.source_template_id).toBe("construction_jha");
      expect(checklistTemplate.items[0]?.id).toBe("construction_jha:task_description");
      expect(assessmentTemplate.id).toBe("activated:company-1:ra_construction_confined_space");
      expect(assessmentTemplate.source_template_id).toBe("ra_construction_confined_space");
      expect(assessmentTemplate.category).toBe("confined_space");
      expect(assessmentTemplate.items[0]?.id).toBe("ra_construction_confined_space:hazard_description");
    });

    it("exposes generic risk assessment templates under the generic group", () => {
      const templates = getRiskAssessmentTemplatesByIndustry("generic", "US");

      expect(templates.length).toBeGreaterThan(0);
      expect(templates.map((template) => template.id)).toContain("ra_generic_5step_hse");
      expect(templates.every((template) => template.industry === "generic")).toBe(true);
    });

    it("ships built-in procedures whose first step points at a real template", () => {
      const steps = getBuiltInProcedureTemplates().flatMap((procedure) => procedure.steps);

      expect(steps.length).toBeGreaterThan(0);
      for (const step of steps) {
        const resolvedId = resolveProcedureStepTemplateId(step.template_id);
        const resolvedTemplate = getTemplateById(resolvedId) || getRiskAssessmentTemplateById(resolvedId);
        expect(resolvedTemplate, `${step.template_name} should resolve ${resolvedId}`).toBeDefined();
      }
    });

    it("completes a procedure step and advances to the next step", () => {
      const submission: ProcedureSubmission = {
        id: "proc-sub-1",
        company_id: "company-1",
        procedure_template_id: "proc-1",
        submitter_id: "user-1",
        location_id: null,
        status: "in_progress",
        current_step: 1,
        step_submissions: [
          { step_id: "step-1", submission_id: null, status: "in_progress", completed_at: null },
          { step_id: "step-2", submission_id: null, status: "pending", completed_at: null },
        ],
        started_at: "2026-04-12T00:00:00.000Z",
        completed_at: null,
        next_due_date: null,
        created_at: "2026-04-12T00:00:00.000Z",
        updated_at: "2026-04-12T00:00:00.000Z",
      };

      const updated = completeProcedureStep(
        submission,
        "step-1",
        "checklist-sub-1",
        "2026-04-12T00:05:00.000Z",
      );

      expect(updated.current_step).toBe(2);
      expect(updated.status).toBe("in_progress");
      expect(updated.step_submissions[0]).toMatchObject({
        submission_id: "checklist-sub-1",
        status: "completed",
        completed_at: "2026-04-12T00:05:00.000Z",
      });
      expect(updated.step_submissions[1].status).toBe("in_progress");
    });
  });
});
