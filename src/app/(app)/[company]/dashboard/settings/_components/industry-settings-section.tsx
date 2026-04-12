"use client";

import Link from "next/link";
import {
  Check,
  Factory,
  Flame,
  GraduationCap,
  HardHat,
  HeartPulse,
  Mountain,
  PlaneTakeoff,
  Truck,
  UtensilsCrossed,
  Warehouse,
  Zap,
  type LucideIcon,
} from "lucide-react";

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
  INDUSTRY_METADATA,
  getTemplatesForCountry,
} from "@/data/industry-templates";
import { cn } from "@/lib/utils";
import type { Country, IndustryCode } from "@/types";

import type { SettingsCopyProps, SettingsState, UpdateSettingProps } from "./settings-types";

const INDUSTRY_ICON_MAP: Record<string, LucideIcon> = {
  HardHat,
  Factory,
  Flame,
  HeartPulse,
  Warehouse,
  Mountain,
  UtensilsCrossed,
  Zap,
  Truck,
  GraduationCap,
  PlaneTakeoff,
};

interface IndustrySettingsSectionProps extends SettingsCopyProps, UpdateSettingProps {
  companySlug: string;
  companyCountry: Country;
  settings: SettingsState;
}

export function IndustrySettingsSection({
  companySlug,
  companyCountry,
  settings,
  t,
  updateSetting,
}: IndustrySettingsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Industry</CardTitle>
        <CardDescription>
          Select your company&apos;s industry to get recommended checklist
          templates and compliance guidance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Primary Industry</Label>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(Object.keys(INDUSTRY_METADATA) as IndustryCode[]).map((code) => {
              const meta = INDUSTRY_METADATA[code];
              const isSelected = settings.selectedIndustry === code;
              const templateCount = getTemplatesForCountry(code, companyCountry).length;
              const IconComponent = INDUSTRY_ICON_MAP[meta.icon] || Factory;

              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => updateSetting("selectedIndustry", code)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50",
                  )}
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
                    style={{
                      backgroundColor: `${meta.color}15`,
                      color: meta.color,
                    }}
                  >
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t(meta.label_key)}</p>
                    <p className="text-xs text-muted-foreground">
                      {templateCount} templates
                    </p>
                  </div>
                  {isSelected && (
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {settings.selectedIndustry && (
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Recommended Templates</p>
                <p className="text-xs text-muted-foreground">
                  {
                    getTemplatesForCountry(
                      settings.selectedIndustry as IndustryCode,
                      companyCountry,
                    ).length
                  }{" "}
                  templates available for your industry
                </p>
              </div>
              <Link href={`/${companySlug}/dashboard/checklists/my-templates`}>
                <Button variant="outline" size="sm">
                  Browse Template Library
                </Button>
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
