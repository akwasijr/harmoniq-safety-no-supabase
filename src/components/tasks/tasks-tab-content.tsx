"use client";

import React from "react";
import {
  ClipboardList,
  Ticket,
  Wrench,
  ShieldAlert,
  ChevronRight,
  Loader2,
  Calendar,
  User as UserIcon,
  CheckCircle,
  Package,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/use-auth";
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

type UnifiedTask = {
  id: string;
  kind: "ticket" | "work-order" | "corrective-action";
  title: string;
  status: string;
  statusVariant: "default" | "secondary" | "destructive" | "success" | "warning" | "info" | "outline";
  priority?: string;
  priorityVariant?: "default" | "secondary" | "destructive" | "success" | "warning" | "info" | "outline";
  assignedTo: string | null;
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
  const kindColor = getKindIconColor(task.kind);
  const actions = getStatusActions(task.kind, task.status);
  const KindIcon = task.kind === "ticket" ? Ticket : task.kind === "work-order" ? Wrench : ShieldAlert;

  return (
    <Card className="hover:bg-muted/50 transition-colors">
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg shrink-0", 
            task.kind === "ticket" ? "bg-blue-500/10" : task.kind === "work-order" ? "bg-amber-500/10" : "bg-red-500/10"
          )}>
            <KindIcon className={cn("h-4.5 w-4.5", kindColor)} aria-hidden="true" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm truncate">{task.title}</h3>
              <Badge variant={task.statusVariant} className="text-[10px] h-4 shrink-0">
                {formatStatusLabel(task.status)}
              </Badge>
            </div>

            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
              {task.priority && (
                <span className="capitalize">{task.priority}</span>
              )}
              {task.assetName && (
                <span className="flex items-center gap-0.5">
                  <Package className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="truncate max-w-[100px]">{task.assetName}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
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
              {task.isOverdue && (
                <Badge variant="destructive" className="text-[10px] h-4 shrink-0">Overdue</Badge>
              )}
            </div>

            {actions.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
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

          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" aria-hidden="true" />
        </div>
      </CardContent>
    </Card>
  );
}

function TasksEmptyState({ t }: { t: (key: string, params?: Record<string, string | number>) => string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center" role="status">
      <div className="rounded-full bg-muted p-4 mb-3">
        <ClipboardList className="h-10 w-10 text-muted-foreground/40" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{t("tasks.empty") || "No tasks assigned to you"}</p>
      <p className="text-xs text-muted-foreground/70 mt-1">
        {t("tasks.emptyHint") || "Items assigned to you will appear here"}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exported TasksTabContent — used both in standalone /tasks and embedded in Safety
// ---------------------------------------------------------------------------

export function TasksTabContent() {
  const { t, formatDate } = useTranslation();
  const { toast } = useToast();
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

  const isLoading = ticketsLoading || workOrdersLoading || actionsLoading;

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

  const allTasks = React.useMemo(() => {
    if (!user) return [];

    const companyId = user.company_id;

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
        assignedTo: tk.assigned_to ?? null,
        assignedByName: getUserName(tk.created_by),
        dueDate: tk.due_date,
        assetName: null,
        updatedAt: tk.updated_at,
        isOverdue: isItemOverdue(tk.due_date, tk.status),
        priorityWeight: PRIORITY_WEIGHT[tk.priority] ?? 0,
        description: tk.description || "",
      }));

    const filteredWorkOrders: UnifiedTask[] = workOrders
      .filter(
        (wo) =>
          wo.company_id === companyId &&
          wo.assigned_to === user.id,
      )
      .map((wo) => ({
        id: wo.id,
        kind: "work-order" as const,
        title: wo.title,
        status: wo.status,
        statusVariant: getWorkOrderStatusVariant(wo.status),
        priority: wo.priority,
        priorityVariant: getPriorityVariant(wo.priority),
        assignedTo: wo.assigned_to ?? null,
        assignedByName: getUserName(wo.requested_by),
        dueDate: wo.due_date,
        assetName: getAssetName(wo.asset_id),
        updatedAt: wo.updated_at,
        isOverdue: isItemOverdue(wo.due_date, wo.status),
        priorityWeight: PRIORITY_WEIGHT[wo.priority] ?? 0,
        description: wo.description || "",
      }));

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
        assignedTo: ca.assigned_to ?? null,
        assignedByName: "",
        dueDate: ca.due_date,
        assetName: getAssetName(ca.asset_id),
        updatedAt: ca.updated_at,
        isOverdue: isItemOverdue(ca.due_date, ca.status),
        priorityWeight: PRIORITY_WEIGHT[ca.severity] ?? 0,
        description: ca.description || "",
      }));

    const sortTasks = (a: UnifiedTask, b: UnifiedTask) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      if (b.priorityWeight !== a.priorityWeight) return b.priorityWeight - a.priorityWeight;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    };

    return [...filteredTickets, ...filteredWorkOrders, ...filteredActions].sort(sortTasks);
  }, [user, tickets, workOrders, correctiveActions, getUserName, getAssetName]);

  const COMPLETED_STATUSES = new Set(["resolved", "closed", "completed", "cancelled"]);

  const assignedTasks = React.useMemo(
    () => allTasks.filter((t) => !COMPLETED_STATUSES.has(t.status)),
    [allTasks],
  );

  const completedTasks = React.useMemo(
    () => allTasks.filter((t) => COMPLETED_STATUSES.has(t.status)),
    [allTasks],
  );

  const [tab, setTab] = React.useState<"assigned" | "completed">("assigned");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");

  const filteredTasks = React.useMemo(() => {
    const base = tab === "assigned" ? assignedTasks : completedTasks;
    if (typeFilter !== "all") {
      return base.filter((t) => t.kind === typeFilter);
    }
    return base;
  }, [tab, assignedTasks, completedTasks, typeFilter]);

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center" role="status" aria-label="Loading">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Assigned / Completed sub-tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1" role="tablist">
        {([
          { id: "assigned" as const, labelKey: "tasks.assigned", fallback: "Assigned" },
          { id: "completed" as const, labelKey: "tasks.completed", fallback: "Completed" },
        ]).map((t_) => (
          <button
            key={t_.id}
            role="tab"
            aria-selected={tab === t_.id}
            onClick={() => setTab(t_.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-medium rounded-md transition-all",
              tab === t_.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
          >
            {t(t_.labelKey) || t_.fallback}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border bg-muted/50 px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">{t("tasks.allTypes") || "All Types"}</option>
            <option value="ticket">{t("tasks.tickets") || "Tickets"}</option>
            <option value="work-order">{t("tasks.workOrders") || "Work Orders"}</option>
            <option value="corrective-action">{t("tasks.actions") || "Actions"}</option>
          </select>

          {typeFilter !== "all" && (
            <button
              onClick={() => { setTypeFilter("all"); }}
              className="text-xs text-primary font-medium whitespace-nowrap px-2"
            >
              {t("common.clear") || "Clear"}
            </button>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground">
          {filteredTasks.length} {filteredTasks.length === 1 ? (t("tasks.task") || "task") : (t("tasks.tasksPlural") || "tasks")}
        </p>
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <TasksEmptyState t={t} />
        ) : (
          filteredTasks.map((task) => (
            <TaskCard key={`${task.kind}-${task.id}`} task={task} formatDate={formatDate} t={t} onStatusUpdate={handleStatusUpdate} />
          ))
        )}
      </div>
    </div>
  );
}
