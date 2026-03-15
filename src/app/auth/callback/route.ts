import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { buildCompanyDestination } from "@/lib/navigation";
import { getPlatformSlugFilterList, getPlatformSlugs, isPlatformSlug } from "@/lib/platform-config";
import { getSuperAdminEmails } from "@/lib/server-config";

const APP_CHOICE_COOKIE = "harmoniq_app_choice";
const PLATFORM_SLUGS = getPlatformSlugs();
const PLATFORM_SLUGS_LIST = getPlatformSlugFilterList({ quoteValues: true });
type AppChoice = "dashboard" | "app";
type CallbackUser = {
  id: string;
  email?: string;
  user_metadata?: {
    given_name?: string;
    first_name?: string;
    family_name?: string;
    last_name?: string;
  };
  app_metadata?: {
    provider?: string;
  };
};

async function getFirstNonPlatformSlug(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string | null> {
  const { data: company } = await supabase
    .from("companies")
    .select("slug")
    .not("slug", "in", PLATFORM_SLUGS_LIST)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return company?.slug || null;
}

function normalizeAppChoice(choice?: string | null): AppChoice | null {
  if (choice === "dashboard" || choice === "app") return choice;
  return null;
}

function getAllowedApps(role: string): AppChoice[] {
  if (role === "employee") return ["app"];
  if (role === "super_admin") return ["dashboard"];
  if (role === "company_admin" || role === "manager") return ["dashboard", "app"];
  return ["dashboard"];
}

function resolveAppChoice(role: string, choice?: string | null): AppChoice {
  const normalized = normalizeAppChoice(choice);
  if (normalized) return normalized;
  const allowed = getAllowedApps(role);
  return allowed.includes("dashboard") ? "dashboard" : "app";
}

function isChoiceAllowed(role: string, choice: AppChoice): boolean {
  return getAllowedApps(role).includes(choice);
}

function redirectToLoginError(requestUrl: URL, message: string) {
  return NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent(message)}`, requestUrl.origin)
  );
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const source = requestUrl.searchParams.get("source");
  const type = requestUrl.searchParams.get("type");
  const inviteToken = requestUrl.searchParams.get("invite_token");

  const supabase = await createClient();

  // Handle OAuth callback (has code parameter)
  if (code) {
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) {
      return NextResponse.redirect(
        new URL("/login?error=OAuth+sign-in+failed", requestUrl.origin)
      );
    }

    // If this OAuth callback came from an invite flow, handle invite acceptance
    if (inviteToken) {
      const accepted = await acceptInviteIfPending(supabase, data.user, inviteToken, request, requestUrl);
      if (accepted) return accepted;
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
    return NextResponse.redirect(new URL("/reset-password", requestUrl.origin));
  }

  return NextResponse.redirect(
    new URL("/login?error=Invalid+callback", requestUrl.origin)
  );
}

async function acceptInviteIfPending(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: CallbackUser,
  inviteToken: string,
  request: NextRequest,
  requestUrl: URL
): Promise<NextResponse | null> {
  const email = user.email?.toLowerCase() || "";

  // Validate the invite token
  const { data: invitation } = await supabase
    .from("invitations")
    .select("*")
    .eq("token", inviteToken)
    .eq("email", email)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (!invitation) return null; // No valid invite, fall through to normal routing

  // Check if user profile already exists
  const { data: existingProfile } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!existingProfile) {
    // Create user profile from invite data
    await supabase.from("users").insert([{
      id: user.id,
      email: email,
      first_name: user.user_metadata?.given_name || user.user_metadata?.first_name || email.split("@")[0],
      last_name: user.user_metadata?.family_name || user.user_metadata?.last_name || "",
      full_name: `${user.user_metadata?.given_name || user.user_metadata?.first_name || email.split("@")[0]} ${user.user_metadata?.family_name || user.user_metadata?.last_name || ""}`.trim(),
      company_id: invitation.company_id,
      role: invitation.role,
      user_type: "internal",
      account_type: "standard",
      status: "active",
      email_verified_at: new Date().toISOString(),
      oauth_provider: user.app_metadata?.provider || "email",
      oauth_id: user.id,
      language: "en",
      theme: "system",
      two_factor_enabled: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }]);
  } else {
    // Activate existing profile
    await supabase.from("users").update({
      status: "active",
      email_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", user.id);
  }

  // Mark invitation as accepted
  await supabase
    .from("invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invitation.id);


  // Redirect to company app
  const { data: company } = await supabase
    .from("companies")
    .select("slug")
    .eq("id", invitation.company_id)
    .maybeSingle();

  const dest = buildCompanyDestination(company?.slug, invitation.role === "employee" ? "app" : "dashboard");
  return NextResponse.redirect(new URL(dest, requestUrl.origin));
}

async function routeAuthenticatedUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: CallbackUser,
  request: NextRequest,
  requestUrl: URL
) {
  const email = user.email?.toLowerCase() || "";
  const isAdminLink = requestUrl.searchParams.get("source") === "admin-link";
  const superAdminEmails = getSuperAdminEmails();
  const isSuperAdmin = isAdminLink && superAdminEmails.includes(email);
  const appChoiceCookie = request.cookies.get(APP_CHOICE_COOKIE)?.value;
  const denyAccess = async () => {
    await supabase.auth.signOut();
    return redirectToLoginError(
      requestUrl,
      "Access denied for the selected app. Please choose a permitted app."
    );
  };

  // Check if user profile exists
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    // Auto-create profile for super admins
    if (isSuperAdmin) {
      // Ensure a platform company exists for super admin
      const { data: platformCompany } = await supabase
        .from("companies")
        .select("id")
        .in("slug", PLATFORM_SLUGS)
        .limit(1)
        .maybeSingle();

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
          .maybeSingle();
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
      const requestedApp = resolveAppChoice("super_admin", appChoiceCookie);
      if (!isChoiceAllowed("super_admin", requestedApp)) {
        return await denyAccess();
      }

      // Super admin via login chooser should land on a tenant dashboard, never the platform portal.
      const { data: tenantCompany } = await supabase
        .from("companies")
        .select("slug")
        .not("slug", "in", PLATFORM_SLUGS_LIST)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!tenantCompany?.slug) {
        return NextResponse.redirect(
          new URL("/login?error=No+tenant+available.+Use+the+admin+link+for+platform+access.", requestUrl.origin)
        );
      }

      const dest = buildCompanyDestination(tenantCompany.slug, requestedApp);
      return NextResponse.redirect(new URL(dest, requestUrl.origin));
    }

    // Non-super-admin without profile, must have been invited
    // Check for pending invitation
    const { data: invitation } = await supabase
      .from("invitations")
      .select("*")
      .eq("email", email)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (invitation) {
      // Accept invitation, create user profile
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


      // Get company slug for redirect
      const { data: company } = await supabase
        .from("companies")
        .select("slug")
        .eq("id", invitation.company_id)
        .maybeSingle();

      const requestedApp = resolveAppChoice(invitation.role, appChoiceCookie);
      if (!isChoiceAllowed(invitation.role, requestedApp)) {
        return await denyAccess();
      }
      const dest = buildCompanyDestination(company?.slug, requestedApp);
      return NextResponse.redirect(new URL(dest, requestUrl.origin));
    }

    // No profile, no invitation. Deny access
    await supabase.auth.signOut();
    return NextResponse.redirect(
      new URL("/login?error=No+account+found.+Contact+your+administrator+for+an+invitation.", requestUrl.origin)
    );
  }

  // User profile exists, route based on role
  if (profile) {
    const updates: Record<string, string> = {
      last_login_at: new Date().toISOString(),
    };
    if (profile.status === "inactive") {
      updates.status = "active";
    }
    await supabase.from("users").update(updates).eq("id", profile.id);
    await supabase
      .from("invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("email", profile.email.toLowerCase())
      .is("accepted_at", null);
  }

  // If a super admin hits the regular login (non admin link), treat them like a company admin for routing
  const effectiveRole = profile.role === "super_admin" && !isAdminLink ? "company_admin" : profile.role;

  const requestedApp = resolveAppChoice(effectiveRole, appChoiceCookie);
  if (!isChoiceAllowed(effectiveRole, requestedApp)) {
    return await denyAccess();
  }

  // Super admin: from the chooser, route to a tenant dashboard (platform portal only via direct link).
  if (profile.role === "super_admin") {
    if (!isAdminLink) {
      const { data: tenantCompany } = await supabase
        .from("companies")
        .select("slug")
        .not("slug", "in", PLATFORM_SLUGS_LIST)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!tenantCompany?.slug) {
        return NextResponse.redirect(
          new URL("/login?error=No+tenant+available.+Use+the+admin+link+for+platform+access.", requestUrl.origin)
        );
      }

      const dest = buildCompanyDestination(tenantCompany.slug, "dashboard");
      return NextResponse.redirect(new URL(dest, requestUrl.origin));
    }

    const { data: tenantCompany } = await supabase
      .from("companies")
      .select("slug")
      .not("slug", "in", PLATFORM_SLUGS_LIST)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!tenantCompany?.slug) {
      return NextResponse.redirect(
        new URL("/login?error=No+tenant+available.+Use+the+admin+link+for+platform+access.", requestUrl.origin)
      );
    }

    const dest = buildCompanyDestination(tenantCompany.slug, "dashboard");
    return NextResponse.redirect(new URL(dest, requestUrl.origin));
  }

  // Get user's company slug (non–super-admin)
   const { data: company } = await supabase
    .from("companies")
    .select("slug")
    .eq("id", profile.company_id)
    .maybeSingle();

  let slug = company?.slug || null;

  // If the user is tied to a platform slug or has no company, fall back to the first non-platform tenant.
  if (!slug || isPlatformSlug(slug)) {
    const fallback = await getFirstNonPlatformSlug(supabase);
    if (!fallback) {
      await supabase.auth.signOut();
      return NextResponse.redirect(
        new URL("/login?error=No+tenant+available.+Use+the+admin+link+for+platform+access.", requestUrl.origin)
      );
    }
    slug = fallback;
  }

  const dest = buildCompanyDestination(slug, requestedApp);
  return NextResponse.redirect(new URL(dest, requestUrl.origin));
}
