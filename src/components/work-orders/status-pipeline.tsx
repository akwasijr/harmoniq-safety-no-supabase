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
      <div className={cn("flex items-center gap-2 px-4 py-3 rounded-lg border bg-muted/30", className)}>
        <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center">
          <span className="text-[10px] text-muted-foreground">✕</span>
        </div>
        <span className="text-sm font-medium text-muted-foreground">Cancelled</span>
      </div>
    );
  }

  const currentIndex = PIPELINE_STEPS.findIndex((s) => s.status === currentStatus);

  return (
    <div className={cn("rounded-lg border bg-card px-4 py-4", className)}>
      <div className="flex items-center">
        {PIPELINE_STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;

          return (
            <React.Fragment key={step.status}>
              {/* Step circle + label */}
              <div className="flex flex-col items-center gap-1.5 min-w-0">
                <div
                  className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors",
                    isCompleted && "bg-emerald-600 text-white dark:bg-emerald-500",
                    isActive && "bg-foreground text-background ring-2 ring-foreground/20 ring-offset-2 ring-offset-background",
                    !isCompleted && !isActive && "bg-muted text-muted-foreground/50",
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-[11px] leading-tight text-center max-w-[80px]",
                    isCompleted && "text-emerald-700 dark:text-emerald-400 font-medium",
                    isActive && "text-foreground font-semibold",
                    !isCompleted && !isActive && "text-muted-foreground/50",
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connecting line */}
              {index < PIPELINE_STEPS.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-1 mt-[-20px]",
                    index < currentIndex
                      ? "bg-emerald-600 dark:bg-emerald-500"
                      : "bg-border",
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
