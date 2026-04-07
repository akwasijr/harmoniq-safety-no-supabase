export async function logPlatformAuditEvent({
  action,
  resource,
  details,
  companyId,
}: {
  action: string;
  resource: string;
  details?: Record<string, unknown>;
  companyId?: string | null;
}) {
  try {
    await fetch("/api/platform/audit-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        resource,
        details,
        companyId,
      }),
    });
  } catch (error) {
    console.warn("[PlatformAudit] Failed to log event", error);
  }
}
