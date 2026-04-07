"use client";

import Link from "next/link";
import { ClipboardCheck, ClipboardList, ShieldCheck } from "lucide-react";
import { TasksTabContent } from "@/components/tasks/tasks-tab-content";
import { useCompanyParam } from "@/hooks/use-company-param";
import { useTranslation } from "@/i18n";
import { useTicketsStore } from "@/stores/tickets-store";
import { useWorkOrdersStore } from "@/stores/work-orders-store";
import { useCorrectiveActionsStore } from "@/stores/corrective-actions-store";
import { LoadingPage } from "@/components/ui/loading";

export default function TasksPage() {
  const company = useCompanyParam();
  const { t } = useTranslation();

  const { items: tickets, isLoading: ticketsLoading } = useTicketsStore();
  const { items: workOrders, isLoading: workOrdersLoading } = useWorkOrdersStore();
  const { items: actions, isLoading: actionsLoading } = useCorrectiveActionsStore();

  const isLoading =
    (ticketsLoading && tickets.length === 0) ||
    (workOrdersLoading && workOrders.length === 0) ||
    (actionsLoading && actions.length === 0);

  if (isLoading) {
    return <LoadingPage />;
  }

  return (
    <div className="flex min-h-full flex-col pb-20">
      <div className="sticky top-[60px] z-10 border-b bg-background px-4 pt-4 pb-3">
        <h1 className="text-lg font-bold">{t("app.myTasks") || "My Tasks"}</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("tasks.pageHint") || "Assigned work appears here. Tickets are for incident follow-up, work orders are for maintenance, and corrective actions are for remediation."}
        </p>
      </div>

      <div className="space-y-4 px-4 pt-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-3">
            <p className="text-xs font-semibold">Tickets</p>
            <p className="mt-1 text-xs text-muted-foreground">Investigation and incident follow-up tasks.</p>
          </div>
          <div className="rounded-xl border bg-card p-3">
            <p className="text-xs font-semibold">Work orders</p>
            <p className="mt-1 text-xs text-muted-foreground">Repairs and maintenance work against assets.</p>
          </div>
          <div className="rounded-xl border bg-card p-3">
            <p className="text-xs font-semibold">Corrective actions</p>
            <p className="mt-1 text-xs text-muted-foreground">Safety remediation that must be closed out.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href={`/${company}/app/checklists?tab=checklists`}
            className="flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/30"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <ClipboardCheck className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{t("checklists.tabs.checklists") || "Checklists"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("tasks.publishedHint") || "Open published safety checklists available to your company."}
              </p>
            </div>
          </Link>

          <Link
            href={`/${company}/app/inspection`}
            className="flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/30"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
              <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{t("inspectionRounds.title") || "Inspection work"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("tasks.inspectionHint") || "Start assigned rounds or run an inspection against an asset."}
              </p>
            </div>
          </Link>
        </div>

        <section aria-labelledby="assigned-work-heading" className="space-y-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 id="assigned-work-heading" className="text-sm font-semibold">
              {t("tasks.assigned") || "Assigned"}
            </h2>
          </div>
          <TasksTabContent />
        </section>
      </div>
    </div>
  );
}
