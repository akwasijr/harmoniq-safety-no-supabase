import type { LucideIcon } from "lucide-react";

import type { FieldAppSettings } from "@/lib/field-app-settings";
import type { MeasurementSystem } from "@/lib/company-settings";
import type { Currency } from "@/types";

export type SettingsTabType =
  | "general"
  | "modules"
  | "branding"
  | "fieldApp"
  | "notifications"
  | "security"
  | "billing";

export interface SettingsState {
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

export interface SettingsTabConfig {
  value: SettingsTabType;
  label: string;
  icon: LucideIcon;
}

export interface SettingsCopyProps {
  t: (key: string) => string;
}

export interface UpdateSettingProps {
  updateSetting: <K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K],
  ) => void;
}
