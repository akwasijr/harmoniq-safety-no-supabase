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
  Package,
  X,
  Play,
  ListChecks,
  History,
  Camera,
  MessageSquare,
  Percent,
  HardHat,
  Scale,
  Download,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

type TabType = "incidents" | "checklists" | "risk-assessment" | "procedures";
type SubTabType = "assigned" | "available" | "history";

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

// Collapsible section component
function Section({ 
  title, 
  icon: Icon, 
  iconColor = "text-muted-foreground",
  defaultOpen = true, 
  children 
}: { 
  title: string; 
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
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
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", isOpen && "rotate-180")} aria-hidden="true" />
      </button>
      {isOpen && <div id={sectionId} className="space-y-1.5 pb-3">{children}</div>}
    </div>
  );
}

// ---------- Checklist Tab ----------

type ChecklistSubTab = "assigned" | "history";

function ChecklistsTabContent({
  company,
  companyName,
  templates,
  pendingTemplates,
  userSubmissions,
  completedToday,
  user,
  t,
  formatDate,
}: {
  company: string;
  companyName: string;
  templates: ChecklistTemplate[];
  pendingTemplates: ChecklistTemplate[];
  userSubmissions: ChecklistSubmission[];
  completedToday: ChecklistSubmission[];
  user: User | null;
  t: (key: string) => string;
  formatDate: (date: string | Date, options?: Intl.DateTimeFormatOptions) => string;
}) {
  const [subTab, setSubTab] = React.useState<ChecklistSubTab>("assigned");
  const completedSubmissions = React.useMemo(() => userSubmissions.filter(s => s.status === "submitted"), [userSubmissions]);
  const draftSubmissions = React.useMemo(() => userSubmissions.filter(s => s.status === "draft"), [userSubmissions]);
  const [exportingId, setExportingId] = React.useState<string | null>(null);

  const handleExportChecklist = async (submission: ChecklistSubmission, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExportingId(submission.id);
    try {
      const { ChecklistPDF, downloadPDF } = await import("@/lib/pdf-export");
      const tpl = templates.find(t => t.id === submission.template_id);
      const doc = <ChecklistPDF
        companyName={companyName}
        templateName={tpl?.name || "Checklist"}
        submission={{
          responses: submission.responses,
          submitted_at: submission.submitted_at,
          submitter_name: user?.full_name || "Unknown",
          general_comments: submission.general_comments,
        }}
        items={tpl?.items || []}
      />;
      const datePart = new Date(submission.submitted_at || submission.created_at)
        .toISOString().split("T")[0];
      await downloadPDF(doc, `checklist-${tpl?.name?.replace(/\s+/g, "-").toLowerCase() || "report"}-${datePart}.pdf`);
    } catch {
      // silently fail
    } finally {
      setExportingId(null);
    }
  };
  const [historyLimit, setHistoryLimit] = React.useState(10);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortOrder, setSortOrder] = React.useState<"newest" | "oldest">("newest");

  const filteredHistory = React.useMemo(() => {
    let items = completedSubmissions;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((s) => {
        const tplName = templates.find((t) => t.id === s.template_id)?.name || "";
        return tplName.toLowerCase().includes(q);
      });
    }
    items.sort((a, b) => {
      const dateA = new Date(a.submitted_at || a.created_at).getTime();
      const dateB = new Date(b.submitted_at || b.created_at).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });
    return items;
  }, [completedSubmissions, templates, searchQuery, sortOrder]);

  const visibleHistory = filteredHistory.slice(0, historyLimit);

  const subTabs: { id: ChecklistSubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "assigned", label: "Assigned", icon: ListChecks },
    { id: "history", label: "History", icon: History },
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
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1 mb-3">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-medium rounded-md transition-all active:opacity-80",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ASSIGNED sub-tab */}
      {subTab === "assigned" && (
        <>
          {/* Assigned / pending checklists */}
          {pendingTemplates.length > 0 && (
        <Section
          title="Assigned to you"
          icon={ClipboardCheck}
          iconColor="text-primary"
        >
          {pendingTemplates.map((template) => {
            const dueInfo = getChecklistDueInfo(template, userSubmissions);
            const isOverdue = dueInfo.status === "overdue";
            return (
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
                  {getFrequencyLabel(template.recurrence)} · {template.items?.length || 0} items
                  {isOverdue && <span className="text-red-500 font-medium"> · Overdue</span>}
                  {!isOverdue && dueInfo.status === "due" && template.recurrence === "daily" && (
                    <span className="text-amber-500 font-medium"> · Due today</span>
                  )}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
            );
          })}
        </Section>
      )}

      {/* Drafts / in-progress */}
      {draftSubmissions.length > 0 && (
        <Section
          title="In progress"
          icon={Clock}
          iconColor="text-blue-500"
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
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors active:bg-muted/50 hover:bg-muted/30"
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
      )}

      {/* Completed today */}
      {completedToday.length > 0 && (
        <Section
          title="Completed today"
          icon={CheckCircle}
          iconColor="text-success"
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

      {/* HISTORY sub-tab */}
      {subTab === "history" && (
        <>
          {/* Search + sort */}
          <div className="flex gap-2 mb-3">
            <input
              type="search"
              placeholder="Search completed..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setHistoryLimit(10); }}
              className="flex-1 h-9 rounded-lg border bg-background px-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
              className="h-9 rounded-lg border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>

          {visibleHistory.length > 0 ? (
            <div className="space-y-2">
              {visibleHistory.map((submission) => {
                  const tpl = templates.find(t => t.id === submission.template_id);
                  const score = getScore(submission);
                  const passCount = submission.responses?.filter((r: ChecklistResponse) => r.value === true || r.value === "pass" || r.value === "yes").length || 0;
                  const failCount = submission.responses?.filter((r: ChecklistResponse) => r.value === false || r.value === "fail" || r.value === "no").length || 0;
                  const naCount = submission.responses?.filter((r: ChecklistResponse) => r.value === "na" || r.value === "n/a").length || 0;
                  const hasNotes = submission.responses?.some((r: ChecklistResponse) => r.comment);
                  const hasPhotos = submission.responses?.some((r: ChecklistResponse) => (r.photo_urls?.length ?? 0) > 0);

                  return (
                    <Link
                      key={submission.id}
                      href={`/${company}/app/checklists/${submission.template_id}?submission=${submission.id}`}
                      className="block rounded-lg border p-3 space-y-2 transition-colors hover:bg-muted/30 active:bg-muted/50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{tpl?.name || "Checklist"}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {formatDate(new Date(submission.submitted_at || submission.created_at))}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {score !== null && (
                            <div className={cn(
                              "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
                              score >= 80 ? "bg-green-200 text-green-900 dark:bg-green-900/40 dark:text-green-100" :
                              score >= 50 ? "bg-amber-200 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100" :
                              "bg-red-200 text-red-900 dark:bg-red-900/40 dark:text-red-100"
                            )}>
                              {score}%
                            </div>
                          )}
                          <button
                            onClick={(e) => handleExportChecklist(submission, e)}
                            disabled={exportingId === submission.id}
                            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                            aria-label="Export PDF"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 text-[10px]">
                        <span className="flex items-center gap-1 text-green-700 dark:text-green-300">
                          <CheckCircle className="h-3 w-3" /> {passCount} pass
                        </span>
                        <span className="flex items-center gap-1 text-red-700 dark:text-red-300">
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
                    </Link>
                  );
                })}

              {/* Load more */}
              {historyLimit < filteredHistory.length && (
                <button
                  onClick={() => setHistoryLimit((prev) => prev + 10)}
                  className="w-full py-2.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Load more ({filteredHistory.length - historyLimit} remaining)
                </button>
              )}
            </div>
          ) : (
            <div className="py-8 text-center">
              <History className="h-10 w-10 text-muted-foreground/20 mx-auto" />
              <p className="text-sm font-medium text-muted-foreground mt-2">
                {searchQuery ? "No matching checklists" : "No completed checklists"}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {searchQuery ? "Try a different search term" : "Completed checklists with scores will appear here"}
              </p>
            </div>
          )}
        </>
      )}
    </>
  );
}

