"use client";

import { TasksTabContent } from "@/components/tasks/tasks-tab-content";
import { useTranslation } from "@/i18n";
import { useTicketsStore } from "@/stores/tickets-store";
import { useWorkOrdersStore } from "@/stores/work-orders-store";
import { useCorrectiveActionsStore } from "@/stores/corrective-actions-store";
import { LoadingPage } from "@/components/ui/loading";

export default function TasksPage() {
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
        <h1 className="text-lg font-bold">{t("app.myTasks") || "My tasks"}</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Items assigned to you will appear here
        </p>
      </div>

      <div className="px-4 pt-4">
        <TasksTabContent />
      </div>
    </div>
  );
}
