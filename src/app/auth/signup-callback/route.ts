import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from("users")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (existingUser) {
        // User already registered, redirect to login
        return NextResponse.redirect(new URL("/login", requestUrl.origin));
      }

      // New user - redirect to signup to enter company details
      return NextResponse.redirect(new URL("/signup", requestUrl.origin));
    }
  }

  return NextResponse.redirect(
    new URL("/signup?message=OAuth+sign-up+failed", requestUrl.origin)
  );
}
