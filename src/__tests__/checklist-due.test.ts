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

function daysAgo(n: number, from: Date): Date {
  return new Date(from.getTime() - n * 24 * 60 * 60 * 1000);
}

// ---------------------------------------------------------------------------
// getFrequencyLabel
// ---------------------------------------------------------------------------

describe("getFrequencyLabel", () => {
  it("returns correct labels", () => {
    expect(getFrequencyLabel("daily")).toBe("Daily");
    expect(getFrequencyLabel("weekly")).toBe("Weekly");
    expect(getFrequencyLabel("monthly")).toBe("Monthly");
    expect(getFrequencyLabel("once")).toBe("One-time");
    expect(getFrequencyLabel(undefined)).toBe("One-time");
  });

  it("returns raw string for unknown recurrence", () => {
    expect(getFrequencyLabel("quarterly")).toBe("quarterly");
  });
});

// ---------------------------------------------------------------------------
// getFrequencyColor
// ---------------------------------------------------------------------------

describe("getFrequencyColor", () => {
  it("returns red classes for daily", () => {
    const c = getFrequencyColor("daily");
    expect(c.text).toContain("red");
    expect(c.bg).toContain("red");
  });

  it("returns amber classes for weekly", () => {
    const c = getFrequencyColor("weekly");
    expect(c.text).toContain("amber");
    expect(c.bg).toContain("amber");
  });

  it("returns blue classes for monthly", () => {
    const c = getFrequencyColor("monthly");
    expect(c.text).toContain("blue");
    expect(c.bg).toContain("blue");
  });

  it("returns muted for once/undefined", () => {
    const c = getFrequencyColor("once");
    expect(c.text).toContain("muted");
    expect(c.bg).toContain("muted");
  });

  it("returns muted when undefined", () => {
    const c = getFrequencyColor(undefined);
    expect(c.text).toContain("muted");
  });

  it("includes dark mode variants for daily", () => {
    const c = getFrequencyColor("daily");
    expect(c.text).toContain("dark:");
    expect(c.bg).toContain("dark:");
  });

  it("includes dark mode variants for weekly", () => {
    const c = getFrequencyColor("weekly");
    expect(c.text).toContain("dark:");
    expect(c.bg).toContain("dark:");
  });
});

// ---------------------------------------------------------------------------
// getChecklistDueInfo
// ---------------------------------------------------------------------------

describe("getChecklistDueInfo", () => {
  const NOW = new Date("2024-06-15T12:00:00Z");

  describe("one-time checklists", () => {
    it("not started → due", () => {
      const tpl = makeTemplate({ recurrence: "once" });
      const info = getChecklistDueInfo(tpl, [], NOW);
      expect(info.status).toBe("due");
      expect(info.label).toBe("Not started");
      expect(info.lastCompleted).toBeNull();
      expect(info.nextDue).toBeNull();
    });

    it("completed → completed", () => {
      const tpl = makeTemplate({ recurrence: "once" });
      const sub = makeSubmission({ template_id: tpl.id, submitted_at: "2024-06-10T10:00:00Z" });
      const info = getChecklistDueInfo(tpl, [sub], NOW);
      expect(info.status).toBe("completed");
      expect(info.label).toBe("Completed");
      expect(info.lastCompleted).toBeInstanceOf(Date);
    });
  });

  describe("daily checklists", () => {
    it("completed today → completed", () => {
      const tpl = makeTemplate({ recurrence: "daily" });
      const sub = makeSubmission({ template_id: tpl.id, submitted_at: NOW.toISOString() });
      const info = getChecklistDueInfo(tpl, [sub], NOW);
      expect(info.status).toBe("completed");
      expect(info.label).toBe("Done today");
    });

    it("completed yesterday (>24h ago) → overdue", () => {
      const tpl = makeTemplate({ recurrence: "daily" });
      const twoDaysAgo = daysAgo(2, NOW);
      const sub = makeSubmission({ template_id: tpl.id, submitted_at: twoDaysAgo.toISOString() });
      const info = getChecklistDueInfo(tpl, [sub], NOW);
      expect(info.status).toBe("overdue");
    });

    it("completed yesterday but within 24h → due today", () => {
      const tpl = makeTemplate({ recurrence: "daily" });
      const justUnder24h = new Date(NOW.getTime() - 20 * 60 * 60 * 1000);
      if (justUnder24h.toDateString() !== NOW.toDateString()) {
        const sub = makeSubmission({ template_id: tpl.id, submitted_at: justUnder24h.toISOString() });
        const info = getChecklistDueInfo(tpl, [sub], NOW);
        expect(info.status).toBe("due");
        expect(info.label).toBe("Due today");
      }
    });
  });

  describe("weekly checklists", () => {
    it("completed 3 days ago → completed", () => {
      const tpl = makeTemplate({ recurrence: "weekly" });
      const sub = makeSubmission({ template_id: tpl.id, submitted_at: daysAgo(3, NOW).toISOString() });
      const info = getChecklistDueInfo(tpl, [sub], NOW);
      expect(info.status).toBe("completed");
      expect(info.label).toContain("week");
    });

    it("completed 8 days ago → overdue", () => {
      const tpl = makeTemplate({ recurrence: "weekly" });
      const sub = makeSubmission({ template_id: tpl.id, submitted_at: daysAgo(8, NOW).toISOString() });
      const info = getChecklistDueInfo(tpl, [sub], NOW);
      expect(info.status).toBe("overdue");
    });
  });

  describe("monthly checklists", () => {
    it("completed 15 days ago → completed", () => {
      const tpl = makeTemplate({ recurrence: "monthly" });
      const sub = makeSubmission({ template_id: tpl.id, submitted_at: daysAgo(15, NOW).toISOString() });
      const info = getChecklistDueInfo(tpl, [sub], NOW);
      expect(info.status).toBe("completed");
      expect(info.label).toContain("month");
    });

    it("completed 35 days ago → overdue", () => {
      const tpl = makeTemplate({ recurrence: "monthly" });
      const sub = makeSubmission({ template_id: tpl.id, submitted_at: daysAgo(35, NOW).toISOString() });
      const info = getChecklistDueInfo(tpl, [sub], NOW);
      expect(info.status).toBe("overdue");
    });
  });

  describe("recurring never completed", () => {
    it("daily with no submissions → overdue", () => {
      const tpl = makeTemplate({ recurrence: "daily" });
      const info = getChecklistDueInfo(tpl, [], NOW);
      expect(info.status).toBe("overdue");
      expect(info.lastCompleted).toBeNull();
    });

    it("weekly with no submissions → overdue", () => {
      const tpl = makeTemplate({ recurrence: "weekly" });
      const info = getChecklistDueInfo(tpl, [], NOW);
      expect(info.status).toBe("overdue");
    });

    it("monthly with no submissions → overdue", () => {
      const tpl = makeTemplate({ recurrence: "monthly" });
      const info = getChecklistDueInfo(tpl, [], NOW);
      expect(info.status).toBe("overdue");
    });
  });

  describe("edge cases", () => {
    it("ignores draft submissions", () => {
      const tpl = makeTemplate({ recurrence: "daily" });
      const draft = makeSubmission({ template_id: tpl.id, status: "draft", submitted_at: null });
      const info = getChecklistDueInfo(tpl, [draft], NOW);
      expect(info.status).toBe("overdue");
    });

    it("ignores submissions for other templates", () => {
      const tpl = makeTemplate({ id: "tpl-A", recurrence: "once" });
      const sub = makeSubmission({ template_id: "tpl-B", submitted_at: "2024-06-10T10:00:00Z" });
      const info = getChecklistDueInfo(tpl, [sub], NOW);
      expect(info.status).toBe("due");
    });

    it("picks the most recent submission", () => {
      const tpl = makeTemplate({ recurrence: "weekly" });
      const old = makeSubmission({ id: "sub-old", template_id: tpl.id, submitted_at: daysAgo(10, NOW).toISOString() });
      const recent = makeSubmission({ id: "sub-new", template_id: tpl.id, submitted_at: daysAgo(2, NOW).toISOString() });
      const info = getChecklistDueInfo(tpl, [old, recent], NOW);
      expect(info.status).toBe("completed");
    });

    it("returns the template in the result", () => {
      const tpl = makeTemplate({ name: "Fire Drill" });
      const info = getChecklistDueInfo(tpl, [], NOW);
      expect(info.template.name).toBe("Fire Drill");
    });

    it("sets nextDue for recurring completed checklists", () => {
      const tpl = makeTemplate({ recurrence: "weekly" });
      const sub = makeSubmission({ template_id: tpl.id, submitted_at: daysAgo(2, NOW).toISOString() });
      const info = getChecklistDueInfo(tpl, [sub], NOW);
      expect(info.nextDue).toBeInstanceOf(Date);
    });
  });
});

