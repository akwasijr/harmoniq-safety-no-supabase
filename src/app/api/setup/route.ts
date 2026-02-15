import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * First-time setup: creates the first company + super admin.
 * Only works when zero companies exist in the database.
 * POST /api/setup { email, password, company_name, country }
 */
export async function POST(request: NextRequest) {
  try {
    const adminClient = createAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY not configured. Set it in Vercel environment variables." },
        { status: 500 }
      );
    }

    // Check if any companies exist
    const { count } = await adminClient
      .from("companies")
      .select("id", { count: "exact", head: true });

    if (count && count > 0) {
      return NextResponse.json(
        { error: "Setup already completed. Companies already exist." },
        { status: 409 }
      );
    }

    const body = await request.json();
    const { email, password, company_name, country } = body;

    if (!email || !password || !company_name) {
      return NextResponse.json(
        { error: "email, password, and company_name are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // 1. Create the company
    const slug = company_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const { data: company, error: companyError } = await adminClient
      .from("companies")
      .insert({
        name: company_name,
        slug: slug || "harmoniq",
        app_name: company_name,
        country: country || "US",
        language: "en",
        status: "active",
        tier: "enterprise",
        seat_limit: 999,
      })
      .select()
      .single();

    if (companyError) {
      return NextResponse.json({ error: `Failed to create company: ${companyError.message}` }, { status: 500 });
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
      return NextResponse.json({ error: `Failed to create auth user: ${authError.message}` }, { status: 500 });
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
        language: "en",
        theme: "system",
        two_factor_enabled: false,
      });

    if (profileError) {
      return NextResponse.json({ error: `Failed to create profile: ${profileError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Setup complete! You can now log in.",
      company: { id: company.id, name: company.name, slug: company.slug },
      user: { email, role: "super_admin" },
      login_url: `/admin`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** GET: Check if setup is needed */
export async function GET() {
  try {
    const adminClient = createAdminClient();
    if (!adminClient) {
      return NextResponse.json({ needs_setup: true, reason: "service_role_key_missing" });
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
