"use client";

import * as React from "react";
import { Building, Upload, X, ChevronDown, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  FIELD_APP_FONT_OPTIONS,
  FIELD_APP_SHAPE_OPTIONS,
  FIELD_APP_SHADOW_OPTIONS,
  type FieldAppSettings,
} from "@/lib/field-app-settings";

import type { SettingsCopyProps, SettingsState, UpdateSettingProps } from "./settings-types";

// Design templates — pre-built visual combinations
const DESIGN_TEMPLATES = [
  { id: "default", name: "Default", primaryColor: "#3B82F6", secondaryColor: "#6366F1", font: "geist", shape: "medium", shadow: "subtle" },
  { id: "ocean", name: "Ocean Blue", primaryColor: "#0284C7", secondaryColor: "#0EA5E9", font: "plus_jakarta_sans", shape: "large", shadow: "subtle" },
  { id: "forest", name: "Forest Green", primaryColor: "#16A34A", secondaryColor: "#15803D", font: "work_sans", shape: "medium", shadow: "subtle" },
  { id: "sunset", name: "Sunset Orange", primaryColor: "#EA580C", secondaryColor: "#DC2626", font: "manrope", shape: "small", shadow: "strong" },
  { id: "midnight", name: "Midnight", primaryColor: "#4F46E5", secondaryColor: "#7C3AED", font: "inter", shape: "medium", shadow: "none" },
  { id: "coral", name: "Coral", primaryColor: "#E11D48", secondaryColor: "#F43F5E", font: "ibm_plex_sans", shape: "large", shadow: "subtle" },
  { id: "slate", name: "Slate Professional", primaryColor: "#475569", secondaryColor: "#64748B", font: "source_sans_3", shape: "small", shadow: "none" },
  { id: "teal", name: "Teal Modern", primaryColor: "#0D9488", secondaryColor: "#14B8A6", font: "public_sans", shape: "medium", shadow: "subtle" },
];

interface BrandingSettingsSectionProps extends SettingsCopyProps, UpdateSettingProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  settings: SettingsState;
  onLogoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveLogo: () => void;
}

