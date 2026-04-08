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

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
          {/* Animated Harmoniq shield logo */}
          <div className="relative">
            <svg
              width="64"
              height="64"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="animate-[pulse_1.5s_ease-in-out_infinite]"
            >
              {/* Shield shape */}
              <path
                d="M32 4L8 16v16c0 14.4 10.24 27.84 24 32 13.76-4.16 24-17.6 24-32V16L32 4z"
                className="fill-primary/10 stroke-primary"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  strokeDasharray: 160,
                  strokeDashoffset: 0,
                  animation: "shield-draw 1.2s ease-out forwards",
                }}
              />
              {/* Checkmark inside */}
              <path
                d="M22 32l7 7 13-14"
                className="stroke-primary"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                style={{
                  strokeDasharray: 40,
                  strokeDashoffset: 40,
                  animation: "check-draw 0.5s ease-out 0.8s forwards",
                }}
              />
            </svg>
            {/* Glow ring */}
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-[pulse_2s_ease-in-out_infinite]" />
          </div>
          <p className="text-sm font-semibold text-muted-foreground tracking-wider uppercase animate-[pulse_1.5s_ease-in-out_infinite]">
            Harmoniq
          </p>
        </div>
        <style>{`
          @keyframes shield-draw {
            from { stroke-dashoffset: 160; opacity: 0; }
            to { stroke-dashoffset: 0; opacity: 1; }
          }
          @keyframes check-draw {
            from { stroke-dashoffset: 40; }
            to { stroke-dashoffset: 0; }
          }
        `}</style>
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
