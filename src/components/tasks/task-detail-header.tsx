"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; variant: string }> = {
  new: { label: "New", variant: "info" },
  in_progress: { label: "In Progress", variant: "in_progress" },
  blocked: { label: "Blocked", variant: "destructive" },
  waiting: { label: "Waiting", variant: "warning" },
  resolved: { label: "Resolved", variant: "resolved" },
  closed: { label: "Closed", variant: "archived" },
  requested: { label: "Requested", variant: "info" },
  approved: { label: "Approved", variant: "in_review" },
  completed: { label: "Completed", variant: "completed" },
  cancelled: { label: "Cancelled", variant: "cancelled" },
  open: { label: "Open", variant: "info" },
  waiting_approval: { label: "Waiting Approval", variant: "warning" },
  waiting_material: { label: "Waiting Material", variant: "warning" },
  scheduled: { label: "Scheduled", variant: "info" },
};

export function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || { label: formatStatusLabel(status), variant: "secondary" };
}

export const PRIORITY_CONFIG: Record<string, { label: string; variant: string }> = {
  critical: { label: "Critical", variant: "critical" },
  high: { label: "High", variant: "high" },
  medium: { label: "Medium", variant: "medium" },
  low: { label: "Low", variant: "low" },
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
            <Badge variant="overdue">Overdue</Badge>
          )}
          <Badge variant={conf.variant as BadgeProps["variant"]}>{conf.label}</Badge>
        </div>
      </div>
      {children}
    </div>
  );
}
