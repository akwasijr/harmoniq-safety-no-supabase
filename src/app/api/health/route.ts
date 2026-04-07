import { NextRequest, NextResponse } from "next/server";
import { getEnvStatus } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";

const healthLimiter = createRateLimiter({ limit: 60, windowMs: 60_000, prefix: "health" });

export const dynamic = "force-dynamic";

// Track process start time for uptime
const startTime = Date.now();

interface HealthSnapshot {
  ok: boolean;
  timestamp: string;
  version: string;
  uptime_seconds: number;
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
      sentryDsn: boolean;
    };
    database: {
      ok: boolean;
      latency_ms: number | null;
      error: string | null;
    };
    memory: {
      rss_mb: number;
      heap_used_mb: number;
      heap_total_mb: number;
    };
  };
}

async function getHealthSnapshot(): Promise<HealthSnapshot> {
  const env = getEnvStatus();
  const strictReadiness = process.env.NODE_ENV === "production";
  const isMockMode = process.env.NEXT_PUBLIC_ENABLE_MOCK_MODE === "true" && (!env.hasSupabaseUrl || !env.hasSupabasePublishableKey);
  const issues: string[] = [];
  const warnings: string[] = [];
  const database = {
    ok: isMockMode || !strictReadiness || !env.hasSupabaseAdminKey,
    latency_ms: null as number | null,
    error: null as string | null,
  };
  const pushConfigStatus = (key: string) => {
    if (strictReadiness) {
      issues.push(key);
    } else {
      warnings.push(key);
    }
  };

  if (!env.hasSupabaseUrl) {
    if (isMockMode) {
      warnings.push("supabase_url_missing");
    } else {
      pushConfigStatus("supabase_url_missing");
    }
  }

  if (!env.hasSupabasePublishableKey) {
    if (isMockMode) {
      warnings.push("supabase_publishable_key_missing");
    } else {
      pushConfigStatus("supabase_publishable_key_missing");
    }
  }

  if (!env.hasSupabaseAdminKey) {
    warnings.push("supabase_admin_key_missing");
    database.error = "Supabase admin key missing";
  }

  if (!env.hasConfiguredSiteUrl) {
    pushConfigStatus("site_url_missing");
  }

  if (env.hasTurnstileSiteKey !== env.hasTurnstileSecretKey) {
    warnings.push("turnstile_partially_configured");
  }

  const hasSentryDsn = !!process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!hasSentryDsn) {
    warnings.push("sentry_dsn_missing");
  }

  // Database connectivity check with latency measurement
  if (env.hasSupabaseUrl && env.hasSupabaseAdminKey) {
    const adminClient = createAdminClient();

    if (!adminClient) {
      if (strictReadiness) {
        issues.push("database_client_unavailable");
      } else {
        warnings.push("database_client_unavailable");
      }
      database.error = "Supabase admin client unavailable";
    } else {
      const dbStart = Date.now();
      const { error } = await adminClient
        .from("companies")
        .select("id", { head: true, count: "exact" });

      database.latency_ms = Date.now() - dbStart;

      if (error) {
        if (strictReadiness) {
          issues.push("database_unreachable");
        } else {
          warnings.push("database_unreachable");
        }
        console.error("[Health API] Database check failed:", error.message);
        database.error = "Database connection failed";
      } else {
        database.ok = true;
      }
    }
  }

  // Memory usage
  const mem = process.memoryUsage();

  return {
    ok: issues.length === 0 && (database.ok || isMockMode || !strictReadiness),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "0.1.0",
    uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
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
        sentryDsn: hasSentryDsn,
      },
      database,
      memory: {
        rss_mb: Math.round(mem.rss / 1024 / 1024),
        heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024),
        heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024),
      },
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
  const status = snapshot.ok ? 200 : 503;

  logger.info("health_check", {
    status,
    durationMs: snapshot.checks.database.latency_ms ?? undefined,
  });

  return withNoStoreHeaders(
    NextResponse.json(snapshot, { status })
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
