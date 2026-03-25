"use client";

import * as React from "react";
import { getCompanySettingsKey } from "@/lib/company-settings";
import type { IndustryCode, Language } from "@/types";
import {
  type FieldAppSettings,
  buildDefaultFieldAppSettings,
  readStoredFieldAppSettings,
} from "@/lib/field-app-settings";

interface FieldAppSettingsContextValue {
  settings: FieldAppSettings;
}

const FieldAppSettingsContext = React.createContext<FieldAppSettingsContextValue | null>(null);

export function FieldAppSettingsProvider({
  companyId,
  industry,
  language,
  children,
}: {
  companyId?: string | null;
  industry?: IndustryCode | null;
  language?: Language | null;
  children: React.ReactNode;
}) {
  const [settings, setSettings] = React.useState<FieldAppSettings>(() => buildDefaultFieldAppSettings(industry));

  React.useEffect(() => {
    setSettings(readStoredFieldAppSettings(companyId, industry));
  }, [companyId, industry, language]);

  React.useEffect(() => {
    if (typeof window === "undefined" || !companyId) {
      return;
    }

    const storageKey = getCompanySettingsKey(companyId);
    const syncSettings = () => {
      setSettings(readStoredFieldAppSettings(companyId, industry));
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === storageKey) {
        syncSettings();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", syncSettings);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", syncSettings);
    };
  }, [companyId, industry]);

  const value = React.useMemo(() => ({ settings }), [settings]);

  return <FieldAppSettingsContext.Provider value={value}>{children}</FieldAppSettingsContext.Provider>;
}

export function useFieldAppSettings() {
  const context = React.useContext(FieldAppSettingsContext);
  if (!context) {
    throw new Error("useFieldAppSettings must be used within a FieldAppSettingsProvider");
  }
  return context;
}
