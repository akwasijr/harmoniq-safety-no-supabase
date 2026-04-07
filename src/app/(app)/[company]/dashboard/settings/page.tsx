"use client";

import * as React from "react";
import {
  Bell,
  Building,
  Check,
  CreditCard,
  Factory,
  Palette,
  Save,
  Shield,
  Smartphone,
} from "lucide-react";
import { useTheme } from "next-themes";

import { RoleGuard } from "@/components/auth/role-guard";
import { LoadingPage } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyParam } from "@/hooks/use-company-param";
import { useTranslation } from "@/i18n";
import type { SupportedLocale } from "@/i18n";
import { applyBranding } from "@/lib/branding";
import {
  buildRegionalDefaults,
  getCompanySettingsKey,
} from "@/lib/company-settings";
import { COUNTRY_OPTIONS } from "@/lib/country-config";
import {
  buildDefaultFieldAppSettings,
  FIELD_APP_MIN_QUICK_ACTIONS,
  FIELD_APP_QUICK_ACTION_DEFINITIONS,
  getFieldAppTip,
  normalizeFieldAppSettings,
  type FieldAppQuickActionId,
  type FieldAppSettings,
} from "@/lib/field-app-settings";
import { applyDocumentLanguage } from "@/lib/localization";
import { useCompanyStore } from "@/stores/company-store";
import type { Company, Country, IndustryCode, Language } from "@/types";

import { BrandingSettingsSection } from "./_components/branding-settings-section";
import { FieldAppSettingsSection } from "./_components/field-app-settings-section";
import { GeneralSettingsSection } from "./_components/general-settings-section";
import { IndustrySettingsSection } from "./_components/industry-settings-section";
import {
  BillingSettingsSection,
  NotificationsSettingsSection,
  SecuritySettingsSection,
} from "./_components/settings-detail-sections";
import { SettingsTabs } from "./_components/settings-tabs";
import type {
  SettingsState,
  SettingsTabConfig,
  SettingsTabType,
} from "./_components/settings-types";

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

const buildSettingsFromCompany = (
  company: Company | null | undefined,
): SettingsState => {
  const currentCompany = company ?? defaultCompany;
  const regionalDefaults = buildRegionalDefaults(currentCompany.country);

  return {
    companyName: currentCompany.name,
    appName: currentCompany.app_name || currentCompany.name,
    selectedCountry: currentCompany.country,
    selectedIndustry: currentCompany.industry || "",
    language: currentCompany.language,
    currency: currentCompany.currency || regionalDefaults.currency,
    dateFormat: regionalDefaults.dateFormat,
    timezone: regionalDefaults.timezone,
    measurementSystem: regionalDefaults.measurementSystem,
    primaryColor: currentCompany.primary_color || "#024E6E",
    secondaryColor: currentCompany.secondary_color || "#029EDB",
    logoUrl: currentCompany.logo_url,
    notifCriticalAlerts: true,
    notifDailyDigest: true,
    notifChecklistReminders: false,
    notifMaintenanceAlerts: true,
    notifNewIncidents: true,
    twoFactorEnabled: false,
    ssoEnabled: false,
    sessionTimeout: "30",
    passwordPolicy: "strong",
    fieldApp: buildDefaultFieldAppSettings(currentCompany.industry),
  };
};

