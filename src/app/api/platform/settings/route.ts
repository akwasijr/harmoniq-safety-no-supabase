import { NextRequest, NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/rate-limit";
import {
  normalizePlatformAdminSettings,
  PLATFORM_ADMIN_SETTINGS_KEY,
} from "@/lib/platform-admin-settings";
import { getPlatformAdminSettings } from "@/lib/platform-admin-settings-server";
import { createClient } from "@/lib/supabase/server";

const platformSettingsWriteLimiter = createRateLimiter({
  limit: 20,
  windowMs: 60_000,
  prefix: "platform_admin_settings",
});

function withNoStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await getPlatformAdminSettings();
  return withNoStore(NextResponse.json(settings));
}

export async function POST(request: NextRequest) {
  const rl = platformSettingsWriteLimiter.check(request);
  if (!rl.allowed) {
    return rl.response;
  }

  try {
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
    const settings = normalizePlatformAdminSettings(body);
    const timestamp = new Date().toISOString();

    const { error } = await supabase.from("platform_settings").upsert(
      {
        key: PLATFORM_ADMIN_SETTINGS_KEY,
        value: settings,
        updated_by: user.id,
        updated_at: timestamp,
      },
      { onConflict: "key" },
    );

    if (error) {
      console.error("[Platform API]", error);
      return NextResponse.json(
        { error: "Failed to save platform settings" },
        { status: 500 },
      );
    }

    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const { error: auditError } = await supabase.from("audit_logs").insert({
      company_id: profile.company_id,
      user_id: user.id,
      action: "platform_settings_updated",
      resource: "platform_settings",
      details: {
        platformName: settings.platformName,
        defaultCurrency: settings.defaultCurrency,
        maintenanceMode: settings.maintenanceMode,
        allowSelfSignup: settings.allowSelfSignup,
      },
      ip_address: ipAddress,
      created_at: timestamp,
    });

    if (auditError) {
      console.error("[PlatformSettings] Failed to write audit log:", auditError.message);
    }

    return withNoStore(NextResponse.json(settings));
  } catch {
    return withNoStore(
      NextResponse.json({ error: "Failed to save platform settings" }, { status: 500 }),
    );
  }
}
