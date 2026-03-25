"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const AUTH_TABS = [
  { id: "login", label: "Log in", href: "/login" },
  { id: "signup", label: "Sign up", href: "/signup" },
] as const;

/**
 * Pill-style tab navigation for switching between login and signup.
 * Detects active tab from the current pathname.
 */
export function AuthTabs() {
  const pathname = usePathname();

  return (
    <div className="mb-6 flex justify-center">
      <div className="inline-flex items-center gap-1 rounded-lg bg-muted p-1">
        {AUTH_TABS.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                "inline-flex items-center rounded-md px-4 py-2 text-sm font-medium transition-all",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
