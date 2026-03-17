"use client";

import React from "react";
import {
  ClipboardList,
  Ticket,
  Wrench,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Loader2,
  ListChecks,
  Calendar,
  User as UserIcon,
  AlertTriangle,
  Ban,
  Clock,
  CheckCircle2,
  Package,
  Play,
  CheckCircle,
  RotateCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyParam } from "@/hooks/use-company-param";
import { useTranslation } from "@/i18n";
import { useTicketsStore } from "@/stores/tickets-store";
import { useWorkOrdersStore } from "@/stores/work-orders-store";
import { useCorrectiveActionsStore } from "@/stores/corrective-actions-store";
import { useUsersStore } from "@/stores/users-store";
import { useAssetsStore } from "@/stores/assets-store";
import type {
  Ticket as TicketType,
  WorkOrder,
  CorrectiveAction,
  TicketStatus,
  WorkOrderStatus,
  CorrectiveActionStatus,
} from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabId = "all" | "tickets" | "work-orders" | "actions";

type UnifiedTask = {
  id: string;
  kind: "ticket" | "work-order" | "corrective-action";
  title: string;
  status: string;
  statusVariant: "default" | "secondary" | "destructive" | "success" | "warning" | "info" | "outline";
  priority?: string;
  priorityVariant?: "default" | "secondary" | "destructive" | "success" | "warning" | "info" | "outline";
  assignedByName: string;
  dueDate: string | null;
  assetName: string | null;
  updatedAt: string;
  isOverdue: boolean;
  priorityWeight: number;
  description?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PRIORITY_WEIGHT: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function getTicketStatusVariant(status: TicketStatus): UnifiedTask["statusVariant"] {
  switch (status) {
    case "resolved":
    case "closed":
      return "success";
    case "in_progress":
      return "info";
    case "blocked":
      return "destructive";
    case "waiting":
      return "warning";
    case "new":
    default:
      return "secondary";
  }
}

function getWorkOrderStatusVariant(status: WorkOrderStatus): UnifiedTask["statusVariant"] {
  switch (status) {
    case "completed":
      return "success";
    case "in_progress":
      return "info";
    case "approved":
      return "warning";
    case "cancelled":
      return "destructive";
    case "requested":
    default:
      return "secondary";
  }
}

function getCorrectiveActionStatusVariant(status: CorrectiveActionStatus): UnifiedTask["statusVariant"] {
  switch (status) {
    case "completed":
      return "success";
    case "in_progress":
      return "info";
    case "overdue":
      return "destructive";
    case "open":
    default:
      return "secondary";
  }
}

function getPriorityVariant(priority: string | undefined): UnifiedTask["priorityVariant"] {
  switch (priority) {
    case "critical":
      return "destructive";
    case "high":
      return "warning";
    case "medium":
      return "info";
    case "low":
    default:
      return "outline";
  }
}

function isItemOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate) return false;
  if (["completed", "resolved", "closed", "cancelled"].includes(status)) return false;
  return new Date(dueDate) < new Date();
}

function formatStatusLabel(status: string): string {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getKindIcon(kind: UnifiedTask["kind"]) {
  switch (kind) {
    case "ticket":
      return Ticket;
    case "work-order":
      return Wrench;
    case "corrective-action":
      return ShieldAlert;
  }
}

function getKindIconColor(kind: UnifiedTask["kind"]) {
  switch (kind) {
    case "ticket":
      return "text-blue-500";
    case "work-order":
      return "text-amber-500";
    case "corrective-action":
      return "text-red-500";
  }
}

// ---------------------------------------------------------------------------
// Tabs config
// ---------------------------------------------------------------------------

const TABS: { id: TabId; label: string; labelKey: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "all", label: "All", labelKey: "tasks.all", icon: ListChecks },
  { id: "tickets", label: "Tickets", labelKey: "tasks.tickets", icon: Ticket },
  { id: "work-orders", label: "Work Orders", labelKey: "tasks.workOrders", icon: Wrench },
  { id: "actions", label: "Actions", labelKey: "tasks.actions", icon: ShieldAlert },
];

// ---------------------------------------------------------------------------
// Status action helpers
// ---------------------------------------------------------------------------

type StatusAction = {
  labelKey: string;
  fallbackLabel: string;
  targetStatus: string;
  icon: React.ComponentType<{ className?: string }>;
  className: string;
};

