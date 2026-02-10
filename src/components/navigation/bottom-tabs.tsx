"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  AlertTriangle,
  ClipboardCheck,
  Package,
  User,
} from "lucide-react";
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
    titleKey: "nav.report",
    shortTitleKey: "nav.reportShort",
    fallback: "Report",
    href: "/app/report",
    icon: AlertTriangle,
  },
  {
    titleKey: "nav.tasks",
    shortTitleKey: "nav.tasksShort",
    fallback: "Tasks",
    href: "/app/checklists",
    icon: ClipboardCheck,
  },
  {
    titleKey: "nav.assets",
    shortTitleKey: "nav.assetsShort",
    fallback: "Assets",
    href: "/app/assets",
    icon: Package,
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

  return (
    <nav aria-label="App navigation" className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card safe-area-inset-bottom">
      <ul className="flex h-16 items-center justify-around">
        {tabItems.map((item) => {
          const href = `/${company}${item.href}`;
          // For exact match items (like Home), only match the exact path
          // For other items, match the path or any sub-paths
          const isActive = item.exactMatch 
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "flex min-h-[44px] flex-col items-center justify-center gap-1 px-2 py-2",
                  "transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon
                  className={cn("h-5 w-5", isActive && "fill-primary/20")}
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    "text-xs max-w-[4.5rem] truncate text-center",
                    isActive ? "font-medium" : "font-normal"
                  )}
                >
                  {t(item.shortTitleKey)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