// ---------------------------------------------------------------------------
// getDueChecklists
// ---------------------------------------------------------------------------

describe("getDueChecklists", () => {
  const NOW = new Date("2024-06-15T12:00:00Z");

  it("returns overdue before due", () => {
    const tplOverdue = makeTemplate({ id: "overdue", recurrence: "weekly" });
    const tplDue = makeTemplate({ id: "due", recurrence: "once" });
    const result = getDueChecklists([tplOverdue, tplDue], [], NOW);
    expect(result[0].template.id).toBe("overdue");
    expect(result[0].status).toBe("overdue");
  });

  it("excludes completed checklists", () => {
    const tpl = makeTemplate({ id: "done", recurrence: "once" });
    const sub = makeSubmission({ template_id: "done" });
    const result = getDueChecklists([tpl], [sub], NOW);
    expect(result).toHaveLength(0);
  });

  it("sorts daily before weekly before monthly", () => {
    const daily = makeTemplate({ id: "d", recurrence: "daily" });
    const monthly = makeTemplate({ id: "m", recurrence: "monthly" });
    const weekly = makeTemplate({ id: "w", recurrence: "weekly" });
    const result = getDueChecklists([monthly, daily, weekly], [], NOW);
    expect(result.map((r) => r.template.id)).toEqual(["d", "w", "m"]);
  });

  it("returns empty array when all checklists are completed", () => {
    const tpl = makeTemplate({ id: "t-done", recurrence: "once" });
    const sub = makeSubmission({ template_id: "t-done", submitted_at: "2024-06-10T10:00:00Z" });
    const result = getDueChecklists([tpl], [sub], NOW);
    expect(result).toHaveLength(0);
  });

  it("handles empty templates array", () => {
    expect(getDueChecklists([], [], NOW)).toEqual([]);
  });

  it("returns only due and overdue — not completed", () => {
    const templates = [
      makeTemplate({ id: "t-daily", recurrence: "daily" }),
      makeTemplate({ id: "t-once", recurrence: "once" }),
      makeTemplate({ id: "t-weekly", recurrence: "weekly" }),
    ];
    const subs = [
      makeSubmission({ template_id: "t-weekly", submitted_at: daysAgo(2, NOW).toISOString() }),
    ];
    const result = getDueChecklists(templates, subs, NOW);
    const ids = result.map((r) => r.template.id);
    expect(ids).toContain("t-daily");
    expect(ids).toContain("t-once");
    expect(ids).not.toContain("t-weekly");
  });
});
