"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Wrench,
  FileCheck,
  ClipboardCheck,
  ShieldAlert,
  Layers,
  Calendar as CalendarIcon,
  GraduationCap,
  Award,
  ClipboardList,
} from "lucide-react";
import { useCompanyData } from "@/hooks/use-company-data";
import { useCustomEventsStore } from "@/stores/custom-events-store";
import { useAuth } from "@/hooks/use-auth";

// ── Types ────────────────────────────────────────────────────────────────

export type EventType =
  | "incident"
  | "work_order"
  | "corrective_action"
  | "checklist"
  | "inspection"
  | "procedure"
  | "custom"
  | "training"
  | "certification"
  | "compliance";

export type EventStatus = "overdue" | "due_soon" | "upcoming" | "completed";

export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: EventType;
  status: EventStatus;
  color: string;
  href: string;
}

// ── Configs ──────────────────────────────────────────────────────────────

export const EVENT_CONFIG: Record<
  EventType,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  incident: { label: "Incident", icon: AlertTriangle, color: "text-red-600" },
  work_order: { label: "Work Order", icon: Wrench, color: "text-blue-600" },
  corrective_action: { label: "Corrective Action", icon: FileCheck, color: "text-amber-600" },
  checklist: { label: "Checklist", icon: ClipboardCheck, color: "text-green-600" },
  inspection: { label: "Inspection", icon: ShieldAlert, color: "text-purple-600" },
  procedure: { label: "Procedure", icon: Layers, color: "text-indigo-600" },
  custom: { label: "Custom Event", icon: CalendarIcon, color: "text-teal-600" },
  training: { label: "Training", icon: GraduationCap, color: "text-orange-600" },
  certification: { label: "Certification", icon: Award, color: "text-cyan-600" },
  compliance: { label: "Compliance", icon: ClipboardList, color: "text-emerald-600" },
};

export const STATUS_COLORS: Record<EventStatus, { dot: string; bg: string; text: string }> = {
  overdue: { dot: "bg-red-500", bg: "bg-red-50 dark:bg-red-950/20", text: "text-red-700 dark:text-red-400" },
  due_soon: { dot: "bg-amber-500", bg: "bg-amber-50 dark:bg-amber-950/20", text: "text-amber-700 dark:text-amber-400" },
  upcoming: { dot: "bg-blue-500", bg: "bg-blue-50 dark:bg-blue-950/20", text: "text-blue-700 dark:text-blue-400" },
  completed: { dot: "bg-green-500", bg: "bg-green-50 dark:bg-green-950/20", text: "text-green-700 dark:text-green-400" },
};

// ── Helpers ───────────────────────────────────────────────────────────────

export function getEventStatus(date: Date, isCompleted: boolean): EventStatus {
  if (isCompleted) return "completed";
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const diff = d.getTime() - now.getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  if (days < 0) return "overdue";
  if (days <= 7) return "due_soon";
  return "upcoming";
}

