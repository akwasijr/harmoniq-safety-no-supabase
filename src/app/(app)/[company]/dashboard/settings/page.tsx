"use client";

import * as React from "react";
import Link from "next/link";
import {
  Building,
  Palette,
  Bell,
  Shield,
  Globe,
  CreditCard,
  Save,
  Check,
  Upload,
  X,
  Factory,
  Smartphone,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  HardHat,
  Flame,
  HeartPulse,
  Warehouse,
  Mountain,
  UtensilsCrossed,
  Zap,
  Truck,
  GraduationCap,
  PlaneTakeoff,
  type LucideIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCompanyParam } from "@/hooks/use-company-param";
import { useAuth } from "@/hooks/use-auth";
import { applyBranding } from "@/lib/branding";
import { applyDocumentLanguage } from "@/lib/localization";
import { COUNTRY_OPTIONS, getCountryConfig } from "@/lib/country-config";
import { CountryFlag } from "@/components/ui/country-flag";
import {
  buildRegionalDefaults,
  CURRENCY_OPTIONS,
  DATE_FORMAT_OPTIONS,
  getCompanySettingsKey,
  TIMEZONE_OPTIONS,
  type MeasurementSystem,
} from "@/lib/company-settings";
import { useCompanyStore } from "@/stores/company-store";
import { useToast } from "@/components/ui/toast";
import type { Company, Country, Currency, Language, IndustryCode } from "@/types";
import { INDUSTRY_METADATA, getTemplatesByIndustry } from "@/data/industry-templates";

const INDUSTRY_ICON_MAP: Record<string, LucideIcon> = {
  HardHat, Factory, Flame, HeartPulse, Warehouse,
  Mountain, UtensilsCrossed, Zap, Truck, GraduationCap, PlaneTakeoff,
};

import { SUPPORTED_LOCALES, useTranslation } from "@/i18n";
import type { SupportedLocale } from "@/i18n";
import { RoleGuard } from "@/components/auth/role-guard";
import { FieldAppHomePreview } from "@/components/settings/field-app-home-preview";
import {
  type FieldAppQuickActionId,
  type FieldAppSettings,
  buildDefaultFieldAppSettings,
  FIELD_APP_FONT_OPTIONS,
  FIELD_APP_MIN_QUICK_ACTIONS,
  FIELD_APP_QUICK_ACTION_DEFINITIONS,
  FIELD_APP_SHADOW_OPTIONS,
  FIELD_APP_SHAPE_OPTIONS,
  getFieldAppTip,
  normalizeFieldAppSettings,
} from "@/lib/field-app-settings";

type SettingsTabType = "general" | "branding" | "fieldApp" | "industry" | "notifications" | "security" | "billing";

interface SettingsState {
  companyName: string;
  appName: string;
  selectedCountry: string;
  selectedIndustry: string;
  language: string;
  currency: Currency;
  dateFormat: string;
  timezone: string;
  measurementSystem: MeasurementSystem;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
  notifCriticalAlerts: boolean;
  notifDailyDigest: boolean;
  notifChecklistReminders: boolean;
  notifMaintenanceAlerts: boolean;
  notifNewIncidents: boolean;
  twoFactorEnabled: boolean;
  ssoEnabled: boolean;
  sessionTimeout: string;
  passwordPolicy: string;
  fieldApp: FieldAppSettings;
}

const defaultCompany: Company = {
  id: "default",
  name: "My Company",
  slug: "my-company",
  app_name: "Safety App",
  country: "US",
  language: "en",
  status: "active",
  logo_url: null,
  hero_image_url: null,
  primary_color: "#024E6E",
  secondary_color: "#029EDB",
  font_family: "Geist Sans",
  ui_style: "rounded",
  tier: "professional",
  seat_limit: 50,
  currency: "USD",
  trial_ends_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const buildSettingsFromCompany = (company: Company | null | undefined): SettingsState => {
  const c = company ?? defaultCompany;
  const regionalDefaults = buildRegionalDefaults(c.country);
  return {
    companyName: c.name,
    appName: c.app_name || c.name,
    selectedCountry: c.country,
    selectedIndustry: c.industry || "",
    language: c.language,
    currency: c.currency || regionalDefaults.currency,
    dateFormat: regionalDefaults.dateFormat,
    timezone: regionalDefaults.timezone,
    measurementSystem: regionalDefaults.measurementSystem,
    primaryColor: c.primary_color || "#024E6E",
    secondaryColor: c.secondary_color || "#029EDB",
    logoUrl: c.logo_url,
    notifCriticalAlerts: true,
    notifDailyDigest: true,
    notifChecklistReminders: false,
    notifMaintenanceAlerts: true,
    notifNewIncidents: true,
    twoFactorEnabled: false,
    ssoEnabled: false,
    sessionTimeout: "30",
    passwordPolicy: "strong",
    fieldApp: buildDefaultFieldAppSettings(c.industry),
  };
};

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked ? "true" : "false"}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        checked ? "bg-primary" : "bg-muted"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

