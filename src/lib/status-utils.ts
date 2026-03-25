import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Badge / variant helpers – return strings that match <Badge variant="…">
// ---------------------------------------------------------------------------

export type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "success"
  | "warning"
  | "info"
  | "outline"
  | "new"
  | "in-progress"
  | "in_progress"
  | "in-review"
  | "in_review"
  | "resolved"
  | "archived"
  | "pending"
  | "low"
  | "medium"
  | "high"
  | "critical"
  | "expired"
  | "overdue"
  | "inactive"
  | "active"
  | "completed"
  | "cancelled";

/**
 * Map a priority string to a Badge variant.
 * Used in incidents, corrective actions, maintenance schedules, etc.
 */
export function getPriorityVariant(priority: string): BadgeVariant {
  switch (priority) {
    case "urgent":
    case "critical":
      return "destructive";
    case "high":
      return "high";
    case "medium":
      return "medium";
    default:
      return "low";
  }
}

/**
 * Map a severity string to a Badge variant.
 * Used in incidents, corrective actions, risk assessments, etc.
 */
export function getSeverityVariant(severity: string): BadgeVariant {
  switch (severity) {
    case "critical":
    case "high":
      return "destructive";
    case "medium":
      return "warning";
    default:
      return "secondary";
  }
}

/**
 * Map a severity string to a Tailwind text-color class.
 * Used for coloring icons next to severity text.
 */
export function getSeverityIconColor(severity: string): string {
  switch (severity) {
    case "critical":
    case "high":
      return "text-destructive";
    case "medium":
      return "text-warning";
    default:
      return "text-muted-foreground";
  }
}

// ---------------------------------------------------------------------------
// Status → Badge variant helpers
// ---------------------------------------------------------------------------

/**
 * Generic status-to-variant mapper.
 * Covers work orders, corrective actions, incidents, and general statuses.
 */
export function getStatusVariant(
  status: string,
  opts?: { isOverdue?: boolean },
): BadgeVariant {
  switch (status) {
    case "completed":
      return "completed";
    case "resolved":
      return "resolved";
    case "active":
      return "active";
    case "in_progress":
    case "approved":
      return "warning";
    case "cancelled":
      return "cancelled";
    case "closed":
      return "secondary";
    case "inactive":
      return "inactive";
    case "expired":
      return "expired";
    case "requested":
    case "new":
    case "open":
      return opts?.isOverdue ? "overdue" : "secondary";
    default:
      return opts?.isOverdue ? "overdue" : "secondary";
  }
}

/**
 * Work-order-specific status → variant map (constant lookup).
 */
export const WORK_ORDER_STATUS_COLORS: Record<string, BadgeVariant> = {
  requested: "secondary",
  approved: "warning",
  in_progress: "warning",
  completed: "completed",
  cancelled: "cancelled",
};

// ---------------------------------------------------------------------------
// Entity-lookup helpers
// These accept arrays so they remain pure (no dependency on stores).
// ---------------------------------------------------------------------------

export interface HasId {
  id: string;
}

export interface UserLike extends HasId {
  first_name: string;
  last_name: string;
  full_name: string;
}

export interface TeamLike extends HasId {
  name: string;
}

/**
 * Look up a user's full display name by ID.
 *
 * @param userId   – the user ID to find
 * @param users    – the users array to search
 * @param fallback – text when user not found (default "Unassigned")
 */
export function getUserDisplayName(
  userId: string | null | undefined,
  users: UserLike[],
  fallback = "Unassigned",
): string {
  if (!userId) return fallback;
  const user = users.find((u) => u.id === userId);
  if (!user) return fallback;
  return user.full_name || `${user.first_name} ${user.last_name}`;
}

/**
 * Build the display name using first + last name format specifically.
 */
export function getUserFirstLastName(
  userId: string | null | undefined,
  users: UserLike[],
  fallback = "Unknown",
): string {
  if (!userId) return fallback;
  const user = users.find((u) => u.id === userId);
  if (!user) return fallback;
  return `${user.first_name} ${user.last_name}`;
}

/**
 * Get the assignee name for a maintenance schedule,
 * which can be either a user or a team.
 */
export function getScheduleAssigneeName(
  schedule: { assigned_to_user_id: string | null; assigned_to_team_id: string | null },
  users: UserLike[],
  teams: TeamLike[],
): string {
  if (schedule.assigned_to_user_id) {
    const user = users.find((u) => u.id === schedule.assigned_to_user_id);
    return user ? `${user.first_name} ${user.last_name}` : "Unknown";
  }
  if (schedule.assigned_to_team_id) {
    const team = teams.find((t) => t.id === schedule.assigned_to_team_id);
    return team ? team.name : "Unknown Team";
  }
  return "Unassigned";
}

/**
 * Look up an asset's name by ID.
 */
export function getAssetDisplayName(
  assetId: string | null | undefined,
  assets: { id: string; name: string }[],
  fallback = "Unknown",
): string {
  if (!assetId) return fallback;
  return assets.find((a) => a.id === assetId)?.name || fallback;
}

// ---------------------------------------------------------------------------
// Role → variant
// ---------------------------------------------------------------------------

export function getRoleVariant(role: string): BadgeVariant {
  switch (role) {
    case "company_admin":
    case "super_admin":
      return "destructive";
    case "manager":
      return "warning";
    default:
      return "secondary";
  }
}
