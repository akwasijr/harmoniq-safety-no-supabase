export type AppChoice = "dashboard" | "app";

const DEFAULT_COMPANY_SLUG = "harmoniq";
const COMPANY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeCompanySlug(slug: string | null | undefined, fallback = DEFAULT_COMPANY_SLUG) {
  const candidate = slug?.trim().toLowerCase() ?? "";
  return COMPANY_SLUG_PATTERN.test(candidate) ? candidate : fallback;
}

export function buildCompanyDestination(slug: string | null | undefined, appChoice: AppChoice) {
  const safeSlug = normalizeCompanySlug(slug);
  return appChoice === "app" ? `/${safeSlug}/app` : `/${safeSlug}/dashboard`;
}

export function buildPlatformAnalyticsDestination(slug: string | null | undefined) {
  const safeSlug = normalizeCompanySlug(slug);
  return `/${safeSlug}/dashboard/platform/analytics`;
}

export function sanitizeRelativePath(path: string | null | undefined, fallback = "/") {
  if (!path || !path.startsWith("/")) return fallback;
  if (path.startsWith("//") || path.includes("://") || path.includes("\\") || path.includes("\0")) {
    return fallback;
  }
  return path;
}
