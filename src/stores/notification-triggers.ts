import type { Notification } from "./notifications-store";

/**
 * Creates a well-formed Notification object.
 * Uses `source` / `source_id` to link back to the originating entity.
 */
function createNotification(params: {
  title: string;
  message: string;
  type: string;
  user_id?: string;
  company_id?: string;
  source?: string;
  source_id?: string;
}): Notification {
  return {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: params.title,
    message: params.message,
    type: params.type,
    user_id: params.user_id ?? null,
    company_id: params.company_id ?? "",
    source: params.source ?? null,
    source_id: params.source_id ?? null,
    read: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// ── Overdue items ────────────────────────────────────────────────────────

interface OverdueCheckParams {
  userId: string;
  companyId: string;
  tickets: Array<{
    id: string;
    title: string;
    assigned_to: string | null;
    due_date: string | null;
    status: string;
  }>;
  workOrders: Array<{
    id: string;
    title: string;
    assigned_to: string | null;
    due_date: string | null;
    status: string;
  }>;
  correctiveActions: Array<{
    id: string;
    description: string;
    assigned_to: string | null;
    due_date: string;
    status: string;
  }>;
  addNotification: (n: Notification) => void;
}

export function checkOverdueItems(params: OverdueCheckParams) {
  const { userId, companyId, tickets, workOrders, correctiveActions, addNotification: add } = params;
  const now = new Date();

  // Overdue tickets assigned to user
  tickets
    .filter(
      (t) =>
        t.assigned_to === userId &&
        t.due_date &&
        new Date(t.due_date) < now &&
        t.status !== "resolved" &&
        t.status !== "closed",
    )
    .forEach((t) => {
      add(
        createNotification({
          title: "Overdue ticket",
          message: `Ticket "${t.title}" is past due`,
          type: "warning",
          user_id: userId,
          company_id: companyId,
          source: "ticket",
          source_id: t.id,
        }),
      );
    });

  // Overdue work orders
  workOrders
    .filter(
      (wo) =>
        wo.assigned_to === userId &&
        wo.due_date &&
        new Date(wo.due_date) < now &&
        wo.status !== "completed" &&
        wo.status !== "cancelled",
    )
    .forEach((wo) => {
      add(
        createNotification({
          title: "Overdue work order",
          message: `Work order "${wo.title}" is past due`,
          type: "warning",
          user_id: userId,
          company_id: companyId,
          source: "work_order",
          source_id: wo.id,
        }),
      );
    });

  // Overdue corrective actions
  correctiveActions
    .filter(
      (ca) =>
        ca.assigned_to === userId &&
        ca.due_date &&
        new Date(ca.due_date) < now &&
        ca.status !== "completed",
    )
    .forEach((ca) => {
      add(
        createNotification({
          title: "Overdue corrective action",
          message: `Action "${ca.description}" is past due`,
          type: "error",
          user_id: userId,
          company_id: companyId,
          source: "corrective_action",
          source_id: ca.id,
        }),
      );
    });
}

// ── Assignment notification ──────────────────────────────────────────────

export function notifyAssignment(
  add: (n: Notification) => void,
  params: {
    userId: string;
    companyId: string;
    entityType: string;
    entityTitle: string;
    entityId: string;
    assignedBy: string;
  },
) {
  add(
    createNotification({
      title: `New ${params.entityType} assigned`,
      message: `"${params.entityTitle}" was assigned to you by ${params.assignedBy}`,
      type: "info",
      user_id: params.userId,
      company_id: params.companyId,
      source: params.entityType,
      source_id: params.entityId,
    }),
  );
}

// ── Critical incident notification ───────────────────────────────────────

export function notifyCriticalIncident(
  add: (n: Notification) => void,
  params: {
    companyId: string;
    incidentTitle: string;
    incidentId: string;
  },
) {
  add(
    createNotification({
      title: "Critical incident reported",
      message: `A critical incident "${params.incidentTitle}" has been reported`,
      type: "error",
      company_id: params.companyId,
      source: "incident",
      source_id: params.incidentId,
    }),
  );
}

// ── Overdue checklists notification ──────────────────────────────────────

interface ChecklistOverdueParams {
  userId: string;
  companyId: string;
  dueChecklists: Array<{
    template: { id: string; name: string; recurrence?: string };
    status: "due" | "overdue";
    label: string;
  }>;
  addNotification: (n: Notification) => void;
}

export function checkOverdueChecklists(params: ChecklistOverdueParams) {
  const { userId, companyId, dueChecklists, addNotification: add } = params;

  const overdueItems = dueChecklists.filter((item) => item.status === "overdue");

  overdueItems.forEach((item) => {
    const freq = item.template.recurrence || "once";
    add(
      createNotification({
        title: "Overdue checklist",
        message: `"${item.template.name}" (${freq}) is overdue`,
        type: "warning",
        user_id: userId,
        company_id: companyId,
        source: "checklist_template",
        source_id: item.template.id,
      }),
    );
  });
}

// ── Incident notifications ──────────────────────────────────────────

export function notifyIncidentStatusChange(
  addNotification: (n: Notification) => void,
  params: { companyId: string; incidentTitle: string; incidentId: string; newStatus: string; changedBy: string },
) {
  addNotification(
    createNotification({
      title: "Incident status updated",
      message: `"${params.incidentTitle}" moved to ${params.newStatus.replace(/_/g, " ")}`,
      type: "incident_status",
      company_id: params.companyId,
      source: "incident",
      source_id: params.incidentId,
    }),
  );
}

export function notifyIncidentComment(
  addNotification: (n: Notification) => void,
  params: { companyId: string; incidentTitle: string; incidentId: string; commenterName: string },
) {
  addNotification(
    createNotification({
      title: "New comment on incident",
      message: `${params.commenterName} commented on "${params.incidentTitle}"`,
      type: "incident_comment",
      company_id: params.companyId,
      source: "incident",
      source_id: params.incidentId,
    }),
  );
}

export function notifyIncidentEscalated(
  addNotification: (n: Notification) => void,
  params: { companyId: string; incidentTitle: string; incidentId: string; severity: string },
) {
  addNotification(
    createNotification({
      title: "Incident auto-escalated",
      message: `${params.severity} severity incident "${params.incidentTitle}" was not acknowledged in time`,
      type: "incident_escalation",
      company_id: params.companyId,
      source: "incident",
      source_id: params.incidentId,
    }),
  );
}
