"use client";

import { I18nProvider } from "@/i18n";

export function MarketingI18nWrapper({ children }: { children: React.ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}