function getStatusActions(kind: UnifiedTask["kind"], status: string): StatusAction[] {
  if (kind === "work-order") {
    if (status === "approved") {
      return [{ labelKey: "tasks.startWork", fallbackLabel: "Start Work", targetStatus: "in_progress", icon: Play, className: "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900" }];
    }
    if (status === "in_progress") {
      return [{ labelKey: "tasks.markComplete", fallbackLabel: "Mark Complete", targetStatus: "completed", icon: CheckCircle, className: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900" }];
    }
  }
  if (kind === "ticket") {
    if (status === "new") {
      return [{ labelKey: "tasks.start", fallbackLabel: "Start", targetStatus: "in_progress", icon: Play, className: "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900" }];
    }
    if (status === "in_progress") {
      return [{ labelKey: "tasks.resolve", fallbackLabel: "Resolve", targetStatus: "resolved", icon: CheckCircle, className: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900" }];
    }
  }
  if (kind === "corrective-action") {
    if (status === "open") {
      return [{ labelKey: "tasks.start", fallbackLabel: "Start", targetStatus: "in_progress", icon: Play, className: "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900" }];
    }
    if (status === "in_progress") {
      return [{ labelKey: "tasks.complete", fallbackLabel: "Complete", targetStatus: "completed", icon: CheckCircle, className: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900" }];
    }
  }
  return [];
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TaskCard({
  task,
  formatDate,
  t,
  onStatusUpdate,
}: {
  task: UnifiedTask;
  formatDate: (date: string | Date, options?: Intl.DateTimeFormatOptions) => string;
  t: (key: string, params?: Record<string, string | number>) => string;
  onStatusUpdate: (taskId: string, kind: UnifiedTask["kind"], targetStatus: string) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const KindIcon = getKindIcon(task.kind);
  const kindColor = getKindIconColor(task.kind);
  const actions = getStatusActions(task.kind, task.status);
  const iconClassName = cn("h-5 w-5 shrink-0", kindColor);

  return (
    <div className="rounded-lg border transition-colors hover:bg-muted/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 p-3 text-left active:bg-muted/50"
      >
        {task.kind === "ticket" ? (
          <Ticket className={iconClassName} aria-hidden="true" />
        ) : task.kind === "work-order" ? (
          <Wrench className={iconClassName} aria-hidden="true" />
        ) : (
          <ShieldAlert className={iconClassName} aria-hidden="true" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-medium text-sm truncate max-w-[60%]">{task.title}</p>
            <Badge variant={task.statusVariant} className="text-[10px] h-4 shrink-0">
              {formatStatusLabel(task.status)}
            </Badge>
            {task.isOverdue && (
              <Badge variant="destructive" className="text-[10px] h-4 shrink-0">
                Overdue
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            {task.priority && (
              <Badge variant={task.priorityVariant} className="text-[10px] h-4 shrink-0">
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
              </Badge>
            )}
            {task.assetName && (
              <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                <Package className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate max-w-[100px]">{task.assetName}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
            {task.assignedByName && (
              <span className="flex items-center gap-0.5 truncate">
                <UserIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
                {task.assignedByName}
              </span>
            )}
            {task.dueDate && (
              <span className="flex items-center gap-0.5 shrink-0">
                <Calendar className="h-3 w-3" aria-hidden="true" />
                {formatDate(new Date(task.dueDate), { month: "short", day: "numeric" })}
              </span>
            )}
          </div>
        </div>

        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
        )}
      </button>

      {expanded && (
        <div className="border-t px-3 pb-3">
          {task.description && (
            <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line">
              {task.description}
            </p>
          )}
          {!task.description && (
            <p className="text-xs text-muted-foreground/70 mt-2 italic">
              {t("tasks.noDescription") || "No description provided"}
            </p>
          )}

          {actions.length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.targetStatus}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStatusUpdate(task.id, task.kind, action.targetStatus);
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                      action.className,
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {t(action.labelKey) || action.fallbackLabel}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ kind, t }: { kind: TabId; t: (key: string, params?: Record<string, string | number>) => string }) {
  const config: Record<TabId, { icon: React.ComponentType<{ className?: string }>; messageKey: string; fallback: string }> = {
    all: { icon: ListChecks, messageKey: "tasks.empty", fallback: "No tasks assigned to you" },
    tickets: { icon: Ticket, messageKey: "tasks.emptyTickets", fallback: "No tickets assigned to you" },
    "work-orders": { icon: Wrench, messageKey: "tasks.emptyWorkOrders", fallback: "No work orders assigned to you" },
    actions: { icon: ShieldAlert, messageKey: "tasks.emptyActions", fallback: "No corrective actions assigned to you" },
  };

  const { icon: Icon, messageKey, fallback } = config[kind];

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center" role="status">
      <div className="rounded-full bg-muted p-4 mb-3">
        <Icon className="h-10 w-10 text-muted-foreground/40" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{t(messageKey) || fallback}</p>
      <p className="text-xs text-muted-foreground/70 mt-1">
        {t("tasks.emptyHint") || "Items assigned to you will appear here"}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function TasksPage() {
  const { t, formatDate } = useTranslation();
  const { toast } = useToast();
  const company = useCompanyParam();
  const { user } = useAuth();

  const { items: tickets, isLoading: ticketsLoading, update: updateTicket } = useTicketsStore();
  const { items: workOrders, isLoading: workOrdersLoading, update: updateWorkOrder } = useWorkOrdersStore();
  const { items: correctiveActions, isLoading: actionsLoading, update: updateCorrectiveAction } = useCorrectiveActionsStore();
  const { items: users } = useUsersStore();
  const { items: assets } = useAssetsStore();

  const handleStatusUpdate = React.useCallback(
    (taskId: string, kind: UnifiedTask["kind"], targetStatus: string) => {
      const now = new Date().toISOString();
      if (kind === "work-order") {
        const updates: Partial<WorkOrder> = { status: targetStatus as WorkOrderStatus, updated_at: now };
        if (targetStatus === "completed") updates.completed_at = now;
        updateWorkOrder(taskId, updates);
      } else if (kind === "ticket") {
        updateTicket(taskId, { status: targetStatus as TicketStatus, updated_at: now });
      } else if (kind === "corrective-action") {
        const updates: Partial<CorrectiveAction> = { status: targetStatus as CorrectiveActionStatus, updated_at: now };
        if (targetStatus === "completed") updates.completed_at = now;
        updateCorrectiveAction(taskId, updates);
      }
      toast(t("tasks.statusUpdated") || "Status updated", "success");
    },
    [updateTicket, updateWorkOrder, updateCorrectiveAction, toast, t],
  );

  const [activeTab, setActiveTab] = React.useState<TabId>("all");

  const isLoading = ticketsLoading || workOrdersLoading || actionsLoading;

  // Lookup helpers
  const getUserName = React.useCallback(
    (id: string | null) => {
      if (!id) return "";
      const u = users.find((u) => u.id === id);
      return u?.full_name ?? "";
    },
    [users],
  );

  const getAssetName = React.useCallback(
    (id: string | null) => {
      if (!id) return null;
      const a = assets.find((a) => a.id === id);
      return a?.name ?? null;
    },
    [assets],
  );

  // Build unified task lists
  const { myTickets, myWorkOrders, myActions, allTasks } = React.useMemo(() => {
    if (!user) return { myTickets: [], myWorkOrders: [], myActions: [], allTasks: [] };

    const companyId = user.company_id;

    // Tickets assigned to me or my teams
    const filteredTickets: UnifiedTask[] = tickets
      .filter(
        (tk) =>
          tk.company_id === companyId &&
          (tk.assigned_to === user.id ||
            (user.team_ids?.length && tk.assigned_groups?.some((g) => user.team_ids!.includes(g)))),
      )
      .map((tk) => ({
        id: tk.id,
        kind: "ticket" as const,
        title: tk.title,
        status: tk.status,
        statusVariant: getTicketStatusVariant(tk.status),
        priority: tk.priority,
        priorityVariant: getPriorityVariant(tk.priority),
        assignedByName: getUserName(tk.created_by),
        dueDate: tk.due_date,
        assetName: null,
        updatedAt: tk.updated_at,
        isOverdue: isItemOverdue(tk.due_date, tk.status),
        priorityWeight: PRIORITY_WEIGHT[tk.priority] ?? 0,
        description: tk.description || "",
      }));

    // Work orders assigned to me or requested by me
    const filteredWorkOrders: UnifiedTask[] = workOrders
      .filter(
        (wo) =>
          wo.company_id === companyId &&
          (wo.assigned_to === user.id || wo.requested_by === user.id),
      )
      .map((wo) => ({
        id: wo.id,
        kind: "work-order" as const,
        title: wo.title,
        status: wo.status,
        statusVariant: getWorkOrderStatusVariant(wo.status),
        priority: wo.priority,
        priorityVariant: getPriorityVariant(wo.priority),
        assignedByName: getUserName(wo.requested_by),
        dueDate: wo.due_date,
        assetName: getAssetName(wo.asset_id),
        updatedAt: wo.updated_at,
        isOverdue: isItemOverdue(wo.due_date, wo.status),
        priorityWeight: PRIORITY_WEIGHT[wo.priority] ?? 0,
        description: wo.description || "",
      }));

    // Corrective actions assigned to me
    const filteredActions: UnifiedTask[] = correctiveActions
      .filter((ca) => ca.company_id === companyId && ca.assigned_to === user.id)
      .map((ca) => ({
        id: ca.id,
        kind: "corrective-action" as const,
        title: ca.description,
        status: ca.status,
        statusVariant: getCorrectiveActionStatusVariant(ca.status),
        priority: ca.severity,
        priorityVariant: getPriorityVariant(ca.severity),
        assignedByName: "",
        dueDate: ca.due_date,
        assetName: getAssetName(ca.asset_id),
        updatedAt: ca.updated_at,
        isOverdue: isItemOverdue(ca.due_date, ca.status),
        priorityWeight: PRIORITY_WEIGHT[ca.severity] ?? 0,
        description: ca.description || "",
      }));

    const sortTasks = (a: UnifiedTask, b: UnifiedTask) => {
      // Overdue items first
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      // Then by priority weight (higher = more urgent)
      if (b.priorityWeight !== a.priorityWeight) return b.priorityWeight - a.priorityWeight;
      // Then by updated_at desc
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    };

    return {
      myTickets: [...filteredTickets].sort(sortTasks),
      myWorkOrders: [...filteredWorkOrders].sort(sortTasks),
      myActions: [...filteredActions].sort(sortTasks),
      allTasks: [...filteredTickets, ...filteredWorkOrders, ...filteredActions].sort(sortTasks),
    };
  }, [user, tickets, workOrders, correctiveActions, company, getUserName, getAssetName]);

  // Current visible list based on active tab
  const visibleTasks = React.useMemo(() => {
    switch (activeTab) {
      case "tickets":
        return myTickets;
      case "work-orders":
        return myWorkOrders;
      case "actions":
        return myActions;
      case "all":
      default:
        return allTasks;
    }
  }, [activeTab, allTasks, myTickets, myWorkOrders, myActions]);

  // Tab counts
  const tabCounts: Record<TabId, number> = React.useMemo(
    () => ({
      all: allTasks.length,
      tickets: myTickets.length,
      "work-orders": myWorkOrders.length,
      actions: myActions.length,
    }),
    [allTasks, myTickets, myWorkOrders, myActions],
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center" role="status" aria-label={t("common.loading")}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header + Tabs */}
      <div className="sticky top-14 z-10 bg-background border-b px-4 pt-4 pb-3">
        <h1 className="text-lg font-bold mb-3">{t("tasks.title") || "My Tasks"}</h1>
        {allTasks.length > 0 && (
          <p className="text-xs text-muted-foreground -mt-2 mb-3">{allTasks.length} {t("tasks.total") || "total tasks"}</p>
        )}

        <div className="flex gap-1 bg-muted rounded-lg p-1 overflow-x-auto" role="tablist" aria-label={t("tasks.title") || "Task categories"}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = tabCounts[tab.id];
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-medium rounded-md transition-all whitespace-nowrap",
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{t(tab.labelKey) || tab.label}</span>
                {count > 0 && (
                  <span className="ml-0.5 bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Task list */}
      <div
        id={`tabpanel-${activeTab}`}
        role="tabpanel"
        aria-label={t(`tasks.${activeTab}`) || activeTab}
        className="flex-1 px-4 pt-3 pb-20 space-y-1.5"
      >
        {visibleTasks.length === 0 ? (
          <EmptyState kind={activeTab} t={t} />
        ) : (
          visibleTasks.map((task) => (
            <TaskCard key={`${task.kind}-${task.id}`} task={task} formatDate={formatDate} t={t} onStatusUpdate={handleStatusUpdate} />
          ))
        )}
      </div>
    </div>
  );
}
