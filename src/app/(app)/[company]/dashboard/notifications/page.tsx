"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  Newspaper,
  ClipboardCheck,
  AlertTriangle,
  Wrench,
  ShieldAlert,
  Clock,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useChecklistTemplatesStore, useChecklistSubmissionsStore } from "@/stores/checklists-store";
import { useTicketsStore } from "@/stores/tickets-store";
import { useWorkOrdersStore } from "@/stores/work-orders-store";
import { useCorrectiveActionsStore } from "@/stores/corrective-actions-store";
import { useRiskEvaluationsStore } from "@/stores/risk-evaluations-store";
import { useNotificationsStore } from "@/stores/notifications-store";
import { useCompanyParam } from "@/hooks/use-company-param";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";
import { LoadingPage } from "@/components/ui/loading";
import { isVisibleToFieldApp } from "@/lib/template-activation";
import { isAssignedToUserOrTeam } from "@/lib/assignment-utils";

const assessmentLabelMap: Record<string, string> = {
  JHA: "Job Hazard Analysis",
  JSA: "Job Safety Analysis",
  RIE: "RI&E Assessment",
  ARBOWET: "Arbowet Compliance Check",
  SAM: "SAM Assessment",
  OSA: "OSA Assessment",
};

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  audienceLabel?: string;
  urgencyWeight: number;
}

const PRIORITY_WEIGHT: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function getUrgencyWeight(priority?: string | null, dueDate?: string | null) {
  const priorityWeight = priority ? (PRIORITY_WEIGHT[priority] ?? 0) : 0;
  const overdueWeight = dueDate && new Date(dueDate) < new Date() ? 10 : 0;
  return overdueWeight + priorityWeight;
}

