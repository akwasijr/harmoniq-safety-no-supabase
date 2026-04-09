"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Newspaper,
  ClipboardCheck,
  AlertTriangle,
  Wrench,
  ShieldAlert,
  Clock,
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
import { NoDataEmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
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

export default function NotificationsPage() {
  const company = useCompanyParam();
  const router = useRouter();
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

    // Real DB notifications (from triggers)
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
          ? n.source === "content"
            ? `/${company}/app/news/${n.source_id}`
            : n.source === "incident"
              ? `/${company}/app/incidents/${n.source_id}`
              : n.source === "ticket"
                ? `/${company}/app/tasks/tickets/${n.source_id}`
                : n.source === "work_order" || n.source === "work_orders"
                  ? `/${company}/app/tasks/work-orders/${n.source_id}`
                  : n.source === "corrective_action"
                    ? `/${company}/app/tasks/actions/${n.source_id}`
                    : n.source === "checklist"
                      ? `/${company}/app/checklists/${n.source_id}`
                      : `/${company}/app`
          : `/${company}/app`;
        const sourceTicket = n.source === "ticket" ? tickets.find((ticket) => ticket.id === n.source_id) : null;
        const sourceWorkOrder = n.source === "work_order" ? workOrders.find((workOrder) => workOrder.id === n.source_id) : null;
        const sourceAction = n.source === "corrective_action" ? correctiveActions.find((action) => action.id === n.source_id) : null;
        items.push({
          id: n.id,
          type: n.source || "news",
          title: n.title,
          description: n.message,
          timestamp: new Date(n.created_at),
          read: n.read,
          href,
          icon,
          iconColor: color,
          audienceLabel:
            n.source === "ticket"
              ? getAudienceLabel(Boolean(sourceTicket && isAssignedToUserOrTeam(sourceTicket, user)), "Company update")
              : n.source === "work_order"
                ? getAudienceLabel(Boolean(sourceWorkOrder && isAssignedToUserOrTeam(sourceWorkOrder, user)), "Company update")
                : n.source === "corrective_action"
                  ? getAudienceLabel(Boolean(sourceAction && isAssignedToUserOrTeam(sourceAction, user)), "Company update")
                  : n.user_id === user.id
                    ? "Assigned to you"
                    : "Company update",
          urgencyWeight:
            n.source === "ticket"
              ? getUrgencyWeight(sourceTicket?.priority, sourceTicket?.due_date)
              : n.source === "work_order"
                ? getUrgencyWeight(sourceWorkOrder?.priority, sourceWorkOrder?.due_date)
                : n.source === "corrective_action"
                  ? getUrgencyWeight(sourceAction?.severity, sourceAction?.due_date)
                  : 0,
        });
      });

    // Also include derived notifications from stores (for items without triggers)
    // Pending checklist tasks
    const completedIds = new Set(
      checklistSubmissions
        .filter((s) => s.submitter_id === user.id && s.status === "submitted")
        .map((s) => s.template_id)
    );
    const dbIds = new Set(items.map((n) => n.id));
    checklistTemplates
      .filter(
        (template) =>
          template.company_id === user.company_id &&
          isVisibleToFieldApp(template) &&
          !completedIds.has(template.id),
      )
      .forEach((template) => {
        const derivedId = `task-${template.id}`;
        if (dbIds.has(derivedId)) return;
        items.push({
          id: derivedId,
          type: "task",
          title: template.name,
          description: `${template.items?.length || 0} items to complete`,
          timestamp: new Date(template.created_at || fallbackTimestamp),
          read: readDerivedIds.has(derivedId),
          href: `/${company}/app/checklists/${template.id}`,
          icon: ClipboardCheck,
          iconColor: "text-primary bg-primary/15",
          audienceLabel: "Checklist",
          urgencyWeight: 0,
        });
      });

    // Assigned tickets
    tickets
      .filter(
        (ticket) =>
          ticket.company_id === user.company_id &&
          ticket.status === "new" &&
          isAssignedToUserOrTeam(ticket, user),
      )
      .forEach((ticket) => {
        const derivedId = `ticket-${ticket.id}`;
        if (dbIds.has(derivedId)) return;
        items.push({
          id: derivedId,
          type: "ticket",
          title: ticket.title || "Ticket",
          description: `Priority: ${ticket.priority || "normal"}`,
          timestamp: new Date(ticket.created_at || fallbackTimestamp),
          read: readDerivedIds.has(derivedId),
          href: `/${company}/app/tasks/tickets/${ticket.id}`,
          icon: Wrench,
          iconColor: "text-purple-600 bg-purple-100 dark:bg-purple-900/40 dark:text-purple-300",
          audienceLabel: "Assigned to you",
          urgencyWeight: getUrgencyWeight(ticket.priority, ticket.due_date),
        });
      });

    workOrders
      .filter(
        (workOrder) =>
          workOrder.company_id === user.company_id &&
          isAssignedToUserOrTeam(workOrder, user) &&
          workOrder.status !== "completed" &&
          workOrder.status !== "cancelled",
      )
      .forEach((workOrder) => {
        const derivedId = `work-order-${workOrder.id}`;
        if (dbIds.has(derivedId)) return;
        items.push({
          id: derivedId,
          type: "work-order",
          title: workOrder.title,
          description: `Status: ${workOrder.status.replace(/_/g, " ")}`,
          timestamp: new Date(workOrder.updated_at || workOrder.created_at || fallbackTimestamp),
          read: readDerivedIds.has(derivedId),
          href: `/${company}/app/tasks/work-orders/${workOrder.id}`,
          icon: Wrench,
          iconColor: "text-amber-700 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300",
          audienceLabel: "Assigned to you",
          urgencyWeight: getUrgencyWeight(workOrder.priority, workOrder.due_date),
        });
      });

    correctiveActions
      .filter(
        (action) =>
          action.company_id === user.company_id &&
          isAssignedToUserOrTeam(action, user) &&
          action.status !== "completed",
      )
      .forEach((action) => {
        const derivedId = `action-${action.id}`;
        if (dbIds.has(derivedId)) return;
        items.push({
          id: derivedId,
          type: "corrective-action",
          title: t("tasks.actions") || "Corrective action",
          description: action.description,
          timestamp: new Date(action.updated_at || action.created_at || fallbackTimestamp),
          read: readDerivedIds.has(derivedId),
          href: `/${company}/app/tasks/actions/${action.id}`,
          icon: ShieldAlert,
          iconColor: "text-red-700 bg-red-100 dark:bg-red-900/40 dark:text-red-300",
          audienceLabel: "Assigned to you",
          urgencyWeight: getUrgencyWeight(action.severity, action.due_date),
        });
      });

    riskEvaluations
      .filter(
        (evaluation) =>
          evaluation.company_id === user.company_id &&
          evaluation.submitter_id === user.id &&
          (evaluation.status === "draft" || evaluation.status === "submitted"),
      )
      .forEach((evaluation) => {
        const derivedId = `risk-evaluation-${evaluation.id}`;
        if (dbIds.has(derivedId)) return;
        const isDraft = evaluation.status === "draft";
        items.push({
          id: derivedId,
          type: "risk-assessment",
          title: assessmentLabelMap[evaluation.form_type] || evaluation.form_type,
          description: isDraft ? "Draft assessment ready to resume" : "Assessment submitted and awaiting review",
          timestamp: new Date(evaluation.reviewed_at || evaluation.submitted_at || evaluation.created_at || fallbackTimestamp),
          read: readDerivedIds.has(derivedId),
          href: isDraft
            ? `/${company}/app/risk-assessment/${evaluation.form_type.toLowerCase()}?draft=${evaluation.id}`
            : `/${company}/app/risk-assessment/view/${evaluation.id}`,
          icon: ClipboardCheck,
          iconColor: "text-blue-700 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300",
          audienceLabel: "Assessment",
          urgencyWeight: isDraft ? 1 : 2,
        });
      });

    items.sort((a, b) => {
      if (b.urgencyWeight !== a.urgencyWeight) return b.urgencyWeight - a.urgencyWeight;
      if (a.read !== b.read) return a.read ? 1 : -1;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
    return items;
  }, [user, dbNotifications, checklistTemplates, checklistSubmissions, tickets, workOrders, correctiveActions, riskEvaluations, company, fallbackTimestamp, t, readDerivedIds]);


  const handleNotificationClick = (notification: NotificationItem) => {
    if (
      !notification.read &&
      (notification.id.startsWith("task-") ||
        notification.id.startsWith("ticket-") ||
        notification.id.startsWith("work-order-") ||
        notification.id.startsWith("action-") ||
        notification.id.startsWith("risk-evaluation-"))
    ) {
      setReadDerivedIds((prev) => {
        const next = new Set(prev);
        next.add(notification.id);
        sessionStorage.setItem("harmoniq_read_derived", JSON.stringify([...next]));
        return next;
      });
    } else if (!notification.read) {
      updateNotification(notification.id, { read: true } as Partial<import("@/stores/notifications-store").Notification>);
    }
  };

  const [filter, setFilter] = React.useState<"all" | "unread">("all");
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(new Set());
  const [swipeState, setSwipeState] = React.useState<Record<string, number>>({});
  const touchStartX = React.useRef<Record<string, number>>({});

  const filteredNotifications = React.useMemo(() => {
    let items = notifications.filter((n) => !dismissedIds.has(n.id));
    if (filter === "unread") items = items.filter((n) => !n.read);
    return items;
  }, [notifications, filter, dismissedIds]);

  const unreadCount = notifications.filter((n) => !n.read && !dismissedIds.has(n.id)).length;

  const handleMarkAllRead = () => {
    notifications.forEach((n) => {
      if (!n.read) handleNotificationClick(n);
    });
  };

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
    const n = notifications.find((item) => item.id === id);
    if (n && !n.read) handleNotificationClick(n);
  };

  const handleTouchStart = (id: string, x: number) => {
    touchStartX.current[id] = x;
  };

  const handleTouchMove = (id: string, x: number) => {
    const start = touchStartX.current[id];
    if (start === undefined) return;
    const delta = x - start;
    if (delta < -10) {
      setSwipeState((prev) => ({ ...prev, [id]: Math.max(delta, -120) }));
    }
  };

  const handleTouchEnd = (id: string) => {
    const offset = swipeState[id] || 0;
    if (offset < -80) {
      handleDismiss(id);
    }
    setSwipeState((prev) => ({ ...prev, [id]: 0 }));
    delete touchStartX.current[id];
  };

  if (isLoading && dbNotifications.length === 0) {
    return <LoadingPage />;
  }

  return (
    <div className="flex flex-col min-h-full pb-20">
      {/* Header */}
      <div className="sticky top-[60px] z-10 bg-background border-b px-4 pt-4 pb-3 space-y-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted transition-colors"
            aria-label={t("common.goBack")}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold flex-1">{t("notifications.title") || "Notifications"}</h1>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs font-medium text-primary"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "flex-1 py-1.5 text-xs font-medium rounded-md transition-colors",
              filter === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            All
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={cn(
              "flex-1 py-1.5 text-xs font-medium rounded-md transition-colors",
              filter === "unread" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            Unread {unreadCount > 0 && `(${unreadCount})`}
          </button>
        </div>
      </div>

      {/* Notification list */}
      <div className="flex-1">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {filter === "unread" ? "No unread notifications" : "No notifications yet"}
            </p>
          </div>
        ) : (
          <ul>
            {filteredNotifications.map((notification) => {
              const offset = swipeState[notification.id] || 0;
              return (
                <li key={notification.id} className="relative border-b border-border last:border-0 overflow-hidden">
                  {/* Dismiss background */}
                  {offset < -10 && (
                    <div className="absolute inset-y-0 right-0 flex items-center justify-end pr-4 bg-destructive/10 w-full">
                      <span className="text-xs font-medium text-destructive">Dismiss</span>
                    </div>
                  )}

                  <Link
                    href={notification.href}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3.5 transition-all relative bg-background",
                      !notification.read && "bg-primary/5",
                    )}
                    style={{ transform: offset ? `translateX(${offset}px)` : undefined }}
                    onTouchStart={(e) => handleTouchStart(notification.id, e.touches[0].clientX)}
                    onTouchMove={(e) => handleTouchMove(notification.id, e.touches[0].clientX)}
                    onTouchEnd={() => handleTouchEnd(notification.id)}
                  >
                    <div className="mt-0.5 shrink-0">
                      <notification.icon className={cn("h-5 w-5", notification.iconColor.split(" ").find(c => c.startsWith("text-")) || "text-muted-foreground")} aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-sm leading-snug", !notification.read ? "font-semibold" : "font-medium text-muted-foreground")}>
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{notification.description}</p>
                      <p className="text-[10px] text-muted-foreground/50 mt-1">{formatDate(notification.timestamp)}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
