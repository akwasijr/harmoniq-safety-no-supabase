"use client";

import * as React from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { loadFromStorage, saveToStorage } from "@/lib/local-storage";
import { hasSupabasePublicEnv } from "@/lib/supabase/public-env";
import { sanitizeText } from "@/lib/validation";

/** Recursively sanitize all string values in an entity before writing. */
function sanitizeEntity<T extends Record<string, unknown>>(entity: T): T {
  const sanitized = { ...entity };
  for (const key of Object.keys(sanitized)) {
    if (typeof sanitized[key] === "string") {
      (sanitized as Record<string, unknown>)[key] = sanitizeText(sanitized[key] as string);
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
    const [items, setItems] = React.useState<T[]>(() => {
      if (isSupabaseConfigured) return loadFromStorage(storageKey, []);
      const cached = loadFromStorage<T[]>(storageKey, []);
      if (cached.length === 0) return initialData;
      // Merge any new mock items not in cache
      const cachedIds = new Set(cached.map((item) => item.id));
      const newItems = initialData.filter((item) => !cachedIds.has(item.id));
      return newItems.length > 0 ? [...cached, ...newItems] : cached;
    });
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const hasLoadedRef = React.useRef(!isSupabaseConfigured);
    const isFetchingRef = React.useRef(false);
    const isMountedRef = React.useRef(true);

    React.useEffect(() => {
      return () => {
        isMountedRef.current = false;
      };
    }, []);

    const ensureLoaded = React.useCallback(() => {
      if (!isSupabaseConfigured) return;
      if (hasLoadedRef.current || isFetchingRef.current) return;
      isFetchingRef.current = true;
      setIsLoading(true);
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
            setItems(fetched);
            // Cache to localStorage for offline resilience
            saveToStorage(storageKey, fetched);
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
        }
      };

      fetchData();
    }, []);

    // === LOCALSTORAGE MODE ===
    const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const itemsRef = React.useRef(items);
    itemsRef.current = items;

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

    // Cross-tab sync: listen for storage changes from other tabs/windows
    React.useEffect(() => {
      if (isSupabaseConfigured) return;
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === storageKey && e.newValue && isMountedRef.current) {
          try {
            const parsed = JSON.parse(e.newValue) as T[];
            setItems(parsed);
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
        void (async () => {
          const supabase = createClient();
          const mapped = mapToSupabase(sanitizedItem as unknown as Record<string, unknown>, opts.columnMap, opts.stripFields);
          if (process.env.NODE_ENV === "development") {
            console.log(`[Harmoniq Debug] Upserting to ${table}:`, Object.keys(mapped), mapped);
          }
          const { error: persistError } = await supabase.from(table).upsert(mapped);
          if (persistError && process.env.NODE_ENV === "development") {
            console.error(`[Harmoniq Debug] Upsert error for ${table}:`, persistError.message, persistError.details, persistError.hint);
          }
          if (persistError) {
            console.warn(`[Harmoniq] Error adding to ${table}:`, persistError.message, persistError.details);
            if (!isMountedRef.current) return;
            // Targeted rollback: remove only this item instead of restoring full snapshot
            const rolledBack = itemsRef.current.filter((existing) => existing.id !== sanitizedItem.id);
            itemsRef.current = rolledBack;
            setItems(rolledBack);
            saveToStorage(storageKey, rolledBack);
            setError(persistError.message);
            toast.error("Failed to save item");
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
        void (async () => {
          const supabase = createClient();
          const mapped = mapToSupabase(sanitizedUpdates as unknown as Record<string, unknown>, opts.columnMap, opts.stripFields);
          const { error: persistError } = await supabase.from(table).update(mapped).eq("id", id);
          if (persistError) {
            console.warn(`[Harmoniq] Error updating ${table}:`, persistError.message, persistError.details);
            if (!isMountedRef.current) return;
            // Targeted rollback: restore only this item to its pre-update state
            if (previousItem) {
              const rolledBack = itemsRef.current.map((item) => (item.id === id ? previousItem : item));
              itemsRef.current = rolledBack;
              setItems(rolledBack);
              saveToStorage(storageKey, rolledBack);
            }
            setError(persistError.message);
            toast.error("Failed to update item");
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
        void (async () => {
          const supabase = createClient();
          const { error: persistError } = await supabase.from(table).delete().eq("id", id);
          if (persistError) {
            console.warn(`[Harmoniq] Error deleting from ${table}:`, persistError.message);
            if (!isMountedRef.current) return;
            // Targeted rollback: re-add the removed item
            if (removedItem) {
              const rolledBack = [...itemsRef.current, removedItem];
              itemsRef.current = rolledBack;
              setItems(rolledBack);
              saveToStorage(storageKey, rolledBack);
            }
            setError(persistError.message);
            toast.error("Failed to remove item");
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
    }, [ctx.ensureLoaded, options?.skipLoad]);
    return ctx;
  }

  return { Provider, useStore };
}
