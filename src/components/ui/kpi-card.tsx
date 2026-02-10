import * as React from "react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    direction: "up" | "down" | "neutral";
    label?: string;
  };
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
  onClick?: () => void;
  active?: boolean;
}

export function KPICard({
  title,
  value,
  description,
  trend,
  icon: Icon,
  className,
  onClick,
  active,
}: KPICardProps) {
  const Component = onClick ? "button" : "div";
  
  return (
    <Component
      className={cn(
        "rounded-lg border bg-card p-6 shadow-sm text-left w-full",
        onClick && "cursor-pointer transition-all hover:border-primary",
        active && "border-primary bg-primary/5",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        {Icon && (
          <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        )}
      </div>

      {(description || trend) && (
        <div className="mt-4 flex items-center gap-2 text-sm">
          {trend && (
            <span
              className={cn(
                "font-medium",
                trend.direction === "up" && "text-success",
                trend.direction === "down" && "text-destructive",
                trend.direction === "neutral" && "text-muted-foreground"
              )}
            >
              {trend.value > 0 ? "+" : ""}
              {trend.value}%
            </span>
          )}
          {description && (
            <span className="text-muted-foreground">{description}</span>
          )}
          {trend?.label && (
            <span className="text-muted-foreground">{trend.label}</span>
          )}
        </div>
      )}
    </Component>
  );
}
