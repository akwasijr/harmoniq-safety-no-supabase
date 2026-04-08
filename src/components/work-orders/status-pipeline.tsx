"use client";

import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { capitalize } from "@/lib/utils";
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
  statusDate?: string;
  className?: string;
}

export function StatusPipeline({ currentStatus, statusDate, className }: StatusPipelineProps) {
  const currentIndex = currentStatus === "cancelled"
    ? -1
    : STEPS.indexOf(currentStatus);

  if (currentStatus === "cancelled") {
    return (
      <div className={cn("rounded-lg border bg-card px-5 py-4", className)}>
        <p className="text-sm text-muted-foreground">
          Status: <span className="font-medium text-foreground">Cancelled</span>
        </p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border bg-card px-5 py-4", className)}>
      <p className="text-sm text-muted-foreground mb-4">
        Status: <span className="font-medium text-foreground">{capitalize(currentStatus.replace(/_/g, " "))}</span>
      </p>

      <div className="flex items-start">
        {STEPS.map((step, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          const last = i === STEPS.length - 1;

          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center" style={{ minWidth: 0 }}>
                {/* Circle */}
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    done && "border-muted-foreground/50 bg-transparent",
                    active && "border-foreground bg-foreground",
                    !done && !active && "border-muted-foreground/30 bg-transparent",
                  )}
                >
                  {done ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
                  ) : active ? (
                    <span className="h-2 w-2 rounded-full bg-background" />
                  ) : null}
                </div>

                {/* Label */}
                <span
                  className={cn(
                    "mt-1.5 text-[11px] leading-tight text-center max-w-[80px]",
                    active ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                >
                  {LABELS[step]}
                </span>

                {/* Timestamp for active step */}
                {active && statusDate && (
                  <span className="mt-0.5 text-[10px] text-muted-foreground">
                    {new Date(statusDate).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}
              </div>

              {/* Connector line */}
              {!last && (
                <div
                  className={cn(
                    "h-px flex-1 self-center mt-0 shrink-0",
                    i < currentIndex ? "bg-muted-foreground/40" : "bg-border",
                  )}
                  style={{ marginTop: "14px", minWidth: "12px" }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
