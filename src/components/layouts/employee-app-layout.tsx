"use client";

import * as React from "react";
import Link from "next/link";
import { Shield, Bell } from "lucide-react";
import { BottomTabs } from "@/components/navigation/bottom-tabs";
import { useFieldAppSettings } from "@/components/providers/field-app-settings-provider";
import { getFieldAppShellStyle } from "@/lib/field-app-settings";

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
  const { settings } = useFieldAppSettings();

  return (
    <div
      className="field-app-shell flex min-h-screen flex-col bg-muted"
      data-field-shadow={settings.shadow}
      style={getFieldAppShellStyle(settings)}
    >
      {/* Header */}
      {showHeader && (
        <header className="field-app-surface sticky top-0 z-30 flex h-14 items-center justify-between bg-brand-solid px-4">
          <Link href={`/${company}/app`} className="flex items-center gap-2">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt={`${companyName} logo`}
                className="h-6 w-6 rounded object-contain"
              />
            ) : (
              <Shield className="h-5 w-5 text-brand-solid-foreground/80" aria-hidden="true" />
            )}
            <span className="font-semibold text-sm text-brand-solid-foreground">{headerTitle || companyName}</span>
          </Link>
          <Link href={`/${company}/app/notifications`} className="relative p-2" aria-label={`${notificationCount} notifications`}>
            <Bell className="h-5 w-5 text-brand-solid-foreground/80" />
            {notificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
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
