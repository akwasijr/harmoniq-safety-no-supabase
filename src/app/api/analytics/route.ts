import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";
import { sanitizeRelativePath } from "@/lib/navigation";
import { truncate } from "@/lib/validation";

// 30 analytics events per IP per minute (POST), 20 reads per IP per minute (GET)
const analyticsLimiter = createRateLimiter({ limit: 30, windowMs: 60_000, prefix: "analytics" });
const analyticsReadLimiter = createRateLimiter({ limit: 20, windowMs: 60_000, prefix: "analytics_read" });
const ANALYTICS_RETENTION_DAYS = 90;
const PAGEVIEW_MEMORY_LIMIT = 10000;
const ANALYTICS_PAGE_SIZE = 1000;

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
  const cutoff = Date.now() - ANALYTICS_RETENTION_DAYS * 24 * 60 * 60 * 1000;
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

function isAnalyticsOriginAllowed(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const originHost = new URL(origin).hostname.toLowerCase();
    const requestHost = (request.headers.get("host") || "").split(":")[0].toLowerCase();
    const forwardedHost = (request.headers.get("x-forwarded-host") || "").split(",")[0]?.trim().split(":")[0]?.toLowerCase();
    const configuredSiteHost = process.env.NEXT_PUBLIC_SITE_URL
      ? new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname.toLowerCase()
      : null;
    const allowedHosts = new Set([requestHost, forwardedHost, configuredSiteHost, "localhost", "127.0.0.1"].filter(Boolean));

    return allowedHosts.has(originHost);
  } catch {
    return false;
  }
}

function getBrowserName(userAgent: string): string {
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Edg")) return "Edge";
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Safari")) return "Safari";
  return "Other";
}

function safeDecode(value: string | null): string | null {
  if (!value) return null;

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getFirstHeader(request: NextRequest, names: string[]) {
  for (const name of names) {
    const value = request.headers.get(name);
    if (value) {
      return value;
    }
  }

  return null;
}

function normalizeEvent(request: NextRequest, body: unknown): PageviewEvent | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const payload = body as Record<string, unknown>;
  const rawPath = typeof payload.path === "string" ? payload.path : "";
  if (!rawPath) return null;

  const ua = request.headers.get("user-agent") || "";
  const clientIp = getClientIp(request);
  const latHeader = getFirstHeader(request, ["x-vercel-ip-latitude", "x-geo-latitude", "x-client-latitude"]);
  const lngHeader = getFirstHeader(request, ["x-vercel-ip-longitude", "x-geo-longitude", "x-client-longitude"]);
  const lat = latHeader ? Number.parseFloat(latHeader) : null;
  const lng = lngHeader ? Number.parseFloat(lngHeader) : null;

  return {
    path: sanitizeRelativePath(rawPath),
    referrer: typeof payload.referrer === "string" && payload.referrer
      ? truncate(payload.referrer, 512)
      : "direct",
    country: truncate(
      getFirstHeader(request, ["x-vercel-ip-country", "cf-ipcountry", "x-country-code"]) || "unknown",
      128
    ),
    city: safeDecode(getFirstHeader(request, ["x-vercel-ip-city", "x-geo-city", "x-client-city"])),
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    browser: getBrowserName(ua),
    device: /Mobile|Android|iPhone/i.test(ua) ? "mobile" : "desktop",
    ip_hash: hashIp(clientIp),
    timestamp: new Date().toISOString(),
  };
}

function storeFallbackEvent(event: PageviewEvent) {
  pageviews.push(event);
  if (pageviews.length > PAGEVIEW_MEMORY_LIMIT) {
    pageviews.splice(0, pageviews.length - PAGEVIEW_MEMORY_LIMIT);
  }
}

function rowToEvent(row: Record<string, unknown>, index: number): PageviewEvent | null {
  if (typeof row.path !== "string" || typeof row.created_at !== "string") {
    return null;
  }

  return {
    path: row.path,
    referrer: typeof row.referrer === "string" && row.referrer ? row.referrer : "direct",
    country: typeof row.country === "string" && row.country ? row.country : "unknown",
    city: typeof row.city === "string" ? row.city : null,
    lat: typeof row.lat === "number" && Number.isFinite(row.lat) ? row.lat : null,
    lng: typeof row.lng === "number" && Number.isFinite(row.lng) ? row.lng : null,
    browser: typeof row.browser === "string" && row.browser ? row.browser : "Other",
    device: typeof row.device === "string" && row.device ? row.device : "desktop",
    ip_hash: typeof row.ip_hash === "string" && row.ip_hash ? row.ip_hash : `legacy-${index}`,
    timestamp: row.created_at,
  };
}

