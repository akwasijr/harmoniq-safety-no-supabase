import type { ChecklistTemplate, ChecklistSubmission } from "@/types";

export type DueStatus = "due" | "overdue" | "completed" | "upcoming";

export interface ChecklistDueInfo {
  template: ChecklistTemplate;
  status: DueStatus;
  label: string;
  lastCompleted: Date | null;
  nextDue: Date | null;
}

const RECURRENCE_MS: Record<string, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  once: "One-time",
};

export function getFrequencyLabel(recurrence?: string): string {
  return FREQUENCY_LABELS[recurrence || "once"] || recurrence || "One-time";
}

export function getFrequencyColor(recurrence?: string): { text: string; bg: string } {
  switch (recurrence) {
    case "daily":
      return { text: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30" };
    case "weekly":
      return { text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30" };
    case "monthly":
      return { text: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" };
    default:
      return { text: "text-muted-foreground", bg: "bg-muted" };
  }
}

/**
 * Calculate due status for a checklist template based on user's submissions.
 */
export function getChecklistDueInfo(
  template: ChecklistTemplate,
  submissions: ChecklistSubmission[],
  now: Date = new Date(),
): ChecklistDueInfo {
  const recurrence = template.recurrence || "once";
  const intervalMs = RECURRENCE_MS[recurrence];

  // Find user's most recent completed submission for this template
  const completedSubmissions = submissions
    .filter((s) => s.template_id === template.id && s.status === "submitted" && s.submitted_at)
    .sort((a, b) => new Date(b.submitted_at!).getTime() - new Date(a.submitted_at!).getTime());

  const lastSubmission = completedSubmissions[0];
  const lastCompleted = lastSubmission ? new Date(lastSubmission.submitted_at!) : null;

  // One-time checklists: completed once = done
  if (recurrence === "once") {
    if (lastCompleted) {
      return { template, status: "completed", label: "Completed", lastCompleted, nextDue: null };
    }
    return { template, status: "due", label: "Not started", lastCompleted: null, nextDue: null };
  }

  // Recurring checklists
  if (!intervalMs) {
    return { template, status: "due", label: getFrequencyLabel(recurrence), lastCompleted, nextDue: null };
  }

  if (!lastCompleted) {
    return { template, status: "overdue", label: "Overdue", lastCompleted: null, nextDue: null };
  }

  const nextDue = new Date(lastCompleted.getTime() + intervalMs);
  const timeSinceLastMs = now.getTime() - lastCompleted.getTime();

  // Check if completed within the current period
  if (timeSinceLastMs < intervalMs) {
    // Completed for this period
    if (recurrence === "daily") {
      // For daily: check if completed today
      const isToday = lastCompleted.toDateString() === now.toDateString();
      if (isToday) {
        return { template, status: "completed", label: "Done today", lastCompleted, nextDue };
      }
      return { template, status: "due", label: "Due today", lastCompleted, nextDue };
    }
    return { template, status: "completed", label: `Done this ${recurrence === "weekly" ? "week" : "month"}`, lastCompleted, nextDue };
  }

  // Overdue
  return { template, status: "overdue", label: "Overdue", lastCompleted, nextDue };
}

/**
 * Get all checklists that are due or overdue for the current user.
 */
export function getDueChecklists(
  templates: ChecklistTemplate[],
  submissions: ChecklistSubmission[],
  now: Date = new Date(),
): ChecklistDueInfo[] {
  return templates
    .map((template) => getChecklistDueInfo(template, submissions, now))
    .filter((info) => info.status === "due" || info.status === "overdue")
    .sort((a, b) => {
      // Overdue first, then due
      if (a.status === "overdue" && b.status !== "overdue") return -1;
      if (b.status === "overdue" && a.status !== "overdue") return 1;
      // Daily before weekly before monthly
      const order = { daily: 0, weekly: 1, monthly: 2, once: 3 };
      const recA = a.template.recurrence || "once";
      const recB = b.template.recurrence || "once";
      return (order[recA as keyof typeof order] ?? 3) - (order[recB as keyof typeof order] ?? 3);
    });
}
