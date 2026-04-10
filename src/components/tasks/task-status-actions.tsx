"use client";

import React from "react";
import { CheckCircle, Play, AlertTriangle, Clock, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatStatusLabel } from "@/components/tasks/task-detail-header";

const ACTION_STYLES: Record<string, { icon: typeof Play; className: string }> = {
  in_progress: {
    icon: Play,
    className: "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900",
  },
  approved: {
    icon: CheckCircle,
    className: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300 dark:hover:bg-indigo-900",
  },
  waiting_material: {
    icon: Clock,
    className: "bg-orange-50 text-orange-700 hover:bg-orange-100 dark:bg-orange-950 dark:text-orange-300 dark:hover:bg-orange-900",
  },
  scheduled: {
    icon: CalendarClock,
    className: "bg-cyan-50 text-cyan-700 hover:bg-cyan-100 dark:bg-cyan-950 dark:text-cyan-300 dark:hover:bg-cyan-900",
  },
  resolved: {
    icon: CheckCircle,
    className: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900",
  },
  completed: {
    icon: CheckCircle,
    className: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900",
  },
  closed: {
    icon: CheckCircle,
    className: "bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900",
  },
  cancelled: {
    icon: AlertTriangle,
    className: "bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900",
  },
};

export const STATUS_FLOWS: Record<string, Record<string, string[]>> = {
  ticket: {
    new: ["in_progress"],
    in_progress: ["resolved"],
    resolved: ["closed"],
    blocked: ["in_progress"],
    waiting: ["in_progress"],
    closed: [],
  },
  "work-order": {
    waiting_approval: ["waiting_material", "approved", "cancelled"],
    waiting_material: ["approved", "cancelled"],
    approved: ["scheduled", "in_progress", "cancelled"],
    scheduled: ["in_progress", "cancelled"],
    in_progress: ["completed", "cancelled"],
    completed: [],
    cancelled: [],
  },
  "corrective-action": {
    open: ["in_progress"],
    in_progress: ["completed"],
    completed: [],
  },
};

interface TaskStatusActionsProps {
  kind: "ticket" | "work-order" | "corrective-action";
  currentStatus: string;
  onStatusChange: (targetStatus: string) => void;
  disabled?: boolean;
}

export function TaskStatusActions({ kind, currentStatus, onStatusChange, disabled }: TaskStatusActionsProps) {
  const nextStatuses = STATUS_FLOWS[kind]?.[currentStatus] || [];

  if (nextStatuses.length === 0) return null;

  return (
    <div className="space-y-2">
      {nextStatuses.map((nextStatus) => {
        const style = ACTION_STYLES[nextStatus] || ACTION_STYLES.in_progress;
        const Icon = style.icon;
        return (
          <button
            key={nextStatus}
            onClick={() => onStatusChange(nextStatus)}
            disabled={disabled}
            className={cn(
              "flex items-center justify-center gap-2 w-full rounded-xl px-4 py-3 text-sm font-medium transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              style.className,
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {formatStatusLabel(nextStatus)}
          </button>
        );
      })}
    </div>
  );
}