async function insertPageview(event: PageviewEvent) {
  const supabase = await createClient();
  const extendedPayload = {
    path: event.path,
    referrer: event.referrer,
    country: event.country,
    city: event.city,
    lat: event.lat,
    lng: event.lng,
    browser: event.browser,
    device: event.device,
    ip_hash: event.ip_hash,
    created_at: event.timestamp,
  };

  const { error: extendedError } = await supabase.from("site_analytics").insert(extendedPayload);
  if (!extendedError) return;

  const { error: baseError } = await supabase.from("site_analytics").insert({
    path: event.path,
    referrer: event.referrer,
    country: event.country,
    browser: event.browser,
    device: event.device,
    created_at: event.timestamp,
  });

  if (baseError) {
    throw baseError;
  }
}

async function fetchPersistedPageviews(cutoffIso: string): Promise<PageviewEvent[]> {
  const supabase = await createClient();
  const selectExtended = "path, referrer, country, city, lat, lng, browser, device, ip_hash, created_at";
  const selectBase = "path, referrer, country, browser, device, created_at";
  const events: PageviewEvent[] = [];

  const fetchPages = async (columns: string) => {
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from("site_analytics")
        .select(columns)
        .gte("created_at", cutoffIso)
        .order("created_at", { ascending: true })
        .range(from, from + ANALYTICS_PAGE_SIZE - 1);

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        break;
      }

      for (const [index, row] of data.entries()) {
        if (!row || typeof row !== "object") {
          continue;
        }

        const event = rowToEvent(row as Record<string, unknown>, from + index);
        if (event) {
          events.push(event);
        }
      }

      if (data.length < ANALYTICS_PAGE_SIZE) {
        break;
      }

      from += ANALYTICS_PAGE_SIZE;
    }
  };

  try {
    await fetchPages(selectExtended);
  } catch {
    events.length = 0;
    await fetchPages(selectBase);
  }

  return events;
}

export async function POST(request: NextRequest) {
  try {
    if (request.headers.get("dnt") === "1") {
      return NextResponse.json({ ok: true });
    }

    // Rate limit: 30 requests per minute per IP
    const rl = analyticsLimiter.check(request);
    if (!rl.allowed) return rl.response;

    if (!isAnalyticsOriginAllowed(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const event = normalizeEvent(request, body);
    if (!event) {
      return NextResponse.json({ error: "path required" }, { status: 400 });
    }

    try {
      await insertPageview(event);
    } catch (insertError) {
      console.error("Analytics persistence failed, using memory fallback:", insertError);
      storeFallbackEvent(event);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Rate limit reads
  const rl = analyticsReadLimiter.check(request);
  if (!rl.allowed) return rl.response;

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
      .maybeSingle();
    if (!profile || !["super_admin", "company_admin"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } catch {
    // Fail-closed: if auth check fails, deny access
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestedDays = Number.parseInt(request.nextUrl.searchParams.get("days") || "30", 10);
  const days = Number.isFinite(requestedDays) ? Math.min(Math.max(requestedDays, 1), ANALYTICS_RETENTION_DAYS) : 30;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const cutoffIso = new Date(cutoff).toISOString();
  purgeOldEvents();

  let persisted: PageviewEvent[] = [];
  try {
    persisted = await fetchPersistedPageviews(cutoffIso);
  } catch (error) {
    console.error("Failed to load persisted analytics:", error);
  }

  const fallbackEvents = pageviews.filter((e) => new Date(e.timestamp).getTime() >= cutoff);
  const filtered = [...persisted, ...fallbackEvents];

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
    if (e.lat !== null && e.lng !== null && !seenHashes.has(e.ip_hash)) {
      const { lat, lng } = e;
      seenHashes.add(e.ip_hash);
      const existing = locations.find(
        (l) => Math.abs(l.lat - lat) < 0.05 && Math.abs(l.lng - lng) < 0.05
      );
      if (existing) {
        existing.count++;
      } else {
        locations.push({ lat, lng, city: e.city, country: e.country, count: 1 });
      }
    }
  }

  return NextResponse.json({
    total: filtered.length,
    uniqueVisitors: new Set(filtered.map((e) => e.ip_hash)).size,
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
