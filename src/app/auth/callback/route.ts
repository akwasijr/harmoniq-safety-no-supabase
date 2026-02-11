import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const DEMO_COMPANY_SLUG = "nexus";
const DEMO_COMPANY_ID = "d0000000-0000-0000-0000-000000000001";

function getSuperAdminEmails(): string[] {
  const raw = process.env.SUPER_ADMIN_EMAILS || "";
  return raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}

function isDemoEmail(email: string): boolean {
  return email.toLowerCase() === "demo@harmoniq.safety";
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const source = requestUrl.searchParams.get("source");
  const type = requestUrl.searchParams.get("type");

  const supabase = await createClient();

  // Handle OAuth callback (has code parameter)
  if (code) {
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) {
      return NextResponse.redirect(
        new URL("/login?error=OAuth+sign-in+failed", requestUrl.origin)
      );
    }
    return await routeAuthenticatedUser(supabase, data.user, request, requestUrl);
  }

  // Handle email/password login redirect (session already set by client)
  if (source === "email") {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(
        new URL("/login?error=Session+not+found", requestUrl.origin)
      );
    }
    return await routeAuthenticatedUser(supabase, user, request, requestUrl);
  }

  // Handle password recovery
  if (type === "recovery") {
    return NextResponse.redirect(new URL("/login", requestUrl.origin));
  }

  return NextResponse.redirect(
    new URL("/login?error=Invalid+callback", requestUrl.origin)
  );
}

async function routeAuthenticatedUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string; email?: string; user_metadata?: Record<string, any>; app_metadata?: Record<string, any> },
  request: NextRequest,
  requestUrl: URL
) {
  const email = user.email?.toLowerCase() || "";
  const superAdminEmails = getSuperAdminEmails();
  const isSuperAdmin = superAdminEmails.includes(email);
  const isDemo = isDemoEmail(email);

  // Check if user profile exists
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // Auto-create profile for super admins
    if (isSuperAdmin) {
      // Ensure a platform company exists for super admin
      const { data: platformCompany } = await supabase
        .from("companies")
        .select("id")
        .eq("slug", "harmoniq")
        .single();

      let companyId = platformCompany?.id;
      if (!companyId) {
        const { data: newCompany } = await supabase
          .from("companies")
          .insert([{
            name: "Harmoniq Platform",
            slug: "harmoniq",
            app_name: "Harmoniq Safety",
            country: "US",
            language: "en",
            status: "active",
            tier: "enterprise",
            seat_limit: 999,
          }])
          .select("id")
          .single();
        companyId = newCompany?.id;
      }

      await supabase.from("users").insert([{
        id: user.id,
        email: email,
        first_name: user.user_metadata?.given_name || user.user_metadata?.first_name || "Admin",
        last_name: user.user_metadata?.family_name || user.user_metadata?.last_name || "User",
        company_id: companyId,
        role: "super_admin",
        status: "active",
        email_verified_at: new Date().toISOString(),
        oauth_provider: user.app_metadata?.provider || "email",
        oauth_id: user.id,
      }]);

      // Log and redirect to platform
      await logAudit(supabase, user.id, "login_success", request);
      return NextResponse.redirect(new URL("/harmoniq/dashboard", requestUrl.origin));
    }

    // Non-super-admin without profile — must have been invited
    // Check for pending invitation
    const { data: invitation } = await supabase
      .from("invitations")
      .select("*")
      .eq("email", email)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (invitation) {
      // Accept invitation — create user profile
      await supabase.from("users").insert([{
        id: user.id,
        email: email,
        first_name: user.user_metadata?.given_name || user.user_metadata?.first_name || "New",
        last_name: user.user_metadata?.family_name || user.user_metadata?.last_name || "User",
        company_id: invitation.company_id,
        role: invitation.role,
        status: "active",
        email_verified_at: new Date().toISOString(),
        oauth_provider: user.app_metadata?.provider || "email",
        oauth_id: user.id,
      }]);

      // Mark invitation as accepted
      await supabase
        .from("invitations")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", invitation.id);

      await logAudit(supabase, user.id, "login_success", request);

      // Get company slug for redirect
      const { data: company } = await supabase
        .from("companies")
        .select("slug")
        .eq("id", invitation.company_id)
        .single();

      return NextResponse.redirect(
        new URL(`/${company?.slug || "harmoniq"}/dashboard`, requestUrl.origin)
      );
    }

    // No profile, no invitation — deny access
    await supabase.auth.signOut();
    return NextResponse.redirect(
      new URL("/login?error=No+account+found.+Contact+your+administrator+for+an+invitation.", requestUrl.origin)
    );
  }

  // User profile exists — route based on role
  await logAudit(supabase, user.id, "login_success", request);

  // Get user's company slug
  const { data: company } = await supabase
    .from("companies")
    .select("slug")
    .eq("id", profile.company_id)
    .single();

  const slug = company?.slug || "harmoniq";

  if (profile.role === "super_admin") {
    return NextResponse.redirect(new URL(`/${slug}/dashboard`, requestUrl.origin));
  }

  if (profile.role === "company_admin" || profile.role === "manager") {
    return NextResponse.redirect(new URL(`/${slug}/dashboard`, requestUrl.origin));
  }

  // Employee — route to employee app
  return NextResponse.redirect(new URL(`/${slug}/app`, requestUrl.origin));
}

async function logAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  action: string,
  request: NextRequest
) {
  try {
    await supabase.from("audit_logs").insert([{
      user_id: userId,
      action,
      resource: "auth",
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined,
    }]);
  } catch {}
}