// ---------- Reports Tab (redesigned) ----------

type ReportsSubTab = "reports" | "history";

function ReportsTabContent({
  company,
  incidents,
  user,
  t,
  formatDate,
}: {
  company: string;
  incidents: Incident[];
  user: User | null;
  t: (key: string) => string;
  formatDate: (date: string | Date, options?: Intl.DateTimeFormatOptions) => string;
}) {
  const [subTab, setSubTab] = React.useState<ReportsSubTab>("reports");
  const [historyLimit, setHistoryLimit] = React.useState(10);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortOrder, setSortOrder] = React.useState<"newest" | "oldest">("newest");

  const myIncidents = React.useMemo(
    () => incidents.filter((i) => i.reporter_id === user?.id),
    [incidents, user?.id]
  );

  const typeConfMap: Record<string, { icon: typeof AlertTriangle; color: string; bg: string }> = {
    injury: { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10" },
    near_miss: { icon: ShieldAlert, color: "text-orange-500", bg: "bg-orange-500/10" },
    hazard: { icon: AlertTriangle, color: "text-yellow-500", bg: "bg-yellow-500/10" },
    property_damage: { icon: Package, color: "text-blue-500", bg: "bg-blue-500/10" },
    environmental: { icon: AlertTriangle, color: "text-green-500", bg: "bg-green-500/10" },
    fire: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-600/10" },
    security: { icon: ShieldAlert, color: "text-purple-500", bg: "bg-purple-500/10" },
    other: { icon: AlertTriangle, color: "text-muted-foreground", bg: "bg-muted" },
  };

  const filteredHistory = React.useMemo(() => {
    let items = [...myIncidents];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.type.replace(/_/g, " ").toLowerCase().includes(q) ||
          (i.building || "").toLowerCase().includes(q)
      );
    }
    items.sort((a, b) => {
      const dateA = new Date(a.incident_date).getTime();
      const dateB = new Date(b.incident_date).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });
    return items;
  }, [myIncidents, searchQuery, sortOrder]);

  const visibleHistory = filteredHistory.slice(0, historyLimit);

  const subTabs: { id: ReportsSubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "reports", label: "Reports", icon: AlertTriangle },
    { id: "history", label: "History", icon: History },
  ];

  const renderIncidentCard = (incident: Incident) => {
    const typeConf = typeConfMap[incident.type] || typeConfMap.other;
    const TypeIcon = typeConf.icon;
    return (
      <Link
        key={incident.id}
        href={`/${company}/app/incidents/${incident.id}`}
        className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors active:bg-muted/50 hover:bg-muted/30"
      >
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", typeConf.bg)}>
          <TypeIcon className={cn("h-4 w-4", typeConf.color)} aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm leading-tight truncate">{incident.title}</p>
            {incident.status !== "new" && (
              <Badge variant={
                incident.status === "resolved" ? "success" :
                incident.status === "in_progress" ? "warning" : "secondary"
              } className="text-[10px] h-4 shrink-0">
                {incident.status.replace(/_/g, " ")}
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {incident.type.replace(/_/g, " ")} · {formatDate(new Date(incident.incident_date), { month: "short", day: "numeric" })}
            {incident.building ? ` · ${incident.building}` : ""}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
      </Link>
    );
  };

  return (
    <>
      {/* Sub-tab pills */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1 mb-3">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-medium rounded-md transition-all active:opacity-80",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* REPORTS sub-tab (action items) */}
      {subTab === "reports" && (
        <>
          {/* Report Incident CTA */}
          <Link
            href={`/${company}/app/report`}
            className="flex items-center gap-3 rounded-xl border bg-card p-3.5 transition-colors hover:bg-muted/30 active:bg-muted/50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <FileCheck className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{t("app.reportIncident")}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{t("app.reportIncidentDesc") || "Spot something unsafe? Let the team know."}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
          </Link>
        </>
      )}

      {/* HISTORY sub-tab */}
      {subTab === "history" && (
        <>
          {/* Search + sort */}
          <div className="flex gap-2 mb-3">
            <input
              type="search"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setHistoryLimit(10); }}
              className="flex-1 h-9 rounded-lg border bg-background px-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
              className="h-9 rounded-lg border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>

          {visibleHistory.length > 0 ? (
            <div className="space-y-2">
              {visibleHistory.map(renderIncidentCard)}

              {/* Load more */}
              {historyLimit < filteredHistory.length && (
                <button
                  onClick={() => setHistoryLimit((prev) => prev + 10)}
                  className="w-full py-2.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Load more ({filteredHistory.length - historyLimit} remaining)
                </button>
              )}
            </div>
          ) : (
            <div className="py-8 text-center">
              <History className="h-10 w-10 text-muted-foreground/20 mx-auto" />
              <p className="text-sm font-medium text-muted-foreground mt-2">
                {searchQuery ? "No matching reports" : "No report history"}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {searchQuery ? "Try a different search term" : "Submitted reports will appear here"}
              </p>
            </div>
          )}
        </>
      )}
    </>
  );
}

