import type { Incident } from "@/types";

/**
 * Default escalation rules — checked client-side when incidents load.
 * If an incident is still "new" (unacknowledged) past the threshold,
 * it gets flagged as escalated.
 */
const ESCALATION_THRESHOLDS: { severity: string; hours: number }[] = [
  { severity: "critical", hours: 1 },
  { severity: "high", hours: 4 },
  { severity: "medium", hours: 24 },
  { severity: "low", hours: 72 },
];

/** Check if an incident should be escalated based on time since creation */
export function shouldEscalate(incident: Incident): boolean {
  if (incident.status !== "new") return false;
  if (incident.escalated) return false;

  const rule = ESCALATION_THRESHOLDS.find((r) => r.severity === incident.severity);
  if (!rule) return false;

  const createdAt = new Date(incident.created_at).getTime();
  const now = Date.now();
  const hoursElapsed = (now - createdAt) / (1000 * 60 * 60);

  return hoursElapsed >= rule.hours;
}

/** Check all incidents and return IDs that need escalation */
export function getEscalationCandidates(incidents: Incident[]): string[] {
  return incidents.filter(shouldEscalate).map((i) => i.id);
}
