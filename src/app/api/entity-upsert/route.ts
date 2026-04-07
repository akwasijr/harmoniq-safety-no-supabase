import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createRateLimiter } from "@/lib/rate-limit";
import {
  getAssetScopedRowIds,
  validateEntityUpsertRequest,
} from "@/lib/entity-upsert";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/public-env";

// 30 upsert requests per IP per minute
const upsertLimiter = createRateLimiter({ limit: 30, windowMs: 60_000, prefix: "entity-upsert" });

export async function POST(request: NextRequest) {
  try {
    const rl = upsertLimiter.check(request);
    if (!rl.allowed) return rl.response;

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

    const validated = validateEntityUpsertRequest(table, data, profile);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: validated.status });
    }

    const assetIds = getAssetScopedRowIds(table, validated.rows);
    if (assetIds.length > 0) {
      const { data: assets, error: assetsError } = await supabase
        .from("assets")
        .select("id, company_id")
        .in("id", assetIds);

      if (assetsError) {
        console.error("[Entity Upsert API] Failed to validate asset ownership:", assetsError);
        return NextResponse.json({ error: "Failed to validate asset ownership" }, { status: 500 });
      }

      if (!assets || assets.length !== assetIds.length) {
        return NextResponse.json({ error: "Referenced asset not found" }, { status: 400 });
      }

      if (profile.role !== "super_admin" && assets.some((asset) => asset.company_id !== profile.company_id)) {
        return NextResponse.json({ error: "Cannot access data from another company" }, { status: 403 });
      }
    }

    // Use service role key via PostgREST to bypass RLS.
    // We already validate auth + company isolation above.
    const supabaseUrl = getSupabaseUrl();
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

    if (supabaseUrl && serviceRoleKey) {
      const res = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
        method: "POST",
        headers: {
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          "Prefer": "resolution=merge-duplicates",
        },
        body: JSON.stringify(validated.rows),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
        console.error(`[Entity Upsert API] Service role upsert error for ${table}:`, body.message || body);
        return NextResponse.json({ error: body.message || "Upsert failed" }, { status: 500 });
      }
    } else {
      // Fallback: use caller's session (RLS applies)
      const publishableKey = getSupabasePublishableKey();
      const { data: { session } } = await supabase.auth.getSession();

      if (!supabaseUrl || !publishableKey || !session?.access_token) {
        return NextResponse.json({ error: "Server not configured" }, { status: 500 });
      }

      const res = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
        method: "POST",
        headers: {
          "apikey": publishableKey,
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
          "Prefer": "resolution=merge-duplicates",
        },
        body: JSON.stringify(validated.rows),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
        console.error(`[Entity Upsert API] Error for ${table}:`, body.message || body);
        return NextResponse.json({ error: body.message || "Upsert failed" }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Entity Upsert API] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
