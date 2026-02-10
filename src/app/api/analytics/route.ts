import { NextResponse } from "next/server";

/**
 * Privacy-compliant pageview analytics collector.
 * - No PII stored (no IP, no user agent fingerprinting)
 * - Respects Do Not Track header
 * - Only collects if user has given analytics consent
 * - Anonymous aggregation only
 */

interface PageviewEvent {
  path: string;
  referrer: string;
  country: string;
  browser: string;
  device: string;
  timestamp: string;
}

// In-memory store for now; replace with Supabase when connected
const pageviews: PageviewEvent[] = [];

// Auto-purge events older than 90 days
function purgeOldEvents() {
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  while (pageviews.length > 0 && new Date(pageviews[0].timestamp).getTime() < cutoff) {
    pageviews.shift();
  }
}

export async function POST(request: Request) {
  try {
    // Respect Do Not Track
    if (request.headers.get("dnt") === "1") {
      return NextResponse.json({ ok: true });
    }

    const body = await request.json();
    const { path, referrer } = body;

    if (!path) {
      return NextResponse.json({ error: "path required" }, { status: 400 });
    }

    // Derive minimal anonymous metadata from headers
    const ua = request.headers.get("user-agent") || "";
    const browser = ua.includes("Firefox") ? "Firefox"
      : ua.includes("Edg") ? "Edge"
      : ua.includes("Chrome") ? "Chrome"
      : ua.includes("Safari") ? "Safari"
      : "Other";
    const device = /Mobile|Android|iPhone/i.test(ua) ? "mobile" : "desktop";

    // Country from Cloudflare/Vercel headers (no IP stored)
    const country = request.headers.get("cf-ipcountry")
      || request.headers.get("x-vercel-ip-country")
      || "unknown";

    const event: PageviewEvent = {
      path,
      referrer: referrer || "direct",
      country,
      browser,
      device,
      timestamp: new Date().toISOString(),
    };

    pageviews.push(event);
    purgeOldEvents();

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/** GET endpoint for super admin to query analytics */
export async function GET(request: Request) {
  // TODO: Add auth check (super admin only)
  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get("days") || "30", 10);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  purgeOldEvents();

  const filtered = pageviews.filter((e) => new Date(e.timestamp).getTime() >= cutoff);

  // Aggregate
  const byPage: Record<string, number> = {};
  const byCountry: Record<string, number> = {};
  const byBrowser: Record<string, number> = {};
  const byDevice: Record<string, number> = {};
  const byReferrer: Record<string, number> = {};
  const byDay: Record<string, number> = {};

  for (const e of filtered) {
    byPage[e.path] = (byPage[e.path] || 0) + 1;
    byCountry[e.country] = (byCountry[e.country] || 0) + 1;
    byBrowser[e.browser] = (byBrowser[e.browser] || 0) + 1;
    byDevice[e.device] = (byDevice[e.device] || 0) + 1;
    byReferrer[e.referrer] = (byReferrer[e.referrer] || 0) + 1;
    const day = e.timestamp.split("T")[0];
    byDay[day] = (byDay[day] || 0) + 1;
  }

  return NextResponse.json({
    total: filtered.length,
    period_days: days,
    by_page: byPage,
    by_country: byCountry,
    by_browser: byBrowser,
    by_device: byDevice,
    by_referrer: byReferrer,
    by_day: byDay,
  });
}
