"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ShieldCheck,
  Package,
  Newspaper,
  User,
} from "lucide-react";
import { useFieldAppSettings } from "@/components/providers/field-app-settings-provider";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";

interface BottomTabsProps {
  company: string;
}

interface TabItem {
  titleKey: string;
  shortTitleKey: string;
  fallback: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exactMatch?: boolean;
  alsoMatchPrefixes?: string[];
}

const tabItems: TabItem[] = [
  {
    titleKey: "nav.home",
    shortTitleKey: "nav.homeShort",
    fallback: "Home",
    href: "/app",
    icon: Home,
    exactMatch: true,
  },
  {
    titleKey: "nav.safety",
    shortTitleKey: "nav.safetyShort",
    fallback: "Safety",
    href: "/app/checklists",
    icon: ShieldCheck,
    alsoMatchPrefixes: ["/app/report", "/app/incidents", "/app/risk-assessment", "/app/inspections", "/app/tasks"],
  },
  {
    titleKey: "nav.assets",
    shortTitleKey: "nav.assetsShort",
    fallback: "Assets",
    href: "/app/assets",
    icon: Package,
  },
  {
    titleKey: "nav.news",
    shortTitleKey: "nav.newsShort",
    fallback: "News",
    href: "/app/news",
    icon: Newspaper,
  },
  {
    titleKey: "nav.profile",
    shortTitleKey: "nav.profileShort",
    fallback: "Profile",
    href: "/app/profile",
    icon: User,
  },
];

export function BottomTabs({ company }: BottomTabsProps) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { settings } = useFieldAppSettings();
  const visibleTabs = React.useMemo(
    () => tabItems.filter((item) => settings.newsEnabled || item.href !== "/app/news"),
    [settings.newsEnabled]
  );

  return (
    <nav aria-label="App navigation" className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background safe-area-inset-bottom">
      <ul className="flex h-[68px] items-center justify-around">
        {visibleTabs.map((item) => {
          const href = `/${company}${item.href}`;
          const isActive = item.exactMatch 
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`)
              || (item.alsoMatchPrefixes?.some(p => {
                const fullP = `/${company}${p}`;
                return pathname === fullP || pathname.startsWith(`${fullP}/`);
              }) ?? false);

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "flex min-h-[44px] flex-col items-center justify-center px-2 py-1.5",
                  "transition-colors active:opacity-70",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isActive ? "text-foreground" : "text-muted-foreground/50"
                )}
              >
                {isActive && (
                  <div className="h-[3px] w-6 rounded-full bg-primary mx-auto mb-1" />
                )}
                <item.icon
                  className="h-5 w-5"
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    "text-[11px] max-w-[4.5rem] truncate text-center mt-1",
                    isActive ? "font-semibold" : "font-normal"
                  )}
                >
                  {t(item.shortTitleKey) || item.fallback}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
