import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/rate-limit";
import { sanitizeText, isValidUUID } from "@/lib/validation";

const incidentLimiter = createRateLimiter({ limit: 20, windowMs: 60_000, prefix: "incidents" });
const incidentGetLimiter = createRateLimiter({ limit: 100, windowMs: 60_000, prefix: "incidents-get" });

async function getAuthenticatedUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("id, role, company_id")
    .eq("id", user.id)
    .single();

  return profile;
}

export async function GET(request: NextRequest) {
  try {
    const rl = incidentGetLimiter.check(request);
    if (!rl.allowed) return rl.response;

    const supabase = await createClient();
    const profile = await getAuthenticatedUser(supabase);

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const companyId = searchParams.get("company_id") || profile.company_id;

    // Non-super-admins can only access their own company
    if (profile.role !== "super_admin" && companyId !== profile.company_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let query = supabase
      .from("incidents")
      .select("id, company_id, reference_number, reporter_id, type, type_other, severity, priority, title, description, incident_date, incident_time, lost_time, lost_time_amount, active_hazard, location_id, building, floor, zone, room, gps_lat, gps_lng, location_description, asset_id, media_urls, status, flagged, resolved_at, resolved_by, resolution_notes, assigned_to, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    const { data: incidents, error } = await query;

    if (error) {
      console.error("[Incidents API] List error:", error);
      return NextResponse.json({ error: "Failed to fetch incidents" }, { status: 500 });
    }

    return NextResponse.json({ incidents: incidents || [] });
  } catch (err) {
    console.error("[Incidents API] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = incidentLimiter.check(request);
    if (!rl.allowed) return rl.response;

    const supabase = await createClient();
    const profile = await getAuthenticatedUser(supabase);

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate and sanitize inputs
    const title = sanitizeText(body.title, 200);
    const description = sanitizeText(body.description, 5000);
    const type = sanitizeText(body.type, 50);
    const severity = sanitizeText(body.severity, 20);
    const priority = sanitizeText(body.priority, 20);
    const incident_date = sanitizeText(body.incident_date, 10);
    const incident_time = sanitizeText(body.incident_time, 5);
    const location_description = body.location_description ? sanitizeText(body.location_description, 2000) : null;
    const building = body.building ? sanitizeText(body.building, 100) : null;
    const floor = body.floor ? sanitizeText(body.floor, 50) : null;
    const zone = body.zone ? sanitizeText(body.zone, 50) : null;
    const room = body.room ? sanitizeText(body.room, 50) : null;

    if (!title || !description || !type || !severity || !priority) {
      return NextResponse.json(
        { error: "Title, description, type, severity, and priority are required" },
        { status: 400 }
      );
    }

    const validTypes = ["injury", "near_miss", "property_damage", "environmental", "security", "fire", "equipment_failure", "spill", "hazard", "other"];
    const validSeverities = ["low", "medium", "high", "critical"];
    const validPriorities = ["low", "medium", "high", "critical"];

    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid incident type" }, { status: 400 });
    }
    if (!validSeverities.includes(severity)) {
      return NextResponse.json({ error: "Invalid severity" }, { status: 400 });
    }
    if (!validPriorities.includes(priority)) {
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
    }

    const location_id = body.location_id && isValidUUID(body.location_id) ? body.location_id : null;
    const asset_id = body.asset_id && isValidUUID(body.asset_id) ? body.asset_id : null;

    const now = new Date().toISOString();
    const referenceNumber = `INC-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    const { data: incident, error } = await supabase
      .from("incidents")
      .insert([{
        company_id: profile.company_id,
        reporter_id: profile.id,
        reference_number: referenceNumber,
        title,
        description,
        type,
        type_other: type === "other" ? sanitizeText(body.type_other || "", 100) || null : null,
        severity,
        priority,
        incident_date,
        incident_time,
        lost_time: Boolean(body.lost_time),
        lost_time_amount: (() => { const n = body.lost_time ? Number(body.lost_time_amount) : null; return n !== null && !isNaN(n) && n >= 0 ? n : null; })(),
        active_hazard: Boolean(body.active_hazard),
        location_id,
        building,
        floor,
        zone,
        room,
        location_description,
        asset_id,
        status: "new",
        flagged: false,
        created_at: now,
        updated_at: now,
      }])
      .select()
      .single();

    if (error) {
      console.error("[Incidents API] Create error:", error);
      return NextResponse.json({ error: "Failed to create incident" }, { status: 500 });
    }

    return NextResponse.json({ incident }, { status: 201 });
  } catch (err) {
    console.error("[Incidents API] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
