"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  ClipboardCheck, 
  ChevronRight, 
  ChevronDown,
  CheckCircle,
  ShieldAlert,
  FileCheck,
  AlertTriangle,
  Clock,
  MapPin,
  X,
  Play,
  ListChecks,
  ListTodo,
  History,
  Camera,
  MessageSquare,
  Percent,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useChecklistTemplatesStore, useChecklistSubmissionsStore } from "@/stores/checklists-store";
import { useAssetsStore } from "@/stores/assets-store";
import { useLocationsStore } from "@/stores/locations-store";
import { useRiskEvaluationsStore } from "@/stores/risk-evaluations-store";
import { useIncidentsStore } from "@/stores/incidents-store";
import { cn } from "@/lib/utils";
import { useCompanyParam } from "@/hooks/use-company-param";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation, LOCALE_DEFAULT_COUNTRY } from "@/i18n";
import { TasksSkeleton } from "@/components/ui/loading";
import { TasksTabContent } from "@/components/tasks/tasks-tab-content";
import type { ChecklistTemplate, ChecklistSubmission, ChecklistResponse, User } from "@/types";

type TabType = "checklists" | "risk-assessment" | "reports" | "tasks";
type CountryCode = "US" | "NL" | "SE";

// Country-specific risk assessment forms
const riskAssessmentForms = {
  US: [
    { id: "jha", name: "JHA", fullName: "Job Hazard Analysis", icon: FileCheck },
    { id: "jsa", name: "JSA", fullName: "Job Safety Analysis", icon: ShieldAlert },
  ],
  NL: [
    { id: "rie", name: "RI&E", fullName: "RI&E Assessment", icon: FileCheck },
    { id: "arbowet", name: "Arbowet", fullName: "Arbowet Compliance Check", icon: ShieldAlert },
  ],
  SE: [
    { id: "sam", name: "SAM", fullName: "SAM Assessment", icon: FileCheck },
    { id: "osa", name: "OSA", fullName: "Psykosocial Riskbed\u00f6mning", icon: ShieldAlert },
  ],
};

