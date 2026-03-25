import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/public-env";
import type { UserRole } from "@/types";

interface AuthenticatedProfile {
  role: UserRole;
  company_id: string | null;
}

/**
 * Creates a Supabase client for use in middleware.
 * Handles session refresh by reading/writing cookies on the response.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const supabaseUrl = getSupabaseUrl();
  const supabasePublishableKey = getSupabasePublishableKey();

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("Missing Supabase public environment variables.");
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session. This is critical for keeping the user logged in.
  // Do NOT remove this getUser() call.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: AuthenticatedProfile | null = null;

  if (user) {
    const { data } = await supabase
      .from("users")
      .select("role, company_id")
      .eq("id", user.id)
      .maybeSingle();

    if (data?.role) {
      profile = {
        role: data.role as UserRole,
        company_id: data.company_id,
      };
    }
  }

  return { user, profile, supabaseResponse };
}
