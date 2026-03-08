/**
 * Validate required environment variables on startup.
 * Import this in the app's root layout to catch misconfigurations early.
 */

const REQUIRED_SERVER_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

const SENSITIVE_VARS = [
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

export function validateEnv() {
  const missing: string[] = [];

  for (const key of REQUIRED_SERVER_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error(`[ENV] Missing required environment variables: ${missing.join(", ")}`);
  }

  // Warn if sensitive keys are accidentally prefixed with NEXT_PUBLIC_
  for (const key of SENSITIVE_VARS) {
    const publicKey = `NEXT_PUBLIC_${key}`;
    if (process.env[publicKey]) {
      console.error(`[ENV] CRITICAL: ${publicKey} is exposed to the browser! Remove the NEXT_PUBLIC_ prefix immediately.`);
    }
  }

  // Warn if service role key is missing (optional for non-admin deploys)
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("[ENV] SUPABASE_SERVICE_ROLE_KEY not set — admin features (setup, invitations) will be unavailable.");
  }
}