export default function SettingsPage() {
  const company = useCompanyParam();
  const {
    currentCompany,
    isLoading: isAuthLoading,
    hasPermission: currentUserCan,
  } = useAuth();
  const canEditSettings = currentUserCan("settings.edit");
  const { items: companies, update: updateCompany } = useCompanyStore();
  const { resolvedTheme } = useTheme();
  const fallbackCompany = React.useMemo(
    () => companies.find((item) => item.slug === company) ?? null,
    [companies, company],
  );
  const activeCompany = currentCompany ?? fallbackCompany ?? defaultCompany;
  const settingsStorageKey = React.useMemo(
    () => getCompanySettingsKey(activeCompany?.id),
    [activeCompany?.id],
  );
  const [activeTab, setActiveTab] = React.useState<SettingsTabType>("general");
  const [settings, setSettings] = React.useState<SettingsState>(() =>
    buildSettingsFromCompany(activeCompany ?? defaultCompany),
  );
  const [saved, setSaved] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { t, setLocale } = useTranslation();

  const settingsTabs = React.useMemo<SettingsTabConfig[]>(
    () => [
      { value: "general", label: t("settings.tabs.general"), icon: Building },
      { value: "branding", label: t("settings.tabs.branding"), icon: Palette },
      { value: "fieldApp", label: "Field App", icon: Smartphone },
      { value: "industry", label: "Industry", icon: Factory },
      {
        value: "notifications",
        label: t("settings.tabs.notifications"),
        icon: Bell,
      },
      { value: "security", label: t("settings.tabs.security"), icon: Shield },
      { value: "billing", label: t("settings.tabs.billing"), icon: CreditCard },
    ],
    [t],
  );

  React.useEffect(() => {
    if (typeof window === "undefined" || !activeCompany) {
      return;
    }

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
          (nextSettings.selectedIndustry || activeCompany.industry) as
            | IndustryCode
            | undefined,
        );
        if (!localStorage.getItem(storageKey)) {
          localStorage.setItem(storageKey, JSON.stringify(parsed));
        }
      } catch {
        toast("Failed to load saved settings", "error");
      }
    } else {
      nextSettings.fieldApp = buildDefaultFieldAppSettings(
        activeCompany.industry,
      );
    }

    setSettings(nextSettings);
    applyBranding(
      {
        primaryColor: nextSettings.primaryColor,
        secondaryColor: nextSettings.secondaryColor,
      },
      resolvedTheme || "light",
    );
    applyDocumentLanguage(nextSettings.language);
  }, [activeCompany, resolvedTheme, toast]);

  const handleSave = () => {
    if (!activeCompany) {
      toast("Unable to save settings", "error");
      return;
    }

    setSaving(true);
    setTimeout(() => {
      if (typeof window !== "undefined") {
        localStorage.setItem(settingsStorageKey, JSON.stringify(settings));
        applyBranding(
          {
            primaryColor: settings.primaryColor,
            secondaryColor: settings.secondaryColor,
          },
          resolvedTheme || "light",
        );
        applyDocumentLanguage(settings.language);
      }

      const nextCountry =
        COUNTRY_OPTIONS.find(
          (option) => option.code === settings.selectedCountry,
        )?.code || activeCompany.country;

      updateCompany(activeCompany.id, {
        name: settings.companyName,
        app_name: settings.appName || settings.companyName,
        primary_color: settings.primaryColor,
        secondary_color: settings.secondaryColor,
        logo_url: settings.logoUrl,
        language: settings.language as Language,
        country: nextCountry as Country,
        currency: settings.currency,
        industry: (settings.selectedIndustry || undefined) as
          | IndustryCode
          | undefined,
      });
      setLocale(settings.language as SupportedLocale);
      setSaving(false);
      setSaved(true);
      toast("Settings saved successfully");
      setTimeout(() => setSaved(false), 2000);
    }, 500);
  };

  const updateSetting = React.useCallback(
    <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
      if (!canEditSettings) {
        return;
      }

      setSettings((previous) => ({ ...previous, [key]: value }));
    },
    [canEditSettings],
  );

  const handleCountryChange = React.useCallback(
    (countryCode: string) => {
      if (!canEditSettings) {
        return;
      }

      const regionalDefaults = buildRegionalDefaults(countryCode as Country);
      setSettings((previous) => ({
        ...previous,
        selectedCountry: countryCode,
        language: regionalDefaults.language,
        currency: regionalDefaults.currency,
        dateFormat: regionalDefaults.dateFormat,
        timezone: regionalDefaults.timezone,
        measurementSystem: regionalDefaults.measurementSystem,
      }));
    },
    [canEditSettings],
  );

  const updateFieldAppSettings = React.useCallback(
    (updater: (previous: FieldAppSettings) => FieldAppSettings) => {
      if (!canEditSettings) {
        return;
      }

      setSettings((previous) => ({
        ...previous,
        fieldApp: normalizeFieldAppSettings(
          updater(previous.fieldApp),
          (previous.selectedIndustry || undefined) as IndustryCode | undefined,
        ),
      }));
    },
    [canEditSettings],
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
    [updateFieldAppSettings],
  );

  const moveFieldQuickAction = React.useCallback(
    (actionId: FieldAppQuickActionId, direction: "up" | "down") => {
      updateFieldAppSettings((previous) => {
        const index = previous.quickActions.indexOf(actionId);
        if (index === -1) {
          return previous;
        }

        const nextIndex = direction === "up" ? index - 1 : index + 1;
        if (nextIndex < 0 || nextIndex >= previous.quickActions.length) {
          return previous;
        }

        const quickActions = [...previous.quickActions];
        const [moved] = quickActions.splice(index, 1);
        quickActions.splice(nextIndex, 0, moved);

        return {
          ...previous,
          quickActions,
        };
      });
    },
    [updateFieldAppSettings],
  );

  const resetFieldAppToIndustryPreset = React.useCallback(() => {
    if (!canEditSettings) {
      return;
    }

    setSettings((previous) => ({
      ...previous,
      fieldApp: buildDefaultFieldAppSettings(
        (previous.selectedIndustry || undefined) as IndustryCode | undefined,
      ),
    }));
  }, [canEditSettings]);

  const quickActionLabels = React.useMemo(
    () =>
      Object.fromEntries(
        FIELD_APP_QUICK_ACTION_DEFINITIONS.map((action) => [
          action.id,
          t(action.labelKey) || action.fallbackLabel,
        ]),
      ) as Record<FieldAppQuickActionId, string>,
    [t],
  );

  const fieldAppTipPreview = React.useMemo(
    () =>
      getFieldAppTip(
        (settings.selectedIndustry || undefined) as IndustryCode | undefined,
        settings.language as Language,
        0,
      ),
    [settings.language, settings.selectedIndustry],
  );

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast?.(t("settings.logoTooLarge") || "Logo must be under 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      updateSetting("logoUrl", reader.result as string);
    };
    reader.onerror = () => {
      toast?.(t("settings.logoUploadFailed") || "Failed to read logo file");
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    updateSetting("logoUrl", null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (isAuthLoading) {
    return <LoadingPage />;
  }

  return (
    <RoleGuard requiredPermission="settings.view">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold">{t("settings.title")}</h1>
          <Button
            onClick={handleSave}
            disabled={saving || !canEditSettings}
            className="gap-2"
          >
            {saved ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving
              ? t("settings.saving")
              : saved
                ? t("settings.saved")
                : t("settings.saveChanges")}
          </Button>
        </div>

        {!canEditSettings && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            {t("common.noEditPermission")}
          </div>
        )}

        <SettingsTabs
          tabs={settingsTabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <div className="grid gap-6">
          {activeTab === "general" && (
            <GeneralSettingsSection
              companySlug={company}
              settings={settings}
              onCountryChange={handleCountryChange}
              t={t}
              updateSetting={updateSetting}
            />
          )}

          {activeTab === "branding" && (
            <BrandingSettingsSection
              fileInputRef={fileInputRef}
              settings={settings}
              onLogoUpload={handleLogoUpload}
              onRemoveLogo={removeLogo}
              t={t}
              updateSetting={updateSetting}
            />
          )}

          {activeTab === "fieldApp" && (
            <FieldAppSettingsSection
              canEditSettings={canEditSettings}
              fieldAppTipPreview={fieldAppTipPreview}
              moveFieldQuickAction={moveFieldQuickAction}
              quickActionLabels={quickActionLabels}
              resetFieldAppToIndustryPreset={resetFieldAppToIndustryPreset}
              settings={settings}
              toggleFieldQuickAction={toggleFieldQuickAction}
              updateFieldAppSettings={updateFieldAppSettings}
            />
          )}

          {activeTab === "industry" && (
            <IndustrySettingsSection
              companySlug={company}
              settings={settings}
              t={t}
              updateSetting={updateSetting}
            />
          )}

          {activeTab === "notifications" && (
            <NotificationsSettingsSection
              settings={settings}
              t={t}
              updateSetting={updateSetting}
            />
          )}

          {activeTab === "security" && (
            <SecuritySettingsSection
              settings={settings}
              t={t}
              updateSetting={updateSetting}
            />
          )}

          {activeTab === "billing" && (
            <BillingSettingsSection activeCompany={activeCompany} t={t} />
          )}
        </div>
      </div>
    </RoleGuard>
  );
}
