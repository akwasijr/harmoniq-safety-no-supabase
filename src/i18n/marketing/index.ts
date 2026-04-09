import en from "./en.json";
import sv from "./sv.json";
import nl from "./nl.json";
import de from "./de.json";
import fr from "./fr.json";
import es from "./es.json";

export type MarketingLocale = "en" | "sv" | "nl" | "de" | "fr" | "es";

const translations: Record<MarketingLocale, Record<string, unknown>> = { en, sv, nl, de, fr, es };

/**
 * Get a nested translation value by dot-path, e.g. "hero.title"
 */
function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path; // fallback: return the key itself
    }
  }
  return typeof current === "string" ? current : path;
}

/**
 * Returns a translation function for the given locale.
 * Usage: const t = getMarketingTranslations("sv"); t("hero.title")
 */
export function getMarketingTranslations(locale: MarketingLocale) {
  const dict = (translations[locale] || translations.en) as Record<string, unknown>;
  const fallback = translations.en as Record<string, unknown>;
  return (key: string, replacements?: Record<string, string>) => {
    let value = getNestedValue(dict, key);
    // Fall back to English if key not found in current locale
    if (value === key) value = getNestedValue(fallback, key);
    if (replacements) {
      for (const [k, v] of Object.entries(replacements)) {
        value = value.replace(`{${k}}`, v);
      }
    }
    return value;
  };
}

/**
 * Detect marketing locale from Accept-Language header.
 * Maps: sv* → sv, nl* → nl, everything else → en
 */
export function detectLocaleFromHeader(acceptLanguage: string | null): MarketingLocale {
  if (!acceptLanguage) return "en";
  const lower = acceptLanguage.toLowerCase();
  // Check primary language preferences in order
  const langs = lower.split(",").map((l) => l.split(";")[0].trim());
  for (const lang of langs) {
    if (lang.startsWith("sv")) return "sv";
    if (lang.startsWith("nl")) return "nl";
    if (lang.startsWith("de")) return "de";
    if (lang.startsWith("fr")) return "fr";
    if (lang.startsWith("es")) return "es";
  }
  return "en";
}
