"use client";

import * as React from "react";
import { loadFromStorage, saveToStorage } from "@/lib/local-storage";
import type { SyncQueueItem, SyncItemType } from "@/types";

const SYNC_QUEUE_KEY = "harmoniq_sync_queue";
const OFFLINE_CACHE_KEY = "harmoniq_offline_cache";

interface SyncContextType {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  queue: SyncQueueItem[];
  addToQueue: (type: SyncItemType, payload: Record<string, unknown>) => void;
  syncNow: () => Promise<void>;
  cacheForOffline: (key: string, data: unknown) => void;
  getOfflineCache: <T>(key: string) => T | null;
}

const SyncContext = React.createContext<SyncContextType | null>(null);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = React.useState(true);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [queue, setQueue] = React.useState<SyncQueueItem[]>(() =>
    loadFromStorage<SyncQueueItem[]>(SYNC_QUEUE_KEY, [])
  );

  // Monitor online/offline status
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      syncNow();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Persist queue
  React.useEffect(() => {
    saveToStorage(SYNC_QUEUE_KEY, queue);
  }, [queue]);

  const pendingCount = queue.filter((item) => item.status === "pending").length;

  const addToQueue = React.useCallback(
    (type: SyncItemType, payload: Record<string, unknown>) => {
      const item: SyncQueueItem = {
        id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type,
        payload,
        status: "pending",
        created_at: new Date().toISOString(),
        synced_at: null,
        error: null,
      };
      setQueue((prev) => [...prev, item]);
    },
    []
  );

  // NOTE: No server sync endpoint exists yet. Items stay "pending" until a
  // real API is wired up. When that happens, POST each item to the server and
  // only mark "synced" on a 2xx response.
  const syncNow = React.useCallback(async () => {
    if (isSyncing) return;

    const pending = queue.filter((item) => item.status === "pending");
    if (pending.length === 0) return;

    setIsSyncing(true);

    try {
      // TODO: Replace with real API calls, e.g.:
      // for (const item of pending) {
      //   const res = await fetch(`/api/sync`, { method: "POST", body: JSON.stringify(item) });
      //   if (res.ok) markSynced(item.id);
      // }

      // For now, no-op — items remain pending until a server endpoint exists.

      // Clean up synced items older than 24 hours (from future real syncs)
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      setQueue((prev) =>
        prev.filter(
          (item) =>
            item.status !== "synced" ||
            new Date(item.synced_at || item.created_at).getTime() > cutoff
        )
      );
    } catch {
      // Sync errors are non-fatal
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, queue]);

  const cacheForOffline = React.useCallback((key: string, data: unknown) => {
    const cache = loadFromStorage<Record<string, unknown>>(OFFLINE_CACHE_KEY, {});
    cache[key] = data;
    saveToStorage(OFFLINE_CACHE_KEY, cache);
  }, []);

  const getOfflineCache = React.useCallback(<T,>(key: string): T | null => {
    const cache = loadFromStorage<Record<string, unknown>>(OFFLINE_CACHE_KEY, {});
    return (cache[key] as T) ?? null;
  }, []);

  const value = React.useMemo(
    () => ({
      isOnline,
      pendingCount,
      isSyncing,
      queue,
      addToQueue,
      syncNow,
      cacheForOffline,
      getOfflineCache,
    }),
    [isOnline, pendingCount, isSyncing, queue, addToQueue, syncNow, cacheForOffline, getOfflineCache]
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const ctx = React.useContext(SyncContext);
  if (!ctx) throw new Error("useSync must be used within SyncProvider");
  return ctx;
}
