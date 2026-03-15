"use client";

import * as React from "react";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user_id: string;
  user_name: string;
  company_id: string;
  action: "create" | "update" | "delete" | "status_change" | "assign";
  entity_type: "incident" | "ticket" | "work_order" | "corrective_action" | "asset" | "location" | "user" | "checklist" | "risk_assessment" | "content";
  entity_id: string;
  entity_title: string;
  details: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
}

export type NewAuditEntry = Omit<AuditLogEntry, "id" | "timestamp">;

const STORAGE_KEY = "harmoniq_audit_log";

const loadFromStorage = (): AuditLogEntry[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
};

const saveToStorage = (entries: AuditLogEntry[]) => {
  if (typeof window === "undefined") return;
  try {
    const trimmed = entries.slice(-1000);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch { /* quota exceeded */ }
};

// Module-level listeners so non-React code (logAudit) can trigger re-renders
type Listener = () => void;
let _entries: AuditLogEntry[] = loadFromStorage();
const _listeners = new Set<Listener>();

function notify() {
  _listeners.forEach((l) => l());
}

export function getAuditEntries(): AuditLogEntry[] {
  return _entries;
}

export function addAuditEntry(entry: NewAuditEntry): void {
  const newEntry: AuditLogEntry = {
    ...entry,
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  };
  _entries = [..._entries, newEntry];
  saveToStorage(_entries);
  notify();
}

export function getEntriesForEntity(entityType: string, entityId: string): AuditLogEntry[] {
  return _entries.filter((e) => e.entity_type === entityType && e.entity_id === entityId);
}

export function getEntriesByUser(userId: string): AuditLogEntry[] {
  return _entries.filter((e) => e.user_id === userId);
}

export function getRecentEntries(limit: number = 50): AuditLogEntry[] {
  return _entries.slice(-limit).reverse();
}

// React hook that subscribes to audit log changes
export function useAuditLogStore() {
  const [, rerender] = React.useState(0);

  React.useEffect(() => {
    const listener = () => rerender((n) => n + 1);
    _listeners.add(listener);
    return () => { _listeners.delete(listener); };
  }, []);

  return {
    entries: _entries,
    addEntry: addAuditEntry,
    getEntriesForEntity,
    getEntriesByUser,
    getRecentEntries,
  };
}