function safeDateParse(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

// ── Hook ──────────────────────────────────────────────────────────────────

// Build a surface-aware href. On mobile (`/{company}/app/...`), routes to mobile
// detail pages; otherwise routes to desktop (`/{company}/dashboard/...`).
// Returns "" when no detail page exists on the current surface — the caller
// should render a non-clickable row in that case.
function buildHref(
  surface: "mobile" | "desktop",
  company: string,
  type: EventType,
  id: string,
  templateId?: string | null,
): string {
  if (surface === "mobile") {
    switch (type) {
      case "incident":
        return `/${company}/app/incidents/${id}`;
      case "work_order":
        return `/${company}/app/tasks/work-orders/${id}`;
      case "corrective_action":
        return `/${company}/app/tasks/actions/${id}`;
      case "checklist":
        return `/${company}/app/checklists/${templateId || id}`;
      case "inspection":
        return `/${company}/app/inspection-round`;
      case "procedure":
        return `/${company}/app/checklists/procedures/${id}`;
      // No mobile detail page for these — leave non-clickable
      case "training":
      case "certification":
      case "compliance":
      case "custom":
      default:
        return "";
    }
  }
  // Desktop
  switch (type) {
    case "incident":
      return `/${company}/dashboard/incidents/${id}`;
    case "work_order":
      return `/${company}/dashboard/work-orders/${id}`;
    case "corrective_action":
      return `/${company}/dashboard/corrective-actions/${id}`;
    case "checklist":
      return `/${company}/dashboard/checklists/${templateId || id}`;
    case "inspection":
      return `/${company}/dashboard/inspection-routes`;
    case "procedure":
      return `/${company}/dashboard/checklists/procedures/${id}`;
    case "training":
    case "certification":
      return `/${company}/dashboard/training`;
    case "compliance":
      return `/${company}/dashboard/compliance`;
    case "custom":
    default:
      return "";
  }
}

export function useCalendarEvents(company: string): CalendarEvent[] {
  const { user, currentCompany, hasAnyPermission } = useAuth();
  const pathname = usePathname();
  const surface: "mobile" | "desktop" =
    pathname?.includes(`/${company}/app`) ? "mobile" : "desktop";
  const {
    incidents,
    workOrders,
    correctiveActions,
    checklistSubmissions,
    inspectionRounds,
    procedureSubmissions,
    trainingAssignments,
    workerCertifications,
    complianceObligations,
    checklistTemplates,
    users,
  } = useCompanyData();

  const customEventsStore = useCustomEventsStore();
  const companyId = currentCompany?.id || user?.company_id;
  const customEventsAll = customEventsStore.itemsForCompany(companyId);

  return useMemo(() => {
    const events: CalendarEvent[] = [];

    // Permission gates — derived once per render
    const canViewIncidents = hasAnyPermission([
      "incidents.view_own",
      "incidents.view_team",
      "incidents.view_all",
    ]);
    const canViewWorkOrders = hasAnyPermission([
      "work_orders.view",
      "work_orders.view_all",
    ]);
    const canViewCorrectiveActions = hasAnyPermission([
      "corrective_actions.view",
    ]);
    const canViewChecklists = hasAnyPermission(["checklists.view"]);

    // 1. Incidents — by incident_date
    if (canViewIncidents) {
      incidents.forEach((inc) => {
        const d = safeDateParse(inc.incident_date);
        if (!d) return;
        events.push({
          id: inc.id,
          title: inc.title || "Incident",
          date: d,
          type: "incident",
          status: getEventStatus(d, inc.status === "resolved" || inc.status === "archived"),
          color: "red",
          href: buildHref(surface, company, "incident", inc.id),
        });
      });
    }

    // 2. Work Orders — by due_date
    if (canViewWorkOrders) {
      workOrders.forEach((wo) => {
        const d = safeDateParse(wo.due_date);
        if (!d) return;
        events.push({
          id: wo.id,
          title: wo.title || "Work Order",
          date: d,
          type: "work_order",
          status: getEventStatus(d, wo.status === "completed"),
          color: "blue",
          href: buildHref(surface, company, "work_order", wo.id),
        });
      });
    }

    // 3. Corrective Actions — by due_date
    if (canViewCorrectiveActions) {
      correctiveActions.forEach((ca) => {
        const d = safeDateParse(ca.due_date);
        if (!d) return;
        events.push({
          id: ca.id,
          title: ca.description || "Corrective Action",
          date: d,
          type: "corrective_action",
          status: getEventStatus(d, ca.status === "completed"),
          color: "amber",
          href: buildHref(surface, company, "corrective_action", ca.id),
        });
      });
    }

    // 4. Checklist Submissions — by submitted_at
    if (canViewChecklists) {
      checklistSubmissions.forEach((cs) => {
        const dateStr = cs.submitted_at || cs.created_at;
        const d = safeDateParse(dateStr);
        if (!d) return;
        const template = checklistTemplates.find((t) => t.id === cs.template_id);
        events.push({
          id: cs.id,
          title: template?.name || "Checklist Submission",
          date: d,
          type: "checklist",
          status: "completed",
          color: "green",
          href: buildHref(surface, company, "checklist", cs.id, cs.template_id),
        });
      });
    }

    // 5. Inspection Rounds — by started_at (gated under checklists.view)
    if (canViewChecklists) {
      inspectionRounds.forEach((ir) => {
        const d = safeDateParse(ir.started_at);
        if (!d) return;
        events.push({
          id: ir.id,
          title: "Inspection Round",
          date: d,
          type: "inspection",
          status: getEventStatus(d, !!ir.completed_at),
          color: "purple",
          href: buildHref(surface, company, "inspection", ir.id),
        });
      });
    }

    // 6. Procedure Submissions — by started_at
    if (canViewChecklists) {
      procedureSubmissions.forEach((ps) => {
        const d = safeDateParse(ps.started_at);
        if (!d) return;
        events.push({
          id: ps.id,
          title: checklistTemplates.find((t) => t.id === ps.procedure_template_id)?.name || "Procedure",
          date: d,
          type: "procedure",
          status: getEventStatus(d, ps.status === "completed"),
          color: "indigo",
          href: buildHref(surface, company, "procedure", ps.id),
        });
      });
    }

    // 7. Custom Events — by date (visibility-filtered, no permission gate)
    customEventsAll.forEach((ce) => {
      const d = safeDateParse(ce.date);
      if (!d) return;
      // Visibility rules: creator always sees their own events; others see only
      // events shared with everyone (share_all) or explicitly with them.
      const uid = user?.id;
      const isCreator = uid && ce.creator_id === uid;
      const isSharedWithMe = uid && Array.isArray(ce.shared_with) && ce.shared_with.includes(uid);
      if (!isCreator && !ce.share_all && !isSharedWithMe) return;
      events.push({
        id: ce.id,
        title: ce.title || "Custom Event",
        date: d,
        type: "custom",
        status: getEventStatus(d, false),
        color: "teal",
        href: "",
      });
    });

    // 8. Training Assignments — by due_date (no specific permission)
    trainingAssignments.forEach((ta) => {
      const d = safeDateParse(ta.due_date);
      if (!d) return;
      const isCompleted = ta.status === "completed";
      events.push({
        id: ta.id,
        title: ta.course_name || "Training Assignment",
        date: d,
        type: "training",
        status: getEventStatus(d, isCompleted),
        color: "orange",
        href: buildHref(surface, company, "training", ta.id),
      });
    });

    // 9. Worker Certifications — by expiry_date
    workerCertifications.forEach((wc) => {
      const d = safeDateParse(wc.expiry_date);
      if (!d) return;
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const expD = new Date(d);
      expD.setHours(0, 0, 0, 0);
      const diffMs = expD.getTime() - now.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      let status: EventStatus;
      if (diffDays < 0) {
        status = "overdue";
      } else if (diffDays <= 30) {
        status = "due_soon";
      } else {
        status = "upcoming";
      }

      const worker = users.find((u) => u.id === wc.user_id);
      const workerName = worker?.full_name || worker?.first_name || "";
      events.push({
        id: wc.id,
        title: workerName ? `${workerName} — ${wc.issuer || "Certification"}` : `Certification ${wc.certificate_number || wc.issuer || ""}`.trim(),
        date: d,
        type: "certification",
        status,
        color: "cyan",
        href: buildHref(surface, company, "certification", wc.id),
      });
    });

    // 10. Compliance Obligations — by next_due_date
    complianceObligations.forEach((co) => {
      if (!co.is_active) return;
      const d = safeDateParse(co.next_due_date);
      if (!d) return;
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const dueD = new Date(d);
      dueD.setHours(0, 0, 0, 0);
      const diffMs = dueD.getTime() - now.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      let status: EventStatus;
      if (diffDays < 0 && co.status !== "compliant") {
        status = "overdue";
      } else if (diffDays <= 7) {
        status = "due_soon";
      } else {
        status = "upcoming";
      }

      events.push({
        id: co.id,
        title: co.title || "Compliance Obligation",
        date: d,
        type: "compliance",
        status,
        color: "emerald",
        href: buildHref(surface, company, "compliance", co.id),
      });
    });

    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [
    incidents,
    workOrders,
    correctiveActions,
    checklistSubmissions,
    checklistTemplates,
    inspectionRounds,
    procedureSubmissions,
    customEventsAll,
    trainingAssignments,
    workerCertifications,
    complianceObligations,
    users,
    company,
    user?.id,
    surface,
    hasAnyPermission,
  ]);
}
