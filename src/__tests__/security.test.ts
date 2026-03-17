import { describe, it, expect } from "vitest";
import { sanitizeRelativePath, normalizeCompanySlug } from "@/lib/navigation";

// Security-focused tests for path traversal and open redirect prevention

describe("sanitizeRelativePath — security vectors", () => {
  it("blocks javascript: protocol", () => {
    expect(sanitizeRelativePath("javascript:alert(1)")).toBe("/");
  });

  it("blocks data: protocol", () => {
    expect(sanitizeRelativePath("data:text/html,<h1>hi</h1>")).toBe("/");
  });

  it("blocks protocol-relative with backslash", () => {
    expect(sanitizeRelativePath("/\\evil.com")).toBe("/");
  });

  it("allows deeply nested valid paths", () => {
    expect(sanitizeRelativePath("/a/b/c/d/e/f")).toBe("/a/b/c/d/e/f");
  });

  it("allows paths with query params", () => {
    expect(sanitizeRelativePath("/dashboard?tab=users")).toBe("/dashboard?tab=users");
  });

  it("allows paths with hash fragments", () => {
    expect(sanitizeRelativePath("/docs#section-1")).toBe("/docs#section-1");
  });

  it("blocks encoded protocol in path", () => {
    // Contains ://
    expect(sanitizeRelativePath("/redirect?url=https://evil.com")).toBe("/");
  });
});

describe("normalizeCompanySlug — injection prevention", () => {
  it("rejects SQL injection attempts", () => {
    expect(normalizeCompanySlug("'; DROP TABLE companies;--")).toBe("harmoniq");
  });

  it("rejects path traversal", () => {
    expect(normalizeCompanySlug("../../../etc/passwd")).toBe("harmoniq");
  });

  it("rejects URL-encoded characters", () => {
    expect(normalizeCompanySlug("%2F%2Fevil.com")).toBe("harmoniq");
  });

  it("accepts valid multi-segment slugs", () => {
    expect(normalizeCompanySlug("acme-corp-2024")).toBe("acme-corp-2024");
  });

  it("rejects slugs with trailing dash", () => {
    expect(normalizeCompanySlug("acme-")).toBe("harmoniq");
  });

  it("rejects slugs with consecutive dashes", () => {
    expect(normalizeCompanySlug("acme--corp")).toBe("harmoniq");
  });
});