export default function SettingsPage() {
  const company = useCompanyParam();
  const { currentCompany, isLoading: isAuthLoading, hasPermission: currentUserCan } = useAuth();
  const canEditSettings = currentUserCan("settings.edit");
  const { items: companies } = useCompanyStore();
  const { resolvedTheme } = useTheme();
  const fallbackCompany = React.useMemo(() => companies.find(c => c.slug === company) ?? null, [companies, company]);
  const activeCompany = currentCompany ?? fallbackCompany ?? defaultCompany;
  const settingsStorageKey = React.useMemo(
    () => getCompanySettingsKey(activeCompany?.id),
    [activeCompany?.id]
  );
  const [activeTab, setActiveTab] = React.useState<SettingsTabType>("general");
  const [settings, setSettings] = React.useState<SettingsState>(() =>
    buildSettingsFromCompany(activeCompany ?? defaultCompany)
  );
  const [saved, setSaved] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { update: updateCompany } = useCompanyStore();
  const { toast } = useToast();
  const { t, setLocale } = useTranslation();

  const settingsTabs = [
    { value: "general" as SettingsTabType, label: t("settings.tabs.general"), icon: Building },
    { value: "branding" as SettingsTabType, label: t("settings.tabs.branding"), icon: Palette },
    { value: "fieldApp" as SettingsTabType, label: "Field App", icon: Smartphone },
    { value: "industry" as SettingsTabType, label: "Industry", icon: Factory },
    { value: "notifications" as SettingsTabType, label: t("settings.tabs.notifications"), icon: Bell },
    { value: "security" as SettingsTabType, label: t("settings.tabs.security"), icon: Shield },
    { value: "billing" as SettingsTabType, label: t("settings.tabs.billing"), icon: CreditCard },
  ];

  // Load settings from localStorage on mount and apply branding
  React.useEffect(() => {
    if (typeof window === "undefined" || !activeCompany) return;
    const storageKey = getCompanySettingsKey(activeCompany.id);
    const legacySettings = localStorage.getItem("harmoniq_settings");
    const savedSettings = localStorage.getItem(storageKey) ?? legacySettings;
    let nextSettings = buildSettingsFromCompany(activeCompany);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        nextSettings = { ...nextSettings, ...parsed };
        nextSettings.fieldApp = normalizeFieldAppSettings(
          parsed.fieldApp,
          (nextSettings.selectedIndustry || activeCompany.industry) as IndustryCode | undefined
        );
        if (!localStorage.getItem(storageKey)) {
          localStorage.setItem(storageKey, JSON.stringify(parsed));
        }
      } catch {
        toast("Failed to load saved settings", "error");
      }
    } else {
      nextSettings.fieldApp = buildDefaultFieldAppSettings(activeCompany.industry);
    }
    setSettings(nextSettings);
    applyBranding({ primaryColor: nextSettings.primaryColor, secondaryColor: nextSettings.secondaryColor }, resolvedTheme || "light");
    applyDocumentLanguage(nextSettings.language);
  }, [activeCompany, toast]);

  const handleSave = () => {
    if (!activeCompany) {
      toast("Unable to save settings", "error");
      return;
    }
    setSaving(true);
      setTimeout(() => {
        if (typeof window !== "undefined") {
          localStorage.setItem(settingsStorageKey, JSON.stringify(settings));
          applyBranding({ primaryColor: settings.primaryColor, secondaryColor: settings.secondaryColor }, resolvedTheme || "light");
          applyDocumentLanguage(settings.language);
        }
      const nextCountry =
        COUNTRY_OPTIONS.find((country) => country.code === settings.selectedCountry)?.code ||
        activeCompany.country;
      // Update the company store
        updateCompany(activeCompany.id, {
          name: settings.companyName,
          app_name: settings.appName || settings.companyName,
        primary_color: settings.primaryColor,
        secondary_color: settings.secondaryColor,
        logo_url: settings.logoUrl,
          language: settings.language as Language,
          country: nextCountry as Country,
          currency: settings.currency,
          industry: (settings.selectedIndustry || undefined) as IndustryCode | undefined,
        });
        setLocale(settings.language as SupportedLocale);
        setSaving(false);
        setSaved(true);
        toast("Settings saved successfully");
      setTimeout(() => setSaved(false), 2000);
    }, 500);
  };

  const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    if (!canEditSettings) return;
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const updateFieldAppSettings = React.useCallback(
    (updater: (previous: FieldAppSettings) => FieldAppSettings) => {
      if (!canEditSettings) return;
      setSettings((prev) => ({
        ...prev,
        fieldApp: normalizeFieldAppSettings(
          updater(prev.fieldApp),
          (prev.selectedIndustry || undefined) as IndustryCode | undefined
        ),
      }));
    },
    [canEditSettings]
  );

  const toggleFieldQuickAction = React.useCallback(
    (actionId: FieldAppQuickActionId) => {
      updateFieldAppSettings((previous) => {
        const isEnabled = previous.quickActions.includes(actionId);
        if (isEnabled) {
          if (previous.quickActions.length <= FIELD_APP_MIN_QUICK_ACTIONS) {
            return previous;
          }
          return {
            ...previous,
            quickActions: previous.quickActions.filter((id) => id !== actionId),
          };
        }

        return {
          ...previous,
          quickActions: [...previous.quickActions, actionId],
        };
      });
    },
    [updateFieldAppSettings]
  );

  const moveFieldQuickAction = React.useCallback(
    (actionId: FieldAppQuickActionId, direction: "up" | "down") => {
      updateFieldAppSettings((previous) => {
        const index = previous.quickActions.indexOf(actionId);
        if (index === -1) return previous;

        const nextIndex = direction === "up" ? index - 1 : index + 1;
        if (nextIndex < 0 || nextIndex >= previous.quickActions.length) return previous;

        const quickActions = [...previous.quickActions];
        const [moved] = quickActions.splice(index, 1);
        quickActions.splice(nextIndex, 0, moved);

        return {
          ...previous,
          quickActions,
        };
      });
    },
    [updateFieldAppSettings]
  );

  const resetFieldAppToIndustryPreset = React.useCallback(() => {
    if (!canEditSettings) return;
    setSettings((prev) => ({
      ...prev,
      fieldApp: buildDefaultFieldAppSettings((prev.selectedIndustry || undefined) as IndustryCode | undefined),
    }));
  }, [canEditSettings]);

  const quickActionLabels = React.useMemo(
    () =>
      Object.fromEntries(
        FIELD_APP_QUICK_ACTION_DEFINITIONS.map((action) => [action.id, t(action.labelKey) || action.fallbackLabel])
      ) as Record<FieldAppQuickActionId, string>,
    [t]
  );

  const fieldAppTipPreview = React.useMemo(
    () => getFieldAppTip((settings.selectedIndustry || undefined) as IndustryCode | undefined, settings.language as Language, 0),
    [settings.language, settings.selectedIndustry]
  );

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateSetting("logoUrl", reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    updateSetting("logoUrl", null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <RoleGuard requiredPermission="settings.view">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">{t("settings.title")}</h1>
        <Button onClick={handleSave} disabled={saving || !canEditSettings} className="gap-2">
          {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? t("settings.saving") : saved ? t("settings.saved") : t("settings.saveChanges")}
        </Button>
      </div>

      {!canEditSettings && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4 text-sm text-amber-800 dark:text-amber-200">
          {t("common.noEditPermission")}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-4 overflow-x-auto">
          {settingsTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "flex items-center gap-2 py-3 px-1 text-sm font-medium transition-colors relative whitespace-nowrap",
                  activeTab === tab.value 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{tab.label}</span>
                {activeTab === tab.value && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="grid gap-6">
        {/* General Tab */}
        {activeTab === "general" && (
          <>
            {/* Company Information */}
            <Card>
              <CardHeader>
                <CardTitle>{t("settings.companyInformation")}</CardTitle>
                <CardDescription>{t("settings.basicInfo")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">{t("settings.companyName")}</Label>
                    <Input 
                      id="company-name" 
                      value={settings.companyName}
                      onChange={(e) => updateSetting("companyName", e.target.value)}
                      maxLength={200}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="app-name">{t("settings.appDisplayName") || "App Display Name"}</Label>
                    <Input 
                      id="app-name" 
                      value={settings.appName}
                      onChange={(e) => updateSetting("appName", e.target.value)}
                      placeholder={settings.companyName}
                      maxLength={200}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("settings.appDisplayNameHint") || "Shown in the mobile app header. Defaults to company name."}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-slug">{t("settings.urlSlug")}</Label>
                    <Input id="company-slug" value={company} disabled />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Country & Regulations */}
            <Card className="border-primary/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" aria-hidden="true" />
                  <CardTitle>{t("settings.countryAndRegulations")}</CardTitle>
                </div>
                <CardDescription>{t("settings.countryDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  {COUNTRY_OPTIONS.map((country) => (
                    <button
                      key={country.code}
                      onClick={() => {
                        if (!canEditSettings) return;
                        const regionalDefaults = buildRegionalDefaults(country.code);
                        setSettings((prev) => ({
                          ...prev,
                          selectedCountry: country.code,
                          language: regionalDefaults.language,
                          currency: regionalDefaults.currency,
                          dateFormat: regionalDefaults.dateFormat,
                          timezone: regionalDefaults.timezone,
                          measurementSystem: regionalDefaults.measurementSystem,
                        }));
                      }}
                      className={cn(
                        "flex flex-col items-center gap-3 rounded-xl border-2 p-4 transition-all text-center",
                        settings.selectedCountry === country.code
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 overflow-hidden">
                        <CountryFlag code={country.code} size="md" />
                      </div>
                      <div>
                        <p className={cn(
                          "font-semibold",
                          settings.selectedCountry === country.code && "text-primary"
                        )}>
                          {country.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {country.regulations}
                        </p>
                      </div>
                      {settings.selectedCountry === country.code && (
                        <Badge variant="default" className="text-xs">{t("settings.selected")}</Badge>
                      )}
                    </button>
                  ))}
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm">
                    <strong>{t("settings.basedOnSelection")}</strong>{" "}
                    {t(getCountryConfig(settings.selectedCountry).regulationMessageKey)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Localization */}
            <Card>
              <CardHeader>
                <CardTitle>{t("settings.localization")}</CardTitle>
                <CardDescription>{t("settings.languageAndRegional")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  <div className="space-y-2">
                    <Label htmlFor="language">{t("settings.defaultLanguage")}</Label>
                    <select
                      id="language"
                      title="Select language"
                      aria-label="Select language"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={settings.language}
                      onChange={(e) => updateSetting("language", e.target.value)}
                    >
                      {SUPPORTED_LOCALES.map((locale) => (
                        <option key={locale.code} value={locale.code}>
                          {locale.flag} {locale.name} ({locale.englishName})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">{t("settings.currency")}</Label>
                    <select
                      id="currency"
                      title="Select currency"
                      aria-label="Select currency"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={settings.currency}
                      onChange={(e) => updateSetting("currency", e.target.value as Currency)}
                    >
                      {CURRENCY_OPTIONS.map((currency) => (
                        <option key={currency.value} value={currency.value}>
                          {currency.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date-format">{t("settings.dateFormat")}</Label>
                    <select
                      id="date-format"
                      title="Select date format"
                      aria-label="Select date format"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={settings.dateFormat}
                      onChange={(e) => updateSetting("dateFormat", e.target.value)}
                    >
                      {DATE_FORMAT_OPTIONS.map((format) => (
                        <option key={format.value} value={format.value}>
                          {format.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">{t("settings.timezone")}</Label>
                    <select
                      id="timezone"
                      title="Select timezone"
                      aria-label="Select timezone"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={settings.timezone}
                      onChange={(e) => updateSetting("timezone", e.target.value)}
                    >
                      {TIMEZONE_OPTIONS.map((timezone) => (
                        <option key={timezone.value} value={timezone.value}>
                          {timezone.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="measurement-system">{t("settings.measurementSystem")}</Label>
                    <select
                      id="measurement-system"
                      title="Select measurement system"
                      aria-label="Select measurement system"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={settings.measurementSystem}
                      onChange={(e) =>
                        updateSetting("measurementSystem", e.target.value as MeasurementSystem)
                      }
                    >
                      <option value="metric">{t("settings.metricUnits")}</option>
                      <option value="imperial">{t("settings.imperialUnits")}</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Branding Tab */}
        {activeTab === "branding" && (
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.branding")}</CardTitle>
              <CardDescription>{t("settings.customizeLook")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Upload */}
              <div className="space-y-2">
                <Label>{t("settings.companyLogo")}</Label>
                <div className="flex items-center gap-4">
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-lg border bg-muted overflow-hidden">
                    {settings.logoUrl ? (
                      <>
                        <img src={settings.logoUrl} alt="Company logo" className="h-full w-full object-contain" loading="lazy" />
                        <button
                          onClick={removeLogo}
                          aria-label="Remove logo"
                          className="absolute -top-1 -right-1 rounded-full bg-destructive p-1 text-destructive-foreground hover:bg-destructive/90"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </>
                    ) : (
                      <Building className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                      aria-label="Upload company logo"
                    />
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
                      <Upload className="h-4 w-4" />
                      {t("settings.uploadLogo")}
                    </Button>
                    <p className="text-xs text-muted-foreground">{t("settings.logoHint")}</p>
                  </div>
                </div>
              </div>

              {/* Colors */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="primary-color">{t("settings.primaryColor")}</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="primary-color" 
                      value={settings.primaryColor}
                      onChange={(e) => updateSetting("primaryColor", e.target.value)}
                      className="flex-1"
                    />
                    <input
                      type="color"
                      title="Pick primary color"
                      aria-label="Pick primary color"
                      value={settings.primaryColor}
                      onChange={(e) => updateSetting("primaryColor", e.target.value)}
                      className="h-10 w-14 cursor-pointer rounded-md border p-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondary-color">{t("settings.secondaryColor")}</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="secondary-color" 
                      value={settings.secondaryColor}
                      onChange={(e) => updateSetting("secondaryColor", e.target.value)}
                      className="flex-1"
                    />
                    <input
                      type="color"
                      title="Pick secondary color"
                      aria-label="Pick secondary color"
                      value={settings.secondaryColor}
                      onChange={(e) => updateSetting("secondaryColor", e.target.value)}
                      className="h-10 w-14 cursor-pointer rounded-md border p-1"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <Label>{t("settings.preview")}</Label>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div 
                      className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: settings.primaryColor }}
                    >
                      {settings.logoUrl ? (
                        <img src={settings.logoUrl} alt="Company logo" className="h-8 w-8 object-contain" loading="lazy" />
                      ) : (
                        settings.companyName.charAt(0)
                      )}
                    </div>
                    <span className="font-semibold">{settings.companyName}</span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      className="px-4 py-2 rounded-md text-white text-sm font-medium"
                      style={{ backgroundColor: settings.primaryColor }}
                    >
                      {t("settings.primaryButton")}
                    </button>
                    <button 
                      className="px-4 py-2 rounded-md text-white text-sm font-medium"
                      style={{ backgroundColor: settings.secondaryColor }}
                    >
                      {t("settings.secondaryButton")}
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "fieldApp" && (
          <div className="grid gap-6 xl:items-start xl:grid-cols-[minmax(0,1.35fr)_340px]">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Field App setup</CardTitle>
                  <CardDescription>
                    Control the mobile home experience without changing dashboard branding or layout.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">Quick setup from industry</p>
                      <p className="text-sm text-muted-foreground">
                        Start from your saved industry preset, then fine-tune the mobile app manually.
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
                        onChange={(e) =>
                          updateFieldAppSettings((previous) => ({
                            ...previous,
                            fontId: e.target.value as FieldAppSettings["fontId"],
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
                        onChange={(e) =>
                          updateFieldAppSettings((previous) => ({
                            ...previous,
                            shape: e.target.value as FieldAppSettings["shape"],
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
                      onChange={(e) =>
                        updateFieldAppSettings((previous) => ({
                          ...previous,
                          shadow: e.target.value as FieldAppSettings["shadow"],
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
                    Choose what appears on the field home screen. Quick actions always keep at least {FIELD_APP_MIN_QUICK_ACTIONS} items.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium">Tip of the Day</p>
                        <p className="text-sm text-muted-foreground">
                          Uses the selected company language and industry for the mobile home tip.
                        </p>
                      </div>
                      <Toggle
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
                          Hide the News tab and featured news block from the field app.
                        </p>
                      </div>
                      <Toggle
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
                      <Badge variant="secondary">{settings.fieldApp.quickActions.length} active</Badge>
                    </div>

                    <div className="divide-y">
                      {FIELD_APP_QUICK_ACTION_DEFINITIONS.map((action) => {
                        const enabled = settings.fieldApp.quickActions.includes(action.id);
                        const activeIndex = settings.fieldApp.quickActions.indexOf(action.id);
                        return (
                          <div key={action.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-medium">{quickActionLabels[action.id]}</p>
                              <p className="text-sm text-muted-foreground">
                                {enabled ? `Position ${activeIndex + 1} on the mobile home screen.` : "Hidden from the mobile home screen."}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {enabled && (
                                <>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => moveFieldQuickAction(action.id, "up")}
                                    disabled={activeIndex <= 0 || !canEditSettings}
                                    aria-label={`Move ${quickActionLabels[action.id]} up`}
                                  >
                                    <ArrowUp className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => moveFieldQuickAction(action.id, "down")}
                                    disabled={activeIndex === settings.fieldApp.quickActions.length - 1 || !canEditSettings}
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
                                  (enabled && settings.fieldApp.quickActions.length <= FIELD_APP_MIN_QUICK_ACTIONS)
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
        )}

        {/* Industry Tab */}
        {activeTab === "industry" && (
          <Card>
            <CardHeader>
              <CardTitle>Industry</CardTitle>
              <CardDescription>
                Select your company&apos;s industry to get recommended checklist templates and compliance guidance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Primary Industry</Label>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {(Object.keys(INDUSTRY_METADATA) as IndustryCode[]).map((code) => {
                    const meta = INDUSTRY_METADATA[code];
                    const isSelected = settings.selectedIndustry === code;
                    const templateCount = getTemplatesByIndustry(code).length;
                    const IconComponent = INDUSTRY_ICON_MAP[meta.icon] || Factory;
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => {
                          updateSetting("selectedIndustry", code);
                        }}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50"
                        )}
                      >
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
                          style={{ backgroundColor: `${meta.color}15`, color: meta.color }}
                        >
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {t(`industry_templates.${code}.name`)}
                          </p>
                          <p className="text-xs text-muted-foreground">{templateCount} templates</p>
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
                <div className="pt-4 border-t space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Recommended Templates</p>
                      <p className="text-xs text-muted-foreground">
                        {getTemplatesByIndustry(settings.selectedIndustry as IndustryCode).length} templates available for your industry
                      </p>
                    </div>
                    <Link href={`/${company}/dashboard/checklists/templates`}>
                      <Button variant="outline" size="sm">
                        Browse Template Library
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.notifications")}</CardTitle>
              <CardDescription>{t("settings.configureNotifications")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="divide-y">
                <div className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{t("settings.criticalAlerts")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("settings.criticalAlertsDesc")}
                    </p>
                  </div>
                  <Toggle 
                    checked={settings.notifCriticalAlerts} 
                    onChange={(v) => updateSetting("notifCriticalAlerts", v)}
                    label="Critical incident alerts"
                  />
                </div>
                <div className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{t("settings.newIncidentReports")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("settings.newIncidentReportsDesc")}
                    </p>
                  </div>
                  <Toggle 
                    checked={settings.notifNewIncidents} 
                    onChange={(v) => updateSetting("notifNewIncidents", v)}
                    label="New incident reports"
                  />
                </div>
                <div className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{t("settings.dailyDigest")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("settings.dailyDigestDesc")}
                    </p>
                  </div>
                  <Toggle 
                    checked={settings.notifDailyDigest} 
                    onChange={(v) => updateSetting("notifDailyDigest", v)}
                    label="Daily digest"
                  />
                </div>
                <div className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{t("settings.checklistReminders")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("settings.checklistRemindersDesc")}
                    </p>
                  </div>
                  <Toggle 
                    checked={settings.notifChecklistReminders} 
                    onChange={(v) => updateSetting("notifChecklistReminders", v)}
                    label="Checklist reminders"
                  />
                </div>
                <div className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{t("settings.maintenanceAlerts")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("settings.maintenanceAlertsDesc")}
                    </p>
                  </div>
                  <Toggle 
                    checked={settings.notifMaintenanceAlerts} 
                    onChange={(v) => updateSetting("notifMaintenanceAlerts", v)}
                    label="Maintenance alerts"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security Tab */}
        {activeTab === "security" && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{t("settings.authentication")}</CardTitle>
                <CardDescription>{t("settings.configureAuth")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="divide-y">
                  <div className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-medium">{t("settings.twoFactor")}</p>
                      <p className="text-sm text-muted-foreground">
                        {t("settings.twoFactorDesc")}
                      </p>
                    </div>
                    <Toggle 
                      checked={settings.twoFactorEnabled} 
                      onChange={(v) => updateSetting("twoFactorEnabled", v)}
                      label="Two-factor authentication"
                    />
                  </div>
                  <div className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-medium">{t("settings.sso")}</p>
                      <p className="text-sm text-muted-foreground">
                        {t("settings.ssoDesc")}
                      </p>
                    </div>
                    <Toggle 
                      checked={settings.ssoEnabled} 
                      onChange={(v) => updateSetting("ssoEnabled", v)}
                      label="Single Sign-On"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("settings.sessionAndPassword")}</CardTitle>
                <CardDescription>{t("settings.sessionPasswordDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="session-timeout">{t("settings.sessionTimeout")}</Label>
                    <select
                      id="session-timeout"
                      title="Select session timeout"
                      aria-label="Select session timeout"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={settings.sessionTimeout}
                      onChange={(e) => updateSetting("sessionTimeout", e.target.value)}
                    >
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="60">1 hour</option>
                      <option value="120">2 hours</option>
                      <option value="480">8 hours</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-policy">{t("settings.passwordPolicy")}</Label>
                    <select
                      id="password-policy"
                      title="Select password policy"
                      aria-label="Select password policy"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={settings.passwordPolicy}
                      onChange={(e) => updateSetting("passwordPolicy", e.target.value)}
                    >
                      <option value="basic">Basic (8+ characters)</option>
                      <option value="standard">Standard (8+ with number)</option>
                      <option value="strong">Strong (12+ with special chars)</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Billing Tab */}
        {activeTab === "billing" && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{t("settings.currentPlan")}</CardTitle>
                <CardDescription>{t("settings.subscriptionDetails")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-lg capitalize">
                          {activeCompany.tier} Plan
                        </p>
                        <Badge variant="default">{t("settings.active")}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {activeCompany.seat_limit} seats •{" "}
                        {activeCompany.tier === "professional"
                          ? "$299"
                          : activeCompany.tier === "enterprise"
                          ? "$999"
                          : "$99"}
                        /month
                      </p>
                    </div>
                    <Button variant="outline">{t("settings.changePlan")}</Button>
                  </div>
                </div>

                {/* Usage */}
                <div className="space-y-3">
                  <p className="font-medium">{t("settings.usage")}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{t("settings.activeUsers")}</span>
                      <span>32 / {activeCompany.seat_limit}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{
                          width: `${Math.min((32 / activeCompany.seat_limit) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{t("settings.storageUsed")}</span>
                      <span>2.4 GB / 10 GB</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary rounded-full w-[24%]" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("settings.paymentMethod")}</CardTitle>
                <CardDescription>{t("settings.managePayment")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-14 items-center justify-center rounded bg-muted font-mono text-xs">
                      VISA
                    </div>
                    <div>
                      <p className="font-medium">•••• •••• •••• 4242</p>
                      <p className="text-sm text-muted-foreground">Expires 12/2027</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">{t("settings.update")}</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("settings.billingHistory")}</CardTitle>
                <CardDescription>{t("settings.viewInvoices")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {[
                    { date: "Feb 1, 2026", amount: "$299.00", status: "Paid" },
                    { date: "Jan 1, 2026", amount: "$299.00", status: "Paid" },
                    { date: "Dec 1, 2025", amount: "$299.00", status: "Paid" },
                  ].map((invoice, i) => (
                    <div key={i} className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium">{invoice.date}</p>
                        <p className="text-sm text-muted-foreground">Professional Plan</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{invoice.amount}</span>
                        <Badge variant="success" className="text-xs">{invoice.status}</Badge>
                        <Button variant="ghost" size="sm">Download</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
    </RoleGuard>
  );
}
