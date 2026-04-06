"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, Bell } from "lucide-react";
import { BottomTabs } from "@/components/navigation/bottom-tabs";
import { useFieldAppSettings } from "@/components/providers/field-app-settings-provider";
import { getFieldAppShellStyle } from "@/lib/field-app-settings";

const FULL_PAGE_ROUTES = [
  "/app/report",
  "/app/maintenance",
  "/app/scan",
  "/app/assets/new",
  "/app/checklists/", // matches /app/checklists/[checklistId]
  "/app/inspection/", // matches /app/inspection/[assetId]
  "/app/inspection-round",
];

// Risk assessment form routes — all sub-paths except the index and view pages
const RISK_ASSESSMENT_FORM_PREFIX = "/app/risk-assessment/";
const RISK_ASSESSMENT_EXCLUDED = ["/app/risk-assessment/view"];

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
  const pathname = usePathname();
  const isFullPage = (() => {
    const p = pathname;
    const base = `/${company}`;
    // Check explicit full-page routes
    if (FULL_PAGE_ROUTES.some((route) => p === `${base}${route}` || p.startsWith(`${base}${route}/`))) {
      return true;
    }
    // Check risk-assessment form routes (exclude index and view pages)
    const raPrefix = `${base}${RISK_ASSESSMENT_FORM_PREFIX}`;
    if (p.startsWith(raPrefix) && !RISK_ASSESSMENT_EXCLUDED.some((ex) => p.startsWith(`${base}${ex}`))) {
      return true;
    }
    return false;
  })();

  return (
    <div
      className="field-app-shell flex min-h-screen flex-col bg-muted"
      data-field-shadow={settings.shadow}
      style={getFieldAppShellStyle(settings)}
    >
      {/* Header */}
      {showHeader && !isFullPage && (
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
      <main className={`flex-1 ${isFullPage ? "pb-0" : "pb-20"}`}>{children}</main>

      {/* Bottom navigation — hidden on full-page flows like report incident */}
      {!isFullPage && <BottomTabs company={company} />}
    </div>
  );
}
