import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRateLimiter } from "@/lib/rate-limit";
import {
  getAssetScopedRowIds,
  validateEntityUpsertRequest,
} from "@/lib/entity-upsert";

// 120 upsert requests per IP per minute (allows bulk operations like
// creating a building with multiple floors/zones/rooms in one action)
const upsertLimiter = createRateLimiter({ limit: 120, windowMs: 60_000, prefix: "entity-upsert" });

export async function POST(request: NextRequest) {
  try {
    const rl = upsertLimiter.check(request);
    if (!rl.allowed) return rl.response;

    // Verify the user is authenticated
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (process.env.NODE_ENV === "development") {
      console.log("[entity-upsert] auth check:", { hasUser: !!user, userId: user?.id, authError: authErr?.message });
    }
    if (!user) {
      return NextResponse.json({ error: "Unauthorized", debug: authErr?.message }, { status: 401 });
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
      if (process.env.NODE_ENV === "development") {
        console.log("[entity-upsert] validation failed:", { table, status: validated.status, error: validated.error, profile, data });
      }
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

    // Use admin client (service_role) to bypass RLS since we already
    // validated auth + company ownership above. Falls back to user client.
    const adminClient = createAdminClient();
    const writeClient = adminClient ?? supabase;

    if (!adminClient) {
      console.warn("[Entity Upsert API] Admin client unavailable — falling back to user session (may hit RLS)");
    }

    // Determine if this is an update (partial fields on existing row) or insert.
    // For each row, check if it exists — if yes, UPDATE only the provided fields.
    // If no, INSERT the full row. This prevents NOT NULL constraint violations
    // when the client sends partial updates.
    for (const row of validated.rows) {
      const rowId = row.id as string | undefined;

      if (rowId) {
        // Check if row exists
        const { data: existing } = await writeClient
          .from(table)
          .select("id")
          .eq("id", rowId)
          .maybeSingle();

        if (existing) {
          // Update only the provided fields (exclude id from the update set)
          const { id: _id, ...updateFields } = row;
          void _id;
          const { error: updateError } = await writeClient
            .from(table)
            .update(updateFields)
            .eq("id", rowId);

          if (updateError) {
            const msg = updateError.message || "Update failed";
            if (msg.includes("permission denied") || msg.includes("row-level security")) {
              console.warn(`[Entity Upsert API] Permission issue for ${table}:`, msg);
              return NextResponse.json({ error: "You do not have permission to save this data." }, { status: 403 });
            }
            console.error(`[Entity Upsert API] Error updating ${table}:`, msg);
            return NextResponse.json({ error: "Unable to save data. Please try again." }, { status: 500 });
          }
          continue;
        }
      }

      // Insert new row
      const { error: insertError } = await writeClient
        .from(table)
        .insert(row);

      if (insertError) {
        const msg = insertError.message || "Insert failed";
        if (msg.includes("permission denied") || msg.includes("row-level security")) {
          console.warn(`[Entity Upsert API] Permission issue for ${table}:`, msg);
          return NextResponse.json({ error: "You do not have permission to save this data." }, { status: 403 });
        }
        console.error(`[Entity Upsert API] Error inserting ${table}:`, msg);
        return NextResponse.json({ error: "Unable to save data. Please try again." }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Entity Upsert API] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