export default function DashboardNotificationsPage() {
  const company = useCompanyParam();
  const { user } = useAuth();
  const { items: checklistTemplates } = useChecklistTemplatesStore();
  const { items: checklistSubmissions } = useChecklistSubmissionsStore();
  const { items: tickets } = useTicketsStore();
  const { items: workOrders } = useWorkOrdersStore();
  const { items: correctiveActions } = useCorrectiveActionsStore();
  const { items: riskEvaluations } = useRiskEvaluationsStore();
  const { items: dbNotifications, update: updateNotification, isLoading } = useNotificationsStore();
  const { t, formatDate } = useTranslation();
  const [fallbackTimestamp] = React.useState(() => Date.now());

  const [readDerivedIds, setReadDerivedIds] = React.useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = sessionStorage.getItem("harmoniq_read_derived");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });

  const notifications = React.useMemo<NotificationItem[]>(() => {
    if (!user) return [];
    const items: NotificationItem[] = [];
    const getAudienceLabel = (isPersonal: boolean, fallback: string) => (isPersonal ? "Assigned to you" : fallback);

    dbNotifications
      .filter((n) => n.user_id === null || n.user_id === user.id)
      .forEach((n) => {
        const iconMap: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
          content: { icon: Newspaper, color: "text-blue-700 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300" },
          incident: { icon: AlertTriangle, color: "text-orange-700 bg-orange-100 dark:bg-orange-900/40 dark:text-orange-300" },
          checklist: { icon: ClipboardCheck, color: "text-primary bg-primary/15" },
          task: { icon: Wrench, color: "text-purple-600 bg-purple-100 dark:bg-purple-900/40 dark:text-purple-300" },
          ticket: { icon: Wrench, color: "text-purple-600 bg-purple-100 dark:bg-purple-900/40 dark:text-purple-300" },
          work_order: { icon: Wrench, color: "text-amber-700 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300" },
          corrective_action: { icon: ShieldAlert, color: "text-red-700 bg-red-100 dark:bg-red-900/40 dark:text-red-300" },
        };
        const { icon, color } = iconMap[n.source || "content"] || iconMap.content;
        const href = n.source_id
          ? n.source === "content" ? `/${company}/dashboard/content/${n.source_id}`
            : n.source === "incident" ? `/${company}/dashboard/incidents/${n.source_id}`
            : n.source === "ticket" ? `/${company}/dashboard/tickets/${n.source_id}`
            : (n.source === "work_order" || n.source === "work_orders") ? `/${company}/dashboard/work-orders/${n.source_id}`
            : n.source === "corrective_action" ? `/${company}/dashboard/corrective-actions/${n.source_id}`
            : n.source === "checklist" ? `/${company}/dashboard/checklists/${n.source_id}`
            : `/${company}/dashboard`
          : `/${company}/dashboard`;
        const sourceTicket = n.source === "ticket" ? tickets.find((ticket) => ticket.id === n.source_id) : null;
        const sourceWorkOrder = n.source === "work_order" ? workOrders.find((wo) => wo.id === n.source_id) : null;
        const sourceAction = n.source === "corrective_action" ? correctiveActions.find((a) => a.id === n.source_id) : null;
        items.push({
          id: n.id, type: n.source || "news", title: n.title, description: n.message,
          timestamp: new Date(n.created_at), read: n.read, href, icon, iconColor: color,
          audienceLabel: n.source === "ticket" ? getAudienceLabel(Boolean(sourceTicket && isAssignedToUserOrTeam(sourceTicket, user)), "Company update")
            : n.source === "work_order" ? getAudienceLabel(Boolean(sourceWorkOrder && isAssignedToUserOrTeam(sourceWorkOrder, user)), "Company update")
            : n.source === "corrective_action" ? getAudienceLabel(Boolean(sourceAction && isAssignedToUserOrTeam(sourceAction, user)), "Company update")
            : n.user_id === user.id ? "Assigned to you" : "Company update",
          urgencyWeight: n.source === "ticket" ? getUrgencyWeight(sourceTicket?.priority, sourceTicket?.due_date)
            : n.source === "work_order" ? getUrgencyWeight(sourceWorkOrder?.priority, sourceWorkOrder?.due_date)
            : n.source === "corrective_action" ? getUrgencyWeight(sourceAction?.severity, sourceAction?.due_date) : 0,
        });
      });

    // Derived notifications
    const completedIds = new Set(checklistSubmissions.filter((s) => s.submitter_id === user.id && s.status === "submitted").map((s) => s.template_id));
    const dbIds = new Set(items.map((n) => n.id));

    checklistTemplates.filter((t) => t.company_id === user.company_id && isVisibleToFieldApp(t) && !completedIds.has(t.id)).forEach((template) => {
      const derivedId = `task-${template.id}`;
      if (dbIds.has(derivedId)) return;
      items.push({ id: derivedId, type: "task", title: template.name, description: `${template.items?.length || 0} items to complete`,
        timestamp: new Date(template.created_at || fallbackTimestamp), read: readDerivedIds.has(derivedId),
        href: `/${company}/dashboard/checklists/${template.id}`, icon: ClipboardCheck, iconColor: "text-primary bg-primary/15", audienceLabel: "Checklist", urgencyWeight: 0 });
    });

    tickets.filter((t) => t.company_id === user.company_id && t.status === "new" && isAssignedToUserOrTeam(t, user)).forEach((ticket) => {
      const derivedId = `ticket-${ticket.id}`;
      if (dbIds.has(derivedId)) return;
      items.push({ id: derivedId, type: "ticket", title: ticket.title || "Ticket", description: `Priority: ${ticket.priority || "normal"}`,
        timestamp: new Date(ticket.created_at || fallbackTimestamp), read: readDerivedIds.has(derivedId),
        href: `/${company}/dashboard/tickets/${ticket.id}`, icon: Wrench, iconColor: "text-purple-600 bg-purple-100 dark:bg-purple-900/40 dark:text-purple-300",
        audienceLabel: "Assigned to you", urgencyWeight: getUrgencyWeight(ticket.priority, ticket.due_date) });
    });

    workOrders.filter((wo) => wo.company_id === user.company_id && isAssignedToUserOrTeam(wo, user) && wo.status !== "completed" && wo.status !== "cancelled").forEach((wo) => {
      const derivedId = `work-order-${wo.id}`;
      if (dbIds.has(derivedId)) return;
      items.push({ id: derivedId, type: "work-order", title: wo.title, description: `Status: ${wo.status.replace(/_/g, " ")}`,
        timestamp: new Date(wo.updated_at || wo.created_at || fallbackTimestamp), read: readDerivedIds.has(derivedId),
        href: `/${company}/dashboard/work-orders/${wo.id}`, icon: Wrench, iconColor: "text-amber-700 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300",
        audienceLabel: "Assigned to you", urgencyWeight: getUrgencyWeight(wo.priority, wo.due_date) });
    });

    correctiveActions.filter((a) => a.company_id === user.company_id && isAssignedToUserOrTeam(a, user) && a.status !== "completed").forEach((action) => {
      const derivedId = `action-${action.id}`;
      if (dbIds.has(derivedId)) return;
      items.push({ id: derivedId, type: "corrective-action", title: t("tasks.actions") || "Corrective action", description: action.description,
        timestamp: new Date(action.updated_at || action.created_at || fallbackTimestamp), read: readDerivedIds.has(derivedId),
        href: `/${company}/dashboard/corrective-actions/${action.id}`, icon: ShieldAlert, iconColor: "text-red-700 bg-red-100 dark:bg-red-900/40 dark:text-red-300",
        audienceLabel: "Assigned to you", urgencyWeight: getUrgencyWeight(action.severity, action.due_date) });
    });

    riskEvaluations.filter((e) => e.company_id === user.company_id && e.submitter_id === user.id && (e.status === "draft" || e.status === "submitted")).forEach((evaluation) => {
      const derivedId = `risk-evaluation-${evaluation.id}`;
      if (dbIds.has(derivedId)) return;
      const isDraft = evaluation.status === "draft";
      items.push({ id: derivedId, type: "risk-assessment", title: assessmentLabelMap[evaluation.form_type] || evaluation.form_type,
        description: isDraft ? "Draft assessment ready to resume" : "Assessment submitted and awaiting review",
        timestamp: new Date(evaluation.reviewed_at || evaluation.submitted_at || evaluation.created_at || fallbackTimestamp), read: readDerivedIds.has(derivedId),
        href: isDraft ? `/${company}/dashboard/risk-assessments/form/${evaluation.form_type.toLowerCase()}?draft=${evaluation.id}` : `/${company}/dashboard/risk-assessments/${evaluation.id}`,
        icon: ClipboardCheck, iconColor: "text-blue-700 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300", audienceLabel: "Assessment", urgencyWeight: isDraft ? 1 : 2 });
    });

    items.sort((a, b) => {
      if (b.urgencyWeight !== a.urgencyWeight) return b.urgencyWeight - a.urgencyWeight;
      if (a.read !== b.read) return a.read ? 1 : -1;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
    return items;
  }, [user, dbNotifications, checklistTemplates, checklistSubmissions, tickets, workOrders, correctiveActions, riskEvaluations, company, fallbackTimestamp, t, readDerivedIds]);

  const handleNotificationClick = (notification: NotificationItem) => {
    if (!notification.read && (notification.id.startsWith("task-") || notification.id.startsWith("ticket-") || notification.id.startsWith("work-order-") || notification.id.startsWith("action-") || notification.id.startsWith("risk-evaluation-"))) {
      setReadDerivedIds((prev) => {
        const next = new Set(prev);
        next.add(notification.id);
        sessionStorage.setItem("harmoniq_read_derived", JSON.stringify([...next]));
        window.dispatchEvent(new Event("harmoniq:derived-read"));
        return next;
      });
    } else if (!notification.read) {
      updateNotification(notification.id, { read: true } as Partial<import("@/stores/notifications-store").Notification>);
    }
  };

  const [filter, setFilter] = React.useState<"all" | "unread">("all");
  const filteredNotifications = React.useMemo(() => {
    if (filter === "unread") return notifications.filter((n) => !n.read);
    return notifications;
  }, [notifications, filter]);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    notifications.forEach((n) => { if (!n.read) handleNotificationClick(n); });
  };

  if (isLoading && dbNotifications.length === 0) return <LoadingPage />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="border-b">
          <div className="flex gap-4">
            <button
              onClick={() => setFilter("all")}
              className={cn(
                "py-3 px-1 text-sm font-medium transition-colors relative",
                filter === "all" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              All
              {filter === "all" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={cn(
                "py-3 px-1 text-sm font-medium transition-colors relative",
                filter === "unread" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Unread {unreadCount > 0 && `(${unreadCount})`}
              {filter === "unread" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
            </button>
          </div>
        </div>
        {unreadCount > 0 && (
          <button type="button" onClick={handleMarkAllRead} className="text-xs font-medium text-primary">Mark all read</button>
        )}
      </div>

      {filteredNotifications.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{filter === "unread" ? "No unread notifications" : "No notifications yet"}</p>
        </div>
      ) : (
        <div className="rounded-lg border divide-y">
          {filteredNotifications.map((notification) => (
            <Link
              key={notification.id}
              href={notification.href}
              onClick={() => handleNotificationClick(notification)}
              className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40"
            >
              <div className="mt-0.5 shrink-0">
                <notification.icon className={cn("h-5 w-5", notification.iconColor.split(" ").find((c) => c.startsWith("text-")) || "text-muted-foreground")} aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn("text-sm leading-snug", !notification.read ? "font-semibold" : "font-medium text-muted-foreground")}>{notification.title}</p>
                  {!notification.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{notification.description}</p>
                <p className="text-[10px] text-muted-foreground/50 mt-1">{formatDate(notification.timestamp)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
