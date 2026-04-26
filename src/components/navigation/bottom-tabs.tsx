"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Home,
  ShieldCheck,
  Package,
  Newspaper,
  User,
  Lock,
} from "lucide-react";
import { useFieldAppSettings } from "@/components/providers/field-app-settings-provider";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";
import type { Permission } from "@/types";

interface BottomTabsProps {
  company: string;
}

interface TabItem {
  titleKey: string;
  shortTitleKey: string;
  fallback: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  exactMatch?: boolean;
  alsoMatchPrefixes?: string[];
  requiredPermission?: Permission;
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
    requiredPermission: "checklists.view",
  },
  {
    titleKey: "nav.assets",
    shortTitleKey: "nav.assetsShort",
    fallback: "Assets",
    href: "/app/assets",
    icon: Package,
    requiredPermission: "assets.view",
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
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const visibleTabs = React.useMemo(
    () => tabItems.filter((item) => settings.newsEnabled || item.href !== "/app/news"),
    [settings.newsEnabled]
  );

  return (
    <nav
      aria-label="App navigation"
      className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)" }}
    >
      <div className="mx-3 pointer-events-auto">
        {/* Floating glass capsule */}
        <div className="rounded-full bg-background/60 backdrop-blur-md border border-border/15 shadow-lg">
          <ul className="flex h-[64px] items-center px-1.5">
            {visibleTabs.map((item) => {
              const href = `/${company}${item.href}`;
              const isLocked = item.requiredPermission
                ? !hasPermission(item.requiredPermission)
                : false;
              const isActive =
                !isLocked &&
                (item.exactMatch
                  ? pathname === href
                  : pathname === href ||
                    pathname.startsWith(`${href}/`) ||
                    (item.alsoMatchPrefixes?.some((p) => {
                      const fullP = `/${company}${p}`;
                      return pathname === fullP || pathname.startsWith(`${fullP}/`);
                    }) ??
                      false));

              if (isLocked) {
                return (
                  <li key={item.href} className="flex-1">
                    <button
                      type="button"
                      onClick={() =>
                        toast("You don't have access to this feature", "info")
                      }
                      className="relative flex min-h-[52px] w-full flex-col items-center justify-center gap-1 rounded-full px-1 py-1.5 text-muted-foreground/20 cursor-not-allowed"
                    >
                      <div className="relative">
                        <item.icon
                          className="h-[22px] w-[22px]"
                          strokeWidth={1.5}
                          aria-hidden="true"
                        />
                        <Lock
                          className="absolute -bottom-1 -right-2.5 h-2.5 w-2.5"
                          aria-hidden="true"
                        />
                      </div>
                      <span className="text-[10px] leading-none max-w-[4rem] truncate text-center font-medium">
                        {t(item.shortTitleKey) || item.fallback}
                      </span>
                    </button>
                  </li>
                );
              }

              return (
                <li key={item.href} className="flex-1">
                  <Link
                    href={href}
                    className={cn(
                      "relative flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-full px-1 py-1.5",
                      "active:scale-[0.94] transition-transform duration-100",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground/40"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="navbar-active-pill"
                        className="absolute inset-0 rounded-full bg-muted/70"
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 30,
                          mass: 0.8,
                        }}
                        style={{ zIndex: 0 }}
                      />
                    )}
                    <item.icon
                      className="relative z-10 h-[22px] w-[22px]"
                      strokeWidth={isActive ? 1.8 : 1.4}
                      aria-hidden="true"
                    />
                    <span
                      className={cn(
                        "relative z-10 text-[10px] leading-none max-w-[4rem] truncate text-center",
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
        </div>
      </div>
    </nav>
  );
}
