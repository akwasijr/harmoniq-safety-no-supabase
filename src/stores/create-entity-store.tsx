"use client";

import * as React from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { loadFromStorage, saveToStorage } from "@/lib/local-storage";
import { hasSupabasePublicEnv } from "@/lib/supabase/public-env";
import { subscribeToRealtimeInvalidation } from "@/lib/supabase/realtime-invalidation";
import { sanitizeText } from "@/lib/validation";

// ── Module-level cache ──────────────────────────────────────────────
// Persists across Provider re-mounts so tab navigation never re-fetches
// fresh data from Supabase unless stale.
const globalLoadedCache = new Map<string, number>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

function isCacheFresh(key: string): boolean {
  const ts = globalLoadedCache.get(key);
  return ts != null && Date.now() - ts < CACHE_TTL_MS;
}

/** Retry an entity-upsert POST with exponential backoff. Skips retry on 401/403. */
async function syncWithRetry(
  url: string,
  body: object,
  table: string,
  maxAttempts = 3,
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) return true;
      const resBody = await res.json().catch(() => ({ error: "Unknown error" }));
      const errMsg = resBody.error || `HTTP ${res.status}`;
      // Do not retry on auth errors, client errors (4xx), or rate limits.
      // Retrying 429s worsens the rate limit situation.
      if (res.status >= 400 && res.status < 500) {
        if (res.status === 429) {
          console.warn(`[Harmoniq] Cloud sync rate-limited for ${table}: ${errMsg}`);
        } else if (res.status === 401 || res.status === 403) {
          console.warn(`[Harmoniq] Cloud sync denied for ${table}: ${errMsg}`);
        } else {
          console.warn(`[Harmoniq] Cloud sync rejected for ${table}: ${errMsg}`);
        }
        return false;
      }
      // Only retry on 5xx server errors
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      } else {
        console.warn(`[Harmoniq] Cloud sync failed for ${table} after ${maxAttempts} attempts: ${errMsg}`);
      }
    } catch (syncErr) {
      // Network errors — retry
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      } else {
        console.warn(`[Harmoniq] Cloud sync failed for ${table}:`, syncErr);
      }
    }
  }
  return false;
}

/** Recursively sanitize all string values in an entity before writing. */
function sanitizeEntity<T extends Record<string, unknown>>(entity: T): T {
  const sanitized = { ...entity };
  for (const key of Object.keys(sanitized)) {
    const val = sanitized[key];
    if (typeof val === "string") {
      (sanitized as Record<string, unknown>)[key] = sanitizeText(val);
    } else if (val && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
      (sanitized as Record<string, unknown>)[key] = sanitizeEntity(val as Record<string, unknown>);
    }
  }
  return sanitized;
}


type IdEntity = { id: string };
type CompanyEntity = IdEntity & { company_id: string };

export interface EntityStore<T extends IdEntity> {
  items: T[];
  isLoading: boolean;
  error: string | null;
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  getById: (id: string) => T | undefined;
  add: (item: T) => void;
  update: (id: string, updates: Partial<T>) => void;
  remove: (id: string) => void;
  /** Returns items filtered by company_id. Only works for entities with company_id field. */
  itemsForCompany: (companyId: string | null | undefined) => T[];
  ensureLoaded: () => void;
  clearError: () => void;
}

const isSupabaseConfigured =
  typeof window !== "undefined" &&
  hasSupabasePublicEnv();

/** Debounce delay for localStorage writes (ms) */
const SAVE_DEBOUNCE_MS = 500;

/** Column mapping: app field name → Supabase column name */
type ColumnMap = Record<string, string>;

/** Strip fields that don't exist in Supabase and remap names (TS → DB) */
function mapToSupabase<T extends Record<string, unknown>>(
  item: T,
  columnMap?: ColumnMap,
  stripFields?: string[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(item)) {
    if (stripFields?.includes(key)) continue;
    const mappedKey = columnMap?.[key] || key;
    result[mappedKey] = value;
  }
  return result;
}

/** Reverse-map Supabase column names back to app field names (DB → TS) */
function mapFromSupabase<T>(
  row: Record<string, unknown>,
  columnMap?: ColumnMap
): T {
  if (!columnMap) return row as T;
  // Build reverse map: DB column → TS field
  const reverse: Record<string, string> = {};
  for (const [tsKey, dbCol] of Object.entries(columnMap)) {
    reverse[dbCol] = tsKey;
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const mappedKey = reverse[key] || key;
    result[mappedKey] = value;
  }
  return result as T;
}

