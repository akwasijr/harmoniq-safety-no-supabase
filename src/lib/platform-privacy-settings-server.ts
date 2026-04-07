import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_PLATFORM_PRIVACY_SETTINGS,
  normalizePlatformPrivacySettings,
  PLATFORM_PRIVACY_SETTINGS_KEY,
} from "@/lib/platform-privacy-settings";

export async function getPublicPlatformPrivacySettings() {
  const adminClient = createAdminClient();
  if (!adminClient) {
    return DEFAULT_PLATFORM_PRIVACY_SETTINGS;
  }

  const { data, error } = await adminClient
    .from("platform_settings")
    .select("value")
    .eq("key", PLATFORM_PRIVACY_SETTINGS_KEY)
    .maybeSingle();

  if (error || !data?.value) {
    return DEFAULT_PLATFORM_PRIVACY_SETTINGS;
  }

  return normalizePlatformPrivacySettings(data.value);
}
