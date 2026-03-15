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
    expect(stripHtml("<b>bold</b>")).toBe("bold");
    expect(stripHtml('<a href="x">link</a>')).toBe("link");
  });

  it("handles nested tags", () => {
    expect(stripHtml("<div><p>text</p></div>")).toBe("text");
  });

  it("trims whitespace", () => {
    expect(stripHtml("  hello  ")).toBe("hello");
  });

  it("returns empty for empty string", () => {
    expect(stripHtml("")).toBe("");
  });
});

describe("truncate", () => {
  it("leaves short strings unchanged", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("truncates long strings", () => {
    expect(truncate("hello world", 5)).toBe("hello");
  });

  it("handles exact length", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });
});

describe("sanitizeText", () => {
  it("strips HTML and trims", () => {
    expect(sanitizeText("<b>test</b>")).toBe("test");
  });

  it("enforces max length", () => {
    expect(sanitizeText("a".repeat(300), 100)).toBe("a".repeat(100));
  });

  it("returns empty string for non-string input", () => {
    expect(sanitizeText(123)).toBe("");
    expect(sanitizeText(null)).toBe("");
    expect(sanitizeText(undefined)).toBe("");
  });
});

describe("isValidEmail", () => {
  it("accepts valid emails", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("test.user+tag@company.co.uk")).toBe(true);
  });

  it("rejects invalid emails", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("@no-local.com")).toBe(false);
    expect(isValidEmail("no-domain@")).toBe(false);
  });

  it("rejects emails over 254 chars", () => {
    const longEmail = "a".repeat(246) + "@test.com"; // 255 chars total
    expect(isValidEmail(longEmail)).toBe(false);
  });
});

describe("validatePassword", () => {
  it("accepts valid passwords", () => {
    expect(validatePassword("MyPassword123")).toEqual({ valid: true });
    expect(validatePassword("Str0ngP@ssword!")).toEqual({ valid: true });
  });

  it("rejects short passwords", () => {
    const result = validatePassword("Short1Aa");
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("12 characters");
  });

  it("rejects passwords without lowercase", () => {
    const result = validatePassword("ALLUPPERCASE123");
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("lowercase");
  });

  it("rejects passwords without uppercase", () => {
    const result = validatePassword("alllowercase123");
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("uppercase");
  });

  it("rejects passwords without numbers", () => {
    const result = validatePassword("NoNumbersHere!");
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("number");
  });

  it("rejects non-string input", () => {
    expect(validatePassword(null as unknown as string).valid).toBe(false);
  });

  it("rejects passwords over 128 chars", () => {
    const result = validatePassword("Aa1" + "x".repeat(130));
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("128");
  });
});

describe("isValidUUID", () => {
  it("accepts valid v4 UUIDs", () => {
    expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isValidUUID("d0000000-0000-4000-a000-000000000001")).toBe(true);
  });

  it("rejects invalid UUIDs", () => {
    expect(isValidUUID("not-a-uuid")).toBe(false);
    expect(isValidUUID("")).toBe(false);
    expect(isValidUUID("550e8400-e29b-31d4-a716-446655440000")).toBe(false); // v3, not v4
  });
});

describe("isValidRole", () => {
  it("accepts valid roles", () => {
    expect(isValidRole("company_admin")).toBe(true);
    expect(isValidRole("super_admin")).toBe(true);
  });

  it("rejects invalid roles", () => {
    expect(isValidRole("hacker")).toBe(false);
    expect(isValidRole("")).toBe(false);
  });

  it("uses custom allowed list", () => {
    expect(isValidRole("custom", ["custom", "other"])).toBe(true);
    expect(isValidRole("worker", ["custom"])).toBe(false);
  });
});

describe("validateUUIDArray", () => {
  it("accepts valid UUID arrays", () => {
    const result = validateUUIDArray([
      "550e8400-e29b-41d4-a716-446655440000",
      "d0000000-0000-4000-a000-000000000001",
    ]);
    expect(result).toHaveLength(2);
  });

  it("accepts empty arrays", () => {
    expect(validateUUIDArray([])).toEqual([]);
  });

  it("rejects non-array input", () => {
    expect(validateUUIDArray("not-array")).toBeNull();
    expect(validateUUIDArray(null)).toBeNull();
  });

  it("rejects arrays with invalid UUIDs", () => {
    expect(validateUUIDArray(["not-a-uuid"])).toBeNull();
  });

  it("rejects arrays over 50 items", () => {
    const arr = Array.from({ length: 51 }, (_, i) =>
      `550e8400-e29b-41d4-a716-${String(i).padStart(12, "0")}`
    );
    expect(validateUUIDArray(arr)).toBeNull();
  });
});
