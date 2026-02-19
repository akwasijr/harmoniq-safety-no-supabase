"use client";

import * as React from "react";
import { notFound, useRouter } from "next/navigation";
import { EmployeeAppLayout } from "@/components/layouts/employee-app-layout";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyParam } from "@/hooks/use-company-param";
import { useCompanyStore } from "@/stores/company-store";
import { useContentStore } from "@/stores/content-store";
import { useChecklistTemplatesStore, useChecklistSubmissionsStore } from "@/stores/checklists-store";
import { useTicketsStore } from "@/stores/tickets-store";
import { useNotificationsStore } from "@/stores/notifications-store";
import { useAssetsStore } from "@/stores/assets-store";
import { useIncidentsStore } from "@/stores/incidents-store";
import { useLocationsStore } from "@/stores/locations-store";
import { applyPrimaryColor } from "@/lib/branding";
import { applyDocumentLanguage } from "@/lib/localization";
import { I18nProvider } from "@/i18n";
import type { SupportedLocale } from "@/i18n";

export default function EmployeeAppRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const company = useCompanyParam();
  const router = useRouter();
  const { user, currentCompany, isLoading } = useAuth();
  const { items: companies, isLoading: isCompaniesLoading } = useCompanyStore();
  const { items: contentItems } = useContentStore();
  const { items: checklistTemplates } = useChecklistTemplatesStore();
  const { items: checklistSubmissions } = useChecklistSubmissionsStore();
  const { items: tickets } = useTicketsStore();
  const { items: dbNotifications } = useNotificationsStore();
  // Prefetch additional stores so tab switching is instant
  useAssetsStore();
  useIncidentsStore();
  useLocationsStore();

  // Compute notification count from real DB notifications + derived
  const notificationCount = React.useMemo(() => {
    if (!user) return 0;
    // Count unread DB notifications
    const unreadDb = dbNotifications.filter(
      (n) => !n.read && (n.user_id === null || n.user_id === user.id)
    ).length;
    // Count pending tasks not covered by DB notifications
    const completedIds = new Set(
      checklistSubmissions
        .filter((s) => s.submitter_id === user.id && s.status === "submitted")
        .map((s) => s.template_id)
    );
    const pendingTasks = checklistTemplates.filter((t) => !completedIds.has(t.id)).length;
    const openTickets = tickets.filter((t) => t.assigned_to === user.id && t.status === "new").length;
    return unreadDb + pendingTasks + openTickets;
  }, [user, dbNotifications, checklistTemplates, checklistSubmissions, tickets]);

  // C5: Validate company slug against known companies
  const isValidCompany = React.useMemo(
    () => companies.some((c) => c.slug === company),
    [companies, company]
  );

  React.useEffect(() => {
    applyPrimaryColor(currentCompany?.primary_color);
  }, [currentCompany?.primary_color]);

  React.useEffect(() => {
    applyDocumentLanguage(currentCompany?.language ?? user?.language);
  }, [currentCompany?.language, user?.language]);

  // Redirect unauthenticated users to login
  React.useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
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

  const companyLocale = (currentCompany?.language ?? "en") as SupportedLocale;

  return (
    <I18nProvider companyLocale={companyLocale}>
      <EmployeeAppLayout
        company={company}
        companyName={currentCompany?.app_name || currentCompany?.name || "Safety App"}
        companyLogo={currentCompany?.logo_url || null}
        notificationCount={notificationCount}
      >
        {children}
      </EmployeeAppLayout>
    </I18nProvider>
  );
}
