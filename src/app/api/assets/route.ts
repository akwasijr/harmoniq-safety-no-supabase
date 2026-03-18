import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/rate-limit";
import { sanitizeText, isValidUUID } from "@/lib/validation";

const assetLimiter = createRateLimiter({ limit: 20, windowMs: 60_000, prefix: "assets" });
const assetGetLimiter = createRateLimiter({ limit: 100, windowMs: 60_000, prefix: "assets-get" });

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
    const rl = assetGetLimiter.check(request);
    if (!rl.allowed) return rl.response;

    const supabase = await createClient();
    const profile = await getAuthenticatedUser(supabase);

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const companyId = searchParams.get("company_id") || profile.company_id;

    if (profile.role !== "super_admin" && companyId !== profile.company_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let query = supabase
      .from("assets")
      .select("id, company_id, location_id, parent_asset_id, is_system, name, asset_tag, serial_number, qr_code, category, sub_category, asset_type, criticality, department, manufacturer, model, purchase_date, installation_date, warranty_expiry, expected_life_years, condition, last_condition_assessment, purchase_cost, current_value, depreciation_rate, currency, maintenance_frequency_days, last_maintenance_date, next_maintenance_date, requires_certification, safety_instructions, gps_lat, gps_lng, notes, media_urls, status, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    const { data: assets, error } = await query;

    if (error) {
      console.error("[Assets API] List error:", error);
      return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 });
    }

    return NextResponse.json({ assets: assets || [] });
  } catch (err) {
    console.error("[Assets API] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = assetLimiter.check(request);
    if (!rl.allowed) return rl.response;

    const supabase = await createClient();
    const profile = await getAuthenticatedUser(supabase);

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins and managers can create assets
    if (!["super_admin", "company_admin", "manager"].includes(profile.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();

    const name = sanitizeText(body.name, 200);
    const category = sanitizeText(body.category, 50);
    const serial_number = body.serial_number ? sanitizeText(body.serial_number, 100) : null;
    const manufacturer = body.manufacturer ? sanitizeText(body.manufacturer, 100) : null;
    const model = body.model ? sanitizeText(body.model, 100) : null;
    const department = body.department ? sanitizeText(body.department, 100) : null;
    const safety_instructions = body.safety_instructions ? sanitizeText(body.safety_instructions, 2000) : null;
    const condition = body.condition ? sanitizeText(body.condition, 20) : "good";
    const asset_type = body.asset_type ? sanitizeText(body.asset_type, 20) : "static";
    const criticality = body.criticality ? sanitizeText(body.criticality, 20) : "medium";

    if (!name) {
      return NextResponse.json({ error: "Asset name is required" }, { status: 400 });
    }

    if (!category) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }

    const validConditions = ["new", "good", "fair", "poor", "critical"];
    if (!validConditions.includes(condition)) {
      return NextResponse.json({ error: "Invalid condition" }, { status: 400 });
    }

    const validCriticalities = ["low", "medium", "high", "critical"];
    if (!validCriticalities.includes(criticality)) {
      return NextResponse.json({ error: "Invalid criticality" }, { status: 400 });
    }

    const location_id = body.location_id && isValidUUID(body.location_id) ? body.location_id : null;
    const parent_asset_id = body.parent_asset_id && isValidUUID(body.parent_asset_id) ? body.parent_asset_id : null;

    const now = new Date().toISOString();
    const assetTag = `AST-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    const { data: asset, error } = await supabase
      .from("assets")
      .insert([{
        company_id: profile.company_id,
        name,
        asset_tag: assetTag,
        category,
        serial_number,
        manufacturer,
        model,
        condition,
        asset_type,
        criticality,
        department,
        safety_instructions,
        location_id,
        parent_asset_id,
        status: "active",
        purchase_date: body.purchase_date ? sanitizeText(body.purchase_date, 10) || null : null,
        installation_date: body.installation_date ? sanitizeText(body.installation_date, 10) || null : null,
        warranty_expiry: body.warranty_expiry ? sanitizeText(body.warranty_expiry, 10) || null : null,
        purchase_cost: body.purchase_cost ? parseFloat(body.purchase_cost) || null : null,
        currency: body.currency ? sanitizeText(body.currency, 3) : "USD",
        expected_life_years: body.expected_life_years ? parseInt(body.expected_life_years) || null : null,
        requires_certification: Boolean(body.requires_certification),
        maintenance_frequency_days: body.maintenance_frequency_days ? parseInt(body.maintenance_frequency_days) || null : null,
        created_at: now,
        updated_at: now,
      }])
      .select()
      .single();

    if (error) {
      console.error("[Assets API] Create error:", error);
      return NextResponse.json({ error: "Failed to create asset" }, { status: 500 });
    }

    return NextResponse.json({ asset }, { status: 201 });
  } catch (err) {
    console.error("[Assets API] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
