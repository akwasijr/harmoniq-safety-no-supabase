import { NextRequest, NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_BRAND_PRIMARY_COLOR, DEFAULT_BRAND_SECONDARY_COLOR } from "@/lib/brand-defaults";
import { sanitizeText } from "@/lib/validation";

const companySettingsWriteLimiter = createRateLimiter({
  limit: 20,
  windowMs: 60_000,
  prefix: "company_settings",
});

const HEX_COLOR_REGEX = /^#[0-9a-f]{6}$/i;
const ALLOWED_COUNTRIES = new Set(["NL", "SE", "US", "GB", "DE", "FR", "ES"]);
const ALLOWED_LANGUAGES = new Set(["en", "nl", "sv", "de", "fr", "es"]);
const ALLOWED_CURRENCIES = new Set(["USD", "EUR", "SEK", "GBP"]);
const ALLOWED_UI_STYLES = new Set(["rounded", "square"]);
const ALLOWED_INDUSTRIES = new Set([
  "construction", "manufacturing", "oil_gas", "healthcare", "warehousing",
  "mining", "food_beverage", "utilities", "transportation", "education", "airports",
]);
function withNoStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function normalizeColor(value: unknown, fallback: string) {
  const candidate = sanitizeText(String(value ?? ""), 7);
  return HEX_COLOR_REGEX.test(candidate) ? candidate.toLowerCase() : fallback;
}

function normalizeOptionalString(value: unknown, maxLength: number) {
  const candidate = sanitizeText(String(value ?? ""), maxLength);
  return candidate || null;
}

export async function POST(request: NextRequest) {
  const rl = companySettingsWriteLimiter.check(request);
  if (!rl.allowed) {
    return rl.response;
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return withNoStore(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      );
    }

    const { data: profile } = await supabase
      .from("users")
      .select("company_id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      return withNoStore(
        NextResponse.json({ error: "User profile not found" }, { status: 403 }),
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const requestedCompanyId =
      typeof body.companyId === "string" && body.companyId.trim()
        ? body.companyId.trim()
        : profile.company_id;

    if (!requestedCompanyId) {
      return withNoStore(
        NextResponse.json({ error: "Company not found" }, { status: 400 }),
      );
    }

    const canManageCompany =
      profile.role === "super_admin" ||
      (profile.role === "company_admin" && requestedCompanyId === profile.company_id);

    if (!canManageCompany) {
      return withNoStore(
        NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      );
    }

    const updates = {
      name: sanitizeText(String(body.companyName ?? ""), 120) || "My Company",
      app_name: normalizeOptionalString(body.appName, 120),
      country: ALLOWED_COUNTRIES.has(String(body.selectedCountry ?? ""))
        ? String(body.selectedCountry)
        : "US",
      language: ALLOWED_LANGUAGES.has(String(body.language ?? ""))
        ? String(body.language)
        : "en",
      currency: ALLOWED_CURRENCIES.has(String(body.currency ?? ""))
        ? String(body.currency)
        : "USD",
      logo_url: normalizeOptionalString(body.logoUrl, 2000),
      primary_color: normalizeColor(
        body.primaryColor,
        DEFAULT_BRAND_PRIMARY_COLOR,
      ),
      secondary_color: normalizeColor(
        body.secondaryColor,
        DEFAULT_BRAND_SECONDARY_COLOR,
      ),
      tertiary_color: normalizeColor(
        body.tertiaryColor,
        "#10B981",
      ),
      industry: ALLOWED_INDUSTRIES.has(String(body.selectedIndustry ?? ""))
        ? String(body.selectedIndustry)
        : undefined,
      ui_style: ALLOWED_UI_STYLES.has(String(body.uiStyle ?? ""))
        ? String(body.uiStyle)
        : "rounded",
      updated_at: new Date().toISOString(),
    };

    // Remove undefined fields (Supabase would fail on them)
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );

    const adminClient = createAdminClient();
    const writeClient = adminClient ?? supabase;

    const { data: company, error } = await writeClient
      .from("companies")
      .update(cleanUpdates)
      .eq("id", requestedCompanyId)
      .select("*")
      .single();

    if (error || !company) {
      console.error("[CompanySettings] Failed to save company settings:", error);
      return withNoStore(
        NextResponse.json(
          { error: "Could not save your changes to the server." },
          { status: 500 },
        ),
      );
    }

    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const { error: auditError } = await writeClient.from("audit_logs").insert({
      company_id: requestedCompanyId,
      user_id: user.id,
      action: "company_settings_updated",
      resource: "companies",
      details: {
        name: updates.name,
        app_name: updates.app_name,
        country: updates.country,
        language: updates.language,
        currency: updates.currency,
        primary_color: updates.primary_color,
        secondary_color: updates.secondary_color,
      },
      ip_address: ipAddress,
      created_at: updates.updated_at,
    });

    if (auditError) {
      console.error("[CompanySettings] Failed to write audit log:", auditError);
    }

    return withNoStore(NextResponse.json({ company }));
  } catch (error) {
    console.error("[CompanySettings] Unexpected error:", error);
    return withNoStore(
      NextResponse.json(
        { error: "Could not save your changes to the server." },
        { status: 500 },
      ),
    );
  }
}
