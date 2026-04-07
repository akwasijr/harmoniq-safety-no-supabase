"use client";

import * as React from "react";
import { Building, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type {
  SettingsCopyProps,
  SettingsState,
  UpdateSettingProps,
} from "./settings-types";

interface BrandingSettingsSectionProps
  extends SettingsCopyProps, UpdateSettingProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  settings: SettingsState;
  onLogoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveLogo: () => void;
}

export function BrandingSettingsSection({
  fileInputRef,
  onLogoUpload,
  onRemoveLogo,
  settings,
  t,
  updateSetting,
}: BrandingSettingsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.branding")}</CardTitle>
        <CardDescription>{t("settings.customizeLook")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>{t("settings.companyLogo")}</Label>
          <div className="flex items-center gap-4">
            <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border bg-muted">
              {settings.logoUrl ? (
                <>
                  <img
                    src={settings.logoUrl}
                    alt="Company logo"
                    className="h-full w-full object-contain"
                    loading="lazy"
                  />
                  <button
                    onClick={onRemoveLogo}
                    aria-label="Remove logo"
                    className="absolute -right-1 -top-1 rounded-full bg-destructive p-1 text-destructive-foreground hover:bg-destructive/90"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </>
              ) : (
                <Building
                  className="h-8 w-8 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
            </div>
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onLogoUpload}
                className="hidden"
                id="logo-upload"
                aria-label="Upload company logo"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {t("settings.uploadLogo")}
              </Button>
              <p className="text-xs text-muted-foreground">
                {t("settings.logoHint")}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="primary-color">{t("settings.primaryColor")}</Label>
            <div className="flex gap-2">
              <Input
                id="primary-color"
                value={settings.primaryColor}
                onChange={(event) =>
                  updateSetting("primaryColor", event.target.value)
                }
                className="flex-1"
              />
              <input
                type="color"
                title="Pick primary color"
                aria-label="Pick primary color"
                value={settings.primaryColor}
                onChange={(event) =>
                  updateSetting("primaryColor", event.target.value)
                }
                className="h-10 w-14 cursor-pointer rounded-md border p-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="secondary-color">
              {t("settings.secondaryColor")}
            </Label>
            <div className="flex gap-2">
              <Input
                id="secondary-color"
                value={settings.secondaryColor}
                onChange={(event) =>
                  updateSetting("secondaryColor", event.target.value)
                }
                className="flex-1"
              />
              <input
                type="color"
                title="Pick secondary color"
                aria-label="Pick secondary color"
                value={settings.secondaryColor}
                onChange={(event) =>
                  updateSetting("secondaryColor", event.target.value)
                }
                className="h-10 w-14 cursor-pointer rounded-md border p-1"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t("settings.preview")}</Label>
          <div className="rounded-lg border p-4">
            <div className="mb-4 flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg font-bold text-white"
                style={{ backgroundColor: settings.primaryColor }}
              >
                {settings.logoUrl ? (
                  <img
                    src={settings.logoUrl}
                    alt="Company logo"
                    className="h-8 w-8 object-contain"
                    loading="lazy"
                  />
                ) : (
                  settings.companyName.charAt(0)
                )}
              </div>
              <span className="font-semibold">{settings.companyName}</span>
            </div>
            <div className="flex gap-2">
              <button
                className="rounded-md px-4 py-2 text-sm font-medium text-white"
                style={{ backgroundColor: settings.primaryColor }}
              >
                {t("settings.primaryButton")}
              </button>
              <button
                className="rounded-md px-4 py-2 text-sm font-medium text-white"
                style={{ backgroundColor: settings.secondaryColor }}
              >
                {t("settings.secondaryButton")}
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
