"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, GripVertical, Smartphone, ShieldOff, Lightbulb, Newspaper, Camera } from "lucide-react";
import { FieldAppHomePreview } from "@/components/settings/field-app-home-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  FIELD_APP_MIN_QUICK_ACTIONS,
  FIELD_APP_QUICK_ACTION_DEFINITIONS,
  type FieldAppQuickActionId,
  type FieldAppSettings,
} from "@/lib/field-app-settings";
import { SettingsToggle } from "./settings-toggle";
import type { SettingsState } from "./settings-types";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyStore } from "@/stores/company-store";
import { useToast } from "@/components/ui/toast";

interface FieldAppSettingsSectionProps {
  canEditSettings: boolean;
  fieldAppTipPreview: string;
  moveFieldQuickAction: (actionId: FieldAppQuickActionId, direction: "up" | "down") => void;
  quickActionLabels: Record<FieldAppQuickActionId, string>;
  resetFieldAppToIndustryPreset: () => void;
  settings: SettingsState;
  toggleFieldQuickAction: (actionId: FieldAppQuickActionId) => void;
  updateFieldAppSettings: (updater: (previous: FieldAppSettings) => FieldAppSettings) => void;
}

export function FieldAppSettingsSection({
  canEditSettings, fieldAppTipPreview, moveFieldQuickAction, quickActionLabels,
  resetFieldAppToIndustryPreset, settings, toggleFieldQuickAction, updateFieldAppSettings,
}: FieldAppSettingsSectionProps) {
  const { currentCompany } = useAuth();
  const { update: updateCompany } = useCompanyStore();
  const { toast } = useToast();
  const companyName = settings.companyName || settings.appName || "Company";
  const isAnonymousEnabled = currentCompany?.allow_anonymous_reporting ?? false;

  const enabledActions = settings.fieldApp.quickActions;
  const enabledCount = enabledActions.length;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-start">
      <div className="space-y-6">
        {/* Home screen features */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Home Screen</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Toggle sections visible on the field app home screen.</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Tip of the Day */}
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                <Lightbulb className="h-4 w-4 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Tip of the Day</p>
                <p className="text-[11px] text-muted-foreground">Daily safety tips on the home screen.</p>
              </div>
              <SettingsToggle
                checked={settings.fieldApp.tipOfTheDayEnabled}
                onChange={(checked) => updateFieldAppSettings((prev) => ({ ...prev, tipOfTheDayEnabled: checked }))}
                label="Toggle tip of the day"
              />
            </div>

            {/* News */}
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                <Newspaper className="h-4 w-4 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">News & Updates</p>
                <p className="text-[11px] text-muted-foreground">Show company news feed and announcements.</p>
              </div>
              <SettingsToggle
                checked={settings.fieldApp.newsEnabled}
                onChange={(checked) => updateFieldAppSettings((prev) => ({ ...prev, newsEnabled: checked }))}
                label="Toggle news"
              />
            </div>

            {/* Anonymous reporting */}
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/10">
                <ShieldOff className="h-4 w-4 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Anonymous Reporting</p>
                <p className="text-[11px] text-muted-foreground">Workers can report incidents anonymously.</p>
              </div>
              <SettingsToggle
                checked={isAnonymousEnabled}
                onChange={(checked) => {
                  if (currentCompany) {
                    updateCompany(currentCompany.id, { allow_anonymous_reporting: checked });
                    toast(checked ? "Anonymous reporting enabled" : "Anonymous reporting disabled");
                  }
                }}
                label="Toggle anonymous reporting"
              />
            </div>

            {/* Camera only mode */}
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
                <Camera className="h-4 w-4 text-purple-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Camera Only (No Gallery)</p>
                <p className="text-[11px] text-muted-foreground">Photos must be taken live — workers cannot upload from camera roll. Ensures authenticity of evidence.</p>
              </div>
              <SettingsToggle
                checked={settings.fieldApp.cameraOnly}
                onChange={(checked) => updateFieldAppSettings((prev) => ({ ...prev, cameraOnly: checked }))}
                label="Toggle camera only mode"
              />
            </div>
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Quick Actions</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Reorder and toggle the home screen shortcut buttons ({enabledCount} active, min {FIELD_APP_MIN_QUICK_ACTIONS}).
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {/* Enabled actions first, ordered */}
            {enabledActions.map((actionId, idx) => {
              const action = FIELD_APP_QUICK_ACTION_DEFINITIONS.find((a) => a.id === actionId);
              if (!action) return null;
              return (
                <div key={action.id} className="flex items-center gap-2 rounded-lg border p-2.5 bg-card hover:bg-muted/30 transition-colors">
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <Badge variant="secondary" className="text-[10px] w-5 h-5 flex items-center justify-center p-0 shrink-0">{idx + 1}</Badge>
                  <span className="flex-1 text-sm font-medium truncate">{quickActionLabels[actionId] || action.fallbackLabel}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" disabled={idx <= 0} onClick={() => moveFieldQuickAction(actionId, "up")} className="p-1 rounded hover:bg-muted disabled:opacity-20"><ArrowUp className="h-3 w-3" /></button>
                    <button type="button" disabled={idx >= enabledCount - 1} onClick={() => moveFieldQuickAction(actionId, "down")} className="p-1 rounded hover:bg-muted disabled:opacity-20"><ArrowDown className="h-3 w-3" /></button>
                    <SettingsToggle
                      checked
                      onChange={() => toggleFieldQuickAction(actionId)}
                      label={`Disable ${action.fallbackLabel}`}
                      disabled={enabledCount <= FIELD_APP_MIN_QUICK_ACTIONS}
                    />
                  </div>
                </div>
              );
            })}

            {/* Disabled actions */}
            {FIELD_APP_QUICK_ACTION_DEFINITIONS.filter((a) => !enabledActions.includes(a.id)).map((action) => (
              <div key={action.id} className="flex items-center gap-2 rounded-lg border border-dashed p-2.5 opacity-50 hover:opacity-80 transition-opacity">
                <div className="w-3.5" />
                <div className="w-5" />
                <span className="flex-1 text-sm truncate">{quickActionLabels[action.id] || action.fallbackLabel}</span>
                <SettingsToggle
                  checked={false}
                  onChange={() => toggleFieldQuickAction(action.id)}
                  label={`Enable ${action.fallbackLabel}`}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Sticky phone preview */}
      <div className="hidden xl:block sticky top-24">
        <p className="text-xs font-medium text-muted-foreground font-medium mb-3 text-center">Live Preview</p>
        <FieldAppHomePreview
          settings={settings.fieldApp}
          quickActionLabels={quickActionLabels}
          companyName={companyName}
          tipText={fieldAppTipPreview}
        />
      </div>
    </div>
  );
}
