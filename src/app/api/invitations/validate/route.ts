import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/rate-limit";
import { INVITE_TOKEN_PATTERN, isInvitableRole } from "@/lib/invitations";

// 10 validation attempts per IP per minute
const validateLimiter = createRateLimiter({ limit: 10, windowMs: 60_000, prefix: "invite-validate" });

export async function GET(request: NextRequest) {
  const rl = validateLimiter.check(request);
  if (!rl.allowed) return rl.response;

  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ valid: false, error: "Invalid or expired invitation" }, { status: 400 });
  }

  if (!INVITE_TOKEN_PATTERN.test(token)) {
    return NextResponse.json({ valid: false, error: "Invalid or expired invitation" }, { status: 404 });
  }

  const supabase = await createClient();

  const { data: invitation, error } = await supabase
    .from("invitations")
    .select("email, role, company_id, companies(name)")
    .eq("token", token)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (error || !invitation || !isInvitableRole(invitation.role)) {
    return NextResponse.json({ valid: false, error: "Invalid or expired invitation" }, { status: 404 });
  }

  return NextResponse.json({
    valid: true,
    invitation: {
      email: invitation.email,
      role: invitation.role,
      company_name: (invitation as unknown as { companies?: { name: string } }).companies?.name || "Unknown",
    },
  });
}

/** Accept an invitation — creates user profile and marks invitation as accepted */
export async function POST(request: NextRequest) {
  const rl = validateLimiter.check(request);
  if (!rl.allowed) return rl.response;

  try {
    const body = await request.json();
    const { token, user_id } = body;

    if (!token || !user_id) {
      return NextResponse.json({ error: "Token and user_id are required" }, { status: 400 });
    }

    if (!INVITE_TOKEN_PATTERN.test(token)) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify the caller is authenticated and user_id matches their session
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (authUser.id !== user_id) {
      return NextResponse.json({ error: "User ID mismatch" }, { status: 403 });
    }

    // Find the invitation
    const { data: invitation, error: findError } = await supabase
      .from("invitations")
      .select("id, email, role, company_id")
      .eq("token", token)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (findError || !invitation) {
      return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 404 });
    }

    // Create user profile
    const now = new Date().toISOString();
    const { error: profileError } = await supabase
      .from("users")
      .upsert({
        id: user_id,
        company_id: invitation.company_id,
        email: invitation.email.toLowerCase(),
        first_name: invitation.email.split("@")[0],
        last_name: "",
        role: invitation.role,
        user_type: "internal",
        account_type: "standard",
        status: "active",
        language: "en",
        theme: "system",
        two_factor_enabled: false,
        email_verified_at: now,
        oauth_provider: "email",
        created_at: now,
        updated_at: now,
      }, { onConflict: "id" });

    if (profileError) {
      console.error("[Invitations] Failed to create user profile:", profileError);
      return NextResponse.json({ error: "Failed to create user profile" }, { status: 500 });
    }

    // Mark invitation as accepted
    await supabase
      .from("invitations")
      .update({ accepted_at: now })
      .eq("id", invitation.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Invitations] Accept error:", err);
    return NextResponse.json({ error: "Failed to accept invitation" }, { status: 500 });
  }
}
