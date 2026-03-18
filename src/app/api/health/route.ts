import { NextRequest, NextResponse } from "next/server";
import { getEnvStatus } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRateLimiter } from "@/lib/rate-limit";

const healthLimiter = createRateLimiter({ limit: 60, windowMs: 60_000, prefix: "health" });

export const dynamic = "force-dynamic";

interface HealthSnapshot {
  ok: boolean;
  timestamp: string;
  issues: string[];
  warnings: string[];
  checks: {
    env: {
      supabaseUrl: boolean;
      supabasePublishableKey: boolean;
      supabaseAdminKey: boolean;
      siteUrl: boolean;
      turnstileSiteKey: boolean;
      turnstileSecretKey: boolean;
    };
    database: {
      ok: boolean;
      error: string | null;
    };
  };
}

async function getHealthSnapshot(): Promise<HealthSnapshot> {
  const env = getEnvStatus();
  const issues: string[] = [];
  const warnings: string[] = [];
  const database = {
    ok: false,
    error: null as string | null,
  };

  if (!env.hasSupabaseUrl) {
    issues.push("supabase_url_missing");
  }

  if (!env.hasSupabasePublishableKey) {
    issues.push("supabase_publishable_key_missing");
  }

  if (!env.hasSupabaseAdminKey) {
    issues.push("supabase_admin_key_missing");
    database.error = "Supabase admin key missing";
  }

  if (!env.hasConfiguredSiteUrl) {
    issues.push("site_url_missing");
  }

  if (env.hasTurnstileSiteKey !== env.hasTurnstileSecretKey) {
    warnings.push("turnstile_partially_configured");
  }

  if (env.hasSupabaseUrl && env.hasSupabaseAdminKey) {
    const adminClient = createAdminClient();

    if (!adminClient) {
      issues.push("database_client_unavailable");
      database.error = "Supabase admin client unavailable";
    } else {
      const { error } = await adminClient
        .from("companies")
        .select("id", { head: true, count: "exact" });

      if (error) {
        issues.push("database_unreachable");
        console.error("[Health API] Database check failed:", error.message);
        database.error = "Database connection failed";
      } else {
        database.ok = true;
      }
    }
  }

  return {
    ok: issues.length === 0 && database.ok,
    timestamp: new Date().toISOString(),
    issues,
    warnings,
    checks: {
      env: {
        supabaseUrl: env.hasSupabaseUrl,
        supabasePublishableKey: env.hasSupabasePublishableKey,
        supabaseAdminKey: env.hasSupabaseAdminKey,
        siteUrl: env.hasConfiguredSiteUrl,
        turnstileSiteKey: env.hasTurnstileSiteKey,
        turnstileSecretKey: env.hasTurnstileSecretKey,
      },
      database,
    },
  };
}

function withNoStoreHeaders(response: NextResponse | Response) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: NextRequest) {
  const rl = healthLimiter.check(request);
  if (!rl.allowed) return rl.response;

  const snapshot = await getHealthSnapshot();

  return withNoStoreHeaders(
    NextResponse.json(snapshot, {
      status: snapshot.ok ? 200 : 503,
    })
  );
}

export async function HEAD() {
  const snapshot = await getHealthSnapshot();

  return withNoStoreHeaders(
    new Response(null, {
      status: snapshot.ok ? 200 : 503,
    })
  );
}
