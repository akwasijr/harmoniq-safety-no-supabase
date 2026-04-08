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
  const currentIndex = currentStatus === "cancelled"
    ? -1
    : PIPELINE_STEPS.findIndex((s) => s.status === currentStatus);

  return (
    <div className={cn("rounded-lg border bg-card", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b">
        <h3 className="text-sm font-medium text-foreground">
          Status: {currentStatus === "cancelled" ? "Cancelled" : PIPELINE_STEPS[currentIndex]?.label || "Unknown"}
        </h3>
      </div>

      {/* Stepper */}
      <div className="px-6 py-6">
        {currentStatus === "cancelled" ? (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-[#dc2626] flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-bold">✕</span>
            </div>
            <span className="text-sm font-medium text-[#dc2626]">This work order has been cancelled</span>
          </div>
        ) : (
          <div className="flex items-center">
            {PIPELINE_STEPS.map((step, index) => {
              const isCompleted = index < currentIndex;
              const isActive = index === currentIndex;
              const isLast = index === PIPELINE_STEPS.length - 1;

              return (
                <React.Fragment key={step.status}>
                  {/* Step */}
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <div
                      className={cn(
                        "relative h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold",
                        isCompleted && "bg-[#059669] text-white",
                        isActive && "bg-[#2563eb] text-white shadow-[0_0_0_4px_rgba(37,99,235,0.15)]",
                        !isCompleted && !isActive && "border-2 border-[#d1d5db] text-[#9ca3af] dark:border-[#4b5563] dark:text-[#6b7280]",
                      )}
                    >
                      {isCompleted ? <Check className="h-4 w-4" strokeWidth={3} /> : index + 1}
                    </div>
                    <span
                      className={cn(
                        "text-xs text-center whitespace-nowrap leading-tight",
                        isCompleted && "text-[#047857] dark:text-[#6ee7b7] font-medium",
                        isActive && "text-[#1d4ed8] dark:text-[#93c5fd] font-semibold",
                        !isCompleted && !isActive && "text-[#9ca3af] dark:text-[#6b7280]",
                      )}
                    >
                      {step.label}
                    </span>
                  </div>

                  {/* Line */}
                  {!isLast && (
                    <div className="flex-1 mx-2 mt-[-20px]">
                      <div
                        className={cn(
                          "h-[3px] w-full rounded-full",
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
        )}
      </div>
    </div>
  );
}
