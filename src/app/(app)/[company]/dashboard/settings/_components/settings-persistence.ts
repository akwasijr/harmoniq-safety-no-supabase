import {
  normalizeFieldAppSettings,
  type FieldAppSettings,
} from "@/lib/field-app-settings";
import type { IndustryCode } from "@/types";

import type { SettingsState } from "./settings-types";

type StoredSettings = Partial<SettingsState> & {
  fieldApp?: Partial<FieldAppSettings>;
};

export function mergeStoredSettings(
  baseSettings: SettingsState,
  storedSettings: StoredSettings | null | undefined,
  companyIndustry?: IndustryCode,
): SettingsState {
  if (!storedSettings) {
    return baseSettings;
  }

  const merged: SettingsState = {
    ...baseSettings,
    ...storedSettings,
    companyName: baseSettings.companyName,
    appName: baseSettings.appName,
    selectedCountry: baseSettings.selectedCountry,
    selectedIndustry: baseSettings.selectedIndustry,
    language: baseSettings.language,
    currency: baseSettings.currency,
    primaryColor: baseSettings.primaryColor,
    secondaryColor: baseSettings.secondaryColor,
    logoUrl: baseSettings.logoUrl,
    fieldApp: normalizeFieldAppSettings(
      storedSettings.fieldApp ?? baseSettings.fieldApp,
      (baseSettings.selectedIndustry || companyIndustry) as
        | IndustryCode
        | undefined,
    ),
  };

  return merged;
}
