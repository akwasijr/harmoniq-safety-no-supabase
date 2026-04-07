import { describe, expect, it } from "vitest";

import { mergeStoredSettings } from "@/app/(app)/[company]/dashboard/settings/_components/settings-persistence";
import type { SettingsState } from "@/app/(app)/[company]/dashboard/settings/_components/settings-types";

const baseSettings: SettingsState = {
  companyName: "Harmoniq Safety",
  appName: "Harmoniq Safety",
  selectedCountry: "US",
  selectedIndustry: "construction",
  language: "en",
  currency: "USD",
  dateFormat: "MM/DD/YYYY",
  timezone: "America/New_York",
  measurementSystem: "imperial",
  primaryColor: "#7045d3",
  secondaryColor: "#525252",
  logoUrl: null,
  notifCriticalAlerts: true,
  notifDailyDigest: true,
  notifChecklistReminders: false,
  notifMaintenanceAlerts: true,
  notifNewIncidents: true,
  twoFactorEnabled: false,
  ssoEnabled: false,
  sessionTimeout: "30",
  passwordPolicy: "strong",
  fieldApp: {
    homeLayout: "cards",
    startScreen: "home",
    showQuickActions: true,
    quickActions: ["report-incident", "start-checklist", "scan-asset"],
    offlineMode: "sync-when-online",
    enablePhotoMarkup: true,
    showSafetyTipCard: true,
    safetyTipRotation: "daily",
    emphasizePrimaryAction: "report-incident",
  },
};

describe("mergeStoredSettings", () => {
  it("keeps server-backed branding fields from the latest company record", () => {
    const merged = mergeStoredSettings(baseSettings, {
      primaryColor: "#ff0000",
      secondaryColor: "#00ff00",
      companyName: "Old Name",
      logoUrl: "data:image/png;base64,old",
      notifChecklistReminders: true,
    });

    expect(merged.primaryColor).toBe("#7045d3");
    expect(merged.secondaryColor).toBe("#525252");
    expect(merged.companyName).toBe("Harmoniq Safety");
    expect(merged.logoUrl).toBeNull();
    expect(merged.notifChecklistReminders).toBe(true);
  });
});
