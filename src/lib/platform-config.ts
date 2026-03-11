const DEFAULT_PLATFORM_SLUGS = ["platform", "admin", "superadmin", "harmoniq"];

function parseCsv(raw?: string | null) {
  return (raw || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function getPlatformSlugs() {
  const configured = parseCsv(process.env.NEXT_PUBLIC_PLATFORM_SLUGS);
  return configured.length > 0 ? configured : DEFAULT_PLATFORM_SLUGS;
}

export function getPlatformSlugFilterList(options?: { quoteValues?: boolean }) {
  const { quoteValues = false } = options ?? {};
  const values = getPlatformSlugs().map((slug) => (quoteValues ? `'${slug.replace(/'/g, "''")}'` : slug));
  return `(${values.join(",")})`;
}

export function isPlatformSlug(slug?: string | null) {
  if (!slug) return false;
  const normalized = slug.trim().toLowerCase();
  return getPlatformSlugs().includes(normalized) || normalized.includes("platform");
}
