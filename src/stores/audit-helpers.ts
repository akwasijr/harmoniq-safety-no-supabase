import { addAuditEntry, type NewAuditEntry } from "./audit-log-store";

export function logAudit(entry: NewAuditEntry) {
  addAuditEntry(entry);
}
