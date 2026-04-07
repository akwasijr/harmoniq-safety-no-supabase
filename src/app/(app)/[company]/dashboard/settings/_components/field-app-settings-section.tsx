"use client";

import { ArrowDown, ArrowUp, RefreshCw } from "lucide-react";

import { FieldAppHomePreview } from "@/components/settings/field-app-home-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  FIELD_APP_FONT_OPTIONS,
  FIELD_APP_MIN_QUICK_ACTIONS,
  FIELD_APP_QUICK_ACTION_DEFINITIONS,
  FIELD_APP_SHADOW_OPTIONS,
  FIELD_APP_SHAPE_OPTIONS,
  type FieldAppQuickActionId,
  type FieldAppSettings,
} from "@/lib/field-app-settings";

import { SettingsToggle } from "./settings-toggle";
import type { SettingsState } from "./settings-types";

interface FieldAppSettingsSectionProps {
  canEditSettings: boolean;
  fieldAppTipPreview: string;
  moveFieldQuickAction: (
    actionId: FieldAppQuickActionId,
    direction: "up" | "down",
  ) => void;
  quickActionLabels: Record<FieldAppQuickActionId, string>;
  resetFieldAppToIndustryPreset: () => void;
  settings: SettingsState;
  toggleFieldQuickAction: (actionId: FieldAppQuickActionId) => void;
  updateFieldAppSettings: (
    updater: (previous: FieldAppSettings) => FieldAppSettings,
  ) => void;
}

export function FieldAppSettingsSection({
  canEditSettings,
  fieldAppTipPreview,
  moveFieldQuickAction,
  quickActionLabels,
  resetFieldAppToIndustryPreset,
  settings,
  toggleFieldQuickAction,
  updateFieldAppSettings,
}: FieldAppSettingsSectionProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_340px] xl:items-start">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Field App setup</CardTitle>
            <CardDescription>
              Control the mobile home experience without changing dashboard
              branding or layout.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">Quick setup from industry</p>
                <p className="text-sm text-muted-foreground">
                  Start from your saved industry preset, then fine-tune the
                  mobile app manually.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={resetFieldAppToIndustryPreset}
                disabled={!canEditSettings}
              >
                <RefreshCw className="h-4 w-4" />
                Apply industry defaults
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="field-app-font">Mobile font</Label>
                <select
                  id="field-app-font"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={settings.fieldApp.fontId}
                  onChange={(event) =>
                    updateFieldAppSettings((previous) => ({
                      ...previous,
                      fontId: event.target.value as FieldAppSettings["fontId"],
                    }))
                  }
                >
                  {FIELD_APP_FONT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="field-app-shape">Buttons and cards</Label>
                <select
                  id="field-app-shape"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={settings.fieldApp.shape}
                  onChange={(event) =>
                    updateFieldAppSettings((previous) => ({
                      ...previous,
                      shape: event.target.value as FieldAppSettings["shape"],
                    }))
                  }
                >
                  {FIELD_APP_SHAPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="field-app-shadow">Shadow style</Label>
              <select
                id="field-app-shadow"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={settings.fieldApp.shadow}
                onChange={(event) =>
                  updateFieldAppSettings((previous) => ({
                    ...previous,
                    shadow: event.target.value as FieldAppSettings["shadow"],
                  }))
                }
              >
                {FIELD_APP_SHADOW_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Home content</CardTitle>
            <CardDescription>
              Choose what appears on the field home screen. Quick actions always
              keep at least {FIELD_APP_MIN_QUICK_ACTIONS} items.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">Tip of the Day</p>
                  <p className="text-sm text-muted-foreground">
                    Uses the selected company language and industry for the
                    mobile home tip.
                  </p>
                </div>
                <SettingsToggle
                  checked={settings.fieldApp.tipOfTheDayEnabled}
                  onChange={(checked) =>
                    updateFieldAppSettings((previous) => ({
                      ...previous,
                      tipOfTheDayEnabled: checked,
                    }))
                  }
                  label="Toggle tip of the day"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">News</p>
                  <p className="text-sm text-muted-foreground">
                    Hide the News tab and featured news block from the field
                    app.
                  </p>
                </div>
                <SettingsToggle
                  checked={settings.fieldApp.newsEnabled}
                  onChange={(checked) =>
                    updateFieldAppSettings((previous) => ({
                      ...previous,
                      newsEnabled: checked,
                    }))
                  }
                  label="Toggle news in field app"
                />
              </div>
            </div>

            <div className="rounded-lg border">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div>
                  <p className="font-medium">Quick actions</p>
                  <p className="text-sm text-muted-foreground">
                    Reorder the buttons workers see on the home screen.
                  </p>
                </div>
                <Badge variant="secondary">
                  {settings.fieldApp.quickActions.length} active
                </Badge>
              </div>

              <div className="divide-y">
                {FIELD_APP_QUICK_ACTION_DEFINITIONS.map((action) => {
                  const enabled = settings.fieldApp.quickActions.includes(
                    action.id,
                  );
                  const activeIndex = settings.fieldApp.quickActions.indexOf(
                    action.id,
                  );

                  return (
                    <div
                      key={action.id}
                      className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium">
                          {quickActionLabels[action.id]}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {enabled
                            ? `Position ${activeIndex + 1} on the mobile home screen.`
                            : "Hidden from the mobile home screen."}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {enabled && (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() =>
                                moveFieldQuickAction(action.id, "up")
                              }
                              disabled={activeIndex <= 0 || !canEditSettings}
                              aria-label={`Move ${quickActionLabels[action.id]} up`}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() =>
                                moveFieldQuickAction(action.id, "down")
                              }
                              disabled={
                                activeIndex ===
                                  settings.fieldApp.quickActions.length - 1 ||
                                !canEditSettings
                              }
                              aria-label={`Move ${quickActionLabels[action.id]} down`}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          type="button"
                          variant={enabled ? "outline" : "default"}
                          onClick={() => toggleFieldQuickAction(action.id)}
                          disabled={
                            !canEditSettings ||
                            (enabled &&
                              settings.fieldApp.quickActions.length <=
                                FIELD_APP_MIN_QUICK_ACTIONS)
                          }
                        >
                          {enabled ? "Hide" : "Show"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="xl:sticky xl:top-24">
          <CardHeader>
            <CardTitle>Live preview</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldAppHomePreview
              settings={settings.fieldApp}
              quickActionLabels={quickActionLabels}
              companyName={settings.appName || settings.companyName}
              tipText={fieldAppTipPreview}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
