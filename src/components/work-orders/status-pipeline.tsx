"use client";

import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkOrderStatus } from "@/types";

const STEPS: WorkOrderStatus[] = [
  "waiting_approval",
  "waiting_material",
  "approved",
  "scheduled",
  "in_progress",
  "completed",
];

const LABELS: Record<string, string> = {
  waiting_approval: "Waiting approval",
  waiting_material: "Waiting material",
  approved: "Approved",
  scheduled: "Scheduled",
  in_progress: "In progress",
  completed: "Completed",
};

interface StatusPipelineProps {
  currentStatus: WorkOrderStatus;
  className?: string;
}

export function StatusPipeline({ currentStatus, className }: StatusPipelineProps) {
  const currentIndex = currentStatus === "cancelled"
    ? -1
    : STEPS.indexOf(currentStatus);

  if (currentStatus === "cancelled") {
    return (
      <div className={cn("rounded-lg border bg-card px-4 py-3", className)}>
        <p className="text-sm text-muted-foreground">Status: <span className="font-medium text-foreground">Cancelled</span></p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border bg-card px-4 py-4", className)}>
      <div className="flex items-center gap-1">
        {STEPS.map((step, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          const last = i === STEPS.length - 1;

          return (
            <React.Fragment key={step}>
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  done && "bg-[#059669] text-white",
                  active && "bg-foreground text-background",
                  !done && !active && "bg-muted text-muted-foreground",
                )}
              >
                {done ? (
                  <Check className="h-3 w-3" strokeWidth={3} />
                ) : (
                  <span>{i + 1}.</span>
                )}
                {LABELS[step]}
              </div>

              {!last && (
                <div className={cn(
                  "w-4 h-px shrink-0",
                  i < currentIndex ? "bg-[#059669]" : "bg-border",
                )} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
