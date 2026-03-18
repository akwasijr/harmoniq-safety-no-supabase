"use client";

import React from "react";
import { useTranslation } from "@/i18n";
import { TasksTabContent } from "@/components/tasks/tasks-tab-content";

export default function TasksPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col min-h-full pb-20">
      <div className="sticky top-14 z-10 bg-background border-b px-4 pt-4 pb-3">
        <h1 className="text-lg font-bold">{t("tasks.title") || "My Tasks"}</h1>
      </div>
      <div className="flex-1 px-4 pt-3">
        <TasksTabContent />
      </div>
    </div>
  );
}
