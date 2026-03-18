"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  in_progress: { label: "In Progress", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  blocked: { label: "Blocked", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  waiting: { label: "Waiting", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  closed: { label: "Closed", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" },
  requested: { label: "Requested", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  approved: { label: "Approved", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400" },
  completed: { label: "Completed", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" },
  open: { label: "Open", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
};

export function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || { label: formatStatusLabel(status), color: "bg-gray-100 text-gray-800" };
}

export const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  critical: { label: "Critical", color: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" },
  high: { label: "High", color: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200" },
  medium: { label: "Medium", color: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" },
  low: { label: "Low", color: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200" },
};

interface TaskDetailHeaderProps {
  title: string;
  subtitle?: string;
  status: string;
  overdue?: boolean;
  children?: React.ReactNode;
}

export function TaskDetailHeader({ title, subtitle, status, overdue, children }: TaskDetailHeaderProps) {
  const router = useRouter();
  const conf = getStatusConfig(status);

  return (
    <div className="sticky top-14 z-10 border-b bg-background/95 backdrop-blur px-4 py-3">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold truncate">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {overdue && (
            <Badge className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200">Overdue</Badge>
          )}
          <Badge className={conf.color}>{conf.label}</Badge>
        </div>
      </div>
      {children}
    </div>
  );
}
