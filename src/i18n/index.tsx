"use client";

import * as React from "react";

// Import translation files statically
import en from "./messages/en.json";
import nl from "./messages/nl.json";
import sv from "./messages/sv.json";
import de from "./messages/de.json";
import fr from "./messages/fr.json";
import es from "./messages/es.json";

// ---------- Types ----------

export type SupportedLocale = "en" | "nl" | "sv" | "de" | "fr" | "es";

export interface LocaleConfig {
  code: SupportedLocale;
  name: string;           // Native name (e.g. "Nederlands")
  englishName: string;     // English name (e.g. "Dutch")
  flag: string;            // Emoji flag
  dateLocale: string;      // Intl locale string
  numberLocale: string;
  direction: "ltr" | "rtl";
}

/** Flat map of dot-paths → translated strings */
type Messages = Record<string, string>;

// ---------- Locale registry ----------

export const LOCALE_CONFIGS: Record<SupportedLocale, LocaleConfig> = {
  en: {
    code: "en",
    name: "English",
    englishName: "English",
    flag: "🇺🇸",
    dateLocale: "en-US",
    numberLocale: "en-US",
    direction: "ltr",
  },
  nl: {
    code: "nl",
    name: "Nederlands",
    englishName: "Dutch",
    flag: "🇳🇱",
    dateLocale: "nl-NL",
    numberLocale: "nl-NL",
    direction: "ltr",
  },
  sv: {
    code: "sv",
    name: "Svenska",
    englishName: "Swedish",
    flag: "🇸🇪",
    dateLocale: "sv-SE",
    numberLocale: "sv-SE",
    direction: "ltr",
  },
  de: {
    code: "de",
    name: "Deutsch",
    englishName: "German",
    flag: "🇩🇪",
    dateLocale: "de-DE",
    numberLocale: "de-DE",
    direction: "ltr",
  },
  fr: {
    code: "fr",
    name: "Français",
    englishName: "French",
    flag: "🇫🇷",
    dateLocale: "fr-FR",
    numberLocale: "fr-FR",
    direction: "ltr",
  },
  es: {
    code: "es",
    name: "Español",
    englishName: "Spanish",
    flag: "🇪🇸",
    dateLocale: "es-ES",
    numberLocale: "es-ES",
    direction: "ltr",
  },
};

export const SUPPORTED_LOCALES = Object.values(LOCALE_CONFIGS);

// Country → default locale mapping
export const COUNTRY_DEFAULT_LOCALE: Record<string, SupportedLocale> = {
  US: "en",
  NL: "nl",
  SE: "sv",
  GB: "en",
  DE: "de",
  FR: "fr",
  ES: "es",
};

// Locale → primary country mapping (inverse of above, picks first match)
export const LOCALE_DEFAULT_COUNTRY: Record<SupportedLocale, string> = {
  en: "US",
  nl: "NL",
  sv: "SE",
  de: "DE",
  fr: "FR",
  es: "ES",
};

// ---------- Flatten helper ----------

function flattenMessages(obj: Record<string, unknown>, prefix = ""): Messages {
  const result: Messages = {};
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (typeof value === "string") {
      result[fullKey] = value;
    } else if (typeof value === "object" && value !== null) {
      Object.assign(result, flattenMessages(value as Record<string, unknown>, fullKey));
    }
  }
  return result;
}

// Pre-flatten all message bundles
const MESSAGE_BUNDLES: Record<SupportedLocale, Messages> = {
  en: flattenMessages(en as unknown as Record<string, unknown>),
  nl: flattenMessages(nl as unknown as Record<string, unknown>),
  sv: flattenMessages(sv as unknown as Record<string, unknown>),
  de: flattenMessages(de as unknown as Record<string, unknown>),
  fr: flattenMessages(fr as unknown as Record<string, unknown>),
  es: flattenMessages(es as unknown as Record<string, unknown>),
};

// ---------- Context ----------

interface I18nContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  config: LocaleConfig;
  formatDate: (date: string | Date, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (value: number, currency: string) => string;
}

const I18nContext = React.createContext<I18nContextValue | null>(null);

// ---------- Provider ----------

const STORAGE_KEY = "harmoniq_locale";

function getStoredLocale(): SupportedLocale | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored && stored in MESSAGE_BUNDLES ? (stored as SupportedLocale) : null;
}

function getInitialLocale(companyLocale?: SupportedLocale): SupportedLocale {
  // Priority: localStorage user preference > company default > "en"
  return getStoredLocale() ?? companyLocale ?? "en";
}

export function I18nProvider({
  children,
  companyLocale,
}: {
  children: React.ReactNode;
  companyLocale?: SupportedLocale;
}) {
  const [locale, setLocaleState] = React.useState<SupportedLocale>(() =>
    getInitialLocale(companyLocale)
  );

  const setLocale = React.useCallback((newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, newLocale);
      document.documentElement.lang = newLocale;
      document.documentElement.setAttribute("data-language", newLocale);
    }
  }, []);

  React.useEffect(() => {
    const storedLocale = getStoredLocale();
    if (storedLocale) {
      setLocaleState((prev) => (prev === storedLocale ? prev : storedLocale));
      return;
    }

    const nextLocale = companyLocale ?? "en";
    setLocaleState((prev) => (prev === nextLocale ? prev : nextLocale));
  }, [companyLocale]);

  // Sync HTML lang on mount
  React.useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.setAttribute("data-language", locale);
  }, [locale]);

  const config = LOCALE_CONFIGS[locale];
  const messages = MESSAGE_BUNDLES[locale];
  const fallback = MESSAGE_BUNDLES.en;

  const t = React.useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let text = messages[key] ?? fallback[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }
      return text;
    },
    [messages, fallback]
  );

  const formatDate = React.useCallback(
    (date: string | Date, options?: Intl.DateTimeFormatOptions): string => {
      const d = typeof date === "string" ? new Date(date) : date;
      return new Intl.DateTimeFormat(config.dateLocale, options ?? {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(d);
    },
    [config.dateLocale]
  );

  const formatNumber = React.useCallback(
    (value: number, options?: Intl.NumberFormatOptions): string => {
      return new Intl.NumberFormat(config.numberLocale, options).format(value);
    },
    [config.numberLocale]
  );

  const formatCurrency = React.useCallback(
    (value: number, currency: string): string => {
      return new Intl.NumberFormat(config.numberLocale, {
        style: "currency",
        currency,
      }).format(value);
    },
    [config.numberLocale]
  );

  const value = React.useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t, config, formatDate, formatNumber, formatCurrency }),
    [locale, setLocale, t, config, formatDate, formatNumber, formatCurrency]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// ---------- Hook ----------

export function useTranslation() {
  const context = React.useContext(I18nContext);
  if (!context) {
    throw new Error("useTranslation must be used within I18nProvider");
  }
  return context;
}
