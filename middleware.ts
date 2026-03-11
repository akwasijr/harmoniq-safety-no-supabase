import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { sanitizeRelativePath } from "@/lib/navigation";

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

function detectLocale(acceptLanguage: string | null): string {
  if (!acceptLanguage) return "en";
  const langs = acceptLanguage.toLowerCase().split(",").map((l) => l.split(";")[0].trim());
  for (const lang of langs) {
    if (lang.startsWith("sv")) return "sv";
    if (lang.startsWith("nl")) return "nl";
  }
  return "en";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isSecure = request.nextUrl.protocol === "https:";

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

  // If an admin-entry cookie is present but the user is not on an admin path, clear it.
  // This prevents the super-admin portal from appearing after using the regular login flow.
  const isAdminPath = pathname.startsWith("/admin") || pathname.includes("/dashboard/platform");
  if (!isAdminPath && request.cookies.get(ADMIN_ENTRY_COOKIE)) {
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
  if (pathname.includes("/dashboard/platform") && !request.cookies.get(ADMIN_ENTRY_COOKIE)) {
    const adminUrl = new URL("/admin", request.url);
    adminUrl.searchParams.set("redirect", sanitizeRelativePath(pathname));
    return NextResponse.redirect(adminUrl);
  }

  // Protected routes: check Supabase auth
  const { updateSession } = await import("@/lib/supabase/middleware");
  const { user, supabaseResponse } = await updateSession(request);

  if (!user) {
    // API routes return 401 instead of redirect
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", sanitizeRelativePath(pathname));
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
