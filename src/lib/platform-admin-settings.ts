import { COUNTRY_OPTIONS } from "@/lib/country-config";
import { sanitizeText } from "@/lib/validation";

export interface PlatformAdminSettings {
  platformName: string;
  supportEmail: string;
  supportUrl: string;
  retentionYears: number;
  superAdminSessionHours: number;
  adminSessionHours: number;
  employeeSessionDays: number;
  emailProvider: string;
  fromName: string;
  fromEmail: string;
  newCompanyNotification: boolean;
  incidentAlertNotification: boolean;
  weeklyDigest: boolean;
  securityAlerts: boolean;
  requireSuperAdmin2fa: boolean;
  requireAdmin2fa: boolean;
  trialDurationDays: number;
  maxTrialSeats: number;
  allowSelfSignup: boolean;
  maintenanceMode: boolean;
  enabledCountries: string[];
  defaultCurrency: string;
}

export const PLATFORM_ADMIN_SETTINGS_KEY = "platform_admin_settings";

const SUPPORTED_COUNTRY_CODES = new Set<string>(COUNTRY_OPTIONS.map((country) => country.code));

export const DEFAULT_PLATFORM_ADMIN_SETTINGS: PlatformAdminSettings = {
  platformName: "Harmoniq Safety",
  supportEmail: "support@harmoniq.io",
  supportUrl: "https://support.harmoniq.io",
  retentionYears: 5,
  superAdminSessionHours: 8,
  adminSessionHours: 24,
  employeeSessionDays: 7,
  emailProvider: "Resend",
  fromName: "Harmoniq Safety",
  fromEmail: "noreply@harmoniq.io",
  newCompanyNotification: true,
  incidentAlertNotification: true,
  weeklyDigest: true,
  securityAlerts: true,
  requireSuperAdmin2fa: true,
  requireAdmin2fa: true,
  trialDurationDays: 60,
  maxTrialSeats: 5,
  allowSelfSignup: false,
  maintenanceMode: false,
  enabledCountries: COUNTRY_OPTIONS.map((country) => country.code),
  defaultCurrency: "USD",
};

function clampInteger(value: unknown, fallback: number, min: number, max: number) {
  const parsed =
    typeof value === "number"
      ? Math.round(value)
      : Number.parseInt(String(value ?? fallback), 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, min), max);
}

function normalizeCurrency(value: unknown) {
  const sanitized = sanitizeText(typeof value === "string" ? value.toUpperCase() : "", 3);
  return /^[A-Z]{3}$/.test(sanitized) ? sanitized : DEFAULT_PLATFORM_ADMIN_SETTINGS.defaultCurrency;
}

function normalizeUrl(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  try {
    const parsed = new URL(trimmed);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return fallback;
    }
    return parsed.toString();
  } catch {
    return fallback;
  }
}

export function normalizePlatformAdminSettings(input: unknown): PlatformAdminSettings {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  const enabledCountries = Array.isArray(raw.enabledCountries)
    ? raw.enabledCountries
        .map((value) => sanitizeText(String(value).toUpperCase(), 2))
        .filter((value) => SUPPORTED_COUNTRY_CODES.has(value))
    : DEFAULT_PLATFORM_ADMIN_SETTINGS.enabledCountries;

  return {
    platformName:
      sanitizeText(String(raw.platformName ?? DEFAULT_PLATFORM_ADMIN_SETTINGS.platformName), 120) ||
      DEFAULT_PLATFORM_ADMIN_SETTINGS.platformName,
    supportEmail:
      sanitizeText(String(raw.supportEmail ?? DEFAULT_PLATFORM_ADMIN_SETTINGS.supportEmail), 160) ||
      DEFAULT_PLATFORM_ADMIN_SETTINGS.supportEmail,
    supportUrl: normalizeUrl(raw.supportUrl, DEFAULT_PLATFORM_ADMIN_SETTINGS.supportUrl),
    retentionYears: clampInteger(raw.retentionYears, DEFAULT_PLATFORM_ADMIN_SETTINGS.retentionYears, 1, 10),
    superAdminSessionHours: clampInteger(
      raw.superAdminSessionHours,
      DEFAULT_PLATFORM_ADMIN_SETTINGS.superAdminSessionHours,
      1,
      24,
    ),
    adminSessionHours: clampInteger(
      raw.adminSessionHours,
      DEFAULT_PLATFORM_ADMIN_SETTINGS.adminSessionHours,
      1,
      72,
    ),
    employeeSessionDays: clampInteger(
      raw.employeeSessionDays,
      DEFAULT_PLATFORM_ADMIN_SETTINGS.employeeSessionDays,
      1,
      30,
    ),
    emailProvider:
      sanitizeText(String(raw.emailProvider ?? DEFAULT_PLATFORM_ADMIN_SETTINGS.emailProvider), 80) ||
      DEFAULT_PLATFORM_ADMIN_SETTINGS.emailProvider,
    fromName:
      sanitizeText(String(raw.fromName ?? DEFAULT_PLATFORM_ADMIN_SETTINGS.fromName), 120) ||
      DEFAULT_PLATFORM_ADMIN_SETTINGS.fromName,
    fromEmail:
      sanitizeText(String(raw.fromEmail ?? DEFAULT_PLATFORM_ADMIN_SETTINGS.fromEmail), 160) ||
      DEFAULT_PLATFORM_ADMIN_SETTINGS.fromEmail,
    newCompanyNotification: raw.newCompanyNotification !== false,
    incidentAlertNotification: raw.incidentAlertNotification !== false,
    weeklyDigest: raw.weeklyDigest !== false,
    securityAlerts: raw.securityAlerts !== false,
    requireSuperAdmin2fa: raw.requireSuperAdmin2fa !== false,
    requireAdmin2fa: raw.requireAdmin2fa !== false,
    trialDurationDays: clampInteger(
      raw.trialDurationDays,
      DEFAULT_PLATFORM_ADMIN_SETTINGS.trialDurationDays,
      1,
      365,
    ),
    maxTrialSeats: clampInteger(raw.maxTrialSeats, DEFAULT_PLATFORM_ADMIN_SETTINGS.maxTrialSeats, 1, 500),
    allowSelfSignup: raw.allowSelfSignup === true,
    maintenanceMode: raw.maintenanceMode === true,
    enabledCountries:
      enabledCountries.length > 0 ? enabledCountries : DEFAULT_PLATFORM_ADMIN_SETTINGS.enabledCountries,
    defaultCurrency: normalizeCurrency(raw.defaultCurrency),
  };
}
