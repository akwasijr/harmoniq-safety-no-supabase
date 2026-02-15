"use client";

import * as React from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getCurrentCompany } from "@/mocks/data";
import { useCompanyParam } from "@/hooks/use-company-param";
import { useAuth } from "@/hooks/use-auth";
import { applyPrimaryColor } from "@/lib/branding";
import { applyDocumentLanguage } from "@/lib/localization";
import { useCompanyStore } from "@/stores/company-store";
import { useToast } from "@/components/ui/toast";
import type { Company, Country, Language } from "@/types";
import { useTranslation } from "@/i18n";

type SettingsTabType = "general" | "branding" | "notifications" | "security" | "billing";

const settingsTabs = [
  { value: "general" as SettingsTabType, label: "General", icon: Building },
  { value: "branding" as SettingsTabType, label: "Branding", icon: Palette },
  { value: "notifications" as SettingsTabType, label: "Notifications", icon: Bell },
  { value: "security" as SettingsTabType, label: "Security", icon: Shield },
  { value: "billing" as SettingsTabType, label: "Billing", icon: CreditCard },
];

const countries = [
  { code: "US", name: "United States", regulations: "OSHA (JHA/JSA)" },
  { code: "NL", name: "Netherlands", regulations: "Arbowet (RI&E)" },
  { code: "SE", name: "Sweden", regulations: "AFS (SAM)" },
];

interface SettingsState {
  companyName: string;
  selectedCountry: string;
  language: string;
  dateFormat: string;
  timezone: string;
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
}

const defaultCompany: Company = {
  id: "default",
  name: "My Company",
  slug: "my-company",
  app_name: "Safety App",
  country: "US" as any,
  language: "en" as any,
  status: "active" as any,
  logo_url: null,
  hero_image_url: null,
  primary_color: "#024E6E",
  secondary_color: "#029EDB",
  font_family: "Geist Sans",
  ui_style: "rounded" as any,
  tier: "professional" as any,
  seat_limit: 50,
  currency: "USD",
  trial_ends_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const buildSettingsFromCompany = (company: Company | null | undefined): SettingsState => {
  const c = company ?? defaultCompany;
  return {
  companyName: c.name,
  selectedCountry: c.country,
  language: c.language,
  dateFormat: c.country === "US" ? "MM/DD/YYYY" : "DD/MM/YYYY",
  timezone:
    c.country === "US"
      ? "America/New_York"
      : c.country === "NL"
      ? "Europe/Amsterdam"
      : "Europe/Stockholm",
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
  };
};

const getSettingsKey = (companyId?: string) =>
  companyId ? `harmoniq_settings_${companyId}` : "harmoniq_settings";

export default function SettingsPage() {
  const company = useCompanyParam();
  const { currentCompany, isLoading: isAuthLoading } = useAuth();
  const fallbackCompany = React.useMemo(() => getCurrentCompany(), []);
  const activeCompany = currentCompany ?? fallbackCompany ?? defaultCompany;
  const settingsStorageKey = React.useMemo(
    () => getSettingsKey(activeCompany?.id),
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
  const { t, formatDate, formatNumber } = useTranslation();

  // Load settings from localStorage on mount and apply branding
  React.useEffect(() => {
    if (typeof window === "undefined" || !activeCompany) return;
    const storageKey = getSettingsKey(activeCompany.id);
    const legacySettings = localStorage.getItem("harmoniq_settings");
    const savedSettings = localStorage.getItem(storageKey) ?? legacySettings;
    let nextSettings = buildSettingsFromCompany(activeCompany);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        nextSettings = { ...nextSettings, ...parsed };
        if (!localStorage.getItem(storageKey)) {
          localStorage.setItem(storageKey, JSON.stringify(parsed));
        }
      } catch {
        toast("Failed to load saved settings", "error");
      }
    }
    setSettings(nextSettings);
    applyPrimaryColor(nextSettings.primaryColor);
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
        applyPrimaryColor(settings.primaryColor);
        applyDocumentLanguage(settings.language);
      }
      const nextCountry =
        countries.find((country) => country.code === settings.selectedCountry)?.code ||
        activeCompany.country;
      // Update the company store
      updateCompany(activeCompany.id, {
        name: settings.companyName,
        primary_color: settings.primaryColor,
        secondary_color: settings.secondaryColor,
        logo_url: settings.logoUrl,
        language: settings.language as Language,
        country: nextCountry as Country,
      });
      setSaving(false);
      setSaved(true);
      toast("Settings saved successfully");
      setTimeout(() => setSaved(false), 2000);
    }, 500);
  };

  const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

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

  // Toggle switch component
  const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">{t("settings.title")}</h1>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? t("settings.saving") : saved ? t("settings.saved") : t("settings.saveChanges")}
        </Button>
      </div>

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
                    />
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
                  {countries.map((country) => (
                    <button
                      key={country.code}
                      onClick={() => updateSetting("selectedCountry", country.code)}
                      className={cn(
                        "flex flex-col items-center gap-3 rounded-xl border-2 p-4 transition-all text-center",
                        settings.selectedCountry === country.code
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <Globe className="h-6 w-6 text-primary" />
                      </div>
                      <span className="text-sm font-bold text-muted-foreground">{country.code}</span>
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
                    {settings.selectedCountry === "US" && t("settings.usRegulations")}
                    {settings.selectedCountry === "NL" && t("settings.nlRegulations")}
                    {settings.selectedCountry === "SE" && t("settings.seRegulations")}
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
                <div className="grid gap-4 sm:grid-cols-3">
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
                      <option value="en">English</option>
                      <option value="nl">Nederlands (Dutch)</option>
                      <option value="sv">Svenska (Swedish)</option>
                      <option value="de">Deutsch (German)</option>
                      <option value="fr">Français (French)</option>
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
                      <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                      <option value="DD-MM-YYYY">DD-MM-YYYY (EU)</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
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
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="Europe/London">London (GMT)</option>
                      <option value="Europe/Amsterdam">Amsterdam (CET)</option>
                      <option value="Europe/Stockholm">Stockholm (CET)</option>
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
                        <img src={settings.logoUrl} alt="Company logo" className="h-full w-full object-contain" />
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
                        <img src={settings.logoUrl} alt="" className="h-8 w-8 object-contain" />
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
  );
}
