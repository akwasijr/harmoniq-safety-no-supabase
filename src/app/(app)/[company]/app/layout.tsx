"use client";

import * as React from "react";
import { notFound, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { EmployeeAppLayout } from "@/components/layouts/employee-app-layout";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyParam } from "@/hooks/use-company-param";
import { useCompanyStore } from "@/stores/company-store";
import { useContentStore } from "@/stores/content-store";
import { useChecklistTemplatesStore, useChecklistSubmissionsStore } from "@/stores/checklists-store";
import { useTicketsStore } from "@/stores/tickets-store";
import { useWorkOrdersStore } from "@/stores/work-orders-store";
import { useCorrectiveActionsStore } from "@/stores/corrective-actions-store";
import { useRiskEvaluationsStore } from "@/stores/risk-evaluations-store";
import { useNotificationsStore } from "@/stores/notifications-store";
import { useAssetsStore } from "@/stores/assets-store";
import { useIncidentsStore } from "@/stores/incidents-store";
import { useLocationsStore } from "@/stores/locations-store";
import { applyBranding, resetBranding } from "@/lib/branding";
import { applyDocumentLanguage } from "@/lib/localization";
import { I18nProvider } from "@/i18n";
import type { SupportedLocale } from "@/i18n";
import { isVisibleToFieldApp } from "@/lib/template-activation";
import { isAssignedToUserOrTeam } from "@/lib/assignment-utils";
import { FieldAppSettingsProvider } from "@/components/providers/field-app-settings-provider";

