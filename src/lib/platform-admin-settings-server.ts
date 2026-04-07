import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_PLATFORM_ADMIN_SETTINGS,
  normalizePlatformAdminSettings,
  PLATFORM_ADMIN_SETTINGS_KEY,
} from "@/lib/platform-admin-settings";

export async function getPlatformAdminSettings() {
  const adminClient = createAdminClient();
  if (!adminClient) {
    return DEFAULT_PLATFORM_ADMIN_SETTINGS;
  }

  const { data, error } = await adminClient
    .from("platform_settings")
    .select("value")
    .eq("key", PLATFORM_ADMIN_SETTINGS_KEY)
    .maybeSingle();

  if (error || !data?.value) {
    return DEFAULT_PLATFORM_ADMIN_SETTINGS;
  }

  return normalizePlatformAdminSettings(data.value);
}
