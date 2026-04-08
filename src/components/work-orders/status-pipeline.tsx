"use client";

import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkOrderStatus } from "@/types";

/**
 * Ordered pipeline steps for work order status progression.
 * "cancelled" is excluded — it's a terminal state shown separately.
 */
const PIPELINE_STEPS: { status: WorkOrderStatus; label: string }[] = [
  { status: "waiting_approval", label: "Waiting approval" },
  { status: "waiting_material", label: "Waiting material" },
  { status: "approved", label: "Approved" },
  { status: "scheduled", label: "Scheduled" },
  { status: "in_progress", label: "In progress" },
  { status: "completed", label: "Completed" },
];

const STEP_COLORS: Record<string, { active: string; completed: string }> = {
  waiting_approval: {
    active: "border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-600",
    completed: "border-amber-400 bg-amber-100 dark:bg-amber-900/30 dark:border-amber-700",
  },
  waiting_material: {
    active: "border-orange-500 bg-orange-50 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-600",
    completed: "border-orange-400 bg-orange-100 dark:bg-orange-900/30 dark:border-orange-700",
  },
  approved: {
    active: "border-indigo-500 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-600",
    completed: "border-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 dark:border-indigo-700",
  },
  scheduled: {
    active: "border-cyan-500 bg-cyan-50 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-600",
    completed: "border-cyan-400 bg-cyan-100 dark:bg-cyan-900/30 dark:border-cyan-700",
  },
  in_progress: {
    active: "border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-600",
    completed: "border-blue-400 bg-blue-100 dark:bg-blue-900/30 dark:border-blue-700",
  },
  completed: {
    active: "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-600",
    completed: "border-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 dark:border-emerald-700",
  },
};

interface StatusPipelineProps {
  currentStatus: WorkOrderStatus;
  className?: string;
}

export function StatusPipeline({ currentStatus, className }: StatusPipelineProps) {
  if (currentStatus === "cancelled") {
    return (
      <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 dark:bg-gray-900/40 dark:border-gray-700", className)}>
        <div className="h-2 w-2 rounded-full bg-gray-400 dark:bg-gray-500" />
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Cancelled</span>
      </div>
    );
  }

  const currentIndex = PIPELINE_STEPS.findIndex((s) => s.status === currentStatus);

  return (
    <div className={cn("flex items-stretch gap-0 overflow-x-auto", className)}>
      {PIPELINE_STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isActive = index === currentIndex;
        const isFuture = index > currentIndex;
        const colors = STEP_COLORS[step.status];

        return (
          <div key={step.status} className="flex items-stretch flex-1 min-w-0">
            <div
              className={cn(
                "flex items-center gap-1.5 px-2 py-2 border-b-2 transition-colors w-full justify-center",
                isActive && colors.active,
                isCompleted && colors.completed,
                isFuture && "border-transparent text-muted-foreground/50",
              )}
            >
              {isCompleted && (
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              )}
              {isActive && (
                <div className="h-2 w-2 shrink-0 rounded-full bg-current" />
              )}
              <span
                className={cn(
                  "text-xs font-medium truncate",
                  isFuture && "opacity-50",
                )}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
