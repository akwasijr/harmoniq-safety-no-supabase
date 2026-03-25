"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface InfoRow {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}

interface TaskInfoCardProps {
  rows: InfoRow[];
  className?: string;
}

export function TaskInfoCard({ rows, className }: TaskInfoCardProps) {
  const visibleRows = rows.filter((r) => r.value != null && r.value !== "");

  if (visibleRows.length === 0) return null;

  return (
    <Card className={className}>
      <CardContent className="p-4 space-y-3">
        {visibleRows.map((row, i) => {
          const Icon = row.icon;
          return (
            <div key={i} className="flex items-center gap-3">
              <Icon className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{row.label}</p>
                <div className={cn("text-sm font-medium", row.valueClassName)}>
                  {row.value}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
