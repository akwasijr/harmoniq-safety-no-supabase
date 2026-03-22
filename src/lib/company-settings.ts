import { COUNTRY_OPTIONS, getCountryConfig } from "@/lib/country-config";
import type { Country, Currency, Language } from "@/types";

export type MeasurementSystem = "imperial" | "metric";

export interface RegionalDefaults {
  country: Country;
  language: Language;
  currency: Currency;
  dateFormat: string;
  timezone: string;
  measurementSystem: MeasurementSystem;
}

export interface SelectOption {
  value: string;
  label: string;
}

export const DATE_FORMAT_OPTIONS: SelectOption[] = [
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (US)" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (UK/EU)" },
  { value: "DD-MM-YYYY", label: "DD-MM-YYYY" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (ISO)" },
];

export const TIMEZONE_OPTIONS: SelectOption[] = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Amsterdam", label: "Amsterdam (CET)" },
  { value: "Europe/Stockholm", label: "Stockholm (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Europe/Madrid", label: "Madrid (CET)" },
];

export const CURRENCY_OPTIONS: SelectOption[] = Array.from(
  new Map(
    COUNTRY_OPTIONS.map((country) => [
      country.currency,
      {
        value: country.currency,
        label: country.currency,
      },
    ]),
  ).values(),
);

export function getMeasurementSystemForCountry(country?: Country | string): MeasurementSystem {
  return getCountryConfig(country).code === "US" ? "imperial" : "metric";
}

export function buildRegionalDefaults(country?: Country | string): RegionalDefaults {
  const config = getCountryConfig(country);
  return {
    country: config.code,
    language: config.defaultLocale,
    currency: config.currency,
    dateFormat: config.dateFormat,
    timezone: config.timezone,
    measurementSystem: getMeasurementSystemForCountry(config.code),
  };
}

export function getCompanySettingsKey(companyId?: string): string {
  return companyId ? `harmoniq_settings_${companyId}` : "harmoniq_settings";
}
