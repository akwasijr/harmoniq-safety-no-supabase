/**
 * Middleware unit tests
 *
 * Tests the exported helper functions and core routing logic
 * by importing directly from middleware.ts.
 */
import { describe, it, expect } from "vitest";
import {
  detectLocale,
  getCompanySlugFromPath,
  getAllowedPlatformRoles,
  isStaticAsset,
  isPublicRoute,
  isMarketingRoute,
  isPublicApiRoute,
  checkCsrf,
} from "../../middleware";

// ---------------------------------------------------------------------------
// Helper function tests (imported from middleware.ts)
// ---------------------------------------------------------------------------

describe("detectLocale", () => {
  it("returns 'en' when no Accept-Language header", () => {
    expect(detectLocale(null)).toBe("en");
  });

  it("returns 'en' for empty string", () => {
    expect(detectLocale("")).toBe("en");
  });

  it("detects Swedish", () => {
    expect(detectLocale("sv-SE,sv;q=0.9,en;q=0.8")).toBe("sv");
  });

  it("detects Dutch", () => {
    expect(detectLocale("nl-NL,nl;q=0.9,en;q=0.8")).toBe("nl");
  });

  it("returns 'en' for English header", () => {
    expect(detectLocale("en-US,en;q=0.9")).toBe("en");
  });

  it("returns 'en' for unsupported languages", () => {
    expect(detectLocale("fr-FR,de-DE;q=0.9")).toBe("en");
  });

  it("handles mixed case", () => {
    expect(detectLocale("SV-SE,en;q=0.8")).toBe("sv");
  });

  it("picks first matching supported language", () => {
    // nl before sv in the list
    expect(detectLocale("nl,sv;q=0.8,en;q=0.7")).toBe("nl");
  });

  it("picks sv when it comes first", () => {
    expect(detectLocale("sv,nl;q=0.8,en;q=0.7")).toBe("sv");
  });
});

describe("getCompanySlugFromPath", () => {
  it("extracts company slug from dashboard path", () => {
    expect(getCompanySlugFromPath("/acme-corp/dashboard")).toBe("acme-corp");
  });

  it("extracts slug from deep paths", () => {
    expect(getCompanySlugFromPath("/my-company/dashboard/platform/analytics")).toBe("my-company");
  });

  it("returns null for root path", () => {
    expect(getCompanySlugFromPath("/")).toBe(null);
  });

  it("handles single segment", () => {
    expect(getCompanySlugFromPath("/login")).toBe("login");
  });
});

describe("getAllowedPlatformRoles", () => {
  it("returns only super_admin for platform admin routes", () => {
    const roles = getAllowedPlatformRoles("/acme/dashboard/platform/users");
    expect(roles).toEqual(["super_admin"]);
  });

  it("returns only super_admin for analytics routes", () => {
    const roles = getAllowedPlatformRoles("/acme/dashboard/platform/analytics");
    expect(roles).toEqual(["super_admin"]);
  });

  it("returns only super_admin for platform root", () => {
    const roles = getAllowedPlatformRoles("/acme/dashboard/platform");
    expect(roles).toEqual(["super_admin"]);
  });
});

// ---------------------------------------------------------------------------
// Route classification tests
// ---------------------------------------------------------------------------

