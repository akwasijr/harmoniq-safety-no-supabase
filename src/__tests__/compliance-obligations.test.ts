import { describe, it, expect } from "vitest";
import { getBuiltInObligations } from "@/data/compliance-obligations";

describe("Built-in Compliance Obligations", () => {
  const obligations = getBuiltInObligations();

  it("returns at least 20 obligations", () => {
    expect(obligations.length).toBeGreaterThanOrEqual(20);
  });

  it("all obligations have required fields", () => {
    for (const o of obligations) {
      expect(o.id).toBeTruthy();
      expect(o.title).toBeTruthy();
      expect(o.regulation).toBeTruthy();
      expect(o.company_id).toBe("__built_in__");
      expect(o.is_builtin).toBe(true);
      expect(["US", "NL", "SE", "GB", "DE", "FR", "ES"]).toContain(o.country);
    }
  });

  it("has unique IDs", () => {
    const ids = obligations.map(o => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("OSHA obligations are US-only", () => {
    const osha = obligations.filter(o => o.regulation.includes("OSHA"));
    expect(osha.length).toBeGreaterThan(0);
    for (const o of osha) {
      expect(o.country).toBe("US");
    }
  });

  it("Arbowet obligations are NL-only", () => {
    const arbowet = obligations.filter(o => o.regulation.includes("Arbowet"));
    for (const o of arbowet) {
      expect(o.country).toBe("NL");
    }
  });

  it("all have valid frequency", () => {
    const validFreqs = ["one_time", "daily", "weekly", "monthly", "quarterly", "annual", "custom"];
    for (const o of obligations) {
      expect(validFreqs).toContain(o.frequency);
    }
  });

  it("all have valid category", () => {
    const validCats = ["incident_reporting", "risk_assessment", "training", "inspection", "environmental", "general"];
    for (const o of obligations) {
      expect(validCats).toContain(o.category);
    }
  });

  it("all have a next_due_date set", () => {
    for (const o of obligations) {
      expect(o.next_due_date).toBeTruthy();
      expect(new Date(o.next_due_date).getTime()).toBeGreaterThan(0);
    }
  });

  it("covers all 7 countries", () => {
    const countries = new Set(obligations.map(o => o.country));
    expect(countries.size).toBe(7);
  });
});
