import type { User } from "@/types";

const PREFS_KEY = "harmoniq_sidebar_prefs";

export interface SidebarPreferences {
  hiddenModules: string[];
  groupOrder: string[]; // e.g. ["operations", "reporting", "management", "admin"]
  itemOrder: Record<string, string[]>; // groupId -> ordered hrefs
}

const DEFAULT_PREFS: SidebarPreferences = {
  hiddenModules: [],
  groupOrder: ["operations", "reporting", "management", "admin"],
  itemOrder: {},
};

function getKey(userId: string) {
  return `${PREFS_KEY}_${userId}`;
}

export function getSidebarPreferences(userId: string): SidebarPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(getKey(userId));
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function saveSidebarPreferences(userId: string, prefs: Partial<SidebarPreferences>) {
  if (typeof window === "undefined") return;
  const current = getSidebarPreferences(userId);
  const merged = { ...current, ...prefs };
  try {
    localStorage.setItem(getKey(userId), JSON.stringify(merged));
  } catch { /* quota exceeded — ignore */ }
}
