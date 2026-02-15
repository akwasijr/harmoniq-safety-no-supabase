import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Simple in-memory rate limiter
const rateLimiter = new Map<string, { count: number; reset: number }>();
function checkRate(key: string, maxPerMinute: number): boolean {
  const now = Date.now();
  const entry = rateLimiter.get(key);
  if (!entry || now > entry.reset) {
    rateLimiter.set(key, { count: 1, reset: now + 60000 });
    return true;
  }
  if (entry.count >= maxPerMinute) return false;
  entry.count++;
  return true;
}

function getIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

interface PageviewEvent {
  path: string;
  referrer: string;
  country: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
  browser: string;
  device: string;
  ip_hash: string;
  timestamp: string;
}

const pageviews: PageviewEvent[] = [];

function purgeOldEvents() {
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  while (pageviews.length > 0 && new Date(pageviews[0].timestamp).getTime() < cutoff) {
    pageviews.shift();
  }
}

// Simple hash to anonymize IP
function hashIp(ip: string): string {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    hash = ((hash << 5) - hash + ip.charCodeAt(i)) | 0;
  }
  return `v${Math.abs(hash).toString(36)}`;
}

export async function POST(request: NextRequest) {
  try {
    if (request.headers.get("dnt") === "1") {
      return NextResponse.json({ ok: true });
    }

    // Rate limit: 30 requests per minute per IP
    const ip = getIp(request);
    if (!checkRate(`post:${ip}`, 30)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Origin check: only accept from same origin using strict URL parsing
    const origin = request.headers.get("origin") || "";
    const host = request.headers.get("host") || "";
    if (origin) {
      try {
        const originHost = new URL(origin).hostname;
        const isAllowed = originHost === host.split(":")[0] ||
          originHost === "localhost" ||
          originHost.endsWith(".vercel.app") ||
          originHost.endsWith(".harmoniq-safety.vercel.app");
        if (!isAllowed) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await request.json();
    const { path, referrer } = body;
    if (!path) return NextResponse.json({ error: "path required" }, { status: 400 });

    const ua = request.headers.get("user-agent") || "";
    const browser = ua.includes("Firefox") ? "Firefox"
      : ua.includes("Edg") ? "Edge"
      : ua.includes("Chrome") ? "Chrome"
      : ua.includes("Safari") ? "Safari"
      : "Other";
    const device = /Mobile|Android|iPhone/i.test(ua) ? "mobile" : "desktop";

    const country = request.headers.get("x-vercel-ip-country") || "unknown";
    const city = request.headers.get("x-vercel-ip-city");
    const lat = request.headers.get("x-vercel-ip-latitude");
    const lng = request.headers.get("x-vercel-ip-longitude");
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    pageviews.push({
      path,
      referrer: referrer || "direct",
      country,
      city: city ? decodeURIComponent(city) : null,
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      browser,
      device,
      ip_hash: hashIp(clientIp),
      timestamp: new Date().toISOString(),
    });

    if (pageviews.length > 10000) pageviews.splice(0, pageviews.length - 10000);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Auth check: only super_admin or company_admin can read analytics
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || !["super_admin", "company_admin"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } catch {
    // Fail-closed: if auth check fails, deny access
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const days = parseInt(request.nextUrl.searchParams.get("days") || "30", 10);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  purgeOldEvents();

  const filtered = pageviews.filter((e) => new Date(e.timestamp).getTime() >= cutoff);

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

  // Visitor locations for map (deduplicated by ip_hash)
  const seenHashes = new Set<string>();
  const locations: { lat: number; lng: number; city: string | null; country: string; count: number }[] = [];
  for (const e of filtered) {
    if (e.lat && e.lng && !seenHashes.has(e.ip_hash)) {
      seenHashes.add(e.ip_hash);
      const existing = locations.find(
        (l) => Math.abs(l.lat - e.lat!) < 0.05 && Math.abs(l.lng - e.lng!) < 0.05
      );
      if (existing) {
        existing.count++;
      } else {
        locations.push({ lat: e.lat, lng: e.lng, city: e.city, country: e.country, count: 1 });
      }
    }
  }

  return NextResponse.json({
    total: filtered.length,
    uniqueVisitors: seenHashes.size || new Set(filtered.map((e) => e.ip_hash)).size,
    period_days: days,
    by_page: byPage,
    by_country: byCountry,
    by_browser: byBrowser,
    by_device: byDevice,
    by_referrer: byReferrer,
    by_day: byDay,
    locations,
  });
}
