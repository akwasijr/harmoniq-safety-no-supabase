"use client";

/**
 * Offline queue for field app submissions.
 * Stores pending reports in localStorage and syncs when connectivity returns.
 */

import type { Incident } from "@/types";
import { useState, useEffect, useCallback, useRef } from "react";

const QUEUE_KEY = "harmoniq_offline_queue";
const MAX_RETRIES = 3;

export interface QueuedReport {
  id: string;
  incident: Incident;
  photoFileIds: string[];
  queuedAt: string;
  retries: number;
  lastError?: string;
}

function getQueue(): QueuedReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedReport[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/** Add an incident to the offline queue */
export function enqueueReport(incident: Incident, photoFileIds: string[] = []): void {
  const queue = getQueue();
  queue.push({
    id: `offline_${Date.now()}`,
    incident,
    photoFileIds,
    queuedAt: new Date().toISOString(),
    retries: 0,
  });
  saveQueue(queue);
}

/** Get all pending queued reports */
export function getPendingReports(): QueuedReport[] {
  return getQueue();
}

/** Remove a report from the queue (after successful sync) */
export function dequeueReport(id: string): void {
  const queue = getQueue().filter((r) => r.id !== id);
  saveQueue(queue);
}

/** Mark a report as failed (increment retry count) */
function markRetry(id: string, error: string): void {
  const queue = getQueue().map((r) =>
    r.id === id ? { ...r, retries: r.retries + 1, lastError: error } : r
  );
  // Drop items that exceeded max retries
  saveQueue(queue.filter((r) => r.retries <= MAX_RETRIES));
}

/** Check if the browser is currently online */
export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

/**
 * Try to sync all queued reports.
 * Returns { synced: number, failed: number }
 */
export async function syncQueue(
  addIncident: (incident: Incident) => void,
): Promise<{ synced: number; failed: number }> {
  const queue = getPendingReports();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const report of queue) {
    try {
      addIncident(report.incident);
      dequeueReport(report.id);
      synced++;
    } catch {
      markRetry(report.id, "Sync failed");
      failed++;
    }
  }

  return { synced, failed };
}

/**
 * Hook: provides online status, pending count, and auto-sync.
 */
export function useOfflineSync(addIncident?: (incident: Incident) => void) {
  const [online, setOnline] = useState(() => isOnline());
  const [pendingCount, setPendingCount] = useState(() => getPendingReports().length);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{ synced: number; failed: number } | null>(null);
  const syncInProgress = useRef(false);

  const refreshCount = useCallback(() => {
    setPendingCount(getPendingReports().length);
  }, []);

  const doSync = useCallback(async () => {
    if (!addIncident || syncInProgress.current || !isOnline()) return;
    const queue = getPendingReports();
    if (queue.length === 0) return;

    syncInProgress.current = true;
    setSyncing(true);
    try {
      const result = await syncQueue(addIncident);
      setLastSyncResult(result);
      refreshCount();
    } finally {
      setSyncing(false);
      syncInProgress.current = false;
    }
  }, [addIncident, refreshCount]);

  // Auto-sync when coming back online
  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      // Delay slightly to let connection stabilize
      setTimeout(() => doSync(), 1000);
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [doSync]);

  // Try sync on mount if there are pending items
  useEffect(() => {
    if (isOnline() && getPendingReports().length > 0) {
      doSync();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { online, pendingCount, syncing, lastSyncResult, doSync, refreshCount };
}
