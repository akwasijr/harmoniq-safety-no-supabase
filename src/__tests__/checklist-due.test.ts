import { describe, it, expect } from "vitest";
import {
  getFrequencyLabel,
  getFrequencyColor,
  getChecklistDueInfo,
  getDueChecklists,
} from "@/lib/checklist-due";
import type { ChecklistTemplate, ChecklistSubmission } from "@/types";

function makeTemplate(overrides: Partial<ChecklistTemplate> = {}): ChecklistTemplate {
  return {
    id: "tpl-1",
    company_id: "comp_1",
    name: "Test Checklist",
    description: null,
    recurrence: "daily",
    items: [{ key: "q1", question_key: "q1", type: "yes_no_na", required: true, order: 1 }],
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeSubmission(overrides: Partial<ChecklistSubmission> = {}): ChecklistSubmission {
  return {
    id: "sub-1",
    company_id: "comp_1",
    template_id: "tpl-1",
    submitter_id: "user-1",
    status: "submitted",
    submitted_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    location_id: null,
    responses: [],
    general_comments: null,
    ...overrides,
  };
}

describe("checklist-due", () => {
  describe("getFrequencyLabel", () => {
    it("returns correct labels", () => {
      expect(getFrequencyLabel("daily")).toBe("Daily");
      expect(getFrequencyLabel("weekly")).toBe("Weekly");
      expect(getFrequencyLabel("monthly")).toBe("Monthly");
      expect(getFrequencyLabel("once")).toBe("One-time");
      expect(getFrequencyLabel(undefined)).toBe("One-time");
    });
  });

  describe("getFrequencyColor", () => {
    it("returns red for daily", () => {
      const c = getFrequencyColor("daily");
      expect(c.text).toContain("red");
    });

    it("returns amber for weekly", () => {
      const c = getFrequencyColor("weekly");
      expect(c.text).toContain("amber");
    });

    it("returns blue for monthly", () => {
      const c = getFrequencyColor("monthly");
      expect(c.text).toContain("blue");
    });

    it("returns muted for once/undefined", () => {
      const c = getFrequencyColor("once");
      expect(c.text).toContain("muted");
    });
  });

  describe("getChecklistDueInfo", () => {
    it("one-time not started → due", () => {
      const tpl = makeTemplate({ recurrence: "once" });
      const info = getChecklistDueInfo(tpl, []);
      expect(info.status).toBe("due");
    });

    it("one-time completed → completed", () => {
      const tpl = makeTemplate({ recurrence: "once" });
      const sub = makeSubmission({ template_id: tpl.id });
      const info = getChecklistDueInfo(tpl, [sub]);
      expect(info.status).toBe("completed");
    });

    it("daily completed today → completed", () => {
      const tpl = makeTemplate({ recurrence: "daily" });
      const now = new Date();
      const sub = makeSubmission({ template_id: tpl.id, submitted_at: now.toISOString() });
      const info = getChecklistDueInfo(tpl, [sub], now);
      expect(info.status).toBe("completed");
    });

    it("daily completed yesterday → due or overdue", () => {
      const tpl = makeTemplate({ recurrence: "daily" });
      const now = new Date();
      const yesterday = new Date(now.getTime() - 25 * 60 * 60 * 1000);
      const sub = makeSubmission({ template_id: tpl.id, submitted_at: yesterday.toISOString() });
      const info = getChecklistDueInfo(tpl, [sub], now);
      expect(["due", "overdue"]).toContain(info.status);
    });

    it("weekly completed 3 days ago → completed", () => {
      const tpl = makeTemplate({ recurrence: "weekly" });
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const sub = makeSubmission({ template_id: tpl.id, submitted_at: threeDaysAgo.toISOString() });
      const info = getChecklistDueInfo(tpl, [sub], now);
      expect(info.status).toBe("completed");
    });

    it("weekly completed 8 days ago → overdue", () => {
      const tpl = makeTemplate({ recurrence: "weekly" });
      const now = new Date();
      const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
      const sub = makeSubmission({ template_id: tpl.id, submitted_at: eightDaysAgo.toISOString() });
      const info = getChecklistDueInfo(tpl, [sub], now);
      expect(info.status).toBe("overdue");
    });

    it("monthly completed 15 days ago → completed", () => {
      const tpl = makeTemplate({ recurrence: "monthly" });
      const now = new Date();
      const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
      const sub = makeSubmission({ template_id: tpl.id, submitted_at: fifteenDaysAgo.toISOString() });
      const info = getChecklistDueInfo(tpl, [sub], now);
      expect(info.status).toBe("completed");
    });

    it("monthly completed 35 days ago → overdue", () => {
      const tpl = makeTemplate({ recurrence: "monthly" });
      const now = new Date();
      const thirtyFiveDaysAgo = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000);
      const sub = makeSubmission({ template_id: tpl.id, submitted_at: thirtyFiveDaysAgo.toISOString() });
      const info = getChecklistDueInfo(tpl, [sub], now);
      expect(info.status).toBe("overdue");
    });

    it("recurring never completed → overdue", () => {
      const tpl = makeTemplate({ recurrence: "weekly" });
      const info = getChecklistDueInfo(tpl, []);
      expect(info.status).toBe("overdue");
    });

    it("ignores draft submissions", () => {
      const tpl = makeTemplate({ recurrence: "daily" });
      const draft = makeSubmission({ template_id: tpl.id, status: "draft", submitted_at: null });
      const info = getChecklistDueInfo(tpl, [draft]);
      expect(info.status).toBe("overdue");
    });
  });

  describe("getDueChecklists", () => {
    it("returns overdue before due", () => {
      const tplOverdue = makeTemplate({ id: "overdue", recurrence: "weekly" });
      const tplDue = makeTemplate({ id: "due", recurrence: "once" });
      const result = getDueChecklists([tplOverdue, tplDue], []);
      expect(result[0].template.id).toBe("overdue");
      expect(result[0].status).toBe("overdue");
    });

    it("excludes completed checklists", () => {
      const tpl = makeTemplate({ id: "done", recurrence: "once" });
      const sub = makeSubmission({ template_id: "done" });
      const result = getDueChecklists([tpl], [sub]);
      expect(result).toHaveLength(0);
    });

    it("sorts daily before weekly before monthly", () => {
      const daily = makeTemplate({ id: "d", recurrence: "daily" });
      const monthly = makeTemplate({ id: "m", recurrence: "monthly" });
      const weekly = makeTemplate({ id: "w", recurrence: "weekly" });
      const result = getDueChecklists([monthly, daily, weekly], []);
      expect(result.map((r) => r.template.id)).toEqual(["d", "w", "m"]);
    });
  });
});
