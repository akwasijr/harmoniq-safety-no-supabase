import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { sanitizeRelativePath } from "@/lib/navigation";
import type { UserRole } from "@/types";

const MOCK_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL;

/**
 * Middleware for:
 * 1. CSRF protection — verify Origin header on state-changing requests
 * 2. Server-side route protection (Supabase session)
 * 3. Geo-based locale detection for marketing pages
 */

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/admin",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/contact",
  "/privacy",
  "/terms",
  "/gdpr",
  "/cookies",
  "/invite",
  "/auth/callback",
  "/robots.txt",
  "/sitemap.xml",
];
const MARKETING_ROUTES = ["/", "/contact", "/privacy", "/terms", "/gdpr", "/cookies"];
const STATIC_PREFIXES = ["/_next", "/favicon", "/logo", "/screen-", "/bg-", "/icons", "/manifest", "/sw"];
const PUBLIC_API_ROUTES = ["/api/analytics", "/api/contact", "/api/health", "/api/setup"];
const ADMIN_ENTRY_COOKIE = "harmoniq_admin_entry";
const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const SAME_SITE_FETCH_CONTEXTS = new Set(["same-origin", "same-site", "none"]);
const PLATFORM_ROUTE_SEGMENT = "/dashboard/platform";
const PLATFORM_ANALYTICS_SEGMENT = "/dashboard/platform/analytics";
const PLATFORM_ADMIN_ROLES: readonly UserRole[] = ["super_admin"];
const PLATFORM_ANALYTICS_ROLES: readonly UserRole[] = ["super_admin", "company_admin"];

function detectLocale(acceptLanguage: string | null): string {
  if (!acceptLanguage) return "en";
  const langs = acceptLanguage.toLowerCase().split(",").map((l) => l.split(";")[0].trim());
  for (const lang of langs) {
    if (lang.startsWith("sv")) return "sv";
    if (lang.startsWith("nl")) return "nl";
  }
  return "en";
}

function copyResponseCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });
  return target;
}

function redirectWithSession(url: URL, source: NextResponse) {
  return copyResponseCookies(source, NextResponse.redirect(url));
}

function getCompanySlugFromPath(pathname: string) {
  return pathname.split("/").filter(Boolean)[0] ?? null;
}

function getAllowedPlatformRoles(pathname: string): readonly UserRole[] {
  return pathname.includes(PLATFORM_ANALYTICS_SEGMENT)
    ? PLATFORM_ANALYTICS_ROLES
    : PLATFORM_ADMIN_ROLES;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isSecure = request.nextUrl.protocol === "https:";
  const isPlatformPath = pathname.includes(PLATFORM_ROUTE_SEGMENT);

  // Skip static assets
  if (STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // CSRF protection: verify Origin header on state-changing requests
  if (STATE_CHANGING_METHODS.has(request.method)) {
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    const host = request.headers.get("host");
    const source = origin ?? referer;
    const fetchSite = request.headers.get("sec-fetch-site");

    if (!source) {
      if (!fetchSite || !SAME_SITE_FETCH_CONTEXTS.has(fetchSite)) {
        return NextResponse.json({ error: "Forbidden — missing origin context" }, { status: 403 });
      }
    } else if (host) {
      try {
        const originHost = new URL(source).host;
        if (originHost !== host) {
          return NextResponse.json({ error: "Forbidden — origin mismatch" }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: "Forbidden — invalid origin" }, { status: 403 });
      }
    }
  }

  // Only clear admin-entry cookie on explicit auth page visits (login / signup).
  // This allows super admins to switch between platform and company views without
  // losing their admin session. The cookie still expires naturally after 60 min.
  const isAuthResetPath = pathname === "/login" || pathname === "/signup";
  if (isAuthResetPath && request.cookies.get(ADMIN_ENTRY_COOKIE)) {
    const response = NextResponse.next();
    response.cookies.set(ADMIN_ENTRY_COOKIE, "", {
      path: "/",
      maxAge: 0,
      sameSite: "lax",
      secure: isSecure,
    });
    return response;
  }

  // Marketing pages: set locale cookie
  if (MARKETING_ROUTES.includes(pathname)) {
    const response = NextResponse.next();
    if (!request.cookies.get("harmoniq_locale")) {
      const locale = detectLocale(request.headers.get("accept-language"));
      response.cookies.set("harmoniq_locale", locale, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
        secure: isSecure,
      });
    }
    return response;
  }

  // Other public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // Public API routes (analytics POST, contact) — handle auth internally
  if (PUBLIC_API_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Platform admin routes require explicit admin entry flag (set by /admin login)
  if (isPlatformPath && !request.cookies.get(ADMIN_ENTRY_COOKIE)) {
    const adminUrl = new URL("/admin", request.url);
    adminUrl.searchParams.set("redirect", sanitizeRelativePath(pathname));
    return NextResponse.redirect(adminUrl);
  }

  // In mock mode (no Supabase), skip server-side auth — client handles it via localStorage
  if (MOCK_MODE) {
    return NextResponse.next();
  }

  // Protected routes: check Supabase auth
  const { updateSession } = await import("@/lib/supabase/middleware");
  const { user, profile, supabaseResponse } = await updateSession(request);

  if (!user) {
    // API routes return 401 instead of redirect
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", sanitizeRelativePath(pathname));
    return redirectWithSession(loginUrl, supabaseResponse);
  }

  if (isPlatformPath) {
    const allowedRoles = getAllowedPlatformRoles(pathname);
    if (!profile?.role || !allowedRoles.includes(profile.role)) {
      const companySlug = getCompanySlugFromPath(pathname);
      const fallbackPath =
        profile?.role === "company_admin" && companySlug
          ? `/${companySlug}/dashboard/platform/analytics`
          : companySlug
            ? `/${companySlug}/dashboard`
            : "/login";
      const fallbackUrl = new URL(sanitizeRelativePath(fallbackPath), request.url);
      return redirectWithSession(fallbackUrl, supabaseResponse);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
