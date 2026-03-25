import type { Country, Currency, Language } from "@/types";

export type RiskAssessmentCatalogCountry = "US" | "NL" | "SE";

export interface CountryConfig {
  code: Country;
  name: string;
  flag: string;
  currency: Currency;
  defaultLocale: Language;
  timezone: string;
  dateFormat: string;
  regulations: string;
  regulationMessageKey:
    | "settings.usRegulations"
    | "settings.gbRegulations"
    | "settings.nlRegulations"
    | "settings.seRegulations"
    | "settings.deRegulations"
    | "settings.frRegulations"
    | "settings.esRegulations";
  riskAssessmentCatalog: RiskAssessmentCatalogCountry;
}

export const COUNTRY_CONFIGS: Record<Country, CountryConfig> = {
  US: {
    code: "US",
    name: "United States",
    flag: "🇺🇸",
    currency: "USD",
    defaultLocale: "en",
    timezone: "America/New_York",
    dateFormat: "MM/DD/YYYY",
    regulations: "OSHA (JHA/JSA)",
    regulationMessageKey: "settings.usRegulations",
    riskAssessmentCatalog: "US",
  },
  GB: {
    code: "GB",
    name: "United Kingdom",
    flag: "🇬🇧",
    currency: "GBP",
    defaultLocale: "en",
    timezone: "Europe/London",
    dateFormat: "DD/MM/YYYY",
    regulations: "HSE (RIDDOR/COSHH/PUWER)",
    regulationMessageKey: "settings.gbRegulations",
    riskAssessmentCatalog: "US",
  },
  NL: {
    code: "NL",
    name: "Netherlands",
    flag: "🇳🇱",
    currency: "EUR",
    defaultLocale: "nl",
    timezone: "Europe/Amsterdam",
    dateFormat: "DD/MM/YYYY",
    regulations: "Arbowet (RI&E)",
    regulationMessageKey: "settings.nlRegulations",
    riskAssessmentCatalog: "NL",
  },
  SE: {
    code: "SE",
    name: "Sweden",
    flag: "🇸🇪",
    currency: "SEK",
    defaultLocale: "sv",
    timezone: "Europe/Stockholm",
    dateFormat: "DD/MM/YYYY",
    regulations: "AFS (SAM)",
    regulationMessageKey: "settings.seRegulations",
    riskAssessmentCatalog: "SE",
  },
  DE: {
    code: "DE",
    name: "Germany",
    flag: "🇩🇪",
    currency: "EUR",
    defaultLocale: "de",
    timezone: "Europe/Berlin",
    dateFormat: "DD/MM/YYYY",
    regulations: "ArbSchG (Gefahrdungsbeurteilung)",
    regulationMessageKey: "settings.deRegulations",
    riskAssessmentCatalog: "US",
  },
  FR: {
    code: "FR",
    name: "France",
    flag: "🇫🇷",
    currency: "EUR",
    defaultLocale: "fr",
    timezone: "Europe/Paris",
    dateFormat: "DD/MM/YYYY",
    regulations: "Code du travail (DUERP)",
    regulationMessageKey: "settings.frRegulations",
    riskAssessmentCatalog: "US",
  },
  ES: {
    code: "ES",
    name: "Spain",
    flag: "🇪🇸",
    currency: "EUR",
    defaultLocale: "es",
    timezone: "Europe/Madrid",
    dateFormat: "DD/MM/YYYY",
    regulations: "Ley 31/1995 (PRL)",
    regulationMessageKey: "settings.esRegulations",
    riskAssessmentCatalog: "US",
  },
};

export const COUNTRY_OPTIONS = Object.values(COUNTRY_CONFIGS);

function isCountry(value: string): value is Country {
  return value in COUNTRY_CONFIGS;
}

export function getCountryConfig(country?: Country | string): CountryConfig {
  if (country && isCountry(country)) {
    return COUNTRY_CONFIGS[country];
  }
  return COUNTRY_CONFIGS.US;
}

export function resolveRiskAssessmentCatalogCountry(
  companyCountry?: Country | string,
  localeCountry?: string,
): RiskAssessmentCatalogCountry {
  if (companyCountry && isCountry(companyCountry)) {
    return COUNTRY_CONFIGS[companyCountry].riskAssessmentCatalog;
  }
  if (localeCountry && isCountry(localeCountry)) {
    return COUNTRY_CONFIGS[localeCountry].riskAssessmentCatalog;
  }
  return "US";
}
