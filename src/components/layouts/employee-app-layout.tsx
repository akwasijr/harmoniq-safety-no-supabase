"use client";

import * as React from "react";
import Link from "next/link";
import { Shield, Bell } from "lucide-react";
import { BottomTabs } from "@/components/navigation/bottom-tabs";

interface EmployeeAppLayoutProps {
  children: React.ReactNode;
  company: string;
  companyName?: string;
  companyLogo?: string | null;
  showHeader?: boolean;
  headerTitle?: string;
  notificationCount?: number;
}

export function EmployeeAppLayout({
  children,
  company,
  companyName = "Harmoniq Safety",
  companyLogo = null,
  showHeader = true,
  headerTitle,
  notificationCount = 0,
}: EmployeeAppLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      {/* Header */}
      {showHeader && (
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background px-4">
          <Link href={`/${company}/app`} className="flex items-center gap-2">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt={`${companyName} logo`}
                className="h-6 w-6 rounded object-contain"
              />
            ) : (
              <Shield className="h-5 w-5" aria-hidden="true" />
            )}
            <span className="font-semibold">{headerTitle || companyName}</span>
          </Link>
          <Link href={`/${company}/app/notifications`} className="relative" aria-label={`${notificationCount} notifications`}>
            <Bell className="h-5 w-5 text-muted-foreground" />
            {notificationCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white px-1">
                {notificationCount > 99 ? "99+" : notificationCount}
              </span>
            )}
          </Link>
        </header>
      )}

      {/* Main content */}
      <main className="flex-1 pb-20">{children}</main>

      {/* Bottom navigation */}
      <BottomTabs company={company} />
    </div>
  );
}
