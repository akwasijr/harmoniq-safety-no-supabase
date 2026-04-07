import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createRateLimiter } from "@/lib/rate-limit";
import { sanitizeText, isValidEmail, isValidUUID, validateUUIDArray } from "@/lib/validation";
import { addUserToTeam, removeUserFromTeam } from "@/lib/assignment-utils";
import { canInviteRole } from "@/lib/invitations";

// 10 invitation creates per IP per minute
const inviteLimiter = createRateLimiter({ limit: 10, windowMs: 60_000, prefix: "invitations" });

export async function POST(request: NextRequest) {
  try {
    const rl = inviteLimiter.check(request);
    if (!rl.allowed) return rl.response;
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
    const email = sanitizeText(body.email, 254).toLowerCase();
    const role = sanitizeText(body.role, 30);
    const first_name = sanitizeText(body.first_name, 100);
    const last_name = sanitizeText(body.last_name, 100);
    const department = sanitizeText(body.department || "", 100) || null;
    const company_id = body.company_id ? sanitizeText(body.company_id, 36) : null;
    const team_ids = validateUUIDArray(body.team_ids) || [];

    if (!first_name || !last_name || !email || !role) {
      return NextResponse.json({ error: "First name, last name, email, and role are required" }, { status: 400 });
    }

    const ALLOWED_ROLES = ["company_admin", "manager", "employee"];
    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    if (!canInviteRole(inviter.role, role)) {
      return NextResponse.json({ error: "Invalid role for invitation" }, { status: 403 });
    }

    if (company_id && !isValidUUID(company_id)) {
      return NextResponse.json({ error: "Invalid company ID" }, { status: 400 });
    }

    // Super admin can invite to any company, company admin only to their own
    const targetCompanyId = inviter.role === "super_admin" && company_id
      ? company_id
      : inviter.company_id;

    if (!targetCompanyId) {
      return NextResponse.json({ error: "A target company is required to send invitations." }, { status: 400 });
    }

    const { data: selectedTeams, error: selectedTeamsError } = team_ids.length > 0
      ? await supabase
          .from("teams")
          .select("id, member_ids")
          .eq("company_id", targetCompanyId)
          .in("id", team_ids)
      : { data: [], error: null };

    if (selectedTeamsError) {
      console.error("[Invitations API] Failed to validate invited user teams:", selectedTeamsError);
      return NextResponse.json({ error: "Failed to validate team assignments" }, { status: 500 });
    }

    if ((selectedTeams || []).length !== team_ids.length) {
      return NextResponse.json({ error: "One or more selected teams are invalid for this company" }, { status: 400 });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle();

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
      .maybeSingle();

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
      console.error("[Invitations API] Failed to create invitation record:", insertError);
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
        // Email invite failed (invalid domain, SMTP not configured, etc.)
        // Fall through gracefully — keep the invitation record and return the invite link
        console.warn("[Invitations API] Email invite failed, falling through to link-based invite:", inviteError.message);
      }

      if (!inviteError && inviteData?.user?.id) {
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
            role,
            user_type: "internal",
            account_type: "standard",
            gender: null,
            department: department || null,
            job_title: null,
            employee_id: `EMP${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`,
            status: "pending_activation",
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
            team_ids: team_ids,
          }])
          .select()
          .single();

        if (profileError) {
          console.error("[Invitations API] Failed to create invited user profile:", profileError);
          await supabase.from("invitations").delete().eq("id", invitation.id);
          await adminClient.auth.admin.deleteUser(inviteData.user.id);
          return NextResponse.json(
            { error: "Invitation email was sent, but the user profile could not be prepared. Please retry the invitation." },
            { status: 500 }
          );
        }

        const syncTime = new Date().toISOString();
        const updatedTeamIds: string[] = [];
        for (const team of selectedTeams || []) {
          const { error: teamUpdateError } = await adminClient
            .from("teams")
            .update({
              member_ids: addUserToTeam(team, createdUser.id),
              updated_at: syncTime,
            })
            .eq("id", team.id);

          if (teamUpdateError) {
            console.error("[Invitations API] Failed to sync invited user team membership:", teamUpdateError);

            for (const updatedTeamId of updatedTeamIds) {
              const rollbackTeam = (selectedTeams || []).find((item) => item.id === updatedTeamId);
              if (!rollbackTeam) continue;
              await adminClient
                .from("teams")
                .update({
                  member_ids: removeUserFromTeam(rollbackTeam, createdUser.id),
                  updated_at: new Date().toISOString(),
                })
                .eq("id", updatedTeamId);
            }

            await adminClient.from("users").delete().eq("id", createdUser.id);
            await supabase.from("invitations").delete().eq("id", invitation.id);
            await adminClient.auth.admin.deleteUser(inviteData.user.id);
            return NextResponse.json(
              { error: "Invitation email was sent, but team membership could not be prepared. Please retry the invitation." },
              { status: 500 }
            );
          }

          updatedTeamIds.push(team.id);
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
      .maybeSingle();

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
  } catch (err: unknown) {
    console.error("[Invitations API] Unexpected invitation error:", err);
    return NextResponse.json({ error: "Unable to process the invitation request." }, { status: 500 });
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
      .select("id,email,role,expires_at,accepted_at,company_id,companies(name)")
      .order("created_at", { ascending: false })
      .limit(250);

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
      company_name: (invitation as unknown as { companies?: { name: string } }).companies?.name || null,
    }));

    return NextResponse.json({ invitations: invitationsWithLinks });
  } catch (err: unknown) {
    console.error("[Invitations API] Unexpected invitation listing error:", err);
    return NextResponse.json({ error: "Unable to fetch invitations." }, { status: 500 });
  }
}
