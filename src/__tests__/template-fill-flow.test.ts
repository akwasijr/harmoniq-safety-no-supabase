import { describe, it, expect } from "vitest";
import { getTemplatePublishStatus, isVisibleToFieldApp } from "@/lib/template-activation";
import type { ChecklistTemplate } from "@/types";

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
  });
});
