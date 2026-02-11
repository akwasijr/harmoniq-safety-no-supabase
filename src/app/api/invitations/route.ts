import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get inviter's profile
    const { data: inviter } = await supabase
      .from("users")
      .select("id, role, company_id")
      .eq("id", user.id)
      .single();

    if (!inviter) {
      return NextResponse.json({ error: "User profile not found" }, { status: 403 });
    }

    // Only super_admin and company_admin can invite
    if (!["super_admin", "company_admin"].includes(inviter.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const { email, role, company_id } = body;

    if (!email || !role) {
      return NextResponse.json({ error: "Email and role are required" }, { status: 400 });
    }

    // Super admin can invite to any company, company admin only to their own
    const targetCompanyId = inviter.role === "super_admin" && company_id
      ? company_id
      : inviter.company_id;

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase())
      .single();

    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 });
    }

    // Check for existing pending invitation
    const { data: existingInvite } = await supabase
      .from("invitations")
      .select("id")
      .eq("email", email.toLowerCase())
      .eq("company_id", targetCompanyId)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (existingInvite) {
      return NextResponse.json({ error: "Pending invitation already exists for this email" }, { status: 409 });
    }

    // Generate invitation token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invitation
    const { data: invitation, error: insertError } = await supabase
      .from("invitations")
      .insert([{
        company_id: targetCompanyId,
        email: email.toLowerCase(),
        role,
        invited_by: inviter.id,
        token,
        expires_at: expiresAt.toISOString(),
      }])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: "Failed to create invitation" }, { status: 500 });
    }

    // Build invite URL
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    const inviteUrl = `${siteUrl}/invite?token=${token}`;

    // Get company name for the email
    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", targetCompanyId)
      .single();

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expires_at: invitation.expires_at,
        invite_url: inviteUrl,
        company_name: company?.name,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role, company_id")
      .eq("id", user.id)
      .single();

    if (!profile || !["super_admin", "company_admin"].includes(profile.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Get invitations for the user's company (or all for super admin)
    let query = supabase
      .from("invitations")
      .select("*")
      .order("created_at", { ascending: false });

    if (profile.role !== "super_admin") {
      query = query.eq("company_id", profile.company_id);
    }

    const { data: invitations, error } = await query;

    if (error) {
      return NextResponse.json({ error: "Failed to fetch invitations" }, { status: 500 });
    }

    return NextResponse.json({ invitations });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
