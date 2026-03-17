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

// Extended validation tests for edge cases and security

describe("sanitizeText — XSS vectors", () => {
  it("strips event handler attributes", () => {
    const result = sanitizeText('<img onerror="alert(1)" src=x>');
    expect(result).not.toContain("onerror");
    expect(result).not.toContain("<img");
  });

  it("strips nested script injection", () => {
    const result = sanitizeText('<scr<script>ipt>alert(1)</scr</script>ipt>');
    expect(result).not.toContain("<script");
  });

  it("handles encoded HTML entities as plain text", () => {
    const result = sanitizeText("&lt;script&gt;");
    expect(result).toBe("&lt;script&gt;");
  });
});

describe("isValidEmail — edge cases", () => {
  it("allows double dots (RFC 5322 compliant)", () => {
    // The current regex follows RFC 5322 simplified which allows consecutive dots
    expect(isValidEmail("user..name@example.com")).toBe(true);
  });

  it("accepts plus addressing", () => {
    expect(isValidEmail("user+tag@example.com")).toBe(true);
  });

  it("accepts subdomains", () => {
    expect(isValidEmail("user@sub.domain.example.com")).toBe(true);
  });
});

describe("validatePassword — boundary conditions", () => {
  it("accepts exactly 12 character password", () => {
    expect(validatePassword("Abcdefghij1k").valid).toBe(true);
  });

  it("accepts exactly 128 character password", () => {
    const pw = "Aa1" + "x".repeat(125);
    expect(validatePassword(pw).valid).toBe(true);
  });

  it("rejects 11 character password", () => {
    expect(validatePassword("Abcdefghi1k").valid).toBe(false);
  });
});

describe("isValidUUID — format strictness", () => {
  it("rejects UUID v1", () => {
    expect(isValidUUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")).toBe(false);
  });

  it("accepts uppercase UUID v4", () => {
    expect(isValidUUID("550E8400-E29B-41D4-A716-446655440000")).toBe(true);
  });

  it("rejects truncated UUID", () => {
    expect(isValidUUID("550e8400-e29b-41d4-a716")).toBe(false);
  });
});

describe("validateUUIDArray — security limits", () => {
  it("accepts exactly 50 items", () => {
    const arr = Array.from({ length: 50 }, (_, i) =>
      `550e8400-e29b-41d4-a716-${String(i).padStart(12, "0")}`
    );
    expect(validateUUIDArray(arr)).not.toBeNull();
    expect(validateUUIDArray(arr)).toHaveLength(50);
  });

  it("rejects mixed valid/invalid UUIDs", () => {
    expect(validateUUIDArray([
      "550e8400-e29b-41d4-a716-446655440000",
      "not-a-uuid",
    ])).toBeNull();
  });
});
