import { describe, expect, it } from "vitest";
import {
  FIELD_APP_FONT_OPTIONS,
  FIELD_APP_MIN_QUICK_ACTIONS,
  buildDefaultFieldAppSettings,
  getFieldAppTip,
  normalizeFieldAppSettings,
} from "@/lib/field-app-settings";

describe("field app settings", () => {
  it("builds industry-aware defaults", () => {
    const healthcareSettings = buildDefaultFieldAppSettings("healthcare");

    expect(healthcareSettings.quickActions).toEqual([
      "my_tasks",
      "report_incident",
      "checklists",
      "risk_check",
      "news",
      "browse_assets",
    ]);
  });

  it("keeps at least the minimum quick actions and removes news when disabled", () => {
    const normalized = normalizeFieldAppSettings(
      {
        newsEnabled: false,
        quickActions: ["news", "my_tasks", "report_incident"],
      },
      "construction"
    );

    expect(normalized.newsEnabled).toBe(false);
    expect(normalized.quickActions).not.toContain("news");
    expect(normalized.quickActions).toHaveLength(FIELD_APP_MIN_QUICK_ACTIONS);
  });

  it("returns localized industry tips", () => {
    const dutchTip = getFieldAppTip("warehousing", "nl", 3);
    const englishTip = getFieldAppTip("warehousing", "en", 3);

    expect(dutchTip).not.toEqual(englishTip);
    expect(dutchTip.length).toBeGreaterThan(10);
  });

  it("offers only curated open-source font options", () => {
    expect(FIELD_APP_FONT_OPTIONS.map((option) => option.value)).toEqual([
      "geist",
      "inter",
      "ibm_plex_sans",
      "manrope",
      "plus_jakarta_sans",
      "public_sans",
      "source_sans_3",
      "work_sans",
    ]);
  });
});
