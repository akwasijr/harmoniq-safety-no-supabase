import { describe, expect, it } from "vitest";
import { resolveRiskAssessmentCatalogCountry } from "@/lib/country-config";

describe("resolveRiskAssessmentCatalogCountry", () => {
  it("prefers the company country when available", () => {
    expect(resolveRiskAssessmentCatalogCountry("NL", "US")).toBe("NL");
    expect(resolveRiskAssessmentCatalogCountry("SE", "NL")).toBe("SE");
  });

  it("falls back to the locale country when company country is missing", () => {
    expect(resolveRiskAssessmentCatalogCountry(undefined, "NL")).toBe("NL");
    expect(resolveRiskAssessmentCatalogCountry("", "SE")).toBe("SE");
  });

  it("defaults to US when neither country is usable", () => {
    expect(resolveRiskAssessmentCatalogCountry(undefined, undefined)).toBe("US");
    expect(resolveRiskAssessmentCatalogCountry("unknown", "unknown")).toBe("US");
  });
});
