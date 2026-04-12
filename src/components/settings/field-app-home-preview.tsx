"use client";

import * as React from "react";
import {
  AlertTriangle,
  ClipboardCheck,
  Lightbulb,
  Newspaper,
  ScanLine,
  Search,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type FieldAppQuickActionId,
  type FieldAppSettings,
  getFieldAppQuickActionDefinition,
  getFieldAppShellStyle,
} from "@/lib/field-app-settings";

const ICON_MAP: Record<FieldAppQuickActionId, React.ComponentType<{ className?: string }>> = {
  report_incident: AlertTriangle,
  my_tasks: ClipboardCheck,
  browse_assets: Search,
  request_fix: Wrench,
  scan_asset: ScanLine,
  risk_check: ShieldCheck,
  checklists: ClipboardCheck,
  news: Newspaper,
};

export function FieldAppHomePreview({
  settings,
  quickActionLabels,
  companyName,
  tipText,
}: {
  settings: FieldAppSettings;
  quickActionLabels: Record<FieldAppQuickActionId, string>;
  companyName: string;
  tipText: string;
}) {
  return (
    <div
      className="field-app-shell mx-auto w-full max-w-[320px] rounded-[2rem] border bg-muted p-3"
      data-field-shadow={settings.shadow}
      style={getFieldAppShellStyle(settings)}
    >
      <div className="overflow-hidden rounded-[1.5rem] border bg-background">
        {/* Header with branding */}
        <div className="field-app-panel field-app-surface bg-brand-solid px-4 pb-4 pt-4">
          <p className="text-xs text-brand-solid-foreground/70">Good morning</p>
          <h3 className="mt-0.5 text-lg font-semibold text-brand-solid-foreground">{companyName}</h3>
        </div>

        <div className="space-y-4 bg-background px-3 pb-4 pt-3">
          {/* KPI cards row */}
          <div className="-mt-6 grid grid-cols-3 gap-2">
            {[
              { label: "Safe Days", value: "14", color: "text-green-500" },
              { label: "Pending", value: "5", color: "text-amber-500" },
              { label: "This Week", value: "8", color: "text-blue-500" },
            ].map((stat) => (
              <div key={stat.label} className="field-app-panel border bg-card p-2 text-center shadow-sm">
                <p className={cn("text-lg font-bold", stat.color)}>{stat.value}</p>
                <p className="text-[9px] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Tip of the day banner */}
          {settings.tipOfTheDayEnabled && (
            <div className="field-app-panel field-app-surface flex items-start gap-2.5 border bg-card px-3 py-2.5">
              <div className="field-app-control flex h-7 w-7 shrink-0 items-center justify-center bg-primary/10">
                <Lightbulb className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-primary">Tip of the day</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground line-clamp-2">{tipText}</p>
              </div>
            </div>
          )}

          {/* Quick actions — horizontal circles (matches current field app) */}
          <div>
            <h4 className="mb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Quick actions</h4>
            <div className="flex justify-between gap-1 px-1">
              {settings.quickActions.slice(0, 4).map((actionId) => {
                const action = getFieldAppQuickActionDefinition(actionId);
                const Icon = ICON_MAP[actionId];
                return (
                  <div key={action.id} className="flex flex-col items-center gap-1.5 w-[60px]">
                    <div className="field-app-control flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-[9px] font-medium text-center leading-tight line-clamp-2">
                      {quickActionLabels[actionId] || action.fallbackLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* News section */}
          {settings.newsEnabled && (
            <div>
              <h4 className="mb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">News</h4>
              <div className="field-app-panel field-app-surface border bg-card p-2.5">
                <div className={cn("field-app-panel h-14 bg-gradient-to-br from-primary/20 to-primary/5")} />
                <p className="mt-2 text-[10px] font-semibold">Important shift update</p>
                <p className="mt-0.5 text-[9px] text-muted-foreground">Preview — hidden when News is disabled.</p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom nav bar */}
        <div className="border-t bg-card px-2 py-1.5 flex justify-around">
          {["Home", "Tasks", "Report", "Profile"].map((tab) => (
            <div key={tab} className="flex flex-col items-center gap-0.5 opacity-50">
              <div className="h-4 w-4 rounded bg-muted" />
              <span className="text-[8px]">{tab}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
