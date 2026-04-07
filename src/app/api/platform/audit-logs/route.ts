import { NextRequest, NextResponse } from "next/server";
import { sanitizeText } from "@/lib/validation";
import { createClient } from "@/lib/supabase/server";
import { createRateLimiter } from "@/lib/rate-limit";

const auditLogsLimiter = createRateLimiter({ limit: 20, windowMs: 60_000, prefix: "audit-logs" });

function withNoStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

async function getAdminProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, role, company_id")
    .eq("id", user.id)
    .maybeSingle();

  return { supabase, user, profile };
}

export async function GET(request: NextRequest) {
  const rl = auditLogsLimiter.check(request);
  if (!rl.allowed) return rl.response;

  const { supabase, user, profile } = await getAdminProfile();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!profile || !["super_admin", "company_admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = request.nextUrl.searchParams.get("userId");
  const limit = Math.min(
    Math.max(Number.parseInt(request.nextUrl.searchParams.get("limit") ?? "20", 10) || 20, 1),
    100,
  );

  let query = supabase
    .from("audit_logs")
    .select("id, user_id, action, resource, details, ip_address, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (profile.role !== "super_admin") {
    query = query.eq("company_id", profile.company_id);
  }

  if (userId) {
    query = query.eq("user_id", sanitizeText(userId, 36));
  }

  const { data, error } = await query;
  if (error) {
    return withNoStore(
      NextResponse.json({ error: "Failed to load audit logs", details: error.message }, { status: 500 }),
    );
  }

  return withNoStore(NextResponse.json({ logs: data ?? [] }));
}

export async function POST(request: NextRequest) {
  const rl = auditLogsLimiter.check(request);
  if (!rl.allowed) return rl.response;

  const { supabase, user, profile } = await getAdminProfile();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!profile || !["super_admin", "company_admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const action = sanitizeText(body.action, 120);
  const resource = sanitizeText(body.resource, 120);

  if (!action || !resource) {
    return NextResponse.json({ error: "Action and resource are required" }, { status: 400 });
  }

  const requestedCompanyId =
    typeof body.companyId === "string" ? sanitizeText(body.companyId, 36) : null;
  const details =
    body.details && typeof body.details === "object" && !Array.isArray(body.details) ? body.details : {};
  const companyId =
    profile.role === "super_admin" ? requestedCompanyId ?? profile.company_id : profile.company_id;
  const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const { error } = await supabase.from("audit_logs").insert({
    company_id: companyId,
    user_id: user.id,
    action,
    resource,
    details,
    ip_address: ipAddress,
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to write audit log", details: error.message },
      { status: 500 },
    );
  }

  return withNoStore(NextResponse.json({ ok: true }));
}
