import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/public-env";

/**
 * Supabase client for use in Client Components ("use client").
 * Uses browser cookies for session management.
 */
export function createClient() {
  const supabaseUrl = getSupabaseUrl();
  const supabasePublishableKey = getSupabasePublishableKey();

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("Missing Supabase public environment variables.");
  }

  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}
