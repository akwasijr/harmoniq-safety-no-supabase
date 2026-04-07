import { NextRequest, NextResponse } from "next/server";
import { sanitizeText } from "@/lib/validation";
import { createClient } from "@/lib/supabase/server";
import { createRateLimiter } from "@/lib/rate-limit";
import {
  DEFAULT_BRAND_PRIMARY_COLOR,
  DEFAULT_BRAND_SECONDARY_COLOR,
} from "@/lib/brand-defaults";

const companiesLimiter = createRateLimiter({ limit: 10, windowMs: 60_000, prefix: "platform-companies" });

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(request: NextRequest) {
  try {
    const rl = companiesLimiter.check(request);
    if (!rl.allowed) return rl.response;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role, company_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const name = sanitizeText(body.name, 120);
    const appName = sanitizeText(body.app_name ?? "", 120) || null;
    const slug = slugify(name);

    if (!name || !slug) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }

    const { data: existingCompany } = await supabase
      .from("companies")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existingCompany) {
      return NextResponse.json({ error: "A company with this slug already exists" }, { status: 409 });
    }

    const now = new Date().toISOString();
    const companyPayload = {
      name,
      slug,
      app_name: appName,
      country: sanitizeText(body.country, 8),
      language: sanitizeText(body.language, 8),
      currency: sanitizeText(body.currency, 8),
      tier: sanitizeText(body.tier, 32),
      seat_limit: typeof body.seat_limit === "number" ? body.seat_limit : Number.parseInt(String(body.seat_limit ?? 0), 10) || 0,
      status: sanitizeText(body.status, 32) || "trial",
      primary_color:
        sanitizeText(body.primary_color, 32) || DEFAULT_BRAND_PRIMARY_COLOR,
      secondary_color:
        sanitizeText(body.secondary_color, 32) || DEFAULT_BRAND_SECONDARY_COLOR,
      font_family: sanitizeText(body.font_family ?? "Inter", 80) || "Inter",
      ui_style: sanitizeText(body.ui_style ?? "rounded", 32) || "rounded",
      logo_url: null,
      hero_image_url: null,
      trial_ends_at: typeof body.trial_ends_at === "string" ? body.trial_ends_at : null,
      created_at: now,
      updated_at: now,
    };

    const { data: createdCompany, error } = await supabase
      .from("companies")
      .insert(companyPayload)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to create company", details: error.message },
        { status: 500 },
      );
    }

    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const { error: auditError } = await supabase.from("audit_logs").insert({
      company_id: profile.company_id,
      user_id: user.id,
      action: "platform_company_created",
      resource: "companies",
      details: {
        company_id: createdCompany.id,
        company_name: createdCompany.name,
        tier: createdCompany.tier,
      },
      ip_address: ipAddress,
      created_at: now,
    });

    if (auditError) {
      console.error("[PlatformCompanies] Failed to write audit log:", auditError.message);
    }

    return NextResponse.json({ company: createdCompany });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create company";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
