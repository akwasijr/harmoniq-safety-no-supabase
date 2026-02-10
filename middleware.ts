import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware for:
 * 1. Server-side route protection (auth cookie check)
 * 2. Geo-based locale detection for marketing pages
 */

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/", "/login", "/signup", "/forgot-password", "/contact", "/privacy", "/terms"];

// Marketing routes that get locale detection
const MARKETING_ROUTES = ["/", "/contact", "/privacy", "/terms"];

// Static asset prefixes to skip
const STATIC_PREFIXES = ["/_next", "/favicon", "/logo", "/screen-", "/bg-", "/icons", "/api"];

/**
 * Detect locale from Accept-Language header.
 * sv* → sv, nl* → nl, everything else → en
 */
function detectLocale(acceptLanguage: string | null): string {
  if (!acceptLanguage) return "en";
  const langs = acceptLanguage.toLowerCase().split(",").map((l) => l.split(";")[0].trim());
  for (const lang of langs) {
    if (lang.startsWith("sv")) return "sv";
    if (lang.startsWith("nl")) return "nl";
  }
  return "en";
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets
  if (STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Marketing pages: set locale cookie if not already set
  if (MARKETING_ROUTES.includes(pathname)) {
    const response = NextResponse.next();
    if (!request.cookies.get("harmoniq_locale")) {
      const locale = detectLocale(request.headers.get("accept-language"));
      response.cookies.set("harmoniq_locale", locale, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
    }
    return response;
  }

  // Other public routes (login, signup, etc.) — no auth needed
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // Protected routes: check auth cookie
  const authCookie = request.cookies.get("harmoniq_auth");
  if (!authCookie?.value) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
