import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRateLimiter } from "@/lib/rate-limit";
import { sanitizeText, isValidEmail, validatePassword } from "@/lib/validation";
import { buildRegionalDefaults } from "@/lib/company-settings";

// 5 setup attempts per IP per 10 minutes
const setupLimiter = createRateLimiter({ limit: 5, windowMs: 600_000, prefix: "setup" });

/**
 * First-time setup: creates the first company + super admin.
 * Only works when zero companies exist in the database.
 * POST /api/setup { email, password, company_name, country }
 */
export async function POST(request: NextRequest) {
  try {
    const rl = setupLimiter.check(request);
    if (!rl.allowed) return rl.response;
    const adminClient = createAdminClient();
    if (!adminClient) {
      console.error("[Setup API] Admin client unavailable for setup request.");
      return NextResponse.json(
        { error: "Setup is unavailable on this deployment." },
        { status: 500 }
      );
    }

    // Check if any companies exist
    const { count, error: companyCountError } = await adminClient
      .from("companies")
      .select("id", { count: "exact", head: true });

    if (companyCountError) {
      console.error("[Setup API] Failed to count companies:", companyCountError);
      return NextResponse.json({ error: "Unable to verify setup state." }, { status: 500 });
    }

    if (count && count > 0) {
      return NextResponse.json(
        { error: "Setup already completed. Companies already exist." },
        { status: 409 }
      );
    }

    const body = await request.json();
    const email = sanitizeText(body.email, 254).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";
    const company_name = sanitizeText(body.company_name, 200);
    const country = sanitizeText(body.country || "US", 10);
    const regionalDefaults = buildRegionalDefaults(country);

    if (!email || !password || !company_name) {
      return NextResponse.json(
        { error: "email, password, and company_name are required" },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
      return NextResponse.json({ error: pwCheck.reason }, { status: 400 });
    }

    // 1. Create the company
    const slug = company_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const { data: company, error: companyError } = await adminClient
      .from("companies")
      .insert({
        name: company_name,
        slug: slug || "harmoniq",
        app_name: company_name,
        country: regionalDefaults.country,
        language: regionalDefaults.language,
        status: "active",
        tier: "enterprise",
        seat_limit: 999,
        currency: regionalDefaults.currency,
      })
      .select()
      .single();

    if (companyError) {
      console.error("[Setup API] Failed to create company:", companyError);
      return NextResponse.json({ error: "Failed to create the initial company." }, { status: 500 });
    }

    // 2. Create the auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      // Clean up company
      await adminClient.from("companies").delete().eq("id", company.id);
      console.error("[Setup API] Failed to create auth user:", authError);
      return NextResponse.json({ error: "Failed to provision the initial administrator." }, { status: 500 });
    }

    // 3. Create the profile
    const { error: profileError } = await adminClient
      .from("users")
      .insert({
        id: authData.user.id,
        company_id: company.id,
        email: email.toLowerCase(),
        first_name: "Admin",
        last_name: "User",
        full_name: "Admin User",
        role: "super_admin",
        user_type: "internal",
        account_type: "admin",
        status: "active",
        language: regionalDefaults.language,
        theme: "system",
        two_factor_enabled: false,
      });

    if (profileError) {
      console.error("[Setup API] Failed to create admin profile:", profileError);
      await adminClient.auth.admin.deleteUser(authData.user.id);
      await adminClient.from("companies").delete().eq("id", company.id);
      return NextResponse.json({ error: "Failed to finalize the initial administrator profile." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Setup complete! You can now log in.",
      company: { id: company.id, name: company.name, slug: company.slug },
      user: { email, role: "super_admin" },
      login_url: `/admin`,
    });
  } catch (err: unknown) {
    console.error("[Setup API] Unexpected setup error:", err);
    return NextResponse.json({ error: "Setup failed. Please try again." }, { status: 500 });
  }
}

/** GET: Check if setup is needed */
export async function GET() {
  try {
    const adminClient = createAdminClient();
    if (!adminClient) {
      return NextResponse.json({ needs_setup: true, reason: "admin_key_missing" });
    }

    const { count } = await adminClient
      .from("companies")
      .select("id", { count: "exact", head: true });

    return NextResponse.json({
      needs_setup: !count || count === 0,
      company_count: count || 0,
    });
  } catch {
    return NextResponse.json({ needs_setup: true, reason: "error" });
  }
}
