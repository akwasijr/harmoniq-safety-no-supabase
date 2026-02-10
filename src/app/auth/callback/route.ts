import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Only this email can sign in
const ALLOWED_EMAIL = "harmoniq.safety@gmail.com";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Only allow the whitelisted email
      if (data.user.email?.toLowerCase() !== ALLOWED_EMAIL.toLowerCase()) {
        // Sign them out immediately
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
          },
        ]);
      }

      // Redirect to dashboard
      return NextResponse.redirect(
        new URL("/harmoniq/dashboard", requestUrl.origin)
      );
    }
  }

  return NextResponse.redirect(
    new URL("/?message=OAuth+sign-in+failed", requestUrl.origin)
  );
}
