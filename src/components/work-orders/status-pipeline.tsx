"use client";

import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkOrderStatus } from "@/types";

const PIPELINE_STEPS: { status: WorkOrderStatus; label: string }[] = [
  { status: "waiting_approval", label: "Waiting approval" },
  { status: "waiting_material", label: "Waiting material" },
  { status: "approved", label: "Approved" },
  { status: "scheduled", label: "Scheduled" },
  { status: "in_progress", label: "In progress" },
  { status: "completed", label: "Completed" },
];

interface StatusPipelineProps {
  currentStatus: WorkOrderStatus;
  className?: string;
}

export function StatusPipeline({ currentStatus, className }: StatusPipelineProps) {
  if (currentStatus === "cancelled") {
    return (
      <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/50", className)}>
        <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
        <span className="text-sm font-medium text-muted-foreground">Cancelled</span>
      </div>
    );
  }

  const currentIndex = PIPELINE_STEPS.findIndex((s) => s.status === currentStatus);

  return (
    <div className={cn("flex items-center gap-0 rounded-lg border bg-card p-1", className)}>
      {PIPELINE_STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isActive = index === currentIndex;
        const isFuture = index > currentIndex;

        return (
          <div
            key={step.status}
            className={cn(
              "flex items-center justify-center gap-1.5 flex-1 min-w-0 py-2 px-1 rounded-md text-center transition-colors",
              isActive && "bg-primary text-primary-foreground",
              isCompleted && "text-muted-foreground",
              isFuture && "text-muted-foreground/40",
            )}
          >
            {isCompleted && (
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            )}
            <span
              className={cn(
                "text-xs font-medium truncate",
                isActive && "font-semibold",
              )}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
