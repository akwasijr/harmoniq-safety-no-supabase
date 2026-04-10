"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, Bell, RefreshCw } from "lucide-react";
import { BottomTabs } from "@/components/navigation/bottom-tabs";
import { useFieldAppSettings } from "@/components/providers/field-app-settings-provider";
import { getFieldAppShellStyle } from "@/lib/field-app-settings";
import { useOfflineSync, getPendingReports } from "@/lib/offline-queue";
import { useIncidentsStore } from "@/stores/incidents-store";

function SyncIcon({ company }: { company: string }) {
  const count = getPendingReports().length;
  if (count === 0) return null;
  return (
    <Link href={`/${company}/app/sync`} className="relative p-2" aria-label={`${count} pending sync`}>
      <RefreshCw className="h-5 w-5 text-brand-solid-foreground/80" />
      <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
        {count}
      </span>
    </Link>
  );
}

function OfflineBanner() {
  const { add: addIncident } = useIncidentsStore();
  const { online } = useOfflineSync(addIncident);
  if (online) return null;
  return (
    <div className="bg-amber-600 text-white text-center text-xs py-1.5 px-4">
      You&apos;re offline — submissions are saved locally
    </div>
  );
}

const BOTTOM_NAV_HIDDEN_ROUTES = [
  "/app/report",
  "/app/maintenance",
  "/app/scan",
  "/app/assets/new",
  "/app/checklists/",
  "/app/inspection/",
  "/app/inspection-round",
  "/app/incidents/",
];

const HEADER_HIDDEN_ROUTES = [
  "/app/report",
  "/app/maintenance",
  "/app/scan",
  "/app/assets/new",
  "/app/checklists/",
  "/app/inspection/",
  "/app/inspection-round",
  "/app/incidents/",
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
  const base = `/${company}`;
  const isWorkOrderProcedureRoute = pathname.startsWith(`${base}/app/tasks/work-orders/`) && pathname.endsWith("/procedure");
  const hideBottomNav = (() => {
    const p = pathname;
    if (BOTTOM_NAV_HIDDEN_ROUTES.some((route) => {
      const fullRoute = `${base}${route}`;
      return p === fullRoute || p.startsWith(fullRoute.endsWith("/") ? fullRoute : `${fullRoute}/`);
    })) {
      return true;
    }
    if (isWorkOrderProcedureRoute) {
      return true;
    }
    const raPrefix = `${base}${RISK_ASSESSMENT_FORM_PREFIX}`;
    if (p.startsWith(raPrefix) && !RISK_ASSESSMENT_EXCLUDED.some((ex) => p.startsWith(`${base}${ex}`))) {
      return true;
    }
    return false;
  })();

  const hideHeader = (() => {
    const p = pathname;
    if (isWorkOrderProcedureRoute) {
      return true;
    }
    if (HEADER_HIDDEN_ROUTES.some((route) => {
      const fullRoute = `${base}${route}`;
      return p === fullRoute || p.startsWith(fullRoute.endsWith("/") ? fullRoute : `${fullRoute}/`);
    })) {
      return true;
    }
    const raPrefix = `${base}${RISK_ASSESSMENT_FORM_PREFIX}`;
    if (p.startsWith(raPrefix) && !RISK_ASSESSMENT_EXCLUDED.some((ex) => p.startsWith(`${base}${ex}`))) {
      return true;
    }
    return false;
  })();

  return (
    <div
      className="field-app-shell flex min-h-screen flex-col"
      data-field-shadow={settings.shadow}
      style={{ ...getFieldAppShellStyle(settings), backgroundColor: "hsl(var(--brand-solid, var(--primary)))" }}
    >
      {/* Header */}
      {showHeader && !hideHeader && (
        <header className="field-app-surface sticky top-0 z-30 flex h-[60px] items-center justify-between bg-brand-solid px-4">
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
          <div className="flex items-center gap-1">
            <SyncIcon company={company} />
            <Link href={`/${company}/app/notifications`} className="relative p-2" aria-label={`${notificationCount} notifications`}>
              <Bell className="h-5 w-5 text-brand-solid-foreground/80" />
              {notificationCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {notificationCount > 99 ? "99+" : notificationCount}
                </span>
              )}
            </Link>
          </div>
        </header>
      )}

      {/* Offline banner */}
      <OfflineBanner />

      {/* Main content */}
      <main className={`flex-1 bg-muted ${hideBottomNav ? "pb-0" : "pb-[72px]"}`} style={{ marginTop: showHeader && !hideHeader ? -1 : 0 }}>{children}</main>

      {/* Bottom navigation — hidden on full-page flows like report incident */}
      {!hideBottomNav && <BottomTabs company={company} />}
    </div>
  );
}
