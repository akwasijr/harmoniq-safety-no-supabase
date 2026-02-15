import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
    const { email, role, company_id, first_name, last_name, department, team_ids } = body;

    if (!email || !role || !first_name || !last_name) {
      return NextResponse.json({ error: "First name, last name, email, and role are required" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
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
      return NextResponse.json({ error: "Unable to send invitation. Please check the email and try again." }, { status: 409 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    const adminClient = createAdminClient();

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

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

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

    const inviteUrl = `${siteUrl}/invite?token=${token}`;

    if (adminClient) {
      const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
        email.toLowerCase(),
        {
          data: {
            first_name,
            last_name,
            role,
            company_id: targetCompanyId,
            invited_by: inviter.id,
          },
          redirectTo: `${siteUrl}/auth/callback`,
        }
      );

      if (inviteError) {
        const msg = inviteError.message.toLowerCase();
        if (msg.includes("already") && msg.includes("registered")) {
          await supabase.from("invitations").delete().eq("id", invitation.id);
          return NextResponse.json({ error: "User with this email already exists" }, { status: 409 });
        }
      } else if (inviteData?.user?.id) {
        const now = new Date().toISOString();
        const { data: createdUser, error: profileError } = await adminClient
          .from("users")
          .insert([{
            id: inviteData.user.id,
            company_id: targetCompanyId,
            email: email.toLowerCase(),
            first_name,
            middle_name: null,
            last_name,
            full_name: `${first_name} ${last_name}`.trim(),
            role,
            user_type: "internal",
            account_type: "standard",
            gender: null,
            department: department || null,
            job_title: null,
            employee_id: `EMP${Date.now()}`,
            status: "inactive",
            email_verified_at: null,
            oauth_provider: "email",
            oauth_id: inviteData.user.id,
            location_id: null,
            language: "en",
            theme: "system",
            two_factor_enabled: false,
            last_login_at: null,
            created_at: now,
            updated_at: now,
            team_ids: Array.isArray(team_ids) ? team_ids : [],
          }])
          .select()
          .single();

        if (profileError) {
          return NextResponse.json({ error: "Invitation sent but profile creation failed" }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          email_sent: true,
          invitation: {
            id: invitation.id,
            email: invitation.email,
            role: invitation.role,
            expires_at: invitation.expires_at,
            invite_url: inviteUrl,
          },
          user: createdUser,
        });
      }
    }

    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", targetCompanyId)
      .single();

    return NextResponse.json({
      success: true,
      email_sent: false,
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
      .select("id,email,role,expires_at,accepted_at,token,company_id,companies(name)")
      .order("created_at", { ascending: false });

    if (profile.role !== "super_admin") {
      query = query.eq("company_id", profile.company_id);
    }

    const { data: invitations, error } = await query;

    if (error) {
      return NextResponse.json({ error: "Failed to fetch invitations" }, { status: 500 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    const invitationsWithLinks = (invitations || []).map((invitation) => ({
      ...invitation,
      invite_url: invitation.token ? `${siteUrl}/invite?token=${invitation.token}` : null,
      company_name: (invitation as any).companies?.name || null,
    }));

    return NextResponse.json({ invitations: invitationsWithLinks });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
