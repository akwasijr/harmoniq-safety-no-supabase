"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { loadFromStorage, saveToStorage } from "@/lib/local-storage";

type IdEntity = { id: string };
type CompanyEntity = IdEntity & { company_id: string };

export interface EntityStore<T extends IdEntity> {
  items: T[];
  isLoading: boolean;
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  getById: (id: string) => T | undefined;
  add: (item: T) => void;
  update: (id: string, updates: Partial<T>) => void;
  remove: (id: string) => void;
  /** Returns items filtered by company_id. Only works for entities with company_id field. */
  itemsForCompany: (companyId: string | null | undefined) => T[];
}

const isSupabaseConfigured =
  typeof window !== "undefined" &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Debounce delay for localStorage writes (ms) */
const SAVE_DEBOUNCE_MS = 500;

/**
 * Creates an entity store that auto-selects between Supabase and localStorage.
 * @param storageKey - localStorage key (used as fallback and to derive table name)
 * @param initialData - mock data fallback for localStorage mode
 * @param tableName - Supabase table name (optional, derived from storageKey if omitted)
 */
export function createEntityStore<T extends IdEntity>(
  storageKey: string,
  initialData: T[],
  tableName?: string
) {
  // Derive Supabase table name from storage key: "harmoniq_incidents" → "incidents"
  const table = tableName || storageKey.replace(/^harmoniq_/, "");

  const Context = React.createContext<EntityStore<T> | undefined>(undefined);

  function Provider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = React.useState<T[]>(() =>
      isSupabaseConfigured ? [] : loadFromStorage(storageKey, initialData)
    );
    const [isLoading, setIsLoading] = React.useState(isSupabaseConfigured);

    // === SUPABASE MODE ===
    React.useEffect(() => {
      if (!isSupabaseConfigured) return;

      const supabase = createClient();
      let isMounted = true;

      // Initial fetch
      const fetchData = async () => {
        try {
          const { data, error } = await supabase.from(table).select("*");
          if (error) {
            console.error(`[Harmoniq] Error fetching ${table}:`, error.message);
            // Fall back to localStorage on error
            if (isMounted) setItems(loadFromStorage(storageKey, initialData));
          } else if (isMounted) {
            setItems((data || []) as T[]);
          }
        } finally {
          if (isMounted) setIsLoading(false);
        }
      };

      fetchData();

      // Real-time subscription
      const channel = supabase
        .channel(`${table}_changes`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          (payload) => {
            if (!isMounted) return;
            if (payload.eventType === "INSERT") {
              setItems((prev) => {
                const newItem = payload.new as T;
                const exists = prev.some((p) => p.id === newItem.id);
                return exists ? prev : [...prev, newItem];
              });
            } else if (payload.eventType === "UPDATE") {
              setItems((prev) =>
                prev.map((item) =>
                  item.id === (payload.new as T).id ? (payload.new as T) : item
                )
              );
            } else if (payload.eventType === "DELETE") {
              setItems((prev) =>
                prev.filter((item) => item.id !== (payload.old as T).id)
              );
            }
          }
        )
        .subscribe();

      return () => {
        isMounted = false;
        supabase.removeChannel(channel);
      };
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
    }, [items, storageKey]);

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
    }, [storageKey]);

    // === SHARED METHODS ===
    const getById = React.useCallback(
      (id: string) => items.find((item) => item.id === id),
      [items]
    );

    const add = React.useCallback((item: T) => {
      // Optimistic update
      setItems((prev) => {
        const exists = prev.some((p) => p.id === item.id);
        return exists ? prev.map((p) => (p.id === item.id ? item : p)) : [...prev, item];
      });

      if (isSupabaseConfigured) {
        const supabase = createClient();
        supabase.from(table).upsert(item as Record<string, unknown>).then(({ error }) => {
          if (error) console.error(`[Harmoniq] Error adding to ${table}:`, error.message);
        });
      }
    }, []);

    const update = React.useCallback((id: string, updates: Partial<T>) => {
      // Optimistic update
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
      );

      if (isSupabaseConfigured) {
        const supabase = createClient();
        supabase.from(table).update(updates as Record<string, unknown>).eq("id", id).then(({ error }) => {
          if (error) console.error(`[Harmoniq] Error updating ${table}:`, error.message);
        });
      }
    }, []);

    const remove = React.useCallback((id: string) => {
      // Optimistic update
      setItems((prev) => prev.filter((item) => item.id !== id));

      if (isSupabaseConfigured) {
        const supabase = createClient();
        supabase.from(table).delete().eq("id", id).then(({ error }) => {
          if (error) console.error(`[Harmoniq] Error deleting from ${table}:`, error.message);
        });
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
      () => ({ items, isLoading, setItems, getById, add, update, remove, itemsForCompany }),
      [items, isLoading, getById, add, update, remove, itemsForCompany]
    );

    return <Context.Provider value={value}>{children}</Context.Provider>;
  }

  function useStore() {
    const ctx = React.useContext(Context);
    if (!ctx) throw new Error("useStore must be used within a provider");
    return ctx;
  }

  return { Provider, useStore };
}