export function BrandingSettingsSection({
  fileInputRef, onLogoUpload, onRemoveLogo, settings, t, updateSetting,
}: BrandingSettingsSectionProps) {
  const font = settings.fieldApp?.fontId || "geist";
  const shape = settings.fieldApp?.shape || "medium";
  const shadow = settings.fieldApp?.shadow || "subtle";

  const updateFieldApp = (key: keyof FieldAppSettings, value: string) => {
    updateSetting("fieldApp", { ...settings.fieldApp, [key]: value });
  };

  const applyTemplate = (tpl: typeof DESIGN_TEMPLATES[0]) => {
    updateSetting("primaryColor", tpl.primaryColor);
    updateSetting("secondaryColor", tpl.secondaryColor);
    updateSetting("fieldApp", {
      ...settings.fieldApp,
      fontId: tpl.font as FieldAppSettings["fontId"],
      shape: tpl.shape as FieldAppSettings["shape"],
      shadow: tpl.shadow as FieldAppSettings["shadow"],
    });
  };

  const radiusMap: Record<string, string> = { square: "0px", small: "4px", medium: "8px", large: "12px" };
  const shadowMap: Record<string, string> = { none: "none", subtle: "0 1px 3px rgba(0,0,0,0.08)", strong: "0 4px 12px rgba(0,0,0,0.15)" };
  const fontMap: Record<string, string> = {
    geist: "'Geist Sans'", inter: "'Inter'", ibm_plex_sans: "'IBM Plex Sans'",
    manrope: "'Manrope'", plus_jakarta_sans: "'Plus Jakarta Sans'",
    public_sans: "'Public Sans'", source_sans_3: "'Source Sans 3'", work_sans: "'Work Sans'",
  };

  return (
    <div className="space-y-6">
      {/* Design Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" />Design Templates</CardTitle>
          <CardDescription>Start with a pre-built theme or customize your own.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {DESIGN_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => applyTemplate(tpl)}
                className="group rounded-lg border p-3 text-left hover:ring-2 hover:ring-primary/50 transition-all space-y-2"
              >
                <div className="flex gap-1.5">
                  <div className="h-6 w-6 rounded-full" style={{ backgroundColor: tpl.primaryColor }} />
                  <div className="h-6 w-6 rounded-full" style={{ backgroundColor: tpl.secondaryColor }} />
                </div>
                <p className="text-xs font-medium">{tpl.name}</p>
                <p className="text-[10px] text-muted-foreground">{FIELD_APP_FONT_OPTIONS.find((f) => f.value === tpl.font)?.label}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Logo + Colors */}
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
                    <img src={settings.logoUrl} alt="Company logo" className="h-full w-full object-contain" loading="lazy" />
                    <button onClick={onRemoveLogo} aria-label="Remove logo" className="absolute -right-1 -top-1 rounded-full bg-destructive p-1 text-destructive-foreground hover:bg-destructive/90"><X className="h-3 w-3" /></button>
                  </>
                ) : (<Building className="h-8 w-8 text-muted-foreground" aria-hidden="true" />)}
              </div>
              <div className="space-y-2">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={onLogoUpload} className="hidden" id="logo-upload" />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2"><Upload className="h-4 w-4" />{t("settings.uploadLogo")}</Button>
                <p className="text-xs text-muted-foreground">{t("settings.logoHint")}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="primary-color">{t("settings.primaryColor")}</Label>
              <div className="flex gap-2">
                <Input id="primary-color" value={settings.primaryColor} onChange={(e) => updateSetting("primaryColor", e.target.value)} className="flex-1" />
                <input type="color" value={settings.primaryColor} onChange={(e) => updateSetting("primaryColor", e.target.value)} className="h-10 w-14 cursor-pointer rounded-md border p-1" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondary-color">{t("settings.secondaryColor")}</Label>
              <div className="flex gap-2">
                <Input id="secondary-color" value={settings.secondaryColor} onChange={(e) => updateSetting("secondaryColor", e.target.value)} className="flex-1" />
                <input type="color" value={settings.secondaryColor} onChange={(e) => updateSetting("secondaryColor", e.target.value)} className="h-10 w-14 cursor-pointer rounded-md border p-1" />
              </div>
            </div>
          </div>

          {/* Font, Shape, Shadow — moved from Field App */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="brand-font">Font</Label>
              <div className="relative">
                <select id="brand-font" value={font} onChange={(e) => updateFieldApp("fontId", e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm appearance-none pr-8">
                  {FIELD_APP_FONT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-shape">Corner Radius</Label>
              <div className="relative">
                <select id="brand-shape" value={shape} onChange={(e) => updateFieldApp("shape", e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm appearance-none pr-8">
                  {FIELD_APP_SHAPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-shadow">Shadow Style</Label>
              <div className="relative">
                <select id="brand-shadow" value={shadow} onChange={(e) => updateFieldApp("shadow", e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm appearance-none pr-8">
                  {FIELD_APP_SHADOW_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Preview */}
      <Card>
        <CardHeader><CardTitle>{t("settings.preview")}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Dashboard preview */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dashboard</p>
              <div className="rounded-lg border p-4 space-y-3" style={{ fontFamily: fontMap[font] || "inherit", borderRadius: radiusMap[shape], boxShadow: shadowMap[shadow] }}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg font-bold text-white" style={{ backgroundColor: settings.primaryColor, borderRadius: radiusMap[shape] }}>
                    {settings.logoUrl ? <img src={settings.logoUrl} alt="" className="h-8 w-8 object-contain" /> : settings.companyName.charAt(0)}
                  </div>
                  <span className="font-semibold">{settings.companyName}</span>
                </div>
                <div className="flex gap-2">
                  <button className="rounded-md px-4 py-2 text-sm font-medium text-white" style={{ backgroundColor: settings.primaryColor, borderRadius: radiusMap[shape] }}>{t("settings.primaryButton")}</button>
                  <button className="rounded-md px-4 py-2 text-sm font-medium text-white" style={{ backgroundColor: settings.secondaryColor, borderRadius: radiusMap[shape] }}>{t("settings.secondaryButton")}</button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {["Card A", "Card B", "Card C"].map((label) => (
                    <div key={label} className="border p-2 text-center text-xs" style={{ borderRadius: radiusMap[shape], boxShadow: shadowMap[shadow] }}>
                      <p className="font-semibold" style={{ color: settings.primaryColor }}>12</p>
                      <p className="text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile preview */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Field App</p>
              <div className="mx-auto w-full max-w-[200px] rounded-[1.5rem] border bg-muted p-2">
                <div className="overflow-hidden rounded-[1rem] border bg-background" style={{ fontFamily: fontMap[font] || "inherit" }}>
                  <div className="px-3 py-2" style={{ backgroundColor: settings.primaryColor }}>
                    <p className="text-[9px] text-white/70">Good morning</p>
                    <p className="text-xs font-semibold text-white">{settings.companyName}</p>
                  </div>
                  <div className="p-2 space-y-2">
                    <div className="flex gap-1.5 -mt-2">
                      {["14", "5", "8"].map((v, i) => (
                        <div key={i} className="flex-1 border bg-card p-1 text-center" style={{ borderRadius: radiusMap[shape], boxShadow: shadowMap[shadow] }}>
                          <p className="text-sm font-bold" style={{ color: settings.primaryColor }}>{v}</p>
                          <p className="text-[7px] text-muted-foreground">{["Safe", "Tasks", "Week"][i]}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-around px-1">
                      {[1,2,3,4].map((i) => (
                        <div key={i} className="flex flex-col items-center gap-1">
                          <div className="h-7 w-7 rounded-full flex items-center justify-center" style={{ backgroundColor: settings.primaryColor + "20" }}>
                            <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: settings.primaryColor }} />
                          </div>
                          <span className="text-[6px]">Action</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