export default function EmployeeAppRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const company = useCompanyParam();
  const router = useRouter();
  const { user, currentCompany, isLoading } = useAuth();
  const { items: companies, isLoading: isCompaniesLoading } = useCompanyStore();
  useContentStore();
  const { items: checklistTemplates } = useChecklistTemplatesStore();
  const { items: checklistSubmissions } = useChecklistSubmissionsStore();
  const { items: tickets } = useTicketsStore();
  const { items: workOrders } = useWorkOrdersStore();
  const { items: correctiveActions } = useCorrectiveActionsStore();
  const { items: riskEvaluations } = useRiskEvaluationsStore();
  const { items: dbNotifications } = useNotificationsStore();
  // Prefetch additional stores so tab switching is instant
  useAssetsStore();
  useIncidentsStore();
  useLocationsStore();

  // Prefetch all tab routes so JS chunks are ready before user navigates
  React.useEffect(() => {
    if (!company) return;
    const tabs = ["checklists", "assets", "news", "profile", "tasks", "my-tasks", "notifications", "location"];
    tabs.forEach((tab) => router.prefetch(`/${company}/app/${tab}`));
    router.prefetch(`/${company}/app`);
  }, [company, router]);

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
    const pendingTasks = checklistTemplates.filter(
      (template) =>
        template.company_id === user.company_id &&
        isVisibleToFieldApp(template) &&
        !completedIds.has(template.id),
    ).length;
    const openTickets = tickets.filter(
      (ticket) =>
        ticket.company_id === user.company_id &&
        ticket.status === "new" &&
        isAssignedToUserOrTeam(ticket, user),
    ).length;
    const openWorkOrders = workOrders.filter(
      (workOrder) =>
        workOrder.company_id === user.company_id &&
        isAssignedToUserOrTeam(workOrder, user) &&
        workOrder.status !== "completed" &&
        workOrder.status !== "cancelled",
    ).length;
    const openActions = correctiveActions.filter(
      (action) =>
        action.company_id === user.company_id &&
        isAssignedToUserOrTeam(action, user) &&
        action.status !== "completed",
    ).length;
    const assessmentFollowUp = riskEvaluations.filter(
      (evaluation) =>
        evaluation.company_id === user.company_id &&
        evaluation.submitter_id === user.id &&
        (evaluation.status === "draft" || evaluation.status === "submitted"),
    ).length;
    return unreadDb + pendingTasks + openTickets + openWorkOrders + openActions + assessmentFollowUp;
  }, [user, dbNotifications, checklistTemplates, checklistSubmissions, tickets, workOrders, correctiveActions, riskEvaluations]);

  const { resolvedTheme } = useTheme();

  React.useEffect(() => {
    if (!currentCompany) return;

    let primaryColor = currentCompany.primary_color;
    let secondaryColor = currentCompany.secondary_color;

    // Prefer locally-saved branding overrides over DB values
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
    } catch { /* ignore */ }

    applyBranding(
      {
        primaryColor,
        secondaryColor,
        fontFamily: currentCompany.font_family,
        uiStyle: currentCompany.ui_style,
      },
      resolvedTheme || "light"
    );

    // Set html background to primary color so scroll bounce matches the header
    if (primaryColor) {
      document.documentElement.style.backgroundColor = primaryColor;
    }

    return () => {
      resetBranding();
      document.documentElement.style.backgroundColor = "";
    };
  }, [currentCompany?.primary_color, currentCompany?.secondary_color, currentCompany?.font_family, currentCompany?.ui_style, resolvedTheme, currentCompany]);

  React.useEffect(() => {
    applyDocumentLanguage(currentCompany?.language ?? user?.language);
  }, [currentCompany?.language, user?.language]);

  // Redirect unauthenticated users to login
  React.useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  // Splash screen: show for at least 4s so animation settles
  const [showSplash, setShowSplash] = React.useState(true);
  const splashMinTimeRef = React.useRef(Date.now());

  React.useEffect(() => {
    if (!isLoading && user) {
      const elapsed = Date.now() - splashMinTimeRef.current;
      const remaining = Math.max(0, 5000 - elapsed);
      const timer = setTimeout(() => setShowSplash(false), remaining);
      return () => clearTimeout(timer);
    }
  }, [isLoading, user]);

  if (showSplash && (isLoading || !user)) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#0f0f14" }}>
        <svg
          width="120"
          height="120"
          viewBox="-10 -10 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Top-right blob — flies in from top-right */}
          <path d="M84.84,5.97c11.18,10.61,16.12,21.58,10.4,28.43-6.89,8.24-23.06,5.18-30.43-.96-5.43-4.53-10.3-16.74-8.84-23.72,2.88-13.82,21.41-10.83,28.87-3.75Z" fill="#8b5cf6" className="splash-blob" style={{ animationDelay: "0.2s", ["--dx" as string]: "80px", ["--dy" as string]: "-80px" }} />
          {/* Top-left blob — flies in from top-left */}
          <path d="M43.06,1.77c6.62,4.14,5.61,16.37,1.9,22.31-6.48,10.36-27.92,19.25-37.08,8.53C-3.27,19.57,29.34-6.81,43.06,1.77Z" fill="#8b5cf6" className="splash-blob" style={{ animationDelay: "0.35s", ["--dx" as string]: "-80px", ["--dy" as string]: "-80px" }} />
          {/* Right blob — flies in from right */}
          <path d="M90.61,47.51c10.09,5.18,6.28,21.92.93,29.4-9.71,13.59-31.32,20.76-30.13-2.94.56-11.1,5.84-19.13,15.81-24.32,2.78-1.45,10.59-3.58,13.39-2.14Z" fill="#8b5cf6" className="splash-blob" style={{ animationDelay: "0.5s", ["--dx" as string]: "100px", ["--dy" as string]: "0px" }} />
          {/* Left blob — flies in from left */}
          <path d="M16.97,43.36c10,6.66,11.37,25.03,1.35,32.13-9.67,6.85-24.05-19.32-15.93-30.07,3.23-4.27,10.25-4.95,14.58-2.06Z" fill="#8b5cf6" className="splash-blob" style={{ animationDelay: "0.4s", ["--dx" as string]: "-100px", ["--dy" as string]: "0px" }} />
          {/* Center blob — flies in from below */}
          <path d="M58.61,36.16c13.98,10.11-3.21,34.51-17.24,24.68-16.58-11.62,2.07-35.66,17.24-24.68Z" fill="#8b5cf6" className="splash-blob" style={{ animationDelay: "0.65s", ["--dx" as string]: "0px", ["--dy" as string]: "70px" }} />
          {/* Bottom blob — flies in from bottom */}
          <path d="M50.19,78.06c5.81,3.95,8.59,8.6,4.65,15.15-5.77,9.62-28.57,2.57-31.26-7.18-3.6-13.08,19.27-12.96,26.6-7.97h0Z" fill="#8b5cf6" className="splash-blob" style={{ animationDelay: "0.55s", ["--dx" as string]: "0px", ["--dy" as string]: "90px" }} />
        </svg>
        <style>{`
          .splash-blob {
            opacity: 0;
            transform: translate(var(--dx), var(--dy));
            animation: fly-in 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            animation-delay: inherit;
          }
          @keyframes fly-in {
            0% { opacity: 0; transform: translate(var(--dx), var(--dy)); }
            100% { opacity: 1; transform: translate(0, 0); }
          }
        `}</style>
      </div>
    );
  }

  if (!showSplash && (isLoading || !user)) {
    return null;
  }

  // Only check validity after companies have actually loaded
  if (!isCompaniesLoading && companies.length > 0 && !companies.some((c) => c.slug === company)) {
    notFound();
  }

  const companyLocale = (currentCompany?.language ?? "en") as SupportedLocale;

  return (
    <I18nProvider companyLocale={companyLocale}>
      <FieldAppSettingsProvider
        companyId={currentCompany?.id}
        industry={currentCompany?.industry}
        language={currentCompany?.language}
      >
        <EmployeeAppLayout
          company={company}
          companyName={currentCompany?.app_name || currentCompany?.name || "Safety App"}
          companyLogo={currentCompany?.logo_url || null}
          notificationCount={notificationCount}
        >
          {children}
        </EmployeeAppLayout>
      </FieldAppSettingsProvider>
    </I18nProvider>
  );
}
