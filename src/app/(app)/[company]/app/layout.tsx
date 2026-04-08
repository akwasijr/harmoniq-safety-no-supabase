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

  // Splash screen: show for at least 2.5s with elegant reveal
  const [showSplash, setShowSplash] = React.useState(true);
  const splashMinTimeRef = React.useRef(Date.now());

  React.useEffect(() => {
    if (!isLoading && user) {
      const elapsed = Date.now() - splashMinTimeRef.current;
      const remaining = Math.max(0, 2500 - elapsed);
      const timer = setTimeout(() => setShowSplash(false), remaining);
      return () => clearTimeout(timer);
    }
  }, [isLoading, user]);

  if (showSplash && (isLoading || !user)) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "linear-gradient(145deg, #0f0f14 0%, #1a1a2e 50%, #0f0f14 100%)" }}>
        <div className="flex flex-col items-center gap-6 splash-container">
          {/* Logo image — blur-to-focus with subtle rotation */}
          <div className="splash-logo">
            <img
              src="/logo-white.svg"
              alt="Harmoniq"
              width={180}
              height={42}
              style={{ width: 180, height: "auto" }}
            />
          </div>
          {/* Subtle tagline */}
          <p className="splash-tagline text-xs tracking-[0.3em] uppercase" style={{ color: "rgba(139, 92, 246, 0.7)" }}>
            Safety Platform
          </p>
          {/* Loading dots */}
          <div className="flex gap-1.5 splash-dots">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#8b5cf6", animation: "dot-pulse 1.2s ease-in-out 1.8s infinite", opacity: 0.3 }} />
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#8b5cf6", animation: "dot-pulse 1.2s ease-in-out 2s infinite", opacity: 0.3 }} />
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#8b5cf6", animation: "dot-pulse 1.2s ease-in-out 2.2s infinite", opacity: 0.3 }} />
          </div>
        </div>
        <style>{`
          .splash-logo {
            opacity: 0;
            filter: blur(16px);
            transform: rotate(-8deg) scale(0.9);
            animation: logo-reveal 1.4s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards;
          }
          .splash-tagline {
            opacity: 0;
            transform: translateY(8px);
            animation: text-fade 0.8s ease-out 1.2s forwards;
          }
          .splash-dots {
            opacity: 0;
            animation: text-fade 0.5s ease-out 1.6s forwards;
          }
          @keyframes logo-reveal {
            0% { opacity: 0; filter: blur(16px); transform: rotate(-8deg) scale(0.9); }
            60% { opacity: 1; filter: blur(2px); transform: rotate(1deg) scale(1.02); }
            100% { opacity: 1; filter: blur(0px); transform: rotate(0deg) scale(1); }
          }
          @keyframes text-fade {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes dot-pulse {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 1; }
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
