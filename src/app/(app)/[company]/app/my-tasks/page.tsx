"use client";

import * as React from "react";
import {
  Wrench,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ListChecks,
  History,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NoDataEmptyState } from "@/components/ui/empty-state";
import { LoadingPage } from "@/components/ui/loading";
import { useWorkOrdersStore } from "@/stores/work-orders-store";
import { useAssetsStore } from "@/stores/assets-store";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyParam } from "@/hooks/use-company-param";
import { cn } from "@/lib/utils";
import type { WorkOrder } from "@/types";

type TabType = "active" | "completed";

const PRIORITY_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  critical: {
    label: "Critical",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  high: {
    label: "High",
    className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  },
  medium: {
    label: "Medium",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  low: {
    label: "Low",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400",
  },
};

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  requested: {
    label: "Requested",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  approved: {
    label: "Approved",
    className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  completed: {
    label: "Completed",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
};

function getRelativeDue(dueDate: string): { text: string; overdue: boolean } {
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      text: `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? "s" : ""}`,
      overdue: true,
    };
  }
  if (diffDays === 0) return { text: "Due today", overdue: false };
  if (diffDays === 1) return { text: "Due tomorrow", overdue: false };
  return { text: `Due in ${diffDays} days`, overdue: false };
}

function WorkOrderCard({
  wo,
  assetName,
  onAccept,
  onComplete,
}: {
  wo: WorkOrder;
  assetName: string | null;
  onAccept: (id: string) => void;
  onComplete: (id: string) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);

  const priority = PRIORITY_CONFIG[wo.priority] ?? PRIORITY_CONFIG.medium;
  const status = STATUS_CONFIG[wo.status] ?? STATUS_CONFIG.requested;
  const dueInfo = wo.due_date ? getRelativeDue(wo.due_date) : null;

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start gap-3 p-3 text-left transition-colors active:bg-muted/50 hover:bg-muted/30"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Wrench className="h-5 w-5 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{wo.title}</p>

          {assetName && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {assetName}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <Badge className={cn("text-[10px]", priority.className)} variant="secondary">
              {priority.label}
            </Badge>
            <Badge className={cn("text-[10px]", status.className)} variant="secondary">
              {status.label}
            </Badge>
          </div>

          {dueInfo && (
            <div className="flex items-center gap-1 mt-1.5">
              <Clock className={cn("h-3 w-3", dueInfo.overdue ? "text-red-500" : "text-muted-foreground")} />
              <span
                className={cn(
                  "text-xs",
                  dueInfo.overdue ? "text-red-600 font-medium" : "text-muted-foreground"
                )}
              >
                {dueInfo.text}
              </span>
            </div>
          )}
        </div>

        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t">
          {wo.description && (
            <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line">
              {wo.description}
            </p>
          )}

          <div className="flex gap-2 mt-3">
            {(wo.status === "requested" || wo.status === "approved") && (
              <Button
                size="sm"
                className="gap-1 flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onAccept(wo.id);
                }}
              >
                <Wrench className="h-3.5 w-3.5" />
                Accept
              </Button>
            )}
            {wo.status === "in_progress" && (
              <Button
                size="sm"
                className="gap-1 flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onComplete(wo.id);
                }}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Complete
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MyTasksPage() {
  const company = useCompanyParam();
  const { user } = useAuth();
  const { items: workOrders, isLoading, update } = useWorkOrdersStore();
  const { items: assets } = useAssetsStore();

  const [tab, setTab] = React.useState<TabType>("active");

  const myWorkOrders = React.useMemo(() => {
    if (!user) return [];
    return workOrders.filter((wo) => wo.assigned_to === user.id);
  }, [workOrders, user]);

  const activeWOs = React.useMemo(
    () =>
      myWorkOrders
        .filter((wo) =>
          wo.status === "requested" ||
          wo.status === "approved" ||
          wo.status === "in_progress"
        )
        .sort((a, b) => {
          const priorityOrder: Record<string, number> = {
            critical: 0,
            high: 1,
            medium: 2,
            low: 3,
          };
          return (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
        }),
    [myWorkOrders]
  );

  const completedWOs = React.useMemo(
    () =>
      myWorkOrders
        .filter((wo) => wo.status === "completed")
        .sort((a, b) =>
          new Date(b.completed_at ?? b.updated_at).getTime() -
          new Date(a.completed_at ?? a.updated_at).getTime()
        ),
    [myWorkOrders]
  );

  const getAssetName = React.useCallback(
    (assetId: string | null) => {
      if (!assetId) return null;
      return assets.find((a) => a.id === assetId)?.name ?? null;
    },
    [assets]
  );

  const handleAccept = React.useCallback(
    (id: string) => {
      update(id, { status: "in_progress" });
    },
    [update]
  );

  const handleComplete = React.useCallback(
    (id: string) => {
      update(id, {
        status: "completed",
        completed_at: new Date().toISOString(),
      });
    },
    [update]
  );

  if (!user || isLoading) {
    return <LoadingPage />;
  }

  const displayedWOs = tab === "active" ? activeWOs : completedWOs;

  const tabs = [
    { id: "active" as TabType, label: "Active", icon: ListChecks, count: activeWOs.length },
    { id: "completed" as TabType, label: "Completed", icon: History, count: completedWOs.length },
  ];

  return (
    <div className="flex flex-col min-h-full bg-background">
      {/* Header */}
      <div className="sticky top-14 z-10 border-b bg-background/95 backdrop-blur px-4 py-3">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">My Tasks</h1>
          <Badge variant="secondary" className="text-xs">
            {activeWOs.length}
          </Badge>
        </div>

        {/* Sub-tab pills */}
        <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5 mt-3">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1 py-1.5 px-2 text-[11px] font-medium rounded-md transition-all",
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="h-3 w-3 shrink-0" />
                <span className="truncate">{t.label}</span>
                {t.count > 0 && (
                  <Badge
                    variant={t.id === "active" ? "warning" : "success"}
                    className="text-[9px] h-4 min-w-4 justify-center ml-0.5"
                  >
                    {t.count}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-4">
        {displayedWOs.length === 0 ? (
          <NoDataEmptyState
            entityName={tab === "active" ? "assigned tasks" : "completed tasks"}
          />
        ) : (
          <div className="space-y-3">
            {displayedWOs.map((wo) => (
              <WorkOrderCard
                key={wo.id}
                wo={wo}
                assetName={getAssetName(wo.asset_id)}
                onAccept={handleAccept}
                onComplete={handleComplete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
