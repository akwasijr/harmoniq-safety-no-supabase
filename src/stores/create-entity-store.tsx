"use client";

import * as React from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { loadFromStorage, saveToStorage } from "@/lib/local-storage";
import { hasSupabasePublicEnv } from "@/lib/supabase/public-env";
import { logAudit } from "@/stores/audit-helpers";

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

/** Strip fields that don't exist in Supabase and remap names */
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
    const [items, setItems] = React.useState<T[]>(() =>
      loadFromStorage(storageKey, isSupabaseConfigured ? [] : initialData)
    );
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
            // Fallback to localStorage cache
            const cached = loadFromStorage<T[]>(storageKey, initialData);
            if (isMountedRef.current && cached.length > 0) setItems(cached);
          } else if (isMountedRef.current) {
            const fetched = (data || []) as T[];
            setItems(fetched);
            // Cache to localStorage for offline resilience
            saveToStorage(storageKey, fetched);
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[Harmoniq] Fetch ${table} aborted/failed:`, msg);
          if (isMountedRef.current) setError(msg);
          // Fallback to localStorage cache on network failure
          const cached = loadFromStorage<T[]>(storageKey, initialData);
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
      const previous = itemsRef.current;

      try {
        const exists = previous.some((existing) => existing.id === item.id);
        const next = exists ? previous.map((existing) => (existing.id === item.id ? item : existing)) : [...previous, item];
        itemsRef.current = next;
        // Optimistic update
        setItems(next);
        saveToStorage(storageKey, next);

        logAudit({
          user_id: "system",
          user_name: "System",
          company_id: (item as Record<string, unknown>).company_id as string ?? "",
          action: "create",
          entity_type: table as "incident" | "ticket" | "work_order" | "corrective_action" | "asset" | "location" | "user" | "checklist" | "risk_assessment" | "content",
          entity_id: item.id,
          entity_title: (item as Record<string, unknown>).title as string ?? (item as Record<string, unknown>).name as string ?? item.id,
          details: `Created ${table} record`,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Harmoniq] Error in add for ${table}:`, msg);
        itemsRef.current = previous;
        setItems(previous);
        toast.error("Failed to save item");
        return;
      }

      if (isSupabaseConfigured) {
        void (async () => {
          const supabase = createClient();
          const mapped = mapToSupabase(item as unknown as Record<string, unknown>, opts.columnMap, opts.stripFields);
          const { error: persistError } = await supabase.from(table).upsert(mapped);
          if (persistError) {
            console.warn(`[Harmoniq] Error adding to ${table}:`, persistError.message, persistError.details);
            if (!isMountedRef.current) return;
            itemsRef.current = previous;
            setItems(previous);
            saveToStorage(storageKey, previous);
            setError(persistError.message);
            toast.error("Failed to save item");
          }
        })();
      }
    }, []);

    const update = React.useCallback((id: string, updates: Partial<T>) => {
      setError(null);
      const previous = itemsRef.current;

      try {
        const next = previous.map((item) => (item.id === id ? { ...item, ...updates } : item));
        itemsRef.current = next;
        // Optimistic update
        setItems(next);
        saveToStorage(storageKey, next);

        const existing = previous.find((item) => item.id === id);
        logAudit({
          user_id: "system",
          user_name: "System",
          company_id: (existing as Record<string, unknown> | undefined)?.company_id as string ?? "",
          action: "update",
          entity_type: table as "incident" | "ticket" | "work_order" | "corrective_action" | "asset" | "location" | "user" | "checklist" | "risk_assessment" | "content",
          entity_id: id,
          entity_title: (existing as Record<string, unknown> | undefined)?.title as string ?? (existing as Record<string, unknown> | undefined)?.name as string ?? id,
          details: `Updated ${table} record`,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Harmoniq] Error in update for ${table}:`, msg);
        itemsRef.current = previous;
        setItems(previous);
        toast.error("Failed to update item");
        return;
      }

      if (isSupabaseConfigured) {
        void (async () => {
          const supabase = createClient();
          const mapped = mapToSupabase(updates as unknown as Record<string, unknown>, opts.columnMap, opts.stripFields);
          const { error: persistError } = await supabase.from(table).update(mapped).eq("id", id);
          if (persistError) {
            console.warn(`[Harmoniq] Error updating ${table}:`, persistError.message, persistError.details);
            if (!isMountedRef.current) return;
            itemsRef.current = previous;
            setItems(previous);
            saveToStorage(storageKey, previous);
            setError(persistError.message);
            toast.error("Failed to update item");
          }
        })();
      }
    }, []);

    const remove = React.useCallback((id: string) => {
      setError(null);
      const previous = itemsRef.current;

      try {
        const removed = previous.find((item) => item.id === id);
        const next = previous.filter((item) => item.id !== id);
        itemsRef.current = next;
        // Optimistic update
        setItems(next);
        saveToStorage(storageKey, next);

        logAudit({
          user_id: "system",
          user_name: "System",
          company_id: (removed as Record<string, unknown> | undefined)?.company_id as string ?? "",
          action: "delete",
          entity_type: table as "incident" | "ticket" | "work_order" | "corrective_action" | "asset" | "location" | "user" | "checklist" | "risk_assessment" | "content",
          entity_id: id,
          entity_title: (removed as Record<string, unknown> | undefined)?.title as string ?? (removed as Record<string, unknown> | undefined)?.name as string ?? id,
          details: `Deleted ${table} record`,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Harmoniq] Error in remove for ${table}:`, msg);
        itemsRef.current = previous;
        setItems(previous);
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
            itemsRef.current = previous;
            setItems(previous);
            saveToStorage(storageKey, previous);
            setError(persistError.message);
            toast.error("Failed to remove item");
          }
        })();
      }
    }, []);

    const itemsForCompany = React.useCallback(
      (companyId: string | null | undefined) => {
        // With Supabase, RLS already filters by company — but filter client-side too for safety
        if (!companyId) return items;
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
