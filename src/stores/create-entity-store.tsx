"use client";

import * as React from "react";
import { loadFromStorage, saveToStorage } from "@/lib/local-storage";

type IdEntity = { id: string };
type CompanyEntity = IdEntity & { company_id: string };

export interface EntityStore<T extends IdEntity> {
  items: T[];
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  getById: (id: string) => T | undefined;
  add: (item: T) => void;
  update: (id: string, updates: Partial<T>) => void;
  remove: (id: string) => void;
  /** Returns items filtered by company_id. Only works for entities with company_id field. */
  itemsForCompany: (companyId: string | null | undefined) => T[];
}

/** Debounce delay for localStorage writes (ms) */
const SAVE_DEBOUNCE_MS = 500;

export function createEntityStore<T extends IdEntity>(
  storageKey: string,
  initialData: T[]
) {
  const Context = React.createContext<EntityStore<T> | undefined>(undefined);

  function Provider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = React.useState<T[]>(() =>
      loadFromStorage(storageKey, initialData)
    );

    // Debounced localStorage persistence to avoid blocking the main thread
    const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const itemsRef = React.useRef(items);
    itemsRef.current = items;

    React.useEffect(() => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveToStorage(storageKey, items);
      }, SAVE_DEBOUNCE_MS);
      return () => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      };
    }, [items, storageKey]);

    // Flush any pending save when the provider unmounts to prevent data loss
    React.useEffect(() => {
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

    const getById = React.useCallback(
      (id: string) => items.find((item) => item.id === id),
      [items]
    );

    const add = React.useCallback((item: T) => {
      setItems((prev) => {
        const exists = prev.some((p) => p.id === item.id);
        return exists ? prev.map((p) => (p.id === item.id ? item : p)) : [...prev, item];
      });
    }, []);

    const update = React.useCallback((id: string, updates: Partial<T>) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
      );
    }, []);

    const remove = React.useCallback((id: string) => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, []);

    const itemsForCompany = React.useCallback(
      (companyId: string | null | undefined) => {
        if (!companyId) return items;
        return items.filter(
          (item) => "company_id" in item && (item as unknown as CompanyEntity).company_id === companyId
        );
      },
      [items]
    );

    const value = React.useMemo(
      () => ({ items, setItems, getById, add, update, remove, itemsForCompany }),
      [items, getById, add, update, remove, itemsForCompany]
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
