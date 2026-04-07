import { buildSiteUrl } from "@/lib/site-url";
import { sanitizeText } from "@/lib/validation";

export interface PlatformPrivacySettings {
  cookieConsent: boolean;
  rightToErasure: boolean;
  dataExport: boolean;
  anonymizeIp: boolean;
  retentionDays: number;
  dpoEmail: string;
  privacyUrl: string;
  cookieUrl: string;
}

export const PLATFORM_PRIVACY_SETTINGS_KEY = "public_privacy_settings";

export const DEFAULT_PLATFORM_PRIVACY_SETTINGS: PlatformPrivacySettings = {
  cookieConsent: true,
  rightToErasure: true,
  dataExport: true,
  anonymizeIp: true,
  retentionDays: 365,
  dpoEmail: "privacy@harmoniq.safety",
  privacyUrl: buildSiteUrl("/privacy"),
  cookieUrl: buildSiteUrl("/cookies"),
};

function sanitizeUrl(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return fallback;
    }
    return parsed.toString();
  } catch {
    return fallback;
  }
}

export function normalizePlatformPrivacySettings(input: unknown): PlatformPrivacySettings {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  return {
    cookieConsent: raw.cookieConsent !== false,
    rightToErasure: raw.rightToErasure !== false,
    dataExport: raw.dataExport !== false,
    anonymizeIp: true,
    retentionDays: Math.min(
      Math.max(
        typeof raw.retentionDays === "number"
          ? Math.round(raw.retentionDays)
          : Number.parseInt(String(raw.retentionDays ?? DEFAULT_PLATFORM_PRIVACY_SETTINGS.retentionDays), 10)
            || DEFAULT_PLATFORM_PRIVACY_SETTINGS.retentionDays,
        30
      ),
      3650
    ),
    dpoEmail:
      sanitizeText(
        typeof raw.dpoEmail === "string" ? raw.dpoEmail : DEFAULT_PLATFORM_PRIVACY_SETTINGS.dpoEmail,
        160
      ) || DEFAULT_PLATFORM_PRIVACY_SETTINGS.dpoEmail,
    privacyUrl: sanitizeUrl(raw.privacyUrl, DEFAULT_PLATFORM_PRIVACY_SETTINGS.privacyUrl),
    cookieUrl: sanitizeUrl(raw.cookieUrl, DEFAULT_PLATFORM_PRIVACY_SETTINGS.cookieUrl),
  };
}
