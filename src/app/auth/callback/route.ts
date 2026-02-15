import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const DEMO_COMPANY_SLUG = "harmoniq";
const DEMO_COMPANY_ID = "d0000000-0000-0000-0000-000000000001";
const APP_CHOICE_COOKIE = "harmoniq_app_choice";
const PLATFORM_SLUGS = (process.env.NEXT_PUBLIC_PLATFORM_SLUGS || "platform,admin,superadmin")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
const PLATFORM_SLUGS_LIST = `(${PLATFORM_SLUGS.map((s) => `'${s}'`).join(",")})`;
const isPlatformSlug = (slug?: string | null) =>
  !!slug && (PLATFORM_SLUGS.includes(slug.toLowerCase()) || slug.toLowerCase().includes("platform"));
type AppChoice = "dashboard" | "app";

function getSuperAdminEmails(): string[] {
  const raw = process.env.SUPER_ADMIN_EMAILS || "";
  return raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}

async function getFirstNonPlatformSlug(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string | null> {
  const { data: company } = await supabase
    .from("companies")
    .select("slug")
    .not("slug", "in", PLATFORM_SLUGS_LIST)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();
  return company?.slug || null;
}

function isDemoEmail(email: string): boolean {
  return email.toLowerCase() === "demo@harmoniq.safety";
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

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const source = requestUrl.searchParams.get("source");
  const type = requestUrl.searchParams.get("type");
  const isAdminLink = source === "admin-link";

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
  const isAdminLink = requestUrl.searchParams.get("source") === "admin-link";
  const superAdminEmails = getSuperAdminEmails();
  const isSuperAdmin = isAdminLink && superAdminEmails.includes(email);
  const isDemo = isDemoEmail(email);
  const appChoiceCookie = request.cookies.get(APP_CHOICE_COOKIE)?.value;
  const denyAccess = async () => {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      new URL("/login?error=Access+denied+for+the+selected+app.+Please+choose+a+permitted+app.", requestUrl.origin)
    );
  };

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
        .in("slug", PLATFORM_SLUGS)
        .limit(1)
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
        .single();

      if (!tenantCompany?.slug) {
        return NextResponse.redirect(
          new URL("/login?error=No+tenant+available.+Use+the+admin+link+for+platform+access.", requestUrl.origin)
        );
      }

      const dest = requestedApp === "app" ? `/${tenantCompany.slug}/app` : `/${tenantCompany.slug}/dashboard`;
      return NextResponse.redirect(new URL(dest, requestUrl.origin));
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

      const slug = company?.slug || "harmoniq";
      const requestedApp = resolveAppChoice(invitation.role, appChoiceCookie);
      if (!isChoiceAllowed(invitation.role, requestedApp)) {
        return await denyAccess();
      }
      const dest = requestedApp === "app" ? `/${slug}/app` : `/${slug}/dashboard`;
      return NextResponse.redirect(new URL(dest, requestUrl.origin));
    }

    // No profile, no invitation — deny access
    await supabase.auth.signOut();
    return NextResponse.redirect(
      new URL("/login?error=No+account+found.+Contact+your+administrator+for+an+invitation.", requestUrl.origin)
    );
  }

  // User profile exists — route based on role
  await logAudit(supabase, user.id, "login_success", request);
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
        .single();

      if (!tenantCompany?.slug) {
        return NextResponse.redirect(
          new URL("/login?error=No+tenant+available.+Use+the+admin+link+for+platform+access.", requestUrl.origin)
        );
      }

      const dest = `/${tenantCompany.slug}/dashboard`;
      return NextResponse.redirect(new URL(dest, requestUrl.origin));
    }

    const { data: tenantCompany } = await supabase
      .from("companies")
      .select("slug")
      .not("slug", "in", PLATFORM_SLUGS_LIST)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (!tenantCompany?.slug) {
      return NextResponse.redirect(
        new URL("/login?error=No+tenant+available.+Use+the+admin+link+for+platform+access.", requestUrl.origin)
      );
    }

    const dest = `/${tenantCompany.slug}/dashboard`;
    return NextResponse.redirect(new URL(dest, requestUrl.origin));
  }

  // Get user's company slug (non–super-admin)
   const { data: company } = await supabase
    .from("companies")
    .select("slug")
    .eq("id", profile.company_id)
    .single();

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

  const dest = requestedApp === "app" ? `/${slug}/app` : `/${slug}/dashboard`;
  return NextResponse.redirect(new URL(dest, requestUrl.origin));
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
