import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Check if user profile exists
      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (!profile) {
        // Create default user profile
        await supabase.from("users").insert([
          {
            id: data.user.id,
            email: data.user.email,
            first_name: data.user.user_metadata?.given_name || "User",
            last_name: data.user.user_metadata?.family_name || "",
            company_id: "3b23ad18-7684-45f0-afdc-0dcaad3b19e5", // Default company
            role: "employee",
            status: "active",
          },
        ]);
      }

      // Redirect to dashboard
      return NextResponse.redirect(
        new URL("/?message=OAuth+sign-in+successful", requestUrl.origin)
      );
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(
    new URL("/?message=OAuth+sign-in+failed", requestUrl.origin)
  );
}
