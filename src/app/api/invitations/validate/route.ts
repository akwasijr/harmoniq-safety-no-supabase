import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ valid: false, error: "No token provided" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: invitation, error } = await supabase
    .from("invitations")
    .select("*, companies(name)")
    .eq("token", token)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (error || !invitation) {
    return NextResponse.json({ valid: false, error: "Invalid or expired invitation" }, { status: 404 });
  }

  return NextResponse.json({
    valid: true,
    invitation: {
      email: invitation.email,
      role: invitation.role,
      company_name: (invitation.companies as any)?.name || "Unknown",
    },
  });
}
