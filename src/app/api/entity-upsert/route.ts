import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_TABLES = new Set([
  "incidents",
  "assets",
  "tickets",
  "work_orders",
  "locations",
  "teams",
  "content",
  "checklist_templates",
  "checklist_submissions",
  "risk_evaluations",
  "parts",
  "corrective_actions",
  "asset_inspections",
  "meter_readings",
  "inspection_routes",
  "inspection_rounds",
  "notifications",
  "companies",
]);

export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user profile to enforce company isolation
    const { data: profile } = await supabase
      .from("users")
      .select("company_id, role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 403 });
    }

    const { table, data } = await request.json();

    if (!table || !data) {
      return NextResponse.json({ error: "table and data are required" }, { status: 400 });
    }

    if (!ALLOWED_TABLES.has(table)) {
      return NextResponse.json({ error: "Table not allowed" }, { status: 403 });
    }

    // Enforce company isolation: every row must match user's company
    const payload = Array.isArray(data) ? data : [data];
    for (const item of payload) {
      if (table === "companies") {
        // Only super_admin can upsert companies
        if (profile.role !== "super_admin") {
          return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }
      } else if (item.company_id) {
        // Non-super-admins can only write to their own company
        if (profile.role !== "super_admin" && item.company_id !== profile.company_id) {
          return NextResponse.json({ error: "Cannot access data from another company" }, { status: 403 });
        }
      } else {
        // Force the user's company_id if not provided
        item.company_id = profile.company_id;
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    // Use direct PostgREST call with service role key — bypasses RLS and has full access
    const res = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
      console.error(`[Entity Upsert API] Error for ${table}:`, body.message || body);
      return NextResponse.json({ error: body.message || "Upsert failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Entity Upsert API] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
