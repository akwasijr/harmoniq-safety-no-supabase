import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRateLimiter } from "@/lib/rate-limit";
import {
  getAssetScopedRowIds,
  validateEntityUpsertRequest,
} from "@/lib/entity-upsert";
import type { AllowedEntityUpsertTable, EntityUpsertRow } from "@/lib/entity-upsert";

// 30 upsert requests per IP per minute
const upsertLimiter = createRateLimiter({ limit: 30, windowMs: 60_000, prefix: "entity-upsert" });
type UpsertClient = NonNullable<ReturnType<typeof createAdminClient>> | Awaited<ReturnType<typeof createClient>>;

function getMissingSchemaColumn(message: string | null | undefined): string | null {
  if (!message) return null;
  const match = message.match(/Could not find the '([^']+)' column of '([^']+)' in the schema cache/);
  return match?.[1] ?? null;
}

async function upsertWithSchemaFallback(
  writeClient: UpsertClient,
  table: AllowedEntityUpsertTable,
  rows: EntityUpsertRow[],
) {
  let nextRows = rows.map((row) => ({ ...row }));
  const strippedColumns = new Set<string>();

  while (true) {
    const { error } = await writeClient
      .from(table)
      .upsert(nextRows, { onConflict: "id" });

    if (!error) {
      return { error: null };
    }

    const missingColumn = table === "work_orders" ? getMissingSchemaColumn(error.message) : null;
    if (
      missingColumn &&
      !strippedColumns.has(missingColumn) &&
      nextRows.some((row) => Object.prototype.hasOwnProperty.call(row, missingColumn))
    ) {
      strippedColumns.add(missingColumn);
      nextRows = nextRows.map((row) => {
        const clone = { ...row };
        delete clone[missingColumn];
        return clone;
      });
      console.warn(`[Entity Upsert API] Retrying ${table} upsert without unsupported column: ${missingColumn}`);
      continue;
    }

    return { error };
  }
}

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

    // Use admin client (service_role) to bypass RLS since we already
    // validated auth + company ownership above. Falls back to user client.
    const adminClient = createAdminClient();
    const writeClient = adminClient ?? supabase;

    if (!adminClient) {
      console.warn("[Entity Upsert API] Admin client unavailable — falling back to user session (may hit RLS)");
    }

    const { error: upsertError } = await upsertWithSchemaFallback(writeClient, table, validated.rows);

    if (upsertError) {
      const msg = upsertError.message || "Upsert failed";
      if (msg.includes("permission denied") || msg.includes("row-level security")) {
        console.warn(`[Entity Upsert API] Permission issue for ${table}:`, msg);
        return NextResponse.json({ error: "You do not have permission to save this data." }, { status: 403 });
      }
      console.error(`[Entity Upsert API] Error for ${table}:`, msg);
      return NextResponse.json({ error: "Unable to save data. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Entity Upsert API] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
