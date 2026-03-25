/**
 * Validate required environment variables on startup.
 * Import this in the app's root layout to catch misconfigurations early.
 */
import { getConfiguredSiteUrl } from "@/lib/site-url";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/public-env";

export interface EnvStatus {
  missingRequired: string[];
  exposedSensitiveKeys: string[];
  hasSupabaseUrl: boolean;
  hasSupabasePublishableKey: boolean;
  hasSupabaseAdminKey: boolean;
  hasConfiguredSiteUrl: boolean;
  hasTurnstileSiteKey: boolean;
  hasTurnstileSecretKey: boolean;
}

export function getEnvStatus(): EnvStatus {
  const hasSupabaseUrl = Boolean(getSupabaseUrl());
  const hasSupabasePublishableKey = Boolean(getSupabasePublishableKey());
  const hasSupabaseAdminKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY);
  const hasConfiguredSiteUrl = Boolean(getConfiguredSiteUrl());
  const hasTurnstileSiteKey = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  const hasTurnstileSecretKey = Boolean(process.env.TURNSTILE_SECRET_KEY);
  const missingRequired: string[] = [];
  const exposedSensitiveKeys = ["NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_SECRET_KEY"].filter(
    (key) => Boolean(process.env[key])
  );

  if (!hasSupabaseUrl) {
    missingRequired.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!hasSupabasePublishableKey) {
    missingRequired.push("NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }

  return {
    missingRequired,
    exposedSensitiveKeys,
    hasSupabaseUrl,
    hasSupabasePublishableKey,
    hasSupabaseAdminKey,
    hasConfiguredSiteUrl,
    hasTurnstileSiteKey,
    hasTurnstileSecretKey,
  };
}

export function validateEnv() {
  const env = getEnvStatus();

  if (env.missingRequired.length > 0) {
    const isMockMode = process.env.NEXT_PUBLIC_ENABLE_MOCK_MODE === "true";
    if (isMockMode) {
      console.warn("[ENV] Running in MOCK MODE — auth is bypassed. Do NOT use in production.");
    } else {
      console.error(`[ENV] Missing required environment variables: ${env.missingRequired.join(", ")}`);
      console.error("[ENV] Set NEXT_PUBLIC_ENABLE_MOCK_MODE=true to run without Supabase (development only).");
    }
  }

  for (const publicKey of env.exposedSensitiveKeys) {
    if (process.env[publicKey]) {
      console.error(`[ENV] CRITICAL: ${publicKey} is exposed to the browser! Remove the NEXT_PUBLIC_ prefix immediately.`);
    }
  }

  if (!env.hasSupabaseAdminKey) {
    console.warn("[ENV] SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY not set. Admin features (setup, invitations) will be unavailable.");
  }
}
