"use client";

import * as React from "react";
import { Building, Upload, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  FIELD_APP_FONT_OPTIONS,
  FIELD_APP_SHAPE_OPTIONS,
  FIELD_APP_SHADOW_OPTIONS,
  type FieldAppSettings,
} from "@/lib/field-app-settings";

import type { SettingsCopyProps, SettingsState, UpdateSettingProps } from "./settings-types";

// Richer design templates with full visual variety
const DESIGN_TEMPLATES = [
  { id: "default", name: "Default", primaryColor: "#3B82F6", secondaryColor: "#6366F1", font: "geist", shape: "medium", shadow: "subtle", desc: "Clean blue with balanced corners" },
  { id: "ocean", name: "Ocean Blue", primaryColor: "#0284C7", secondaryColor: "#0EA5E9", font: "plus_jakarta_sans", shape: "large", shadow: "subtle", desc: "Cool blue, rounded, soft shadows" },
  { id: "forest", name: "Forest Green", primaryColor: "#16A34A", secondaryColor: "#15803D", font: "work_sans", shape: "medium", shadow: "subtle", desc: "Natural green, medium radius" },
  { id: "sunset", name: "Sunset Orange", primaryColor: "#EA580C", secondaryColor: "#DC2626", font: "manrope", shape: "small", shadow: "strong", desc: "Bold orange, sharp edges, deep shadows" },
  { id: "midnight", name: "Midnight", primaryColor: "#4F46E5", secondaryColor: "#7C3AED", font: "inter", shape: "medium", shadow: "none", desc: "Rich indigo, no shadows, clean" },
  { id: "coral", name: "Coral Rose", primaryColor: "#E11D48", secondaryColor: "#F43F5E", font: "ibm_plex_sans", shape: "large", shadow: "subtle", desc: "Vibrant pink, large radius, airy" },
  { id: "slate", name: "Slate Pro", primaryColor: "#475569", secondaryColor: "#64748B", font: "source_sans_3", shape: "small", shadow: "none", desc: "Neutral gray, sharp, flat design" },
  { id: "teal", name: "Teal Modern", primaryColor: "#0D9488", secondaryColor: "#14B8A6", font: "public_sans", shape: "medium", shadow: "subtle", desc: "Fresh teal, balanced and modern" },
  { id: "amber", name: "Amber Warm", primaryColor: "#D97706", secondaryColor: "#B45309", font: "work_sans", shape: "large", shadow: "strong", desc: "Warm amber, rounded, bold shadows" },
  { id: "violet", name: "Violet Dream", primaryColor: "#7C3AED", secondaryColor: "#A855F7", font: "manrope", shape: "medium", shadow: "subtle", desc: "Purple gradient feel, soft radius" },
  { id: "military", name: "Military", primaryColor: "#365314", secondaryColor: "#4D7C0F", font: "ibm_plex_sans", shape: "small", shadow: "none", desc: "Dark olive, sharp, no frills" },
  { id: "arctic", name: "Arctic", primaryColor: "#0369A1", secondaryColor: "#38BDF8", font: "plus_jakarta_sans", shape: "large", shadow: "subtle", desc: "Ice blue contrast, smooth and rounded" },
];

