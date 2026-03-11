function parseCsv(raw?: string | null) {
  return (raw || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function getSuperAdminEmails() {
  return parseCsv(process.env.SUPER_ADMIN_EMAILS);
}

