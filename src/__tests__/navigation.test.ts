import { describe, it, expect } from "vitest";
import {
  normalizeCompanySlug,
  buildCompanyDestination,
  buildPlatformAnalyticsDestination,
  sanitizeRelativePath,
} from "@/lib/navigation";

describe("normalizeCompanySlug", () => {
  it("returns a valid slug unchanged", () => {
    expect(normalizeCompanySlug("acme")).toBe("acme");
    expect(normalizeCompanySlug("acme-corp")).toBe("acme-corp");
  });
  it("lowercases the slug", () => {
    expect(normalizeCompanySlug("ACME")).toBe("acme");
  });
  it("trims whitespace", () => {
    expect(normalizeCompanySlug("  acme  ")).toBe("acme");
  });
  it("returns fallback for null/undefined/empty", () => {
    expect(normalizeCompanySlug(null)).toBe("harmoniq");
    expect(normalizeCompanySlug(undefined)).toBe("harmoniq");
    expect(normalizeCompanySlug("")).toBe("harmoniq");
  });
  it("returns fallback for invalid slugs", () => {
    expect(normalizeCompanySlug("has spaces")).toBe("harmoniq");
    expect(normalizeCompanySlug("special!chars")).toBe("harmoniq");
    expect(normalizeCompanySlug("-leading-dash")).toBe("harmoniq");
  });
  it("uses custom fallback", () => {
    expect(normalizeCompanySlug("", "default-co")).toBe("default-co");
  });
});

describe("buildCompanyDestination", () => {
  it("builds app path for app choice", () => {
    expect(buildCompanyDestination("acme", "app")).toBe("/acme/app");
  });
  it("builds dashboard path for dashboard choice", () => {
    expect(buildCompanyDestination("acme", "dashboard")).toBe("/acme/dashboard");
  });
  it("normalizes invalid slug to fallback", () => {
    expect(buildCompanyDestination(null, "app")).toBe("/harmoniq/app");
  });
});

describe("buildPlatformAnalyticsDestination", () => {
  it("builds the platform analytics path", () => {
    expect(buildPlatformAnalyticsDestination("acme")).toBe(
      "/acme/dashboard/platform/analytics"
    );
  });
  it("normalizes invalid slug", () => {
    expect(buildPlatformAnalyticsDestination(null)).toBe(
      "/harmoniq/dashboard/platform/analytics"
    );
  });
});

describe("sanitizeRelativePath", () => {
  it("returns valid relative paths unchanged", () => {
    expect(sanitizeRelativePath("/dashboard")).toBe("/dashboard");
    expect(sanitizeRelativePath("/acme/app/incidents")).toBe("/acme/app/incidents");
  });
  it("rejects null/undefined", () => {
    expect(sanitizeRelativePath(null)).toBe("/");
    expect(sanitizeRelativePath(undefined)).toBe("/");
  });
  it("rejects paths not starting with /", () => {
    expect(sanitizeRelativePath("dashboard")).toBe("/");
    expect(sanitizeRelativePath("")).toBe("/");
  });
  it("rejects protocol-relative URLs (//)", () => {
    expect(sanitizeRelativePath("//evil.com")).toBe("/");
  });
  it("rejects paths with protocol", () => {
    expect(sanitizeRelativePath("/redir?to=http://evil.com")).toBe("/");
  });
  it("rejects paths with backslashes", () => {
    expect(sanitizeRelativePath("/path\\evil")).toBe("/");
  });
  it("rejects paths with null bytes", () => {
    expect(sanitizeRelativePath("/path\0evil")).toBe("/");
  });
  it("uses custom fallback", () => {
    expect(sanitizeRelativePath(null, "/home")).toBe("/home");
  });
});
