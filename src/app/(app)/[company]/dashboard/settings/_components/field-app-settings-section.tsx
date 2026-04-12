"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { FieldAppHomePreview } from "@/components/settings/field-app-home-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_340px] xl:items-start">
      <div className="space-y-6">
        {/* Home content */}
        <Card>
          <CardHeader>
            <CardTitle>Field App Layout</CardTitle>
            <CardDescription>Control what appears on the field app home screen.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">Tip of the Day</p>
                  <p className="text-sm text-muted-foreground">Show a daily safety tip on the home screen.</p>
                </div>
                <SettingsToggle
                  checked={settings.fieldApp.tipOfTheDayEnabled}
                  onChange={(checked) => updateFieldAppSettings((prev) => ({ ...prev, tipOfTheDayEnabled: checked }))}
                  label="Toggle tip of the day"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">News</p>
                  <p className="text-sm text-muted-foreground">Show news and updates section in the field app.</p>
                </div>
                <SettingsToggle
                  checked={settings.fieldApp.newsEnabled}
                  onChange={(checked) => updateFieldAppSettings((prev) => ({ ...prev, newsEnabled: checked }))}
                  label="Toggle news"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">Anonymous Incident Reporting</p>
                  <p className="text-sm text-muted-foreground">Allow field workers to report incidents without identifying themselves.</p>
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
            </div>
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Choose and reorder quick action buttons. Minimum {FIELD_APP_MIN_QUICK_ACTIONS} required.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {FIELD_APP_QUICK_ACTION_DEFINITIONS.map((action) => {
              const isEnabled = settings.fieldApp.quickActions.includes(action.id);
              const idx = settings.fieldApp.quickActions.indexOf(action.id);
              const enabledCount = settings.fieldApp.quickActions.length;

              return (
                <div key={action.id} className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/30">
                  <SettingsToggle
                    checked={isEnabled}
                    onChange={() => toggleFieldQuickAction(action.id)}
                    label={`Toggle ${quickActionLabels[action.id]}`}
                    disabled={isEnabled && enabledCount <= FIELD_APP_MIN_QUICK_ACTIONS}
                  />
                  <span className="flex-1 text-sm font-medium">
                    {quickActionLabels[action.id] || action.fallbackLabel}
                  </span>
                  {isEnabled && (
                    <>
                      <Badge variant="secondary" className="text-xs">{idx + 1}</Badge>
                      <div className="flex gap-0.5">
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={idx <= 0} onClick={() => moveFieldQuickAction(action.id, "up")}>
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={idx >= enabledCount - 1} onClick={() => moveFieldQuickAction(action.id, "down")}>
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Phone preview */}
      <div className="hidden xl:block sticky top-24">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 text-center">Live Preview</p>
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
