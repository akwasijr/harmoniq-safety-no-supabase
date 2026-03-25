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
        <div className="field-app-panel field-app-surface bg-brand-solid px-4 pb-5 pt-4">
          <p className="text-xs text-brand-solid-foreground/70">Good morning</p>
          <h3 className="mt-1 text-lg font-semibold text-brand-solid-foreground">{companyName}</h3>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: "Safe Days", value: "14" },
              { label: "Pending", value: "5" },
              { label: "This Week", value: "8" },
            ].map((stat) => (
              <div key={stat.label} className="field-app-panel bg-white/10 p-2 text-center">
                <p className="text-lg font-semibold text-brand-solid-foreground">{stat.value}</p>
                <p className="text-[10px] text-brand-solid-foreground/70">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 bg-background px-3 pb-4 pt-3">
          {settings.tipOfTheDayEnabled && (
            <div className="field-app-panel field-app-surface -mt-6 flex items-start gap-3 border bg-card px-3 py-3">
              <div className="field-app-control flex h-8 w-8 items-center justify-center bg-primary/10">
                <Lightbulb className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">Tip of the day</p>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{tipText}</p>
              </div>
            </div>
          )}

          <div>
            <h4 className="mb-2 text-sm font-semibold">Quick actions</h4>
            <div className="grid grid-cols-2 gap-2">
              {settings.quickActions.slice(0, 6).map((actionId) => {
                const action = getFieldAppQuickActionDefinition(actionId);
                const Icon = ICON_MAP[actionId];
                return (
                  <div key={action.id} className="field-app-panel field-app-surface flex items-center gap-2 border bg-card p-3">
                    <div className="field-app-control flex h-9 w-9 items-center justify-center bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-xs font-medium">{quickActionLabels[actionId] || action.fallbackLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {settings.newsEnabled && (
            <div>
              <h4 className="mb-2 text-sm font-semibold">Featured news</h4>
              <div className="field-app-panel field-app-surface border bg-card p-3">
                <div className={cn("field-app-panel h-20 bg-gradient-to-br from-primary/20 to-primary/5")} />
                <p className="mt-3 text-xs font-semibold">Important shift update</p>
                <p className="mt-1 text-[11px] text-muted-foreground">This preview block disappears when News is disabled.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
