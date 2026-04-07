"use client";

import { Globe } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CountryFlag } from "@/components/ui/country-flag";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SUPPORTED_LOCALES } from "@/i18n";
import { COUNTRY_OPTIONS, getCountryConfig } from "@/lib/country-config";
import {
  CURRENCY_OPTIONS,
  DATE_FORMAT_OPTIONS,
  TIMEZONE_OPTIONS,
  type MeasurementSystem,
} from "@/lib/company-settings";
import { cn } from "@/lib/utils";
import type { Currency } from "@/types";

import type {
  SettingsCopyProps,
  SettingsState,
  UpdateSettingProps,
} from "./settings-types";

interface GeneralSettingsSectionProps
  extends SettingsCopyProps, UpdateSettingProps {
  companySlug: string;
  settings: SettingsState;
  onCountryChange: (countryCode: string) => void;
}

export function GeneralSettingsSection({
  companySlug,
  onCountryChange,
  settings,
  t,
  updateSetting,
}: GeneralSettingsSectionProps) {
  return (
    <>
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
                onChange={(event) =>
                  updateSetting("companyName", event.target.value)
                }
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="app-name">
                {t("settings.appDisplayName") || "App Display Name"}
              </Label>
              <Input
                id="app-name"
                value={settings.appName}
                onChange={(event) =>
                  updateSetting("appName", event.target.value)
                }
                placeholder={settings.companyName}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">
                {t("settings.appDisplayNameHint") ||
                  "Shown in the mobile app header. Defaults to company name."}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-slug">{t("settings.urlSlug")}</Label>
              <Input id="company-slug" value={companySlug} disabled />
            </div>
          </div>
        </CardContent>
      </Card>

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
                onClick={() => onCountryChange(country.code)}
                className={cn(
                  "flex flex-col items-center gap-3 rounded-xl border-2 p-4 text-center transition-all",
                  settings.selectedCountry === country.code
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50",
                )}
              >
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-primary/10">
                  <CountryFlag code={country.code} size="md" />
                </div>
                <div>
                  <p
                    className={cn(
                      "font-semibold",
                      settings.selectedCountry === country.code &&
                        "text-primary",
                    )}
                  >
                    {country.name}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {country.regulations}
                  </p>
                </div>
                {settings.selectedCountry === country.code && (
                  <Badge variant="default" className="text-xs">
                    {t("settings.selected")}
                  </Badge>
                )}
              </button>
            ))}
          </div>
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm">
              <strong>{t("settings.basedOnSelection")}</strong>{" "}
              {t(
                getCountryConfig(settings.selectedCountry).regulationMessageKey,
              )}
            </p>
          </div>
        </CardContent>
      </Card>

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
                onChange={(event) =>
                  updateSetting("language", event.target.value)
                }
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
                onChange={(event) =>
                  updateSetting("currency", event.target.value as Currency)
                }
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
                onChange={(event) =>
                  updateSetting("dateFormat", event.target.value)
                }
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
                onChange={(event) =>
                  updateSetting("timezone", event.target.value)
                }
              >
                {TIMEZONE_OPTIONS.map((timezone) => (
                  <option key={timezone.value} value={timezone.value}>
                    {timezone.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="measurement-system">
                {t("settings.measurementSystem")}
              </Label>
              <select
                id="measurement-system"
                title="Select measurement system"
                aria-label="Select measurement system"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={settings.measurementSystem}
                onChange={(event) =>
                  updateSetting(
                    "measurementSystem",
                    event.target.value as MeasurementSystem,
                  )
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
  );
}
