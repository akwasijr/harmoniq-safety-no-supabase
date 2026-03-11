const DEFAULT_SITE_URL = "https://harmoniqsafety.com";

function normalizeSiteUrl(url: string) {
  return url.replace(/\/+$/, "");
}

export function getConfiguredSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  return configured ? normalizeSiteUrl(configured) : null;
}

export function getSiteUrl() {
  const configured = getConfiguredSiteUrl();
  if (configured) {
    return configured;
  }

  if (typeof window !== "undefined" && window.location.origin) {
    return normalizeSiteUrl(window.location.origin);
  }

  return DEFAULT_SITE_URL;
}

export function buildSiteUrl(path: string) {
  return new URL(path, `${getSiteUrl()}/`).toString();
}
