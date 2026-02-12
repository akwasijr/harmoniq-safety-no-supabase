"use client";

import * as React from "react";
import { useParams, useRouter, notFound } from "next/navigation";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { useTicketsStore } from "@/stores/tickets-store";
import { useCompanyStore } from "@/stores/company-store";
import { applyPrimaryColor } from "@/lib/branding";
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
  const { items: tickets } = useTicketsStore();
  const { items: companies, isLoading: isCompaniesLoading } = useCompanyStore();

  // Validate company slug only after companies have loaded
  const isValidCompany = React.useMemo(
    () => isCompaniesLoading || companies.length === 0 || companies.some((c) => c.slug === company),
    [companies, company, isCompaniesLoading]
  );

  // Apply saved branding color on mount — must be before any early returns to preserve hook order
  React.useEffect(() => {
    applyPrimaryColor(currentCompany?.primary_color);
  }, [currentCompany?.primary_color]);

  React.useEffect(() => {
    applyDocumentLanguage(currentCompany?.language ?? user?.language);
  }, [currentCompany?.language, user?.language]);

  // C3: Redirect employees away from dashboard — they should use the employee app
  React.useEffect(() => {
    if (!isLoading && user && isEmployee) {
      router.replace(`/${company}/app`);
    }
  }, [isLoading, user, isEmployee, company, router]);

  // Redirect unauthenticated users to login
  React.useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    console.log("[Harmoniq] DashboardLayout: showing spinner", { isLoading, hasUser: !!user });
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

  // Calculate notification count from open/pending tickets assigned to current user
  const notificationCount = tickets.filter(
    t => t.assigned_to === user.id && (t.status === "new" || t.status === "in_progress")
  ).length;

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
        notificationCount={notificationCount}
      >
        {children}
      </DashboardLayout>
    </I18nProvider>
  );
}
