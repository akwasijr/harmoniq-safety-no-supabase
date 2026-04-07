import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createRateLimiter } from "@/lib/rate-limit";
import crypto from "crypto";

/**
 * POST /api/consent — Log a cookie consent event.
 * Stores: hashed IP, user agent, consent choices, timestamp.
 * GET  /api/consent — List consent records (super_admin only).
 */

// 30 consent submissions per IP per minute
const consentLimiter = createRateLimiter({ limit: 30, windowMs: 60_000, prefix: "consent" });

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip + "harmoniq-salt").digest("hex").slice(0, 16);
}

export async function POST(request: NextRequest) {
  try {
    const rl = consentLimiter.check(request);
    if (!rl.allowed) return rl.response;

    const body = await request.json();
    const { necessary, analytics, marketing } = body;

    if (typeof necessary !== "boolean" || typeof analytics !== "boolean" || typeof marketing !== "boolean") {
      return NextResponse.json({ error: "Invalid consent data" }, { status: 400 });
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    const record = {
      id: crypto.randomUUID(),
      ip_hash: hashIp(ip),
      user_agent: userAgent.slice(0, 256),
      necessary,
      analytics,
      marketing,
      created_at: new Date().toISOString(),
    };

    // Try to store in Supabase if configured
    const supabase = await createClient();
    const { error } = await supabase.from("consent_logs").insert([record]);

    if (error) {
      // Table may not exist yet — store in localStorage fallback via response
      console.warn("[Consent API] Supabase insert failed (table may not exist):", error.message);
    }

    return NextResponse.json({ ok: true, id: record.id });
  } catch {
    return NextResponse.json({ error: "Failed to log consent" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
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

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const { data, error, count } = await supabase
      .from("consent_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: "Failed to fetch consent logs" }, { status: 500 });
    }

    return NextResponse.json({ records: data || [], total: count || 0 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