const radiusMap: Record<string, string> = { square: "0px", small: "4px", medium: "8px", large: "12px" };
const shadowMap: Record<string, string> = { none: "none", subtle: "0 1px 3px rgba(0,0,0,0.08)", strong: "0 4px 12px rgba(0,0,0,0.15)" };
const fontMap: Record<string, string> = {
  geist: "Geist Sans", inter: "Inter", ibm_plex_sans: "IBM Plex Sans",
  manrope: "Manrope", plus_jakarta_sans: "Plus Jakarta Sans",
  public_sans: "Public Sans", source_sans_3: "Source Sans 3", work_sans: "Work Sans",
};

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
  const [selectedTemplate, setSelectedTemplate] = React.useState<string>("custom");

  const updateFieldApp = (key: keyof FieldAppSettings, value: string) => {
    updateSetting("fieldApp", { ...settings.fieldApp, [key]: value });
    setSelectedTemplate("custom");
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
    setSelectedTemplate(tpl.id);
  };

  const activeTpl = DESIGN_TEMPLATES.find((t) => t.id === selectedTemplate);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-start">
      {/* Left column: controls */}
      <div className="space-y-6">
        {/* Design template dropdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Design Template</CardTitle>
            <CardDescription>Choose a preset or customize manually.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <select
                value={selectedTemplate}
                onChange={(e) => {
                  const tpl = DESIGN_TEMPLATES.find((t) => t.id === e.target.value);
                  if (tpl) applyTemplate(tpl);
                  else setSelectedTemplate("custom");
                }}
                className="w-full rounded-md border bg-background px-3 py-2.5 text-sm font-medium appearance-none pr-8"
              >
                <option value="custom">Custom</option>
                {DESIGN_TEMPLATES.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
            {/* Show selected template details */}
            {activeTpl && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="h-5 w-5 rounded-full border" style={{ backgroundColor: activeTpl.primaryColor }} />
                    <div className="h-5 w-5 rounded-full border" style={{ backgroundColor: activeTpl.secondaryColor }} />
                  </div>
                  <span className="text-sm font-medium">{activeTpl.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">{activeTpl.desc}</p>
                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  <span className="rounded bg-muted px-1.5 py-0.5">{fontMap[activeTpl.font]}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5">{FIELD_APP_SHAPE_OPTIONS.find((o) => o.value === activeTpl.shape)?.label}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5">{FIELD_APP_SHADOW_OPTIONS.find((o) => o.value === activeTpl.shadow)?.label}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Logo + Colors + Style */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t("settings.branding")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border bg-muted shrink-0">
                {settings.logoUrl ? (
                  <>
                    <img src={settings.logoUrl} alt="Logo" className="h-full w-full object-contain" loading="lazy" />
                    <button onClick={onRemoveLogo} className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground"><X className="h-2.5 w-2.5" /></button>
                  </>
                ) : (<Building className="h-6 w-6 text-muted-foreground" />)}
              </div>
              <div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={onLogoUpload} className="hidden" id="logo-upload" />
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5"><Upload className="h-3.5 w-3.5" />{t("settings.uploadLogo")}</Button>
              </div>
            </div>

            {/* Colors */}
            <div className="grid gap-3 grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">{t("settings.primaryColor")}</Label>
                <div className="flex gap-1.5">
                  <Input value={settings.primaryColor} onChange={(e) => { updateSetting("primaryColor", e.target.value); setSelectedTemplate("custom"); }} className="flex-1 h-9 text-xs" />
                  <input type="color" value={settings.primaryColor} onChange={(e) => { updateSetting("primaryColor", e.target.value); setSelectedTemplate("custom"); }} className="h-9 w-10 cursor-pointer rounded border p-0.5" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("settings.secondaryColor")}</Label>
                <div className="flex gap-1.5">
                  <Input value={settings.secondaryColor} onChange={(e) => { updateSetting("secondaryColor", e.target.value); setSelectedTemplate("custom"); }} className="flex-1 h-9 text-xs" />
                  <input type="color" value={settings.secondaryColor} onChange={(e) => { updateSetting("secondaryColor", e.target.value); setSelectedTemplate("custom"); }} className="h-9 w-10 cursor-pointer rounded border p-0.5" />
                </div>
              </div>
            </div>

            {/* Font, Shape, Shadow */}
            <div className="grid gap-3 grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Font</Label>
                <div className="relative">
                  <select value={font} onChange={(e) => updateFieldApp("fontId", e.target.value)} className="w-full rounded-md border bg-background px-2 py-1.5 text-xs appearance-none pr-6">
                    {FIELD_APP_FONT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Corners</Label>
                <div className="relative">
                  <select value={shape} onChange={(e) => updateFieldApp("shape", e.target.value)} className="w-full rounded-md border bg-background px-2 py-1.5 text-xs appearance-none pr-6">
                    {FIELD_APP_SHAPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Shadow</Label>
                <div className="relative">
                  <select value={shadow} onChange={(e) => updateFieldApp("shadow", e.target.value)} className="w-full rounded-md border bg-background px-2 py-1.5 text-xs appearance-none pr-6">
                    {FIELD_APP_SHADOW_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dashboard preview (compact, below) */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Dashboard Preview</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-lg border p-3 space-y-2" style={{ fontFamily: fontMap[font] || "inherit", borderRadius: radiusMap[shape], boxShadow: shadowMap[shadow] }}>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold text-white" style={{ backgroundColor: settings.primaryColor, borderRadius: radiusMap[shape] }}>
                  {settings.logoUrl ? <img src={settings.logoUrl} alt="" className="h-6 w-6 object-contain" /> : settings.companyName.charAt(0)}
                </div>
                <span className="text-sm font-semibold">{settings.companyName}</span>
              </div>
              <div className="flex gap-1.5">
                <button className="rounded px-3 py-1 text-xs font-medium text-white" style={{ backgroundColor: settings.primaryColor, borderRadius: radiusMap[shape] }}>Primary</button>
                <button className="rounded px-3 py-1 text-xs font-medium text-white" style={{ backgroundColor: settings.secondaryColor, borderRadius: radiusMap[shape] }}>Secondary</button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {["Card A", "Card B", "Card C"].map((l) => (
                  <div key={l} className="border p-1.5 text-center text-[10px]" style={{ borderRadius: radiusMap[shape], boxShadow: shadowMap[shadow] }}>
                    <p className="font-bold" style={{ color: settings.primaryColor }}>12</p>
                    <p className="text-muted-foreground">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right column: sticky phone preview */}
      <div className="hidden xl:block sticky top-24">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 text-center">Field App Preview</p>
        <div className="mx-auto w-full max-w-[240px] rounded-[2rem] border bg-muted p-2.5">
          <div className="overflow-hidden rounded-[1.5rem] border bg-background" style={{ fontFamily: fontMap[font] || "inherit" }}>
            <div className="px-3 py-2.5" style={{ backgroundColor: settings.primaryColor }}>
              <p className="text-[8px] text-white/70">Good morning</p>
              <p className="text-sm font-semibold text-white">{settings.companyName}</p>
            </div>
            <div className="p-2.5 space-y-2.5">
              <div className="flex gap-1.5 -mt-3">
                {[{ v: "14", l: "Safe" }, { v: "5", l: "Tasks" }, { v: "8", l: "Week" }].map((s) => (
                  <div key={s.l} className="flex-1 border bg-card p-1.5 text-center" style={{ borderRadius: radiusMap[shape], boxShadow: shadowMap[shadow] }}>
                    <p className="text-base font-bold" style={{ color: settings.primaryColor }}>{s.v}</p>
                    <p className="text-[7px] text-muted-foreground">{s.l}</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-around px-1">
                {["Report", "Tasks", "Assess", "Assets"].map((a) => (
                  <div key={a} className="flex flex-col items-center gap-1">
                    <div className="h-9 w-9 rounded-full flex items-center justify-center" style={{ backgroundColor: settings.primaryColor + "18" }}>
                      <div className="h-4 w-4 rounded" style={{ backgroundColor: settings.primaryColor, borderRadius: radiusMap[shape] }} />
                    </div>
                    <span className="text-[7px] font-medium">{a}</span>
                  </div>
                ))}
              </div>
              <div className="border bg-card p-2" style={{ borderRadius: radiusMap[shape], boxShadow: shadowMap[shadow] }}>
                <p className="text-[8px] font-semibold" style={{ color: settings.primaryColor }}>Tip of the day</p>
                <p className="text-[7px] text-muted-foreground mt-0.5">Always wear PPE in designated areas.</p>
              </div>
            </div>
            <div className="border-t bg-card px-2 py-1.5 flex justify-around">
              {["Home", "Tasks", "Report", "Profile"].map((tab) => (
                <div key={tab} className="flex flex-col items-center gap-0.5">
                  <div className="h-3 w-3 rounded-sm bg-muted" />
                  <span className="text-[6px] text-muted-foreground">{tab}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