interface StoreOptions {
  tableName?: string;
  /** Map app field names to Supabase column names */
  columnMap?: ColumnMap;
  /** Fields to strip before sending to Supabase (e.g., joined relations) */
  stripFields?: string[];
  /** Subscribe to Supabase realtime invalidation for near-live updates */
  realtimeSubscribe?: boolean;
}

/**
 * Creates an entity store that auto-selects between Supabase and localStorage.
 * @param storageKey - localStorage key (used as fallback and to derive table name)
 * @param initialData - mock data fallback for localStorage mode
 * @param optionsOrTableName - StoreOptions or just a table name string
 */
export function createEntityStore<T extends IdEntity>(
  storageKey: string,
  initialData: T[],
  optionsOrTableName?: string | StoreOptions
) {
  const opts: StoreOptions = typeof optionsOrTableName === "string"
    ? { tableName: optionsOrTableName }
    : optionsOrTableName || {};
  // Derive Supabase table name from storage key: "harmoniq_incidents" → "incidents"
  const table = opts.tableName || storageKey.replace(/^harmoniq_/, "");

  const Context = React.createContext<EntityStore<T> | undefined>(undefined);

  function Provider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = React.useState<T[]>(initialData);
    const [isLoading, setIsLoading] = React.useState(isSupabaseConfigured);
    const [error, setError] = React.useState<string | null>(null);
    const hasLoadedRef = React.useRef(false);
    const isFetchingRef = React.useRef(false);
    const isMountedRef = React.useRef(true);
    const realtimeRefreshTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const writeInFlightRef = React.useRef(0);

    // Hydrate from localStorage on mount (client-only) to avoid SSR mismatch
    React.useEffect(() => {
      const cached = loadFromStorage<T[]>(storageKey, []);
      if (cached.length > 0) {
        const cachedIds = new Set(cached.map((item) => item.id));
        const newItems = initialData.filter((item) => !cachedIds.has(item.id));
        const merged = newItems.length > 0 ? [...cached, ...newItems] : cached;
        setItems(merged);
        itemsRef.current = merged;
      }
      if (!isSupabaseConfigured || isCacheFresh(storageKey)) {
        setIsLoading(false);
        hasLoadedRef.current = true;
      }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    React.useEffect(() => {
      return () => {
        isMountedRef.current = false;
        if (realtimeRefreshTimerRef.current) {
          clearTimeout(realtimeRefreshTimerRef.current);
        }
      };
    }, []);

    const ensureLoaded = React.useCallback(() => {
      if (!isSupabaseConfigured) return;
      if (isFetchingRef.current) return;
      // Defer fetch if writes are in flight to avoid overwriting optimistic data
      if (writeInFlightRef.current > 0) return;
      // Skip fetch entirely if cache is fresh
      if (hasLoadedRef.current && isCacheFresh(storageKey)) return;
      // If we have data but cache is stale, do a silent background refresh
      const hasExistingData = itemsRef.current.length > 0;
      isFetchingRef.current = true;
      if (!hasExistingData) {
        setIsLoading(true);
      }
      setError(null);

      const supabase = createClient();

      const fetchData = async () => {
        try {
          // 10-second timeout to prevent infinite loading
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10_000);

          const { data, error } = await supabase
            .from(table)
            .select("*")
            .abortSignal(controller.signal);

          clearTimeout(timeout);

          if (error) {
            console.error(`[Harmoniq] Error fetching ${table}:`, error.message);
            if (isMountedRef.current) setError(error.message);
            // Fallback to localStorage cache only (never mock data in Supabase mode)
            const cached = loadFromStorage<T[]>(storageKey, []);
            if (isMountedRef.current && cached.length > 0) setItems(cached);
          } else if (isMountedRef.current) {
            const raw = (data || []) as Record<string, unknown>[];
            // Reverse-map DB column names → TS field names
            const fetched = opts.columnMap
              ? raw.map((row) => mapFromSupabase<T>(row, opts.columnMap))
              : (raw as T[]);
            // Merge optimistic items: keep any locally-added items that
            // aren't yet in the Supabase response (write may be in-flight)
            const fetchedIds = new Set(fetched.map((item) => item.id));
            const optimistic = itemsRef.current.filter(
              (item) => !fetchedIds.has(item.id)
            );
            const merged = optimistic.length > 0
              ? [...fetched, ...optimistic]
              : fetched;
            setItems(merged);
            itemsRef.current = merged;
            // Cache to localStorage for offline resilience
            saveToStorage(storageKey, merged);
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[Harmoniq] Fetch ${table} aborted/failed:`, msg);
          if (isMountedRef.current) setError(msg);
          // Fallback to localStorage cache only (never mock data in Supabase mode)
          const cached = loadFromStorage<T[]>(storageKey, []);
          if (isMountedRef.current && cached.length > 0) setItems(cached);
        } finally {
          if (isMountedRef.current) setIsLoading(false);
          isFetchingRef.current = false;
          hasLoadedRef.current = true;
          globalLoadedCache.set(storageKey, Date.now());
        }
      };

      fetchData();
    }, []);

    // === LOCALSTORAGE MODE ===
    const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const itemsRef = React.useRef(items);
    itemsRef.current = items;

    const invalidateAndRefresh = React.useCallback(() => {
      globalLoadedCache.delete(storageKey);
      hasLoadedRef.current = false;

      if (realtimeRefreshTimerRef.current) {
        return;
      }

      realtimeRefreshTimerRef.current = setTimeout(() => {
        realtimeRefreshTimerRef.current = null;
        if (isMountedRef.current) {
          ensureLoaded();
        }
      }, 250);
    }, [ensureLoaded]);

    React.useEffect(() => {
      if (isSupabaseConfigured) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveToStorage(storageKey, items);
      }, SAVE_DEBOUNCE_MS);
      return () => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      };
    }, [items]);

    React.useEffect(() => {
      if (isSupabaseConfigured) return;
      const flushPendingSave = () => {
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
          saveToStorage(storageKey, itemsRef.current);
          saveTimerRef.current = null;
        }
      };
      window.addEventListener("beforeunload", flushPendingSave);
      return () => {
        window.removeEventListener("beforeunload", flushPendingSave);
        flushPendingSave();
      };
    }, []);

    React.useEffect(() => {
      if (!isSupabaseConfigured || !opts.realtimeSubscribe) return;

      const supabase = createClient();

      return subscribeToRealtimeInvalidation({
        client: supabase,
        table,
        scope: storageKey,
        onInvalidate: invalidateAndRefresh,
      });
    }, [invalidateAndRefresh]);

    // Cross-tab sync: listen for storage changes from other tabs/windows
    React.useEffect(() => {
      if (isSupabaseConfigured) return;
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === storageKey && e.newValue && isMountedRef.current) {
          try {
            const parsed = JSON.parse(e.newValue) as T[];
            setItems(parsed);
            // Invalidate TTL cache so next ensureLoaded() re-fetches
            globalLoadedCache.delete(storageKey);
          } catch {
            // ignore parse errors
          }
        }
      };
      window.addEventListener("storage", handleStorageChange);
      return () => window.removeEventListener("storage", handleStorageChange);
    }, []);

    // === SHARED METHODS ===
    const getById = React.useCallback(
      (id: string) => items.find((item) => item.id === id),
      [items]
    );

    const clearError = React.useCallback(() => {
      setError(null);
    }, []);

    const add = React.useCallback((item: T) => {
      setError(null);
      const sanitizedItem = sanitizeEntity(item as unknown as Record<string, unknown>) as unknown as T;
      const previous = itemsRef.current;

      try {
        const exists = previous.some((existing) => existing.id === sanitizedItem.id);
        const next = exists ? previous.map((existing) => (existing.id === sanitizedItem.id ? sanitizedItem : existing)) : [...previous, sanitizedItem];
        itemsRef.current = next;
        // Optimistic update
        setItems(next);
        saveToStorage(storageKey, next);

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Harmoniq] Error in add for ${table}:`, msg);
        // Targeted rollback: remove the item we just added
        const rolledBack = itemsRef.current.filter((existing) => existing.id !== sanitizedItem.id);
        itemsRef.current = rolledBack;
        setItems(rolledBack);
        toast.error("Failed to save item");
        return;
      }

      if (isSupabaseConfigured) {
        writeInFlightRef.current++;
        void (async () => {
          const mapped = mapToSupabase(sanitizedItem as unknown as Record<string, unknown>, opts.columnMap, opts.stripFields);
          if (process.env.NODE_ENV === "development") {
            console.log(`[Harmoniq Debug] Upserting to ${table}:`, Object.keys(mapped), mapped);
          }
          try {
            const ok = await syncWithRetry("/api/entity-upsert", { table, data: mapped }, table);
            if (!ok) {
              toast.warning("Saved offline — changes will sync when the connection is restored.", {
                description: `Failed to save ${table.replace(/_/g, " ")} to the server.`,
                duration: 6000,
              });
            }
          } finally {
            writeInFlightRef.current--;
          }
        })();
      }
    }, []);

    const update = React.useCallback((id: string, updates: Partial<T>) => {
      setError(null);
      const sanitizedUpdates = sanitizeEntity(updates as unknown as Record<string, unknown>) as unknown as Partial<T>;
      // Capture only the item being updated for targeted rollback
      const previousItem = itemsRef.current.find((item) => item.id === id);

      try {
        const next = itemsRef.current.map((item) => (item.id === id ? { ...item, ...sanitizedUpdates } : item));
        itemsRef.current = next;
        // Optimistic update
        setItems(next);
        saveToStorage(storageKey, next);

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Harmoniq] Error in update for ${table}:`, msg);
        // Targeted rollback: restore only this item to its pre-update state
        if (previousItem) {
          const rolledBack = itemsRef.current.map((item) => (item.id === id ? previousItem : item));
          itemsRef.current = rolledBack;
          setItems(rolledBack);
        }
        toast.error("Failed to update item");
        return;
      }

      if (isSupabaseConfigured) {
        writeInFlightRef.current++;
        void (async () => {
          try {
            const mapped = mapToSupabase(sanitizedUpdates as unknown as Record<string, unknown>, opts.columnMap, opts.stripFields);
            const ok = await syncWithRetry(
              "/api/entity-upsert",
              { table, data: { ...mapped, id } },
              table,
            );
            if (!ok) {
              toast.warning("Saved offline — changes will sync when the connection is restored.", {
                description: `Failed to update ${table.replace(/_/g, " ")} on the server.`,
                duration: 6000,
              });
            }
          } finally {
            writeInFlightRef.current--;
          }
        })();
      }
    }, []);

    const remove = React.useCallback((id: string) => {
      setError(null);
      // Capture the item being removed for targeted rollback
      const removedItem = itemsRef.current.find((item) => item.id === id);

      try {
        const next = itemsRef.current.filter((item) => item.id !== id);
        itemsRef.current = next;
        // Optimistic update
        setItems(next);
        saveToStorage(storageKey, next);


      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Harmoniq] Error in remove for ${table}:`, msg);
        // Targeted rollback: re-add the removed item
        if (removedItem) {
          const rolledBack = [...itemsRef.current, removedItem];
          itemsRef.current = rolledBack;
          setItems(rolledBack);
        }
        toast.error("Failed to remove item");
        return;
      }

      if (isSupabaseConfigured) {
        writeInFlightRef.current++;
        void (async () => {
          try {
            const supabase = createClient();
            const { error: persistError } = await supabase.from(table).delete().eq("id", id);
            if (persistError) {
              console.warn(`[Harmoniq] Cloud sync failed for ${table} delete: ${persistError.message} — removed locally`);
              toast.warning("Removed offline — change will sync when the connection is restored.", {
                description: `Failed to delete ${table.replace(/_/g, " ")} on the server.`,
                duration: 6000,
              });
            }
          } finally {
            writeInFlightRef.current--;
          }
        })();
      }
    }, []);

    const itemsForCompany = React.useCallback(
      (companyId: string | null | undefined) => {
        // With Supabase, RLS already filters by company, but filter client-side too for safety
        if (!companyId) return [];
        return items.filter(
          (item) => "company_id" in item && (item as unknown as CompanyEntity).company_id === companyId
        );
      },
      [items]
    );

    const value = React.useMemo(
      () => ({ items, isLoading, error, setItems, getById, add, update, remove, itemsForCompany, ensureLoaded, clearError }),
      [items, isLoading, error, getById, add, update, remove, itemsForCompany, ensureLoaded, clearError]
    );

    return <Context.Provider value={value}>{children}</Context.Provider>;
  }

  function useStore(options?: { skipLoad?: boolean }) {
    const ctx = React.useContext(Context);
    if (!ctx) throw new Error("useStore must be used within a provider");
    React.useEffect(() => {
      if (!options?.skipLoad) {
        ctx.ensureLoaded();
      }
    }, [ctx, options?.skipLoad]);
    return ctx;
  }

  return { Provider, useStore };
}
