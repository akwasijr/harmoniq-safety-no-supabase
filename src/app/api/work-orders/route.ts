import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/rate-limit";
import { sanitizeText, isValidUUID } from "@/lib/validation";

const workOrderLimiter = createRateLimiter({ limit: 20, windowMs: 60_000, prefix: "work-orders" });
const workOrderGetLimiter = createRateLimiter({ limit: 100, windowMs: 60_000, prefix: "work-orders-get" });

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
    const rl = workOrderGetLimiter.check(request);
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
      .from("work_orders")
      .select("id, company_id, asset_id, title, description, priority, status, requested_by, assigned_to, due_date, estimated_hours, actual_hours, parts_cost, labor_cost, corrective_action_id, completed_at, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    const { data: workOrders, error } = await query;

    if (error) {
      console.error("[Work Orders API] List error:", error);
      return NextResponse.json({ error: "Failed to fetch work orders" }, { status: 500 });
    }

    return NextResponse.json({ work_orders: workOrders || [] });
  } catch (err) {
    console.error("[Work Orders API] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = workOrderLimiter.check(request);
    if (!rl.allowed) return rl.response;

    const supabase = await createClient();
    const profile = await getAuthenticatedUser(supabase);

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const title = sanitizeText(body.title, 200);
    const description = sanitizeText(body.description, 5000);
    const priority = sanitizeText(body.priority, 20);

    if (!title || !description) {
      return NextResponse.json(
        { error: "Title and description are required" },
        { status: 400 }
      );
    }

    const validPriorities = ["low", "medium", "high", "critical"];
    if (priority && !validPriorities.includes(priority)) {
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
    }

    const asset_id = body.asset_id && isValidUUID(body.asset_id) ? body.asset_id : null;
    const assigned_to = body.assigned_to && isValidUUID(body.assigned_to) ? body.assigned_to : null;

    const now = new Date().toISOString();

    const { data: workOrder, error } = await supabase
      .from("work_orders")
      .insert([{
        company_id: profile.company_id,
        requested_by: profile.id,
        title,
        description,
        priority: priority || "medium",
        status: "requested",
        asset_id,
        assigned_to,
        due_date: body.due_date ? sanitizeText(body.due_date, 10) || null : null,
        estimated_hours: (() => { const h = parseFloat(body.estimated_hours); return !isNaN(h) && h >= 0 ? h : null; })(),
        actual_hours: null,
        parts_cost: null,
        labor_cost: null,
        corrective_action_id: null,
        completed_at: null,
        created_at: now,
        updated_at: now,
      }])
      .select()
      .single();

    if (error) {
      console.error("[Work Orders API] Create error:", error);
      return NextResponse.json({ error: "Failed to create work order" }, { status: 500 });
    }

    return NextResponse.json({ work_order: workOrder }, { status: 201 });
  } catch (err) {
    console.error("[Work Orders API] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
