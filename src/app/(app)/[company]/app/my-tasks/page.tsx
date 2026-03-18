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
import { useToast } from "@/components/ui/toast";
import { useGps } from "@/hooks/use-gps";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";
import type { WorkOrder } from "@/types";

type TabType = "active" | "completed";

const PRIORITY_CLASSES: Record<string, string> = {
  critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  low: "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300",
};

const STATUS_CLASSES: Record<string, string> = {
  requested: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  approved: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  in_progress: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300",
};

const STATUS_TRANSLATION_KEYS: Record<string, string> = {
  requested: "workOrders.statuses.requested",
  approved: "workOrders.statuses.approved",
  in_progress: "workOrders.statuses.inProgress",
  completed: "workOrders.statuses.completed",
  cancelled: "workOrders.statuses.cancelled",
};

function getRelativeDue(
  dueDate: string,
  t: (key: string, params?: Record<string, string | number>) => string,
): { text: string; overdue: boolean } {
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    return {
      text: absDays === 1
        ? t("tasks.overdueByDay", { days: absDays })
        : t("tasks.overdueByDays", { days: absDays }),
      overdue: true,
    };
  }
  if (diffDays === 0) return { text: t("tasks.dueToday"), overdue: false };
  if (diffDays === 1) return { text: t("tasks.dueTomorrow"), overdue: false };
  return { text: t("tasks.dueInDays", { days: diffDays }), overdue: false };
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
  const { t } = useTranslation();

  const priorityClassName = PRIORITY_CLASSES[wo.priority] ?? PRIORITY_CLASSES.medium;
  const priorityLabel = t(`priority.${wo.priority}`);
  const statusClassName = STATUS_CLASSES[wo.status] ?? STATUS_CLASSES.requested;
  const statusLabel = t(STATUS_TRANSLATION_KEYS[wo.status] ?? "workOrders.statuses.requested");
  const dueInfo = wo.due_date ? getRelativeDue(wo.due_date, t) : null;

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
            <Badge className={cn("text-[10px]", priorityClassName)} variant="secondary">
              {priorityLabel}
            </Badge>
            <Badge className={cn("text-[10px]", statusClassName)} variant="secondary">
              {statusLabel}
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
                {t("tasks.accept")}
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
                {t("tasks.complete")}
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
  const { toast } = useToast();
  const { items: workOrders, isLoading, update } = useWorkOrdersStore();
  const { items: assets } = useAssetsStore();
  const gps = useGps();
  const { t } = useTranslation();

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
        .filter((wo) => wo.status === "completed" || wo.status === "cancelled")
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
      // Capture GPS at the moment of accepting the task
      if (!gps.coords) gps.captureLocation();
      update(id, {
        status: "in_progress",
        location_lat: gps.coords?.lat ?? null,
        location_lng: gps.coords?.lng ?? null,
        updated_at: new Date().toISOString(),
      });
      toast("Task accepted — work order is now in progress", "success");
    },
    [update, toast, gps]
  );

  const handleComplete = React.useCallback(
    (id: string) => {
      // Capture GPS at the moment of completing the task
      if (!gps.coords) gps.captureLocation();
      update(id, {
        status: "completed",
        completed_at: new Date().toISOString(),
        location_lat: gps.coords?.lat ?? null,
        location_lng: gps.coords?.lng ?? null,
        updated_at: new Date().toISOString(),
      });
      toast("Task completed successfully", "success");
    },
    [update, toast, gps]
  );

  if (!user || isLoading) {
    return <LoadingPage />;
  }

  const displayedWOs = tab === "active" ? activeWOs : completedWOs;

  const tabs = [
    { id: "active" as TabType, label: t("tasks.active"), icon: ListChecks, count: activeWOs.length },
    { id: "completed" as TabType, label: t("tasks.completed"), icon: History, count: completedWOs.length },
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
          {tabs.map((tabItem) => {
            const Icon = tabItem.icon;
            const isActive = tab === tabItem.id;
            return (
              <button
                key={tabItem.id}
                onClick={() => setTab(tabItem.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1 py-1.5 px-2 text-[11px] font-medium rounded-md transition-all",
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="h-3 w-3 shrink-0" />
                <span className="truncate">{tabItem.label}</span>
                {tabItem.count > 0 && (
                  <Badge
                    variant={tabItem.id === "active" ? "warning" : "success"}
                    className="text-[9px] h-4 min-w-4 justify-center ml-0.5"
                  >
                    {tabItem.count}
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
            entityName={tab === "active" ? t("tasks.assignedTasks") : t("tasks.completedTasks")}
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
