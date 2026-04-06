import { describe, it, expect } from "vitest";
import {
  stripHtml,
  truncate,
  sanitizeText,
  isValidEmail,
  validatePassword,
  isValidUUID,
  isValidRole,
  validateUUIDArray,
} from "@/lib/validation";

describe("stripHtml", () => {
  it("removes HTML tags", () => {
    expect(stripHtml("<b>hello</b>")).toBe("hello");
  });
  it("removes nested tags", () => {
    expect(stripHtml("<div><p>text</p></div>")).toBe("text");
  });
  it("trims whitespace", () => {
    expect(stripHtml("  hello  ")).toBe("hello");
  });
  it("handles empty string", () => {
    expect(stripHtml("")).toBe("");
  });
  it("strips script tags", () => {
    expect(stripHtml('<script>alert("xss")</script>safe')).toBe('alert("xss")safe');
  });
});

describe("truncate", () => {
  it("returns string unchanged if within limit", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });
  it("truncates string exceeding limit", () => {
    expect(truncate("hello world", 5)).toBe("hello");
  });
  it("returns empty string unchanged", () => {
    expect(truncate("", 5)).toBe("");
  });
  it("handles exact length", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });
});

describe("sanitizeText", () => {
  it("strips HTML and trims", () => {
    expect(sanitizeText("<b>hello</b>")).toBe("hello");
  });
  it("truncates to max length", () => {
    expect(sanitizeText("abcdefghij", 5)).toBe("abcde");
  });
  it("returns empty string for non-string input", () => {
    expect(sanitizeText(123)).toBe("");
    expect(sanitizeText(null)).toBe("");
    expect(sanitizeText(undefined)).toBe("");
  });
  it("uses default max length of 255", () => {
    const long = "a".repeat(300);
    expect(sanitizeText(long)).toHaveLength(255);
  });
});

describe("isValidEmail", () => {
  it("accepts valid emails", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("user.name+tag@domain.co")).toBe(true);
  });
  it("rejects invalid emails", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("noatsign")).toBe(false);
    expect(isValidEmail("@nodomain.com")).toBe(false);
    expect(isValidEmail("user@")).toBe(false);
  });
  it("rejects emails over 254 chars", () => {
    const longEmail = "a".repeat(243) + "@example.com"; // 255 chars
    expect(isValidEmail(longEmail)).toBe(false);
  });
});

describe("validatePassword", () => {
  it("accepts a strong password", () => {
    expect(validatePassword("StrongPass123")).toEqual({ valid: true });
  });
  it("rejects short passwords", () => {
    const result = validatePassword("Short1Aa");
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/12 characters/);
  });
  it("rejects passwords without uppercase", () => {
    const result = validatePassword("alllowercase123");
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/uppercase/);
  });
  it("rejects passwords without lowercase", () => {
    const result = validatePassword("ALLUPPERCASE123");
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/lowercase/);
  });
  it("rejects passwords without digits", () => {
    const result = validatePassword("NoDigitsHereABC");
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/number/);
  });
  it("rejects passwords over 128 chars", () => {
    const result = validatePassword("Aa1" + "x".repeat(126));
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/128/);
  });
  it("rejects non-string input", () => {
    expect(validatePassword(null as unknown as string).valid).toBe(false);
  });
});

describe("isValidUUID", () => {
  it("accepts valid UUIDs", () => {
    expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isValidUUID("d0000000-0000-0000-0000-000000000001")).toBe(true);
    expect(isValidUUID("550e8400-e29b-31d4-a716-446655440000")).toBe(true); // v3
  });
  it("rejects invalid UUIDs", () => {
    expect(isValidUUID("not-a-uuid")).toBe(false);
    expect(isValidUUID("")).toBe(false);
    expect(isValidUUID("550e8400-e29b-41d4-a716")).toBe(false); // too short
  });
});

describe("isValidRole", () => {
  it("accepts default roles", () => {
    expect(isValidRole("worker")).toBe(true);
    expect(isValidRole("supervisor")).toBe(true);
    expect(isValidRole("company_admin")).toBe(true);
    expect(isValidRole("super_admin")).toBe(true);
  });
  it("rejects unknown roles", () => {
    expect(isValidRole("hacker")).toBe(false);
    expect(isValidRole("")).toBe(false);
  });
  it("accepts custom allowed roles", () => {
    expect(isValidRole("custom", ["custom", "other"])).toBe(true);
  });
});

describe("validateUUIDArray", () => {
  it("accepts valid UUID arrays", () => {
    const ids = ["550e8400-e29b-41d4-a716-446655440000"];
    expect(validateUUIDArray(ids)).toEqual(ids);
  });
  it("returns null for non-arrays", () => {
    expect(validateUUIDArray("not-array")).toBeNull();
    expect(validateUUIDArray(123)).toBeNull();
  });
  it("returns null if any UUID is invalid", () => {
    expect(validateUUIDArray(["valid-nope"])).toBeNull();
  });
  it("returns null for arrays exceeding 50 items", () => {
    const arr = Array.from({ length: 51 }, (_, i) =>
      `550e8400-e29b-41d4-a716-${String(i).padStart(12, "0")}`
    );
    expect(validateUUIDArray(arr)).toBeNull();
  });
  it("accepts empty array", () => {
    expect(validateUUIDArray([])).toEqual([]);
  });
});
