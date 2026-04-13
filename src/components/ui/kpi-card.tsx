import * as React from "react";
import * as ReactDOM from "react-dom";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  tooltip?: string;
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
  subtitle,
  tooltip,
  description,
  trend,
  icon: Icon,
  className,
  onClick,
  active,
}: KPICardProps) {
  const Component = onClick ? "button" : "div";
  const [showTooltip, setShowTooltip] = React.useState(false);
  const tooltipRef = React.useRef<HTMLButtonElement>(null);
  const [tooltipPos, setTooltipPos] = React.useState({ top: 0, left: 0 });

  const updateTooltipPos = React.useCallback(() => {
    if (tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect();
      setTooltipPos({
        top: rect.bottom + 6,
        left: Math.min(Math.max(8, rect.left - 100), typeof window !== "undefined" ? window.innerWidth - 272 : 500),
      });
    }
  }, []);
  
  return (
    <>
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
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {tooltip && (
              <button
                ref={tooltipRef}
                type="button"
                className="p-0.5 rounded-full text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted transition-colors"
                onMouseEnter={() => { updateTooltipPos(); setShowTooltip(true); }}
                onMouseLeave={() => setShowTooltip(false)}
                onClick={(e) => { e.stopPropagation(); updateTooltipPos(); setShowTooltip((prev) => !prev); }}
                aria-label={`Info about ${title}`}
              >
                <Info className="h-3 w-3" />
              </button>
            )}
          </div>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-[10px] text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <Icon className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden="true" />
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
    {showTooltip && tooltip && typeof document !== "undefined" && ReactDOM.createPortal(
      <div
        className="fixed z-[9999] w-64 rounded-lg border bg-popover p-3 shadow-lg text-left"
        style={{ top: tooltipPos.top, left: tooltipPos.left }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <p className="text-xs font-medium text-foreground mb-1">{title}</p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{tooltip}</p>
      </div>,
      document.body,
    )}
    </>
  );
}