describe("route classification", () => {
  describe("static assets", () => {
    it("matches _next paths", () => {
      expect(isStaticAsset("/_next/static/chunks/main.js")).toBe(true);
    });
    it("matches favicon", () => {
      expect(isStaticAsset("/favicon.ico")).toBe(true);
    });
    it("matches manifest", () => {
      expect(isStaticAsset("/manifest.json")).toBe(true);
    });
    it("matches icons", () => {
      expect(isStaticAsset("/icons/icon-192.png")).toBe(true);
    });
    it("matches sw", () => {
      expect(isStaticAsset("/sw.js")).toBe(true);
    });
    it("does not match regular pages", () => {
      expect(isStaticAsset("/login")).toBe(false);
    });
  });

  describe("public routes", () => {
    it("includes login", () => {
      expect(isPublicRoute("/login")).toBe(true);
    });
    it("includes signup", () => {
      expect(isPublicRoute("/signup")).toBe(true);
    });
    it("includes auth callback", () => {
      expect(isPublicRoute("/auth/callback")).toBe(true);
    });
    it("excludes dashboard paths", () => {
      expect(isPublicRoute("/acme/dashboard")).toBe(false);
    });
    it("excludes API paths", () => {
      expect(isPublicRoute("/api/incidents")).toBe(false);
    });
  });

  describe("marketing routes", () => {
    it("includes root", () => {
      expect(isMarketingRoute("/")).toBe(true);
    });
    it("includes contact", () => {
      expect(isMarketingRoute("/contact")).toBe(true);
    });
    it("includes all legal pages", () => {
      expect(isMarketingRoute("/privacy")).toBe(true);
      expect(isMarketingRoute("/terms")).toBe(true);
      expect(isMarketingRoute("/gdpr")).toBe(true);
      expect(isMarketingRoute("/cookies")).toBe(true);
    });
    it("excludes login", () => {
      expect(isMarketingRoute("/login")).toBe(false);
    });
  });

  describe("public API routes", () => {
    it("matches analytics", () => {
      expect(isPublicApiRoute("/api/analytics")).toBe(true);
    });
    it("matches analytics sub-paths", () => {
      expect(isPublicApiRoute("/api/analytics/events")).toBe(true);
    });
    it("matches health", () => {
      expect(isPublicApiRoute("/api/health")).toBe(true);
    });
    it("excludes protected API routes", () => {
      expect(isPublicApiRoute("/api/incidents")).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// CSRF protection logic
// ---------------------------------------------------------------------------

describe("CSRF protection logic", () => {
  it("allows GET requests", () => {
    expect(checkCsrf("GET", null, null, null, null)).toBe("pass");
  });

  it("allows HEAD requests", () => {
    expect(checkCsrf("HEAD", null, null, null, null)).toBe("pass");
  });

  it("allows POST with matching origin", () => {
    expect(
      checkCsrf("POST", "https://example.com", null, "example.com", null)
    ).toBe("pass");
  });

  it("allows POST with matching referer (no origin)", () => {
    expect(
      checkCsrf("POST", null, "https://example.com/page", "example.com", null)
    ).toBe("pass");
  });

  it("blocks POST with mismatched origin", () => {
    expect(
      checkCsrf("POST", "https://evil.com", null, "example.com", null)
    ).toBe("block-origin-mismatch");
  });

  it("blocks PUT with mismatched referer", () => {
    expect(
      checkCsrf("PUT", null, "https://evil.com/form", "example.com", null)
    ).toBe("block-origin-mismatch");
  });

  it("blocks DELETE with no origin and no sec-fetch-site", () => {
    expect(
      checkCsrf("DELETE", null, null, "example.com", null)
    ).toBe("block-missing-origin");
  });

  it("allows POST with same-origin sec-fetch-site (no origin header)", () => {
    expect(
      checkCsrf("POST", null, null, "example.com", "same-origin")
    ).toBe("pass");
  });

  it("blocks POST with cross-site sec-fetch-site (no origin header)", () => {
    expect(
      checkCsrf("POST", null, null, "example.com", "cross-site")
    ).toBe("block-missing-origin");
  });

  it("blocks PATCH with invalid origin URL", () => {
    expect(
      checkCsrf("PATCH", "not-a-url", null, "example.com", null)
    ).toBe("block-invalid-origin");
  });

  it("allows POST when origin matches but has port", () => {
    expect(
      checkCsrf("POST", "http://localhost:3000", null, "localhost:3000", null)
    ).toBe("pass");
  });

  it("blocks POST when ports differ", () => {
    expect(
      checkCsrf("POST", "http://localhost:3000", null, "localhost:4000", null)
    ).toBe("block-origin-mismatch");
  });
});

// ---------------------------------------------------------------------------
// Mock mode logic
// ---------------------------------------------------------------------------

describe("mock mode determination", () => {
  it("requires explicit env var to enable mock mode", () => {
    // The middleware uses: process.env.NEXT_PUBLIC_ENABLE_MOCK_MODE === "true" && !process.env.NEXT_PUBLIC_SUPABASE_URL
    const mockModeEnabled = (enableMock: string | undefined, supabaseUrl: string | undefined) =>
      enableMock === "true" && !supabaseUrl;

    expect(mockModeEnabled("true", undefined)).toBe(true);
    expect(mockModeEnabled("true", "")).toBe(true);
    expect(mockModeEnabled("true", "https://example.supabase.co")).toBe(false);
    expect(mockModeEnabled(undefined, undefined)).toBe(false);
    expect(mockModeEnabled("false", undefined)).toBe(false);
    expect(mockModeEnabled("1", undefined)).toBe(false);
  });
});
