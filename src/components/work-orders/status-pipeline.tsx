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
        <div className="h-6 w-6 rounded-full bg-[#6b7280] flex items-center justify-center">
          <span className="text-[10px] text-white font-bold">✕</span>
        </div>
        <span className="text-sm font-medium text-[#374151] dark:text-[#d1d5db]">Cancelled</span>
      </div>
    );
  }

  const currentIndex = PIPELINE_STEPS.findIndex((s) => s.status === currentStatus);

  return (
    <div className={cn("px-2 py-5", className)}>
      <div className="flex items-start">
        {PIPELINE_STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;
          const isLast = index === PIPELINE_STEPS.length - 1;

          return (
            <React.Fragment key={step.status}>
              <div className="flex flex-col items-center gap-2" style={{ minWidth: 0, flex: "0 0 auto" }}>
                {/* Circle */}
                <div
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0",
                    isCompleted && "bg-[#059669] text-white",
                    isActive && "bg-[#2563eb] text-white ring-4 ring-[#2563eb]/20",
                    !isCompleted && !isActive && "border-2 border-[#d1d5db] bg-white text-[#9ca3af] dark:border-[#4b5563] dark:bg-[#1f2937] dark:text-[#6b7280]",
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                {/* Label */}
                <span
                  className={cn(
                    "text-[11px] leading-tight text-center whitespace-nowrap",
                    isCompleted && "text-[#059669] dark:text-[#6ee7b7] font-medium",
                    isActive && "text-[#2563eb] dark:text-[#93c5fd] font-semibold",
                    !isCompleted && !isActive && "text-[#9ca3af] dark:text-[#6b7280]",
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connecting line */}
              {!isLast && (
                <div className="flex-1 flex items-center px-1" style={{ marginTop: 16 }}>
                  <div
                    className={cn(
                      "h-0.5 w-full rounded-full",
                      index < currentIndex
                        ? "bg-[#059669] dark:bg-[#6ee7b7]"
                        : "bg-[#e5e7eb] dark:bg-[#374151]",
                    )}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
