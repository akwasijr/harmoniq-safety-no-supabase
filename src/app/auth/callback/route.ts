import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_EMAIL = "harmoniq.safety@gmail.com";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Only allow whitelisted email for main production
      if (data.user.email?.toLowerCase() !== ALLOWED_EMAIL.toLowerCase()) {
        await supabase.auth.signOut();
        return NextResponse.redirect(
          new URL("/?message=Access+denied.+Only+authorized+accounts+can+sign+in.", requestUrl.origin)
        );
      }

      // Check if user profile exists
      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (!profile) {
        // Create super admin user profile for whitelisted email
        await supabase.from("users").insert([
          {
            id: data.user.id,
            email: data.user.email,
            first_name: data.user.user_metadata?.given_name || "Admin",
            last_name: data.user.user_metadata?.family_name || "User",
            company_id: "3b23ad18-7684-45f0-afdc-0dcaad3b19e5",
            role: "super_admin",
            status: "active",
            email_verified_at: new Date().toISOString(),
            oauth_provider: data.user.app_metadata?.provider || "google",
            oauth_id: data.user.id,
          },
        ]);
      }

      // Log auth attempt
      try {
        await supabase.from("audit_logs").insert([{
          user_id: data.user.id,
          action: "login_success",
          resource: "auth",
          details: { provider: data.user.app_metadata?.provider || "oauth" },
          ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined,
        }]);
      } catch {}  // Don't fail if audit log fails

      return NextResponse.redirect(new URL("/harmoniq/dashboard", requestUrl.origin));
    }

    // Log failed attempt
    if (data.user) {
      try {
        await supabase.from("audit_logs").insert([{
          user_id: data.user.id,
          action: "login_failed",
          resource: "auth",
          details: { error: error?.message || "unknown" },
          ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined,
        }]);
      } catch {}
    }
  }

  return NextResponse.redirect(
    new URL("/?message=OAuth+sign-in+failed", requestUrl.origin)
  );
}