// ---------- Risk Assessment Tab (redesigned) ----------

type RiskAssessmentSubTab = "assigned" | "history";

function RiskAssessmentTabContent({
  company,
  companyName,
  availableForms,
  customRaTemplates,
  inProgressAssessments,
  awaitingReviewAssessments,
  reviewedAssessments,
  assessmentTypeConf,
  riskEvaluations,
  users: allUsers,
  locations: allLocations,
  user,
  t,
  formatDate,
}: {
  company: string;
  companyName: string;
  availableForms: Array<{ id: string; name: string; fullName: string; icon: typeof FileCheck }>;
  customRaTemplates: import("@/types").ChecklistTemplate[];
  inProgressAssessments: Array<{ id: string; formId: string; name: string; location: string; progress: number }>;
  awaitingReviewAssessments: Array<{ id: string; formType: string; name: string; location: string; date: string }>;
  reviewedAssessments: Array<{ id: string; formType: string; name: string; location: string; date: string; reviewerName: string }>;
  assessmentTypeConf: Record<string, { icon: typeof ShieldCheck; color: string; bg: string }>;
  riskEvaluations: import("@/types").RiskEvaluation[];
  users: import("@/types").User[];
  locations: import("@/types").Location[];
  user: User | null;
  t: (key: string) => string;
  formatDate: (date: string | Date, options?: Intl.DateTimeFormatOptions) => string;
}) {
  const [subTab, setSubTab] = React.useState<RiskAssessmentSubTab>("assigned");
  const [historyLimit, setHistoryLimit] = React.useState(10);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortOrder, setSortOrder] = React.useState<"newest" | "oldest">("newest");
  const [exportingId, setExportingId] = React.useState<string | null>(null);

  const handleExportAssessment = async (itemId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExportingId(itemId);
    try {
      const { RiskAssessmentPDF, downloadPDF } = await import("@/lib/pdf-export");
      const evaluation = riskEvaluations.find((ev) => ev.id === itemId);
      if (!evaluation) return;
      const submitter = allUsers.find((u) => u.id === evaluation.submitter_id);
      const location = allLocations.find((l) => l.id === evaluation.location_id);
      const reviewer = evaluation.reviewed_by ? allUsers.find((u) => u.id === evaluation.reviewed_by) : null;
      const doc = <RiskAssessmentPDF
        companyName={companyName}
        formType={evaluation.form_type}
        evaluation={{
          responses: evaluation.responses,
          country: evaluation.country,
          location: location?.name,
          submitted_at: evaluation.submitted_at,
          submitter_name: submitter?.full_name || "Unknown",
          status: evaluation.status,
          reviewed_by: reviewer?.full_name || null,
          reviewed_at: evaluation.reviewed_at,
        }}
      />;
      const datePart = new Date(evaluation.submitted_at || evaluation.created_at)
        .toISOString().split("T")[0];
      await downloadPDF(doc, `risk-assessment-${evaluation.form_type.toLowerCase()}-${datePart}.pdf`);
    } catch {
      // silently fail
    } finally {
      setExportingId(null);
    }
  };

  const historyItems = React.useMemo(() => {
    const all = [
      ...awaitingReviewAssessments.map((item) => ({ ...item, historyStatus: "submitted" as const })),
      ...reviewedAssessments.map((item) => ({ ...item, historyStatus: "reviewed" as const })),
    ];
    const filtered = searchQuery.trim()
      ? all.filter(
          (item) =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.location.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : all;
    filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });
    return filtered;
  }, [awaitingReviewAssessments, reviewedAssessments, searchQuery, sortOrder]);

  const visibleHistory = historyItems.slice(0, historyLimit);

  const subTabs: { id: RiskAssessmentSubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "assigned", label: "Assessments", icon: ShieldCheck },
    { id: "history", label: "History", icon: History },
  ];

  return (
    <>
      {/* Sub-tab pills */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1 mb-3">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-medium rounded-md transition-all active:opacity-80",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ASSIGNED sub-tab */}
      {subTab === "assigned" && (
        <>
          {/* Available assessment forms */}
          {availableForms.length > 0 && (
            <section className="space-y-2 mb-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Available assessments</h2>
              {availableForms.map((form) => {
                const conf = assessmentTypeConf[form.name] || { icon: ShieldCheck, color: "text-primary", bg: "bg-primary/10" };
                const FormIcon = conf.icon;
                return (
                  <Link
                    key={form.id}
                    href={`/${company}/app/risk-assessment/${form.id}`}
                    className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors active:bg-muted/50 hover:bg-muted/30"
                  >
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", conf.bg)}>
                      <FormIcon className={cn("h-4 w-4", conf.color)} aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm leading-tight">{form.fullName}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{form.name} · Tap to start</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                  </Link>
                );
              })}
            </section>
          )}

          {/* Custom risk assessment templates (pushed from dashboard) */}
          {customRaTemplates.length > 0 && (
            <section className="space-y-2 mb-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Custom Assessments</h2>
              {customRaTemplates.map((tpl) => (
                <Link
                  key={tpl.id}
                  href={`/${company}/app/checklists/${tpl.id}`}
                  className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors active:bg-muted/50 hover:bg-muted/30"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/10">
                    <ShieldAlert className="h-4 w-4 text-orange-500" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-tight">{tpl.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{tpl.items.length} items · Tap to start</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                </Link>
              ))}
            </section>
          )}

          {/* In-progress assessments */}
          {inProgressAssessments.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">In progress</h2>
              {inProgressAssessments.map((item) => (
                <Link
                  key={item.id}
                  href={`/${company}/app/risk-assessment/${item.formId}?draft=${item.id}`}
                  className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors active:bg-muted/50 hover:bg-muted/30"
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
                  <span className="text-[10px] text-primary font-medium">{t("checklists.buttons.resume") || "Resume"}</span>
                </Link>
              ))}
            </section>
          )}

          {availableForms.length === 0 && inProgressAssessments.length === 0 && (
            <div className="py-6 text-center">
              <ShieldCheck className="h-8 w-8 text-muted-foreground/20 mx-auto" aria-hidden="true" />
              <p className="text-sm text-muted-foreground mt-2">No assessments assigned</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Assessments will appear here when assigned by your admin</p>
            </div>
          )}
        </>
      )}

      {/* HISTORY sub-tab */}
      {subTab === "history" && (
        <>
          <div className="flex gap-2 mb-3">
            <input
              type="search"
              placeholder="Search submissions..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setHistoryLimit(10); }}
              className="flex-1 h-9 rounded-lg border bg-background px-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
              className="h-9 rounded-lg border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>

          {visibleHistory.length > 0 ? (
            <div className="space-y-2">
              {visibleHistory.map((item) => {
                const conf = assessmentTypeConf[item.formType] || { icon: ShieldCheck, color: "text-muted-foreground", bg: "bg-muted" };
                const TypeIcon = conf.icon;
                const isReviewed = item.historyStatus === "reviewed";

                return (
                  <Link
                    key={item.id}
                    href={`/${company}/app/risk-assessment/view/${item.id}`}
                    className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors active:bg-muted/50 hover:bg-muted/30"
                  >
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", conf.bg)}>
                      <TypeIcon className={cn("h-4 w-4", conf.color)} aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-tight">{item.name}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {item.location} · {formatDate(new Date(item.date))}
                      </p>
                      {"reviewerName" in item && isReviewed && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Reviewer: {(item as typeof reviewedAssessments[number]).reviewerName}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant={isReviewed ? "success" : "warning"} className="text-[10px]">
                        {isReviewed ? "Reviewed" : "Awaiting"}
                      </Badge>
                      <button
                        onClick={(e) => handleExportAssessment(item.id, e)}
                        disabled={exportingId === item.id}
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                        aria-label="Export PDF"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </Link>
                );
              })}

              {historyLimit < historyItems.length && (
                <button
                  onClick={() => setHistoryLimit((prev) => prev + 10)}
                  className="w-full py-2.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Load more ({historyItems.length - historyLimit} remaining)
                </button>
              )}
            </div>
          ) : (
            <div className="py-8 text-center">
              <History className="h-8 w-8 text-muted-foreground/20 mx-auto" aria-hidden="true" />
              <p className="text-sm text-muted-foreground mt-2">
                {searchQuery ? "No matching submissions" : "No submissions yet"}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {searchQuery ? "Try a different search term" : "Submitted assessments will appear here"}
              </p>
            </div>
          )}
        </>
      )}
    </>
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

  // Active procedures for the field app (built-in + company, filtered by industry)
  const activeProcedures = React.useMemo(() => {
    const builtIn = getBuiltInProcedureTemplates().filter((p) => !p.industry || p.industry === currentCompany?.industry);
    const company = procedureTemplateItems.filter((p) => p.is_active);
    return [...company, ...builtIn.filter((b) => !company.some((c) => c.id === b.id))].filter((p) => p.is_active);
  }, [procedureTemplateItems, currentCompany?.industry]);
  
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
      template.company_id === user?.company_id &&
      isVisibleToFieldApp(template),
  );
  const activeAssets = assets.filter((a) => a.status === "active");

  const tabs = [
    { id: "incidents" as TabType, label: t("checklists.tabs.incidents"), icon: AlertTriangle },
    { id: "checklists" as TabType, label: t("checklists.tabs.checklists"), icon: ClipboardCheck },
    { id: "risk-assessment" as TabType, label: t("checklists.tabs.assessments"), icon: ShieldAlert },
    { id: "procedures" as TabType, label: t("checklists.tabs.procedures"), icon: Layers },
  ];

  // Reset sub-tab when main tab changes
  React.useEffect(() => { setSubTab("assigned"); }, [activeTab]);

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
            {(["assigned", "available", "history"] as SubTabType[]).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSubTab(st)}
                className={cn(
                  "flex-1 py-1.5 text-[10px] font-medium rounded-md text-center transition-all relative",
                  subTab === st ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                {st === "assigned" ? t("checklists.tabs.assigned") : st === "available" ? t("checklists.tabs.available") : t("checklists.tabs.history")}
                {st === "history" && checklistDraftCount > 0 && activeTab === "checklists" && (
                  <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-amber-500 text-[8px] text-white flex items-center justify-center font-bold">{checklistDraftCount}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 px-4 pt-3 pb-20 space-y-1">

        {/* INCIDENTS TAB — start report + history */}
        {activeTab === "incidents" && (
          <div className="space-y-3">
            <Link
              href={`/${company}/app/report`}
              className="flex items-center gap-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 active:bg-primary/10 transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Report an Incident</p>
                <p className="text-xs text-muted-foreground">Tap to start a new incident report</p>
              </div>
            </Link>
            <ReportsTabContent
              company={company}
              incidents={incidents}
              user={user}
              t={t}
              formatDate={formatDate}
            />
          </div>
        )}

        {/* CHECKLISTS TAB */}
        {activeTab === "checklists" && subTab === "assigned" && (
          <ChecklistsTabContent
            company={company}
            companyName={currentCompany?.name || company}
            templates={templates}
            pendingTemplates={pendingTemplates}
            userSubmissions={userSubmissions}
            completedToday={completedToday}
            user={user}
            t={t}
            formatDate={formatDate}
          />
        )}
        {activeTab === "checklists" && subTab === "available" && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground mb-2">Templates available to start</p>
            {templates.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground"><ClipboardCheck className="h-7 w-7 mx-auto mb-2 opacity-30" /><p className="text-xs">No checklist templates available.</p></div>
            ) : templates.filter((t) => t.category !== "risk_assessment").map((tpl) => (
              <Link key={tpl.id} href={`/${company}/app/checklists/${tpl.id}`} className="flex items-center gap-3 rounded-xl border bg-card p-3 active:bg-muted/50">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><ClipboardCheck className="h-4 w-4 text-primary" /></div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{tpl.name}</p><p className="text-[10px] text-muted-foreground">{tpl.items.length} items</p></div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            ))}
          </div>
        )}
        {activeTab === "checklists" && subTab === "history" && (
          <div className="space-y-2">
            {checklistDraftCount > 0 && (
              <div className="flex items-center gap-2 mb-2"><Badge variant="warning" className="text-[10px]">{checklistDraftCount} draft{checklistDraftCount > 1 ? "s" : ""}</Badge><span className="text-xs text-muted-foreground">Complete your drafts to submit</span></div>
            )}
            {userSubmissions.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground"><History className="h-7 w-7 mx-auto mb-2 opacity-30" /><p className="text-xs">No checklist history yet.</p></div>
            ) : userSubmissions.slice(0, 20).map((sub) => {
              const tpl = checklistTemplates.find((t) => t.id === sub.template_id);
              return (
                <div key={sub.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                  <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", sub.status === "draft" ? "bg-amber-500/10" : "bg-green-500/10")}>
                    {sub.status === "draft" ? <Clock className="h-4 w-4 text-amber-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tpl?.name || "Checklist"}</p>
                    <p className="text-[10px] text-muted-foreground">{sub.status === "draft" ? "Draft" : formatDate(new Date(sub.submitted_at || sub.created_at))}</p>
                  </div>
                  <Badge variant={sub.status === "draft" ? "warning" : "success"} className="text-[9px] shrink-0">{sub.status === "draft" ? "Draft" : "Submitted"}</Badge>
                </div>
              );
            })}
          </div>
        )}

        {/* RISK ASSESSMENT TAB */}
        {activeTab === "risk-assessment" && subTab === "assigned" && (
          <RiskAssessmentTabContent
            company={company}
            companyName={currentCompany?.name || company}
            availableForms={availableAssessmentForms}
            customRaTemplates={templates.filter((t) => t.category === "risk_assessment")}
            inProgressAssessments={inProgressAssessments}
            awaitingReviewAssessments={awaitingReviewAssessments}
            reviewedAssessments={reviewedAssessments}
            assessmentTypeConf={assessmentTypeConf}
            riskEvaluations={riskEvaluations}
            users={users}
            locations={locations}
            user={user}
            t={t}
            formatDate={formatDate}
          />
        )}
        {activeTab === "risk-assessment" && subTab === "available" && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground mb-2">Assessment forms available</p>
            {availableAssessmentForms.map((form) => (
              <Link key={form.id} href={`/${company}/app/risk-assessment/${form.id}`} className="flex items-center gap-3 rounded-xl border bg-card p-3 active:bg-muted/50">
                <div className="h-9 w-9 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0"><ShieldAlert className="h-4 w-4 text-orange-500" /></div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium">{form.fullName}</p><p className="text-[10px] text-muted-foreground">{form.name}</p></div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            ))}
            {templates.filter((t) => t.category === "risk_assessment").map((tpl) => (
              <Link key={tpl.id} href={`/${company}/app/checklists/${tpl.id}`} className="flex items-center gap-3 rounded-xl border bg-card p-3 active:bg-muted/50">
                <div className="h-9 w-9 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0"><ShieldAlert className="h-4 w-4 text-orange-500" /></div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{tpl.name}</p><p className="text-[10px] text-muted-foreground">{tpl.items.length} items · Custom</p></div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            ))}
          </div>
        )}
        {activeTab === "risk-assessment" && subTab === "history" && (
          <div className="space-y-2">
            {riskEvaluations.filter((e) => e.submitter_id === user?.id).length === 0 ? (
              <div className="py-8 text-center text-muted-foreground"><History className="h-7 w-7 mx-auto mb-2 opacity-30" /><p className="text-xs">No assessment history yet.</p></div>
            ) : riskEvaluations.filter((e) => e.submitter_id === user?.id).slice(0, 20).map((ev) => (
              <Link key={ev.id} href={`/${company}/app/risk-assessment/view/${ev.id}`} className="flex items-center gap-3 rounded-xl border bg-card p-3 active:bg-muted/50">
                <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", ev.status === "draft" ? "bg-amber-500/10" : ev.status === "reviewed" ? "bg-green-500/10" : "bg-blue-500/10")}>
                  {ev.status === "draft" ? <Clock className="h-4 w-4 text-amber-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
                </div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium">{ev.form_type}</p><p className="text-[10px] text-muted-foreground">{formatDate(new Date(ev.submitted_at))}</p></div>
                <Badge variant={ev.status === "draft" ? "warning" : ev.status === "reviewed" ? "success" : "secondary"} className="text-[9px] shrink-0">{ev.status}</Badge>
              </Link>
            ))}
          </div>
        )}

        {/* PROCEDURES TAB */}
        {activeTab === "procedures" && subTab === "available" && (
          <div className="space-y-3">
            {activeProcedures.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground"><Layers className="h-8 w-8 mx-auto mb-2 opacity-40" /><p className="text-sm font-medium">No active procedures</p></div>
            ) : activeProcedures.map((proc) => (
              <div key={proc.id} className="rounded-xl border bg-card p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div><p className="text-sm font-semibold">{proc.name}</p>{proc.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{proc.description}</p>}</div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">{proc.steps.length} steps</Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {proc.steps.map((step, idx) => (<Badge key={step.id} variant="outline" className="text-[10px] gap-1"><span className="font-semibold">{idx + 1}.</span><span className="truncate max-w-[120px]">{step.template_name}</span></Badge>))}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-muted-foreground capitalize">{proc.recurrence.replace(/_/g, " ")}</span>
                  <button type="button" onClick={() => {
                    const now = new Date().toISOString();
                    const subId = `proc_sub_${Date.now()}`;
                    addProcedureSubmission({ id: subId, company_id: user?.company_id || "", procedure_template_id: proc.id, submitter_id: user?.id || "", location_id: null, status: "in_progress", current_step: 1, step_submissions: proc.steps.map((s) => ({ step_id: s.id, submission_id: null, status: "pending" as const, completed_at: null })), started_at: now, completed_at: null, next_due_date: null, created_at: now, updated_at: now });
                    toast("Procedure started — complete the first step");
                    // Navigate to the first step's template
                    const firstStep = proc.steps[0];
                    if (firstStep) {
                      const fillUrl = firstStep.type === "risk_assessment"
                        ? `/${company}/app/risk-assessment/${firstStep.template_id}`
                        : `/${company}/app/checklists/${firstStep.template_id}`;
                      router.push(fillUrl);
                    }
                  }} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground active:scale-95 transition-transform">
                    <Play className="h-3 w-3" />Start
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
                  {currentStep && (
                    <Link href={currentStep.type === "risk_assessment" ? `/${company}/app/risk-assessment/${currentStep.template_id}` : `/${company}/app/checklists/${currentStep.template_id}`} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground active:scale-95 transition-transform w-fit">
                      <Play className="h-3 w-3" />Continue Step {sub.current_step}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {activeTab === "procedures" && subTab === "history" && (
          <div className="space-y-2">
            {procedureSubmissionItems.filter((s) => s.submitter_id === user?.id && s.status !== "in_progress").length === 0 ? (
              <div className="py-8 text-center text-muted-foreground"><History className="h-7 w-7 mx-auto mb-2 opacity-30" /><p className="text-xs">No procedure history yet.</p></div>
            ) : procedureSubmissionItems.filter((s) => s.submitter_id === user?.id && s.status !== "in_progress").slice(0, 20).map((sub) => {
              const proc = activeProcedures.find((p) => p.id === sub.procedure_template_id);
              return (
                <div key={sub.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                  <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", sub.status === "completed" ? "bg-green-500/10" : "bg-muted")}>
                    {sub.status === "completed" ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Clock className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{proc?.name || "Procedure"}</p><p className="text-[10px] text-muted-foreground">{formatDate(new Date(sub.completed_at || sub.started_at))}</p></div>
                  <Badge variant={sub.status === "completed" ? "success" : "secondary"} className="text-[9px] shrink-0 capitalize">{sub.status}</Badge>
                </div>
              );
            })}
          </div>
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
