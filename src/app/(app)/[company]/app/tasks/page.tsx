"use client";

import React from "react";
import Link from "next/link";
import {
  ClipboardList,
  Ticket,
  Wrench,
  ShieldAlert,
  ChevronRight,
  Loader2,
  ListChecks,
  Calendar,
  User as UserIcon,
  AlertTriangle,
  Ban,
  Clock,
  CheckCircle2,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
  href: string;
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
  { id: "all", label: "All", labelKey: "tasks.tabs.all", icon: ListChecks },
  { id: "tickets", label: "Tickets", labelKey: "tasks.tabs.tickets", icon: Ticket },
  { id: "work-orders", label: "Work Orders", labelKey: "tasks.tabs.workOrders", icon: Wrench },
  { id: "actions", label: "Actions", labelKey: "tasks.tabs.actions", icon: ShieldAlert },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TaskCard({ task, formatDate }: { task: UnifiedTask; formatDate: (date: string | Date, options?: Intl.DateTimeFormatOptions) => string }) {
  const KindIcon = getKindIcon(task.kind);
  const kindColor = getKindIconColor(task.kind);

  return (
    <Link
      href={task.href}
      className="flex items-center gap-3 rounded-lg border p-3 transition-colors active:bg-muted/50 hover:bg-muted/40"
    >
      <KindIcon className={cn("h-5 w-5 shrink-0", kindColor)} aria-hidden="true" />

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

      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
    </Link>
  );
}

function EmptyState({ kind, t }: { kind: TabId; t: (key: string, params?: Record<string, string | number>) => string }) {
  const config: Record<TabId, { icon: React.ComponentType<{ className?: string }>; messageKey: string; fallback: string }> = {
    all: { icon: ListChecks, messageKey: "tasks.empty.all", fallback: "No tasks assigned to you" },
    tickets: { icon: Ticket, messageKey: "tasks.empty.tickets", fallback: "No tickets assigned to you" },
    "work-orders": { icon: Wrench, messageKey: "tasks.empty.workOrders", fallback: "No work orders assigned to you" },
    actions: { icon: ShieldAlert, messageKey: "tasks.empty.actions", fallback: "No corrective actions assigned to you" },
  };

  const { icon: Icon, messageKey, fallback } = config[kind];

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center" role="status">
      <div className="rounded-full bg-muted p-4 mb-3">
        <Icon className="h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{t(messageKey) || fallback}</p>
      <p className="text-xs text-muted-foreground/70 mt-1">
        {t("tasks.empty.hint") || "Items assigned to you will appear here"}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function TasksPage() {
  const { t, formatDate } = useTranslation();
  const company = useCompanyParam();
  const { user } = useAuth();

  const { items: tickets, isLoading: ticketsLoading } = useTicketsStore();
  const { items: workOrders, isLoading: workOrdersLoading } = useWorkOrdersStore();
  const { items: correctiveActions, isLoading: actionsLoading } = useCorrectiveActionsStore();
  const { items: users } = useUsersStore();
  const { items: assets } = useAssetsStore();

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
        href: `/${company}/dashboard/tickets/${tk.id}`,
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
        href: `/${company}/dashboard/work-orders?highlight=${wo.id}`,
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
        href: `/${company}/dashboard/corrective-actions?highlight=${ca.id}`,
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
      {/* Header */}
      <header className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" aria-hidden="true" />
          <h1 className="text-lg font-semibold">{t("tasks.title") || "My Tasks"}</h1>
          {allTasks.length > 0 && (
            <Badge variant="secondary" className="text-[10px] h-5 min-w-5 justify-center">
              {allTasks.length}
            </Badge>
          )}
        </div>
      </header>

      {/* Pill Tabs */}
      <div className="sticky top-14 z-20 bg-background border-b px-4 py-2">
        <div className="flex gap-1 bg-muted rounded-lg p-1 overflow-x-auto" role="tablist" aria-label={t("tasks.tabs.label") || "Task categories"}>
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
                  "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium rounded-md transition-all whitespace-nowrap",
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{t(tab.labelKey) || tab.label}</span>
                {count > 0 && (
                  <Badge
                    variant={isActive ? "secondary" : "outline"}
                    className="text-[10px] h-4 min-w-4 justify-center px-1 ml-0.5"
                  >
                    {count}
                  </Badge>
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
        aria-label={t(`tasks.tabs.${activeTab}`) || activeTab}
        className="flex-1 px-4 pt-3 pb-4 space-y-1.5"
      >
        {visibleTasks.length === 0 ? (
          <EmptyState kind={activeTab} t={t} />
        ) : (
          visibleTasks.map((task) => (
            <TaskCard key={`${task.kind}-${task.id}`} task={task} formatDate={formatDate} />
          ))
        )}
      </div>
    </div>
  );
}