// Collapsible section component
function Section({ 
  title, 
  icon: Icon, 
  iconColor = "text-muted-foreground",
  count, 
  countVariant = "secondary",
  defaultOpen = true, 
  children 
}: { 
  title: string; 
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  count?: number; 
  countVariant?: "secondary" | "destructive" | "warning" | "success";
  defaultOpen?: boolean; 
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const sectionId = React.useId();
  return (
    <div>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        aria-expanded={isOpen}
        aria-controls={sectionId}
        className="flex w-full items-center gap-2 py-2.5 px-1 text-sm font-semibold text-foreground"
      >
        <Icon className={cn("h-4 w-4 shrink-0", iconColor)} aria-hidden="true" />
        <span className="flex-1 text-left">{title}</span>
        {count !== undefined && count > 0 && (
          <Badge variant={countVariant} className="text-[10px] h-5 min-w-5 justify-center">
            {count}
          </Badge>
        )}
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", isOpen && "rotate-180")} aria-hidden="true" />
      </button>
      {isOpen && <div id={sectionId} className="space-y-1.5 pb-3">{children}</div>}
    </div>
  );
}

// ---------- Checklist Tab with Sub-tabs ----------

type ChecklistSubTab = "my" | "completed";

function ChecklistsTabContent({
  company,
  templates,
  pendingTemplates,
  userSubmissions,
  completedToday,
  user,
  t,
  formatDate,
}: {
  company: string;
  templates: ChecklistTemplate[];
  pendingTemplates: ChecklistTemplate[];
  userSubmissions: ChecklistSubmission[];
  completedToday: ChecklistSubmission[];
  user: User | null;
  t: (key: string) => string;
  formatDate: (date: string | Date, options?: Intl.DateTimeFormatOptions) => string;
}) {
  const [subTab, setSubTab] = React.useState<ChecklistSubTab>("my");

  const completedSubmissions = userSubmissions.filter(s => s.status === "submitted");
  const draftSubmissions = userSubmissions.filter(s => s.status === "draft");

  const subTabs = [
    { id: "my" as ChecklistSubTab, label: "My checklists", icon: ListChecks },
    { id: "completed" as ChecklistSubTab, label: "Completed", icon: History },
  ];

  // Calculate score for a submission
  const getScore = (submission: ChecklistSubmission) => {
    if (!submission.responses || submission.responses.length === 0) return null;
    const total = submission.responses.length;
    const passed = submission.responses.filter((r: ChecklistResponse) => 
      r.value === true || r.value === "pass" || r.value === "yes"
    ).length;
    const na = submission.responses.filter((r: ChecklistResponse) => 
      r.value === "na" || r.value === "n/a"
    ).length;
    const applicable = total - na;
    if (applicable === 0) return 100;
    return Math.round((passed / applicable) * 100);
  };

  return (
    <>
      {/* Sub-tab pills */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5 mb-3">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1 py-1.5 px-2 text-[11px] font-medium rounded-md transition-all",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="h-3 w-3 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* MY CHECKLISTS sub-tab */}
      {subTab === "my" && (
        <>
          {/* Assigned / pending checklists */}
          {pendingTemplates.length > 0 && (
            <Section
              title="Assigned to you"
              icon={ClipboardCheck}
              iconColor="text-primary"
              count={pendingTemplates.length}
            >
              {pendingTemplates.map((template) => (
                <Link
                  key={template.id}
                  href={`/${company}/app/checklists/${template.id}`}
                  className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors active:bg-muted/50 hover:bg-muted/30"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <ClipboardCheck className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-tight">{template.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {template.items?.length || 0} items · {template.recurrence || "once"}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              ))}
            </Section>
          )}

          {/* Drafts / in-progress */}
          {draftSubmissions.length > 0 && (
            <>
              <div className="border-t" />
              <Section
                title="In progress"
                icon={Clock}
                iconColor="text-blue-500"
                count={draftSubmissions.length}
              >
                {draftSubmissions.map((submission) => {
                  const tpl = templates.find(t => t.id === submission.template_id);
                  const progress = submission.responses?.length
                    ? Math.round((submission.responses.length / (tpl?.items?.length || 1)) * 100)
                    : 0;
                  return (
                    <Link
                      key={submission.id}
                      href={`/${company}/app/checklists/${submission.template_id}?draft=${submission.id}`}
                      className="flex items-center gap-3 rounded-lg border p-3 active:bg-muted/50"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                        <Play className="h-4 w-4 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{tpl?.name || "Checklist"}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 rounded-full bg-blue-500/20 overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground">{progress}%</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">Resume</span>
                    </Link>
                  );
                })}
              </Section>
            </>
          )}

          {/* Completed today */}
          {completedToday.length > 0 && (
            <>
              <div className="border-t" />
              <Section
                title="Completed today"
                icon={CheckCircle}
                iconColor="text-success"
                count={completedToday.length}
                defaultOpen={false}
              >
                {completedToday.map((submission) => {
                  const score = getScore(submission);
                  return (
                    <div key={submission.id} className="flex items-center gap-3 rounded-lg p-2.5 bg-success/5">
                      <CheckCircle className="h-4 w-4 text-success shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {templates.find(t => t.id === submission.template_id)?.name || "Checklist"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDate(new Date(submission.submitted_at || submission.created_at), { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      {score !== null && (
                        <div className="flex items-center gap-1">
                          <Percent className="h-3 w-3 text-success" />
                          <span className="text-xs font-semibold text-success">{score}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </Section>
            </>
          )}

          {pendingTemplates.length === 0 && draftSubmissions.length === 0 && completedToday.length === 0 && (
            <div className="py-8 text-center">
              <ClipboardCheck className="h-10 w-10 text-muted-foreground/20 mx-auto" />
              <p className="text-sm font-medium text-muted-foreground mt-2">No checklists assigned</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Checklists will appear here when assigned by your admin</p>
            </div>
          )}
        </>
      )}

      {/* COMPLETED sub-tab */}
      {subTab === "completed" && (
        <>
          {completedSubmissions.length > 0 ? (
            <div className="space-y-2">
              {completedSubmissions
                .sort((a, b) => new Date(b.submitted_at || b.created_at).getTime() - new Date(a.submitted_at || a.created_at).getTime())
                .map((submission) => {
                  const tpl = templates.find(t => t.id === submission.template_id);
                  const score = getScore(submission);
                  const passCount = submission.responses?.filter((r: ChecklistResponse) => r.value === true || r.value === "pass" || r.value === "yes").length || 0;
                  const failCount = submission.responses?.filter((r: ChecklistResponse) => r.value === false || r.value === "fail" || r.value === "no").length || 0;
                  const naCount = submission.responses?.filter((r: ChecklistResponse) => r.value === "na" || r.value === "n/a").length || 0;
                  const hasNotes = submission.responses?.some((r: ChecklistResponse) => r.comment);
                  const hasPhotos = submission.responses?.some((r: ChecklistResponse) => (r.photo_urls?.length ?? 0) > 0);

                  return (
                    <div key={submission.id} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{tpl?.name || "Checklist"}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {formatDate(new Date(submission.submitted_at || submission.created_at))}
                          </p>
                        </div>
                        {score !== null && (
                          <div className={cn(
                            "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
                            score >= 80 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                            score >= 50 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                            "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          )}>
                            {score}%
                          </div>
                        )}
                      </div>
                      
                      {/* Pass/Fail/N/A summary bar */}
                      <div className="flex items-center gap-3 text-[10px]">
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <CheckCircle className="h-3 w-3" /> {passCount} pass
                        </span>
                        <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                          <X className="h-3 w-3" /> {failCount} fail
                        </span>
                        {naCount > 0 && (
                          <span className="text-muted-foreground">{naCount} N/A</span>
                        )}
                        {hasNotes && (
                          <span className="flex items-center gap-0.5 text-muted-foreground">
                            <MessageSquare className="h-3 w-3" /> Notes
                          </span>
                        )}
                        {hasPhotos && (
                          <span className="flex items-center gap-0.5 text-muted-foreground">
                            <Camera className="h-3 w-3" /> Photos
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="py-8 text-center">
              <History className="h-10 w-10 text-muted-foreground/20 mx-auto" />
              <p className="text-sm font-medium text-muted-foreground mt-2">No completed checklists</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Completed checklists with scores will appear here</p>
            </div>
          )}
        </>
      )}
    </>
  );
}

function EmployeeChecklistsPageContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const locationParam = searchParams.get("location");
  
  const company = useCompanyParam();
  
  const { t, locale, formatDate } = useTranslation();

  const getInitialTab = (): TabType => {
    if (tabParam === "risk-assessment") return "risk-assessment";
    if (tabParam === "checklists") return "checklists";
    if (tabParam === "reports") return "reports";
    if (tabParam === "tasks") return "tasks";
    return "checklists";
  };
  
  const [activeTab, setActiveTab] = React.useState<TabType>(getInitialTab());

  const { items: checklistTemplates, isLoading: isTemplatesLoading } = useChecklistTemplatesStore();
  const { items: checklistSubmissions, isLoading: isSubmissionsLoading } = useChecklistSubmissionsStore();
  const { items: assets } = useAssetsStore();
  const { items: locations } = useLocationsStore();
  const { items: riskEvaluations } = useRiskEvaluationsStore();
  const { items: incidents } = useIncidentsStore();
  const { currentCompany, user } = useAuth();
  
  const selectedLocation = locationParam 
    ? locations.find(l => l.id === locationParam) 
    : null;

  // Derive country from user's locale first, fall back to company country, then US
  const localeCountry = LOCALE_DEFAULT_COUNTRY[locale] as CountryCode | undefined;
  const companyCountry: CountryCode = localeCountry || (currentCompany?.country as CountryCode) || "US";

  const templates = checklistTemplates;
  const activeAssets = assets.filter((a) => a.status === "active");

  const tabs = [
    { id: "reports" as TabType, label: t("checklists.tabs.reports"), icon: AlertTriangle },
    { id: "risk-assessment" as TabType, label: t("checklists.tabs.assessments"), icon: ShieldAlert },
    { id: "checklists" as TabType, label: t("checklists.tabs.checklists"), icon: ClipboardCheck },
    { id: "tasks" as TabType, label: t("checklists.tabs.tasks"), icon: ListTodo },
  ];

  const userSubmissions = user
    ? checklistSubmissions.filter((submission) => submission.submitter_id === user.id)
    : checklistSubmissions;
  const completedTemplateIds = new Set(
    userSubmissions.filter((submission) => submission.status === "submitted").map((submission) => submission.template_id)
  );
  const pendingTemplates = templates.filter((template) => !completedTemplateIds.has(template.id));
  const completedToday = userSubmissions.filter((submission) => {
    const submittedAt = submission.submitted_at || submission.created_at;
    return new Date(submittedAt).toDateString() === new Date().toDateString();
  });

  const assessmentLabelMap: Record<string, string> = {
    JHA: "Job Hazard Analysis",
    JSA: "Job Safety Analysis",
    RIE: "RI&E Assessment",
    ARBOWET: "Arbowet Compliance Check",
    SAM: "SAM Assessment",
    OSA: "OSA Assessment",
  };

  const myAssessments = user
    ? riskEvaluations.filter((evaluation) => evaluation.submitter_id === user.id)
    : riskEvaluations;
  const inProgressAssessments = myAssessments
    .filter((evaluation) => evaluation.status === "draft")
    .slice(0, 2)
    .map((evaluation) => {
      const location = locations.find((loc) => loc.id === evaluation.location_id);
      const responseCount = Object.keys(evaluation.responses || {}).length;
      const progress = Math.min(100, Math.max(10, responseCount * 10));
      return {
        id: evaluation.id,
        formId: evaluation.form_type.toLowerCase(),
        name: assessmentLabelMap[evaluation.form_type] || evaluation.form_type,
        location: location?.name || "Unassigned location",
        progress,
      };
    });
  const completedAssessments = myAssessments
    .filter((evaluation) => evaluation.status !== "draft")
    .slice(0, 3)
    .map((evaluation) => {
      const location = locations.find((loc) => loc.id === evaluation.location_id);
      return {
        id: evaluation.id,
        name: assessmentLabelMap[evaluation.form_type] || evaluation.form_type,
        location: location?.name || "Unassigned location",
        date: evaluation.submitted_at || evaluation.created_at,
      };
    });

  if (isTemplatesLoading || isSubmissionsLoading) {
    return <TasksSkeleton />;
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header + Tabs */}
      <div className="sticky top-14 z-10 bg-background border-b px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold truncate">{t("checklists.safetyTasks")}</h1>
          {selectedLocation && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {selectedLocation.name}
              <Link href={`/${company}/app/checklists`} className="ml-0.5 hover:text-foreground">
                <X className="h-3 w-3" />
              </Link>
            </span>
          )}
        </div>

        <div className="flex gap-1 bg-muted rounded-lg p-1 overflow-x-auto" role="tablist">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-medium rounded-md transition-all whitespace-nowrap",
                  isActive 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pt-3 pb-20 space-y-1">

        {/* CHECKLISTS TAB */}
        {activeTab === "checklists" && (
          <ChecklistsTabContent
            company={company}
            templates={templates}
            pendingTemplates={pendingTemplates}
            userSubmissions={userSubmissions}
            completedToday={completedToday}
            user={user}
            t={t}
            formatDate={formatDate}
          />
        )}

        {/* REPORTS TAB */}
        {activeTab === "reports" && (
          <>
            {/* New Report Button, same style as New Assessment cards */}
            <div className="grid grid-cols-2 gap-2">
              <Link
                href={`/${company}/app/report`}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 transition-all active:border-primary active:bg-primary/10"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <FileCheck className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-sm text-primary">{t("app.reportIncident")}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{t("app.reportIncidentDesc") || "New incident report"}</p>
                </div>
              </Link>
            </div>

            {/* My Submitted Reports */}
            <Section
              title={t("app.myReports") || "My Reports"}
              icon={AlertTriangle}
              iconColor="text-warning"
              count={incidents.filter(i => i.reporter_id === user?.id).length}
            >
              {incidents.filter(i => i.reporter_id === user?.id).length > 0 ? (
                incidents
                  .filter(i => i.reporter_id === user?.id)
                  .sort((a, b) => new Date(b.incident_date).getTime() - new Date(a.incident_date).getTime())
                  .slice(0, 10)
                  .map((incident) => (
                    <Link
                      key={incident.id}
                      href={`/${company}/app/report?view=${incident.id}`}
                      className="flex items-center gap-3 rounded-lg border p-3 transition-colors active:bg-muted/50 hover:bg-muted/40"
                    >
                      <AlertTriangle className={cn(
                        "h-5 w-5 shrink-0",
                        incident.severity === "critical" ? "text-destructive" :
                        incident.severity === "high" ? "text-orange-500" :
                        incident.severity === "medium" ? "text-warning" : "text-muted-foreground"
                      )} aria-hidden="true" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{incident.reference_number}</p>
                          <Badge variant={
                            incident.status === "resolved" ? "success" :
                            incident.status === "in_progress" ? "warning" : "secondary"
                          } className="text-[10px] h-4">
                            {incident.status}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {formatDate(new Date(incident.incident_date))} · {incident.building || (typeof incident.location === 'string' ? incident.location : null) || "N/A"}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                    </Link>
                  ))
              ) : (
                <div className="py-6 text-center">
                  <AlertTriangle className="h-8 w-8 text-muted-foreground/20 mx-auto" aria-hidden="true" />
                  <p className="text-sm font-medium text-muted-foreground mt-2">{t("app.noReports") || "No reports yet"}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">{t("app.noReportsDesc") || "Reports you submit will appear here"}</p>
                </div>
              )}
            </Section>
          </>
        )}

        {/* RISK ASSESSMENT TAB */}
        {activeTab === "risk-assessment" && (
          <>
            <Section title={t("checklists.newAssessment")} icon={FileCheck} iconColor="text-primary">
              <div className="grid grid-cols-2 gap-2">
                {riskAssessmentForms[companyCountry].map((form) => {
                  const Icon = form.icon;
                  return (
                    <Link
                      key={form.id}
                      href={`/${company}/app/risk-assessment/${form.id}`}
                      className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 transition-all active:border-primary active:bg-primary/10"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-sm text-primary">{form.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{form.fullName}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </Section>

            <div className="border-t" />

            {inProgressAssessments.length > 0 && (
              <>
                <Section 
                  title={t("checklists.labels.inProgress")} 
                  icon={Clock} 
                  iconColor="text-blue-500"
                  count={inProgressAssessments.length}
                >
                  {inProgressAssessments.map((item) => (
                    <Link
                      key={item.id}
                      href={`/${company}/app/risk-assessment/${item.formId}?draft=${item.id}`}
                      className="flex items-center gap-3 rounded-lg border bg-card p-3 active:bg-muted/50 hover:bg-muted/30"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                        <Play className="h-4 w-4 text-blue-500" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm leading-tight">{item.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 rounded-full bg-blue-500/20 overflow-hidden" role="progressbar" aria-valuenow={item.progress} aria-valuemin={0} aria-valuemax={100}>
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${item.progress}%` }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground font-medium">{item.progress}%</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-primary font-medium">{t("checklists.buttons.resume")}</span>
                    </Link>
                  ))}
                </Section>
                <div className="border-t" />
              </>
            )}

            <Section 
              title={t("checklists.labels.completed")} 
              icon={CheckCircle} 
              iconColor="text-success"
              count={completedAssessments.length} 
              countVariant="success"
              defaultOpen={false}
            >
              {completedAssessments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-3">{t("checklists.noCompletedAssessments")}</p>
              ) : (
                completedAssessments.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-muted/40">
                    <CheckCircle className="h-4 w-4 text-success shrink-0" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">{item.location}</p>
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">{formatDate(new Date(item.date))}</span>
                  </div>
                ))
              )}
            </Section>
          </>
        )}

        {/* TASKS TAB */}
        {activeTab === "tasks" && (
          <TasksTabContent />
        )}
      </div>
    </div>
  );
}

export default function EmployeeChecklistsPage() {
  return (
    <React.Suspense fallback={<TasksSkeleton />}>
      <EmployeeChecklistsPageContent />
    </React.Suspense>
  );
}
