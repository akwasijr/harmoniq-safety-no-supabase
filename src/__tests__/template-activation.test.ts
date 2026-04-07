import { describe, expect, it } from "vitest";
import { isVisibleToFieldApp, getTemplatePublishStatus } from "@/lib/template-activation";
import type { ChecklistTemplate } from "@/types";

function createTemplate(overrides: Partial<ChecklistTemplate> = {}): ChecklistTemplate {
  return {
    id: "template-1",
    company_id: "company-1",
    name: "Daily inspection",
    description: "Checklist description",
    category: "operations",
    assignment: "all",
    recurrence: "daily",
    items: [],
    is_active: true,
    created_at: "2026-04-07T00:00:00.000Z",
    updated_at: "2026-04-07T00:00:00.000Z",
    ...overrides,
  };
}

describe("template activation visibility", () => {
  it("shows only published templates in the field app", () => {
    expect(isVisibleToFieldApp(createTemplate({ publish_status: "published" }))).toBe(true);
    expect(isVisibleToFieldApp(createTemplate({ publish_status: "draft" }))).toBe(false);
    expect(isVisibleToFieldApp(createTemplate({ publish_status: "archived" }))).toBe(false);
  });

  it("treats missing publish status as draft", () => {
    expect(getTemplatePublishStatus(createTemplate({ publish_status: undefined }))).toBe("draft");
    expect(isVisibleToFieldApp(createTemplate({ publish_status: undefined }))).toBe(false);
  });
});
