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

// Complementary 3-color palettes — primary, secondary (accent), tertiary (highlight)
const DESIGN_TEMPLATES = [
  { id: "default", name: "Default", primaryColor: "#3B82F6", secondaryColor: "#8B5CF6", tertiaryColor: "#10B981", font: "geist", shape: "medium", shadow: "subtle", desc: "Blue + violet accent + emerald highlight" },
  { id: "ocean", name: "Ocean Breeze", primaryColor: "#0284C7", secondaryColor: "#06B6D4", tertiaryColor: "#F59E0B", font: "plus_jakarta_sans", shape: "large", shadow: "subtle", desc: "Sky blue + cyan + warm amber accent" },
  { id: "forest", name: "Forest Trail", primaryColor: "#16A34A", secondaryColor: "#854D0E", tertiaryColor: "#0EA5E9", font: "work_sans", shape: "medium", shadow: "subtle", desc: "Green + earth brown + sky blue" },
  { id: "sunset", name: "Sunset Glow", primaryColor: "#EA580C", secondaryColor: "#7C3AED", tertiaryColor: "#FACC15", font: "manrope", shape: "small", shadow: "strong", desc: "Orange + violet + gold, bold shadows" },
  { id: "midnight", name: "Midnight", primaryColor: "#4F46E5", secondaryColor: "#EC4899", tertiaryColor: "#14B8A6", font: "inter", shape: "medium", shadow: "none", desc: "Indigo + pink + teal, flat design" },
  { id: "coral", name: "Coral Reef", primaryColor: "#E11D48", secondaryColor: "#0891B2", tertiaryColor: "#A3E635", font: "ibm_plex_sans", shape: "large", shadow: "subtle", desc: "Rose + ocean teal + lime accent" },
  { id: "slate", name: "Slate Pro", primaryColor: "#475569", secondaryColor: "#0284C7", tertiaryColor: "#F97316", font: "source_sans_3", shape: "small", shadow: "none", desc: "Gray + blue + orange, professional" },
  { id: "teal", name: "Teal Garden", primaryColor: "#0D9488", secondaryColor: "#D946EF", tertiaryColor: "#F59E0B", font: "public_sans", shape: "medium", shadow: "subtle", desc: "Teal + fuchsia + amber" },
  { id: "amber", name: "Amber Spice", primaryColor: "#D97706", secondaryColor: "#4F46E5", tertiaryColor: "#059669", font: "work_sans", shape: "large", shadow: "strong", desc: "Amber + indigo + emerald, bold" },
  { id: "violet", name: "Violet Aurora", primaryColor: "#7C3AED", secondaryColor: "#06B6D4", tertiaryColor: "#F43F5E", font: "manrope", shape: "medium", shadow: "subtle", desc: "Purple + cyan + rose" },
  { id: "military", name: "Military", primaryColor: "#365314", secondaryColor: "#78716C", tertiaryColor: "#CA8A04", font: "ibm_plex_sans", shape: "small", shadow: "none", desc: "Olive + stone + gold, utilitarian" },
  { id: "arctic", name: "Arctic Ice", primaryColor: "#0369A1", secondaryColor: "#6366F1", tertiaryColor: "#2DD4BF", font: "plus_jakarta_sans", shape: "large", shadow: "subtle", desc: "Deep blue + indigo + aqua" },
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
    updateSetting("tertiaryColor", tpl.tertiaryColor);
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
              <div className="rounded-lg bg-muted/30 p-3 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="h-5 w-5 rounded-full" style={{ backgroundColor: activeTpl.primaryColor }} />
                    <div className="h-5 w-5 rounded-full" style={{ backgroundColor: activeTpl.secondaryColor }} />
                    <div className="h-5 w-5 rounded-full" style={{ backgroundColor: activeTpl.tertiaryColor }} />
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
            <div className="grid gap-3 grid-cols-3">
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
              <div className="space-y-1.5">
                <Label className="text-xs">Tertiary</Label>
                <div className="flex gap-1.5">
                  <Input value={settings.tertiaryColor} onChange={(e) => { updateSetting("tertiaryColor", e.target.value); setSelectedTemplate("custom"); }} className="flex-1 h-9 text-xs" />
                  <input type="color" value={settings.tertiaryColor} onChange={(e) => { updateSetting("tertiaryColor", e.target.value); setSelectedTemplate("custom"); }} className="h-9 w-10 cursor-pointer rounded border p-0.5" />
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
      </div>

      {/* Right column: sticky previews */}
      <div className="hidden xl:block sticky top-24 space-y-5">
        {/* Phone preview — matches actual field app structure */}
        <div className="mx-auto w-full max-w-[280px] rounded-[2.5rem] border-2 border-foreground/10 bg-foreground/5 p-3">
          <div className="overflow-hidden rounded-[2rem] bg-background" style={{ fontFamily: fontMap[font] || "inherit" }}>
            {/* Header bar */}
            <div className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: settings.primaryColor }}>
              <div className="flex items-center gap-1.5">
                <div className="h-4 w-4 rounded bg-white/20" />
                <span className="text-[10px] font-semibold text-white">{settings.companyName}</span>
              </div>
              <div className="h-4 w-4 rounded-full bg-white/20" />
            </div>
            {/* Hero section with glass KPIs */}
            <div className="px-3 pt-4 pb-8" style={{ backgroundColor: settings.primaryColor }}>
              <p className="text-[9px] text-white/60">Good afternoon</p>
              <p className="text-base font-bold text-white mt-0.5">Demo</p>
              <div className="grid grid-cols-3 gap-2 mt-4">
                {["14", "5", "8"].map((v, i) => (
                  <div key={i} className="rounded-lg bg-white/10 backdrop-blur-sm px-2 py-2 text-center" style={{ borderRadius: radiusMap[shape] }}>
                    <p className="text-lg font-bold text-white">{v}</p>
                    <p className="text-[8px] text-white/60">{["Safe Days", "Pending", "This Week"][i]}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Content area */}
            <div className="bg-muted px-3 space-y-3 pb-3">
              {/* Tip card (overlapping) */}
              <div className="-mt-5 relative z-10 bg-card rounded-xl px-3 py-3" style={{ borderRadius: radiusMap[shape], boxShadow: shadowMap[shadow] }}>
                <p className="text-[8px] font-bold" style={{ color: settings.primaryColor }}>Tip of the day</p>
                <p className="text-[8px] text-muted-foreground mt-0.5 leading-relaxed">Always wear appropriate PPE in designated work areas.</p>
              </div>
              {/* Quick actions — circles */}
              <div className="flex justify-evenly pt-1">
                {["Report", "Tasks", "Assess", "Assets"].map((a) => (
                  <div key={a} className="flex flex-col items-center gap-1.5">
                    <div className="h-11 w-11 rounded-full flex items-center justify-center" style={{ backgroundColor: settings.primaryColor + "15" }}>
                      <div className="h-4 w-4 rounded-full bg-white" style={{ opacity: 0.7 }} />
                    </div>
                    <span className="text-[8px] font-medium text-muted-foreground">{a}</span>
                  </div>
                ))}
              </div>
              {/* Focus strip */}
              <div className="bg-card rounded-xl px-3 py-2.5" style={{ borderRadius: radiusMap[shape], boxShadow: shadowMap[shadow] }}>
                <p className="text-[8px] font-bold" style={{ color: settings.primaryColor }}>At a Glance</p>
                <div className="flex gap-2 mt-1.5">
                  <span className="text-[7px] font-medium flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-500" />Urgent</span>
                  <span className="text-[7px] text-muted-foreground flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />Upcoming</span>
                </div>
              </div>
            </div>
            {/* Bottom nav */}
            <div className="bg-card border-t px-3 py-2 flex justify-around">
              {["Home", "Tasks", "Report", "Profile"].map((tab, i) => (
                <div key={tab} className="flex flex-col items-center gap-0.5">
                  <div className={cn("h-4 w-4 rounded-sm", i === 0 ? "bg-foreground/60" : "bg-muted")} />
                  <span className={cn("text-[7px]", i === 0 ? "text-foreground font-medium" : "text-muted-foreground")}>{tab}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Compact dashboard preview */}
        <div className="mx-auto max-w-[280px]">
          <p className="text-[10px] font-medium text-muted-foreground text-center mb-2">Dashboard</p>
          <div className="rounded-lg border p-2.5 space-y-2" style={{ fontFamily: fontMap[font] || "inherit", borderRadius: radiusMap[shape] }}>
            {/* Sidebar + header hint */}
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold text-white" style={{ backgroundColor: settings.primaryColor, borderRadius: radiusMap[shape] }}>
                {settings.logoUrl ? <img src={settings.logoUrl} alt="" className="h-5 w-5 object-contain" /> : settings.companyName.charAt(0)}
              </div>
              <span className="text-xs font-semibold">{settings.companyName}</span>
            </div>
            {/* Button styles */}
            <div className="flex gap-1.5">
              <span className="rounded px-2.5 py-1 text-[9px] font-medium text-white" style={{ backgroundColor: settings.primaryColor, borderRadius: radiusMap[shape] }}>Filled</span>
              <span className="rounded px-2.5 py-1 text-[9px] font-medium border" style={{ color: settings.secondaryColor, borderColor: settings.secondaryColor, borderRadius: radiusMap[shape] }}>Outline</span>
              <span className="rounded px-2.5 py-1 text-[9px] font-medium" style={{ color: settings.tertiaryColor, backgroundColor: settings.tertiaryColor + "18", borderRadius: radiusMap[shape] }}>Subtle</span>
            </div>
            {/* KPI cards */}
            <div className="grid grid-cols-4 gap-1">
              {["Incidents", "TRIR", "LTIFR", "Resolution"].map((l) => (
                <div key={l} className="border p-1 text-center" style={{ borderRadius: radiusMap[shape], boxShadow: shadowMap[shadow] }}>
                  <p className="text-[9px] font-bold" style={{ color: settings.primaryColor }}>12</p>
                  <p className="text-[6px] text-muted-foreground">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
