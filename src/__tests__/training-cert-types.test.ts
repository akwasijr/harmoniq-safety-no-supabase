import { describe, it, expect } from "vitest";
import { getBuiltInCertTypes } from "@/data/training-cert-types";

describe("Built-in Certification Types", () => {
  const types = getBuiltInCertTypes();

  it("returns at least 20 certification types", () => {
    expect(types.length).toBeGreaterThanOrEqual(20);
  });

  it("all types have required fields", () => {
    for (const t of types) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.company_id).toBe("__built_in__");
      expect(t.is_builtin).toBe(true);
      expect(["safety", "equipment", "regulatory", "general"]).toContain(t.category);
    }
  });

  it("has unique IDs", () => {
    const ids = types.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("OSHA types are US-only", () => {
    const oshaTypes = types.filter(t => t.name.includes("OSHA") || t.regulation_ref?.includes("OSHA"));
    expect(oshaTypes.length).toBeGreaterThan(0);
    for (const t of oshaTypes) {
      expect(t.country_specific).toBe("US");
    }
  });

  it("has universal types (country_specific: null)", () => {
    const universal = types.filter(t => t.country_specific === null);
    expect(universal.length).toBeGreaterThan(3);
    expect(universal.some(t => t.name.includes("First Aid"))).toBe(true);
  });

  it("NL types reference Arbowet", () => {
    const nlTypes = types.filter(t => t.country_specific === "NL");
    expect(nlTypes.length).toBeGreaterThan(0);
    expect(nlTypes.some(t => t.name.includes("VCA") || t.name.includes("BHV"))).toBe(true);
  });

  it("SE types exist", () => {
    const seTypes = types.filter(t => t.country_specific === "SE");
    expect(seTypes.length).toBeGreaterThan(0);
  });

  it("validity days are reasonable", () => {
    for (const t of types) {
      if (t.default_validity_days !== null) {
        expect(t.default_validity_days).toBeGreaterThan(0);
        expect(t.default_validity_days).toBeLessThanOrEqual(3650); // max 10 years
      }
    }
  });
});
