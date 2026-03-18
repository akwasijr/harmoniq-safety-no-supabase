import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/rate-limit";

// 10 validation attempts per IP per minute
const validateLimiter = createRateLimiter({ limit: 10, windowMs: 60_000, prefix: "invite-validate" });

export async function GET(request: NextRequest) {
  const rl = validateLimiter.check(request);
  if (!rl.allowed) return rl.response;

  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ valid: false, error: "Invalid or expired invitation" }, { status: 400 });
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
      company_name: (invitation as unknown as { companies?: { name: string } }).companies?.name || "Unknown",
    },
  });
}
