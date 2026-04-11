"use client";

import * as React from "react";
import { useParams, useRouter, notFound } from "next/navigation";
import { useTheme } from "next-themes";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyData } from "@/hooks/use-company-data";
import { useCompanyStore } from "@/stores/company-store";
import { useNotificationsStore } from "@/stores/notifications-store";
import { checkOverdueItems } from "@/stores/notification-triggers";
import { applyBranding, resetBranding } from "@/lib/branding";
import { applyDocumentLanguage } from "@/lib/localization";
import { I18nProvider } from "@/i18n";
import type { SupportedLocale } from "@/i18n";

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const company = params.company as string;
  const { user, currentCompany, isSuperAdmin, isEmployee, isLoading } = useAuth();
  const { items: companies, isLoading: isCompaniesLoading } = useCompanyStore();
  const { tickets, workOrders, correctiveActions } = useCompanyData();
  const { add: addNotification } = useNotificationsStore();

  // Validate company slug only after companies have loaded
  const isValidCompany = React.useMemo(
    () => isCompaniesLoading || companies.length === 0 || companies.some((c) => c.slug === company),
    [companies, company, isCompaniesLoading]
  );

  const { resolvedTheme } = useTheme();

  // Apply branding synchronously before paint to avoid FOUC
  React.useLayoutEffect(() => {
    if (!currentCompany) return;

    let primaryColor = currentCompany.primary_color;
    let secondaryColor = currentCompany.secondary_color;

    // Check if the user has saved branding overrides in localStorage
    try {
      const settingsKey = currentCompany.id
        ? `harmoniq_settings_${currentCompany.id}`
        : null;
      const raw = settingsKey ? localStorage.getItem(settingsKey) : null;
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.primaryColor) primaryColor = saved.primaryColor;
        if (saved.secondaryColor) secondaryColor = saved.secondaryColor;
      }
    } catch { /* ignore parse errors */ }

    applyBranding(
      {
        primaryColor,
        secondaryColor,
        fontFamily: currentCompany.font_family,
        uiStyle: currentCompany.ui_style,
      },
      resolvedTheme || "light"
    );
    return () => resetBranding();
  }, [currentCompany?.primary_color, currentCompany?.secondary_color, currentCompany?.font_family, currentCompany?.ui_style, resolvedTheme, currentCompany]);

  React.useEffect(() => {
    applyDocumentLanguage(currentCompany?.language ?? user?.language);
  }, [currentCompany?.language, user?.language]);

  // C3: Redirect employees away from dashboard. They should use the employee app
  React.useEffect(() => {
    if (!isLoading && user && isEmployee) {
      router.replace(`/${company}/app`);
    }
  }, [isLoading, user, isEmployee, company, router]);

  // Sync platform entry cookie → localStorage when arriving via /admin
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const match = document.cookie.match(/harmoniq_platform_entry=true/);
    if (match) {
      window.localStorage.setItem("harmoniq_platform_entry", "true");
      // Clear the cookie so it doesn't persist beyond this navigation
      document.cookie = "harmoniq_platform_entry=; path=/; max-age=0";
    }
  }, []);

  // Redirect unauthenticated users to login
  React.useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  // Check for overdue items once per hour per session
  React.useEffect(() => {
    if (!isLoading && user?.id && user?.company_id) {
      const checkedKey = `harmoniq_overdue_checked_${user.id}`;
      const lastChecked = sessionStorage.getItem(checkedKey);
      const now = Date.now();
      if (!lastChecked || now - parseInt(lastChecked) > 3600000) {
        checkOverdueItems({
          userId: user.id,
          companyId: user.company_id,
          tickets,
          workOrders,
          correctiveActions,
          addNotification,
        });
        sessionStorage.setItem(checkedKey, String(now));
      }
    }
  }, [user?.id, user?.company_id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // C3: While redirect is pending, show loading instead of dashboard flash
  if (isEmployee) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Only check validity after companies have actually loaded
  if (!isCompaniesLoading && companies.length > 0 && !companies.some((c) => c.slug === company)) {
    notFound();
  }

  const displayRole = user.role === "super_admin"
    ? "Platform Admin"
    : user.role === "company_admin"
      ? "Admin"
      : user.role.charAt(0).toUpperCase() + user.role.slice(1);

  const companyLocale = (currentCompany?.language ?? "en") as SupportedLocale;

  return (
    <I18nProvider companyLocale={companyLocale}>
      <DashboardLayout
        company={company}
        companyName={currentCompany?.name || "Platform"}
        companyLogo={currentCompany?.logo_url || null}
        userName={user.full_name}
        userRole={displayRole}
      >
        {children}
      </DashboardLayout>
    </I18nProvider>
  );
}
