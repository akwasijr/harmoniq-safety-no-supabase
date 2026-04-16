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
  ShieldCheck,
  FileCheck,
  AlertTriangle,
  Clock,
  MapPin,
  X,
  Play,
  History,
  HardHat,
  Scale,
  Download,
  Layers,
  Search,
  ArrowUpDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useChecklistTemplatesStore, useChecklistSubmissionsStore } from "@/stores/checklists-store";
import { useAssetsStore } from "@/stores/assets-store";
import { useLocationsStore } from "@/stores/locations-store";
import { useRiskEvaluationsStore } from "@/stores/risk-evaluations-store";
import { useIncidentsStore } from "@/stores/incidents-store";
import { useUsersStore } from "@/stores/users-store";
import { useProcedureTemplatesStore } from "@/stores/procedure-templates-store";
import { useProcedureSubmissionsStore } from "@/stores/procedure-submissions-store";
import { getBuiltInProcedureTemplates } from "@/data/procedure-templates";
import { cn } from "@/lib/utils";
import { useCompanyParam } from "@/hooks/use-company-param";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation, LOCALE_DEFAULT_COUNTRY } from "@/i18n";
import {
  resolveRiskAssessmentCatalogCountry,
  type RiskAssessmentCatalogCountry,
} from "@/lib/country-config";
import { TasksSkeleton } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";
import { isVisibleToFieldApp } from "@/lib/template-activation";
import { getChecklistDueInfo, getFrequencyLabel, getDueChecklists } from "@/lib/checklist-due";
import type { ChecklistTemplate, ChecklistSubmission, ChecklistResponse, User, Incident } from "@/types";
import { QuickActionFAB } from "@/components/ui/quick-action-fab";

type TabType = "incidents" | "checklists" | "risk-assessment" | "procedures";
type SubTabType = "assigned" | "history";

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
} satisfies Record<
  RiskAssessmentCatalogCountry,
  Array<{ id: string; name: string; fullName: string; icon: typeof FileCheck }>
>;

// Simple inline incident history (no sub-tabs)
function ReportHistoryInline({ company, incidents, user, formatDate }: {
  company: string; incidents: import("@/types").Incident[]; user: import("@/types").User | null;
  formatDate: (date: string | Date) => string;
}) {
  const myIncidents = React.useMemo(() => {
    if (!user) return incidents.slice(0, 20);
    return incidents.filter((i) => i.reporter_id === user.id).slice(0, 20);
  }, [incidents, user]);

  if (myIncidents.length === 0) {
    return <div className="py-6 text-center text-muted-foreground"><p className="text-xs">No incident reports yet.</p></div>;
  }

  return (
    <div className="space-y-2 mt-3">
      <p className="text-xs text-muted-foreground font-medium">Recent reports</p>
      {myIncidents.map((inc) => (
        <Link key={inc.id} href={`/${company}/app/incidents/${inc.id}`} className="flex items-center gap-3 rounded-xl border bg-card p-3 active:bg-muted/50">
          <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", inc.severity === "critical" || inc.severity === "high" ? "bg-red-500/10" : "bg-amber-500/10")}>
            <AlertTriangle className={cn("h-4 w-4", inc.severity === "critical" || inc.severity === "high" ? "text-red-500" : "text-amber-500")} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{inc.title}</p>
            <p className="text-[10px] text-muted-foreground">{formatDate(new Date(inc.incident_date))} · {inc.severity}</p>
          </div>
          <Badge variant={inc.status === "resolved" ? "success" : inc.status === "in_progress" ? "warning" : "secondary"} className="text-[9px] shrink-0 capitalize">{inc.status.replace(/_/g, " ")}</Badge>
        </Link>
      ))}
    </div>
  );
}

function EmployeeChecklistsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const locationParam = searchParams.get("location");
  
  const company = useCompanyParam();
  
  const { t, locale, formatDate } = useTranslation();

  const getInitialTab = (): TabType => {
    if (tabParam === "incidents") return "incidents";
    if (tabParam === "risk-assessment") return "risk-assessment";
    if (tabParam === "checklists") return "checklists";
    if (tabParam === "procedures") return "procedures";
    return "incidents";
  };
  
  const [activeTab, setActiveTab] = React.useState<TabType>(getInitialTab());
  const [subTab, setSubTab] = React.useState<SubTabType>("assigned");
  const [historySearch, setHistorySearch] = React.useState("");
  const [historySearchOpen, setHistorySearchOpen] = React.useState(false);
  const [historyStatus, setHistoryStatus] = React.useState<string>("all");
  const [historySort, setHistorySort] = React.useState<"newest" | "oldest">("newest");

  const { items: checklistTemplates, isLoading: isTemplatesLoading } = useChecklistTemplatesStore();
  const { items: checklistSubmissions, isLoading: isSubmissionsLoading } = useChecklistSubmissionsStore();
  const { items: assets } = useAssetsStore();
  const { items: locations } = useLocationsStore();
  const { items: riskEvaluations } = useRiskEvaluationsStore();
  const { items: incidents } = useIncidentsStore();
  const { items: users } = useUsersStore();
  const { items: procedureTemplateItems } = useProcedureTemplatesStore();
  const { items: procedureSubmissionItems, add: addProcedureSubmission } = useProcedureSubmissionsStore();
  const { currentCompany, user } = useAuth();
  const { toast } = useToast();

  // Active procedures for the field app — only company-activated ones
  const activeProcedures = React.useMemo(() => {
    // Only show procedure templates that the company has explicitly activated
    // (company-owned copies in the store, not raw built-ins)
    return procedureTemplateItems.filter(
      (p) => p.is_active && p.company_id === user?.company_id,
    );
  }, [procedureTemplateItems, user?.company_id]);
  
  const selectedLocation = locationParam 
    ? locations.find(l => l.id === locationParam) 
    : null;

  // Derive country from locally-saved settings first (survives when DB write fails),
  // then company record, then locale, then US
  const effectiveCountry = React.useMemo(() => {
    if (currentCompany?.id) {
      try {
        const raw = localStorage.getItem(`harmoniq_settings_${currentCompany.id}`);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved.selectedCountry) return saved.selectedCountry;
        }
      } catch { /* ignore */ }
    }
    return currentCompany?.country;
  }, [currentCompany?.id, currentCompany?.country]);

  const localeCountry = LOCALE_DEFAULT_COUNTRY[locale];
  const companyCountry = resolveRiskAssessmentCatalogCountry(
    effectiveCountry,
    localeCountry,
  );

  // Available assessment forms for this country, filtered by admin hidden types
  const availableAssessmentForms = React.useMemo(() => {
    const forms = riskAssessmentForms[companyCountry] || riskAssessmentForms.US;
    const hiddenTypes = currentCompany?.hidden_assessment_types || [];
    if (hiddenTypes.length === 0) return forms;
    return forms.filter((form) => !hiddenTypes.includes(form.id));
  }, [companyCountry, currentCompany?.hidden_assessment_types]);

  const templates = checklistTemplates.filter(
    (template) =>
      (template.company_id === user?.company_id || template.company_id === "__built_in__") &&
      isVisibleToFieldApp(template),
  );
  const activeAssets = assets.filter((a) => a.status === "active");

  const tabs = [
    { id: "incidents" as TabType, label: t("checklists.tabs.incidents"), icon: AlertTriangle },
    { id: "checklists" as TabType, label: t("checklists.tabs.checklists"), icon: ClipboardCheck },
    { id: "risk-assessment" as TabType, label: t("checklists.tabs.assessments"), icon: ShieldAlert },
    { id: "procedures" as TabType, label: t("checklists.tabs.procedures"), icon: Layers },
  ];

  // Reset sub-tab and history filters when main tab changes
  React.useEffect(() => { setSubTab("assigned"); setHistorySearch(""); setHistoryStatus("all"); }, [activeTab]);

  // Draft counts for notification pills
  const checklistDraftCount = React.useMemo(() => 
    checklistSubmissions.filter((s) => s.status === "draft" && s.submitter_id === user?.id).length,
    [checklistSubmissions, user?.id],
  );

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
  const awaitingReviewAssessments = myAssessments
    .filter((evaluation) => evaluation.status === "submitted")
    .map((evaluation) => {
      const location = locations.find((loc) => loc.id === evaluation.location_id);
      return {
        id: evaluation.id,
        formType: evaluation.form_type,
        name: assessmentLabelMap[evaluation.form_type] || evaluation.form_type,
        location: location?.name || "Unassigned location",
        date: evaluation.submitted_at || evaluation.created_at,
      };
    });
  const reviewedAssessments = myAssessments
    .filter((evaluation) => evaluation.status === "reviewed")
    .map((evaluation) => {
      const location = locations.find((loc) => loc.id === evaluation.location_id);
      const reviewerName = evaluation.reviewed_by
        ? users.find((candidate) => candidate.id === evaluation.reviewed_by)?.full_name || "Reviewer"
        : "Pending";
      return {
        id: evaluation.id,
        formType: evaluation.form_type,
        name: assessmentLabelMap[evaluation.form_type] || evaluation.form_type,
        location: location?.name || "Unassigned location",
        date: evaluation.reviewed_at || evaluation.submitted_at || evaluation.created_at,
        reviewerName,
      };
    });

  const assessmentTypeConf: Record<string, { icon: typeof ShieldCheck; color: string; bg: string }> = {
    RIE: { icon: ShieldCheck, color: "text-blue-500", bg: "bg-blue-500/10" },
    JHA: { icon: HardHat, color: "text-orange-500", bg: "bg-orange-500/10" },
    JSA: { icon: ClipboardCheck, color: "text-green-500", bg: "bg-green-500/10" },
    SAM: { icon: ShieldAlert, color: "text-purple-500", bg: "bg-purple-500/10" },
    OSA: { icon: ShieldCheck, color: "text-teal-500", bg: "bg-teal-500/10" },
    ARBOWET: { icon: Scale, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    AFS: { icon: ShieldCheck, color: "text-cyan-500", bg: "bg-cyan-500/10" },
  };

  if (isTemplatesLoading || isSubmissionsLoading) {
    return <TasksSkeleton />;
  }

  // Inline search/filter bar for history tabs
  const historySearchBar = (
    <div className="space-y-2 mb-3">
      {/* Search — toggle */}
      {historySearchOpen && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
            placeholder="Search history..."
            className="h-8 pl-8 pr-8 text-sm"
            autoFocus
          />
          <button type="button" onClick={() => { setHistorySearchOpen(false); setHistorySearch(""); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {/* Filter pills + Sort */}
      <div className="flex items-center gap-2">
        {!historySearchOpen && (
          <button
            type="button"
            onClick={() => setHistorySearchOpen(true)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
        )}
        {[
          { value: "all", label: "All" },
          { value: "new", label: "Open" },
          { value: "in_progress", label: "In Progress" },
          { value: "resolved", label: "Resolved" },
        ].map((filter) => (
          <button
            key={filter.value}
            onClick={() => setHistoryStatus(filter.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-95 ${
              historyStatus === filter.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {filter.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setHistorySort((s) => s === "newest" ? "oldest" : "newest")}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-95 bg-muted text-muted-foreground ml-auto"
        >
          <ArrowUpDown className="h-3 w-3" />
          {historySort === "newest" ? "Newest" : "Oldest"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-full">
      {/* Header + Tabs */}
      <div className="sticky top-[60px] z-10 bg-background border-b px-4 pt-4 pb-3">
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

        <div className="flex gap-0.5 bg-muted rounded-lg p-1 overflow-x-auto no-scrollbar" role="tablist">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 py-2 px-2 text-[11px] font-medium rounded-md transition-all active:opacity-80 whitespace-nowrap text-center min-w-0",
                  isActive 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-tabs for non-incident tabs */}
      {activeTab !== "incidents" && (
        <div className="px-4 pt-2">
          <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
            {(["assigned", "history"] as SubTabType[]).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSubTab(st)}
                className={cn(
                  "flex-1 py-1.5 text-[10px] font-medium rounded-md text-center transition-all relative",
                  subTab === st ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                {st === "assigned" ? t("checklists.tabs.assigned") : t("checklists.tabs.history")}
                {st === "assigned" && subTab !== "assigned" && pendingTemplates.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-blue-500" />
                )}
                {st === "history" && subTab !== "history" && checklistDraftCount > 0 && activeTab === "checklists" && (
                  <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-blue-500" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 px-4 pt-3 pb-20 space-y-1">

        {/* INCIDENTS TAB — history */}
        {activeTab === "incidents" && (
          <div className="space-y-3">
            {historySearchBar}
            {(() => {
              const q = historySearch.toLowerCase();
              const myIncidents = (user ? incidents.filter((i) => i.reporter_id === user.id) : incidents);
              const filtered = myIncidents
                .filter((inc) => {
                  if (historyStatus !== "all" && inc.status !== historyStatus) return false;
                  if (q && !inc.title.toLowerCase().includes(q) && !inc.severity.toLowerCase().includes(q) && !inc.status.toLowerCase().includes(q)) return false;
                  return true;
                })
                .sort((a, b) => {
                  const dateA = new Date(a.incident_date).getTime();
                  const dateB = new Date(b.incident_date).getTime();
                  return historySort === "newest" ? dateB - dateA : dateA - dateB;
                });
              return filtered.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground"><History className="h-7 w-7 mx-auto mb-2 opacity-30" /><p className="text-xs">{historySearch ? "No matching results." : "No incident reports yet."}</p></div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Recent reports</p>
                  {filtered.map((inc) => (
                    <Link key={inc.id} href={`/${company}/app/incidents/${inc.id}`} className="flex items-center gap-3 rounded-xl border bg-card p-3 active:bg-muted/50">
                      <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", inc.severity === "critical" || inc.severity === "high" ? "bg-red-500/10" : "bg-amber-500/10")}>
                        <AlertTriangle className={cn("h-4 w-4", inc.severity === "critical" || inc.severity === "high" ? "text-red-500" : "text-amber-500")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{inc.title}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDate(new Date(inc.incident_date))} · {inc.severity}</p>
                      </div>
                      <Badge variant={inc.status === "resolved" ? "success" : inc.status === "in_progress" ? "warning" : "secondary"} className="text-[9px] shrink-0 capitalize">{inc.status.replace(/_/g, " ")}</Badge>
                    </Link>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* CHECKLISTS TAB */}
        {activeTab === "checklists" && subTab === "assigned" && (
          <div className="space-y-2">
            {pendingTemplates.filter((t) => t.category !== "risk_assessment").length === 0 ? (
              <div className="py-8 text-center text-muted-foreground"><CheckCircle className="h-7 w-7 mx-auto mb-2 opacity-30" /><p className="text-xs">All checklists completed. Great work!</p></div>
            ) : pendingTemplates.filter((t) => t.category !== "risk_assessment").map((tpl) => (
              <Link key={tpl.id} href={`/${company}/app/checklists/${tpl.id}`} className="flex items-center gap-3 rounded-xl border bg-card p-3 active:bg-muted/50">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><ClipboardCheck className="h-4 w-4 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tpl.name}</p>
                  <p className="text-[10px] text-muted-foreground">{tpl.recurrence || "Daily"} · {tpl.items.length} items</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            ))}
          </div>
        )}
        {activeTab === "checklists" && subTab === "history" && (
          <div className="space-y-2">
            {historySearchBar}
            {checklistDraftCount > 0 && (
              <div className="flex items-center gap-2 mb-2"><Badge variant="warning" className="text-[10px]">{checklistDraftCount} draft{checklistDraftCount > 1 ? "s" : ""}</Badge><span className="text-xs text-muted-foreground">Complete your drafts to submit</span></div>
            )}
            {(() => {
              const q = historySearch.toLowerCase();
              const filtered = userSubmissions
                .filter((sub) => {
                  if (historyStatus !== "all" && sub.status !== historyStatus) return false;
                  if (q) {
                    const tpl = checklistTemplates.find((t) => t.id === sub.template_id);
                    const name = tpl?.name?.toLowerCase() || "";
                    if (!name.includes(q) && !sub.status.includes(q)) return false;
                  }
                  return true;
                })
                .sort((a, b) => {
                  const dateA = new Date(a.submitted_at || a.created_at).getTime();
                  const dateB = new Date(b.submitted_at || b.created_at).getTime();
                  return historySort === "newest" ? dateB - dateA : dateA - dateB;
                });
              return filtered.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground"><History className="h-7 w-7 mx-auto mb-2 opacity-30" /><p className="text-xs">{historySearch ? "No matching results." : "No checklist history yet."}</p></div>
              ) : filtered.map((sub) => {
                const tpl = checklistTemplates.find((t) => t.id === sub.template_id);
                const href = sub.status === "draft"
                  ? `/${company}/app/checklists/${sub.template_id}?draft=${sub.id}`
                  : `/${company}/app/checklists/submission/${sub.id}`;
                return (
                  <Link key={sub.id} href={href} className="flex items-center gap-3 rounded-xl border bg-card p-3 active:bg-muted/50">
                    <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", sub.status === "draft" ? "bg-amber-500/10" : "bg-green-500/10")}>
                      {sub.status === "draft" ? <Clock className="h-4 w-4 text-amber-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{tpl?.name || "Checklist"}</p>
                      <p className="text-[10px] text-muted-foreground">{sub.status === "draft" ? "Draft" : formatDate(new Date(sub.submitted_at || sub.created_at))}</p>
                    </div>
                    <Badge variant={sub.status === "draft" ? "warning" : "success"} className="text-[9px] shrink-0">{sub.status === "draft" ? "Draft" : "Submitted"}</Badge>
                  </Link>
                );
              });
            })()}
          </div>
        )}

        {/* RISK ASSESSMENT TAB */}
        {activeTab === "risk-assessment" && subTab === "assigned" && (
          <div className="space-y-2">
            {inProgressAssessments.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground"><ShieldAlert className="h-7 w-7 mx-auto mb-2 opacity-30" /><p className="text-xs">No assessments assigned to you.</p></div>
            ) : inProgressAssessments.map((item) => (
              <Link key={item.id} href={`/${company}/app/risk-assessment/${item.formId}?draft=${item.id}`} className="flex items-center gap-3 rounded-xl border bg-card p-3 active:bg-muted/50">
                <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0"><Play className="h-4 w-4 text-blue-500" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">In progress · {item.location}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            ))}
          </div>
        )}
        {activeTab === "risk-assessment" && subTab === "history" && (
          <div className="space-y-2">
            {historySearchBar}
            {(() => {
              const q = historySearch.toLowerCase();
              const filtered = riskEvaluations
                .filter((e) => e.submitter_id === user?.id)
                .filter((ev) => {
                  if (historyStatus !== "all" && ev.status !== historyStatus) return false;
                  if (q) {
                    const name = (assessmentLabelMap[ev.form_type] || ev.form_type).toLowerCase();
                    if (!name.includes(q) && !ev.status.includes(q)) return false;
                  }
                  return true;
                })
                .sort((a, b) => {
                  const dateA = new Date(a.submitted_at).getTime();
                  const dateB = new Date(b.submitted_at).getTime();
                  return historySort === "newest" ? dateB - dateA : dateA - dateB;
                });
              return filtered.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground"><History className="h-7 w-7 mx-auto mb-2 opacity-30" /><p className="text-xs">{historySearch ? "No matching results." : "No assessment history yet."}</p></div>
              ) : filtered.map((ev) => (
                <Link key={ev.id} href={`/${company}/app/risk-assessment/view/${ev.id}`} className="flex items-center gap-3 rounded-xl border bg-card p-3 active:bg-muted/50">
                  <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", ev.status === "draft" ? "bg-amber-500/10" : ev.status === "reviewed" ? "bg-green-500/10" : "bg-blue-500/10")}>
                    {ev.status === "draft" ? <Clock className="h-4 w-4 text-amber-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
                  </div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium">{assessmentLabelMap[ev.form_type] || ev.form_type}</p><p className="text-[10px] text-muted-foreground">{formatDate(new Date(ev.submitted_at))}</p></div>
                  <Badge variant={ev.status === "draft" ? "warning" : ev.status === "reviewed" ? "success" : "secondary"} className="text-[9px] shrink-0">{ev.status}</Badge>
                </Link>
              ));
            })()}
          </div>
        )}

        {/* PROCEDURES TAB */}
        {activeTab === "procedures" && subTab === "assigned" && (
          <div className="space-y-2">
            {procedureSubmissionItems.filter((s) => s.submitter_id === user?.id && s.status === "in_progress").length === 0 ? (
              <div className="py-8 text-center text-muted-foreground"><Layers className="h-7 w-7 mx-auto mb-2 opacity-30" /><p className="text-xs">No procedures assigned to you.</p></div>
            ) : procedureSubmissionItems.filter((s) => s.submitter_id === user?.id && s.status === "in_progress").map((sub) => {
              const proc = activeProcedures.find((p) => p.id === sub.procedure_template_id);
              const currentStep = proc?.steps[sub.current_step - 1];
              return (
                <div key={sub.id} className="rounded-xl border bg-card p-3 space-y-2">
                  <p className="text-sm font-semibold">{proc?.name || "Procedure"}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">Step {sub.current_step} of {sub.step_submissions.length}</Badge>
                    {currentStep && <span className="text-[10px] text-muted-foreground truncate">{currentStep.template_name}</span>}
                  </div>
                  {currentStep && (() => {
                    const knownForms = ["jha", "jsa", "rie", "arbowet", "sam", "osa"];
                    const formMatch = knownForms.find((f) => currentStep.template_id.includes(f));
                    const stepUrl = (currentStep.type === "risk_assessment" && formMatch)
                      ? `/${company}/app/risk-assessment/${formMatch}`
                      : `/${company}/app/checklists/${currentStep.template_id}`;
                    return (
                      <Link href={stepUrl} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground active:scale-95 transition-transform w-fit">
                        <Play className="h-3 w-3" />Continue Step {sub.current_step}
                      </Link>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}
        {activeTab === "procedures" && subTab === "history" && (
          <div className="space-y-2">
            {historySearchBar}
            {(() => {
              const q = historySearch.toLowerCase();
              const allProcs = getBuiltInProcedureTemplates();
              const filtered = procedureSubmissionItems
                .filter((s) => s.submitter_id === user?.id && s.status !== "in_progress")
                .filter((sub) => {
                  if (historyStatus !== "all" && sub.status !== historyStatus) return false;
                  if (q) {
                    const proc = activeProcedures.find((p) => p.id === sub.procedure_template_id)
                      || allProcs.find((p) => p.id === sub.procedure_template_id);
                    const name = proc?.name?.toLowerCase() || "";
                    if (!name.includes(q) && !sub.status.includes(q)) return false;
                  }
                  return true;
                })
                .sort((a, b) => {
                  const dateA = new Date(a.completed_at || a.started_at).getTime();
                  const dateB = new Date(b.completed_at || b.started_at).getTime();
                  return historySort === "newest" ? dateB - dateA : dateA - dateB;
                });
              return filtered.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground"><History className="h-7 w-7 mx-auto mb-2 opacity-30" /><p className="text-xs">{historySearch ? "No matching results." : "No procedure history yet."}</p></div>
              ) : filtered.map((sub) => {
                const proc = activeProcedures.find((p) => p.id === sub.procedure_template_id)
                  || allProcs.find((p) => p.id === sub.procedure_template_id);
                return (
                  <Link key={sub.id} href={`/${company}/app/checklists/procedures/${sub.id}`} className="flex items-center gap-3 rounded-xl border bg-card p-3 active:bg-muted/50">
                    <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", sub.status === "completed" ? "bg-green-500/10" : "bg-muted")}>
                      {sub.status === "completed" ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Clock className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{proc?.name || "Procedure"}</p><p className="text-[10px] text-muted-foreground">{formatDate(new Date(sub.completed_at || sub.started_at))}</p></div>
                    <Badge variant={sub.status === "completed" ? "success" : "secondary"} className="text-[9px] shrink-0 capitalize">{sub.status}</Badge>
                  </Link>
                );
              });
            })()}
          </div>
        )}

      </div>

      {/* Context-aware FAB */}
      <QuickActionFAB
        actions={(() => {
          if (activeTab === "incidents") {
            return [{
              id: "report",
              label: "Report Incident",
              description: "Start a new incident report",
              icon: AlertTriangle,
              href: `/${company}/app/report`,
            }];
          }
          if (activeTab === "checklists") {
            return pendingTemplates
              .filter((tpl) => tpl.category !== "risk_assessment")
              .map((tpl) => ({
                id: tpl.id,
                label: tpl.name,
                description: `${tpl.items.length} items · ${tpl.recurrence || "Daily"}`,
                icon: ClipboardCheck,
                href: `/${company}/app/checklists/${tpl.id}`,
              }));
          }
          if (activeTab === "risk-assessment") {
            const fieldAppRA = templates.filter((tpl) => tpl.category === "risk_assessment" || tpl.category === "hazard_analysis");
            return fieldAppRA.map((tpl) => ({
              id: tpl.id,
              label: tpl.name,
              description: `${tpl.items.length} items`,
              icon: ShieldCheck,
              href: `/${company}/app/checklists/${tpl.id}`,
            }));
          }
          if (activeTab === "procedures") {
            return activeProcedures.map((proc) => ({
              id: proc.id,
              label: proc.name,
              description: `${proc.steps?.length || 0} steps`,
              icon: FileCheck,
              href: `/${company}/app/checklists/procedures/${proc.id}`,
            }));
          }
          return [];
        })()}
      />
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
