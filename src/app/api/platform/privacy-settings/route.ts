import { NextRequest, NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/rate-limit";
import {
  DEFAULT_PLATFORM_PRIVACY_SETTINGS,
  normalizePlatformPrivacySettings,
  PLATFORM_PRIVACY_SETTINGS_KEY,
} from "@/lib/platform-privacy-settings";
import { getPublicPlatformPrivacySettings } from "@/lib/platform-privacy-settings-server";
import { createClient } from "@/lib/supabase/server";

const privacySettingsWriteLimiter = createRateLimiter({
  limit: 20,
  windowMs: 60_000,
  prefix: "platform_privacy_settings",
});

function withNoStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET() {
  const settings = await getPublicPlatformPrivacySettings();
  return withNoStore(NextResponse.json(settings));
}

export async function POST(request: NextRequest) {
  const rl = privacySettingsWriteLimiter.check(request);
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
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || !["super_admin", "company_admin"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const settings = normalizePlatformPrivacySettings(body);

    const { error } = await supabase.from("platform_settings").upsert(
      {
        key: PLATFORM_PRIVACY_SETTINGS_KEY,
        value: settings,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    if (error) {
      return NextResponse.json(
        { error: "Failed to save privacy settings", details: error.message },
        { status: 500 }
      );
    }

    return withNoStore(NextResponse.json(settings));
  } catch {
    return withNoStore(
      NextResponse.json({ error: "Failed to save privacy settings" }, { status: 500 })
    );
  }
}
