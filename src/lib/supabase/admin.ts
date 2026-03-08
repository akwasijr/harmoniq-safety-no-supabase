import { createClient } from "@supabase/supabase-js";

// Ensure this module is never bundled for the browser
if (typeof window !== "undefined") {
  throw new Error("supabase/admin.ts must only be imported in server-side code");
}

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
