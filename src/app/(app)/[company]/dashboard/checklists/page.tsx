"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCompanyParam } from "@/hooks/use-company-param";
import {
  ClipboardCheck,
  CheckCircle,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
  X,
  Download,
  Trash2,
  Play,
  FileText,
  Eye,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { useCompanyData } from "@/hooks/use-company-data";
import { LoadingPage } from "@/components/ui/loading";
import { cn } from "@/lib/utils";
import { isWithinDateRange, DateRangeValue } from "@/lib/date-utils";
import { getTemplatePublishStatus } from "@/lib/template-activation";
import { useTranslation } from "@/i18n";
import { RoleGuard } from "@/components/auth/role-guard";
import { PAGINATION } from "@/lib/constants";
import { downloadCsv } from "@/lib/csv";
import { getDraftsForType, deleteDraft as removeDraft, type Draft } from "@/lib/draft-store";

const mockRiskAssessments: { id: string; template: string; templateId: string; type: string; location: string; date: string; status: string; by: string; riskLevel: string; riskScore: number }[] = [];

type MainTabType = "checklists" | "risk-assessment" | "procedures";

const ITEMS_PER_PAGE = PAGINATION.DEFAULT_PAGE_SIZE;

// Helper to get readable form type name
function getFormTypeName(formType: string): string {
  const names: Record<string, string> = {
    jha: "Job Hazard Analysis (JHA)",
    jsa: "Job Safety Analysis (JSA)",
    rie: "RI&E Assessment",
    arbowet: "Arbowet Compliance Audit",
    sam: "SAM Assessment",
    osa: "OSA Assessment",
  };
  return names[formType.toLowerCase()] || formType;
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

function ChecklistsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const company = useCompanyParam();
  const [activeTab, setActiveTab] = React.useState<MainTabType>("checklists");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [dateRange, setDateRange] = React.useState("last_30_days");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [statusFilter, setStatusFilter] = React.useState("");
  const [showTemplatePickerModal, setShowTemplatePickerModal] = React.useState(false);
  const [showProcedurePickerModal, setShowProcedurePickerModal] = React.useState(false);
  const [checklistDrafts, setChecklistDrafts] = React.useState<Draft[]>([]);

  // Load drafts on mount + refresh periodically
  React.useEffect(() => {
    setChecklistDrafts(getDraftsForType("checklist"));
    const interval = setInterval(() => setChecklistDrafts(getDraftsForType("checklist")), 5000);
    return () => clearInterval(interval);
  }, []);

  // Read tab from URL query params on mount
  React.useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "risk-assessment" || tabParam === "checklists" || tabParam === "procedures") {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const {
    checklistTemplates: checklistTemplatesStore,
    checklistSubmissions: checklistSubmissionsStore,
    riskEvaluations,
    inspections,
    assets,
    correctiveActions,
    users,
    locations,
    procedureTemplates,
    procedureSubmissions,
    stores,
  } = useCompanyData();
  const { isLoading } = stores.checklistTemplates;
  const { t, formatDate } = useTranslation();

  // Map store risk evaluations to the display format
  const storeRiskAssessments = React.useMemo(() => {
    return riskEvaluations.map(re => {
      const submitter = users.find(u => u.id === re.submitter_id);
      const location = locations.find(l => l.id === re.location_id);
      const responses = re.responses as Record<string, unknown>;
      const jobSteps = responses?.job_steps as Array<{ severity?: number; probability?: number }> | undefined;
      let riskScore = 0;
      let riskLevel: "low" | "medium" | "high" | "critical" = "low";
      if (jobSteps && Array.isArray(jobSteps) && jobSteps.length > 0) {
        const scores = jobSteps.map(s => (s.severity ?? 3) * (s.probability ?? 3));
        riskScore = Math.max(...scores);
        if (riskScore >= 16) riskLevel = "critical";
        else if (riskScore >= 10) riskLevel = "high";
        else if (riskScore >= 5) riskLevel = "medium";
        else riskLevel = "low";
      }
      return {
        id: re.id,
        template: getFormTypeName(re.form_type),
        templateId: re.form_type.toLowerCase(),
        type: re.form_type.toUpperCase(),
        location: location?.name || "Unknown",
        date: re.submitted_at.split("T")[0],
        status: re.status === "reviewed" ? "completed" : re.status === "submitted" ? "in_progress" : "draft",
        by: submitter?.full_name || "Unknown",
        riskLevel,
        riskScore,
      };
    });
  }, [riskEvaluations, users, locations]);

  const combinedRiskAssessments = React.useMemo(() => {
    if (storeRiskAssessments.length > 0) {
      return storeRiskAssessments;
    }
    return mockRiskAssessments;
  }, [storeRiskAssessments]);

  // Map inspection submissions to checklist-compatible format for merged display
  const inspectionAsSubmissions = React.useMemo(() => {
    return inspections.map(ins => {
      const asset = assets.find(a => a.id === ins.asset_id);
      const inspector = users.find(u => u.id === ins.inspector_id);
      const checklistSubmission = ins.checklist_id
        ? checklistSubmissionsStore.find((submission) => submission.id === ins.checklist_id)
        : null;
      const checklistTemplate = checklistSubmission
        ? checklistTemplatesStore.find((template) => template.id === checklistSubmission.template_id)
        : ins.checklist_id
          ? checklistTemplatesStore.find((template) => template.id === ins.checklist_id)
          : null;
      const relatedActions = correctiveActions.filter((action) => action.inspection_id === ins.id);

      return {
        id: ins.id,
        template: checklistTemplate?.name || "Inspection",
        location: asset?.name || "Unknown Asset",
        date: formatDate(new Date(ins.inspected_at)),
        status: ins.result === "pass" ? "completed" : ins.result === "fail" ? "completed" : "in_progress",
        by: inspector?.full_name || "Unknown",
        score: ins.result === "pass" ? "Pass" : ins.result === "fail" ? "Fail" : "-",
        issues: relatedActions.length,
        source: "inspection" as const,
      };
    });
  }, [inspections, assets, users, checklistSubmissionsStore, checklistTemplatesStore, correctiveActions, formatDate]);

  const mainTabs = [
    { id: "checklists" as MainTabType, label: t("checklists.tabs.checklists"), icon: ClipboardCheck },
    { id: "risk-assessment" as MainTabType, label: t("checklists.tabs.assessments"), icon: ShieldAlert },
    { id: "procedures" as MainTabType, label: "Procedures", icon: Layers },
  ];

  const getFilters = () => {
    return [
      {
        id: "status",
        label: "All statuses",
        options: [
          { value: "completed", label: "Completed" },
          { value: "in_progress", label: "In Progress" },
        ],
        value: statusFilter,
        onChange: (v: string) => { setStatusFilter(v); setCurrentPage(1); },
      },
    ];
  };

  const getChecklistSubmissions = () => {
    let checklistData = checklistSubmissionsStore
      .filter((submission) =>
        isWithinDateRange(submission.submitted_at || submission.created_at, dateRange as DateRangeValue)
      )
      .map((submission) => {
        const template = checklistTemplatesStore.find((item) => item.id === submission.template_id);
        const location = locations.find((item) => item.id === submission.location_id);
        const submitter = users.find((item) => item.id === submission.submitter_id);
        const booleanResponses = submission.responses.filter((response) => typeof response.value === "boolean");
        const passCount = booleanResponses.filter((response) => response.value === true).length;
        const failCount = booleanResponses.filter((response) => response.value === false).length;
        const score = booleanResponses.length
          ? `${Math.round((passCount / booleanResponses.length) * 100)}%`
          : "-";
        return {
          id: submission.id,
          template: template?.name || "Checklist",
          location: location?.name || "Unassigned location",
          date: formatDate(new Date(submission.submitted_at || submission.created_at)),
          status: submission.status === "submitted" ? "completed" : "in_progress",
          by: submitter?.full_name || "Unknown",
          score,
          issues: failCount,
          source: "checklist" as const,
        };
      });

    let inspectionData = inspectionAsSubmissions.filter((ins) =>
      isWithinDateRange(ins.date, dateRange as DateRangeValue)
    );

    let data = [...checklistData, ...inspectionData];

    if (statusFilter) {
      data = data.filter((item) => item.status === statusFilter);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      data = data.filter((item) =>
        item.template.toLowerCase().includes(query) ||
        item.location.toLowerCase().includes(query)
      );
    }
    return data;
  };

  const getRiskSubmissions = () => {
    let data = [...combinedRiskAssessments];
    if (statusFilter) {
      data = data.filter((item) => item.status === statusFilter);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      data = data.filter((item) => 
        item.template.toLowerCase().includes(query) ||
        item.location.toLowerCase().includes(query)
      );
    }
    return data;
  };

  const checklistSubmissions = getChecklistSubmissions();
  const riskSubmissions = getRiskSubmissions();

  // Published templates for the "Start New" picker
  const publishedTemplates = React.useMemo(() => {
    return checklistTemplatesStore.filter(
      (t) => getTemplatePublishStatus(t) === "published"
    );
  }, [checklistTemplatesStore]);


  // Reset filters when main tab changes
  React.useEffect(() => {
    setCurrentPage(1);
    setSearchQuery("");
    setStatusFilter("");
  }, [activeTab]);

  const getKPIs = () => {
    if (activeTab === "checklists") {
      const allSubmissions = checklistSubmissionsStore;
      const completedThisWeek = allSubmissions.filter(
        (submission) =>
          submission.status === "submitted" &&
          isWithinDateRange(submission.submitted_at || submission.created_at, "last_7_days")
      ).length;
      const pending = allSubmissions.filter((submission) => submission.status === "draft").length;
      const overdue = allSubmissions.filter(
        (submission) =>
          submission.status === "draft" &&
          !isWithinDateRange(submission.created_at, "last_30_days")
      ).length;
      const booleanResponses = allSubmissions.flatMap((submission) =>
        submission.responses.filter((response) => typeof response.value === "boolean")
      );
      const passCount = booleanResponses.filter((response) => response.value === true).length;
      const passRate = booleanResponses.length
        ? `${Math.round((passCount / booleanResponses.length) * 100)}%`
        : "\u2014";
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard title={t("checklists.labels.completedToday")} value={completedThisWeek} icon={CheckCircle} />
          <KPICard title={t("checklists.labels.pending")} value={pending} icon={Clock} />
          <KPICard title="Overdue" value={overdue} icon={AlertTriangle} />
          <KPICard title="Pass Rate" value={passRate} icon={ClipboardCheck} />
        </div>
      );
    }
    if (activeTab === "risk-assessment") {
      const highRisk = combinedRiskAssessments.filter(a => a.riskLevel === "high").length;
      const completed = combinedRiskAssessments.filter(a => a.status === "completed").length;
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard title="Total Assessments" value={combinedRiskAssessments.length} icon={ShieldAlert} />
          <KPICard title="High Risk Items" value={highRisk} icon={AlertTriangle} />
          <KPICard title={t("checklists.labels.inProgress")} value={combinedRiskAssessments.length - completed} icon={Clock} />
          <KPICard title={t("checklists.labels.completed")} value={completed} icon={CheckCircle} />
        </div>
      );
    }
    if (activeTab === "procedures") {
      const inProgress = procedureSubmissionRows.filter((s) => s.status === "in_progress").length;
      const completed = procedureSubmissionRows.filter((s) => s.status === "completed").length;
      const cancelled = procedureSubmissionRows.filter((s) => s.status === "cancelled").length;
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard title="Total Procedures" value={procedureSubmissionRows.length} icon={Layers} />
          <KPICard title={t("checklists.labels.inProgress")} value={inProgress} icon={Clock} />
          <KPICard title={t("checklists.labels.completed")} value={completed} icon={CheckCircle} />
          <KPICard title="Cancelled" value={cancelled} icon={AlertTriangle} />
        </div>
      );
    }
    return null;
  };

  const handleStartNew = () => {
    if (activeTab === "risk-assessment") {
      router.push(`/${company}/dashboard/risk-assessments/new`);
    } else if (activeTab === "procedures") {
      setShowProcedurePickerModal(true);
    } else {
      setShowTemplatePickerModal(true);
    }
  };

  // Active procedure templates for "Start Procedure" picker
  const activeProcedureTemplates = React.useMemo(() => {
    return procedureTemplates.filter((tpl) => tpl.is_active);
  }, [procedureTemplates]);

  // Procedure submissions with display data
  const procedureSubmissionRows = React.useMemo(() => {
    return procedureSubmissions.map((sub) => {
      const tpl = procedureTemplates.find((t) => t.id === sub.procedure_template_id);
      const submitter = users.find((u) => u.id === sub.submitter_id);
      return {
        id: sub.id,
        name: tpl?.name || "Unknown Procedure",
        progress: `Step ${sub.current_step} of ${sub.step_submissions.length}`,
        status: sub.status,
        startedAt: sub.started_at,
        recurrence: tpl?.recurrence || "per_event",
        submitter: submitter?.full_name || "Unknown",
      };
    });
  }, [procedureSubmissions, procedureTemplates, users]);

  const filteredProcedureSubmissions = React.useMemo(() => {
    let data = procedureSubmissionRows;
    if (statusFilter) {
      data = data.filter((s) => s.status === statusFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.submitter.toLowerCase().includes(q)
      );
    }
    return data;
  }, [procedureSubmissionRows, statusFilter, searchQuery]);

  const handleStartProcedure = (templateId: string) => {
    const tpl = procedureTemplates.find((t) => t.id === templateId);
    if (!tpl) return;
    const now = new Date().toISOString();
    const submission = {
      id: `proc_sub_${Date.now()}`,
      company_id: stores.procedureSubmissions.items[0]?.company_id || "",
      procedure_template_id: templateId,
      submitter_id: "",
      location_id: null,
      status: "in_progress" as const,
      current_step: 1,
      step_submissions: tpl.steps.map((step) => ({
        step_id: step.id,
        submission_id: null,
        status: "pending" as const,
        completed_at: null,
      })),
      started_at: now,
      completed_at: null,
      next_due_date: null,
      created_at: now,
      updated_at: now,
    };
    stores.procedureSubmissions.add(submission);
    setShowProcedurePickerModal(false);
  };

  const tableLength = activeTab === "checklists"
    ? checklistSubmissions.length
    : activeTab === "procedures"
    ? filteredProcedureSubmissions.length
    : riskSubmissions.length;
  const totalPages = Math.ceil(tableLength / ITEMS_PER_PAGE);

  const paginatedChecklistSubmissions = checklistSubmissions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const paginatedRiskSubmissions = riskSubmissions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const paginatedProcedureSubmissions = filteredProcedureSubmissions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleExportCSV = () => {
    if (activeTab === "checklists") {
      downloadCsv("checklist-submissions.csv", checklistSubmissions.map((s) => ({
        template: s.template,
        location: s.location,
        submitted_by: s.by,
        date: s.date,
        status: s.status,
        score: s.score,
        issues: s.issues,
        source: s.source,
      })));
    } else if (activeTab === "risk-assessment") {
      downloadCsv("risk-assessments.csv", riskSubmissions.map((r) => ({
        template: r.template,
        type: r.type,
        location: r.location,
        date: r.date,
        status: r.status,
        assessed_by: r.by,
        risk_level: r.riskLevel,
        risk_score: r.riskScore,
      })));
    }
  };

  if (isLoading && checklistSubmissions.length === 0) {
    return <LoadingPage />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold truncate">{t("checklists.safetyTasks")}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button size="sm" className="gap-2" onClick={handleStartNew}>
            <Play className="h-4 w-4" aria-hidden="true" />
            Start New
          </Button>
        </div>
      </div>

      {/* Template Picker Modal (Start New for Checklists) */}
      {showTemplatePickerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowTemplatePickerModal(false)}>
          <div className="bg-background rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold">Start a new checklist</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowTemplatePickerModal(false)} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <p className="text-sm text-muted-foreground mb-4">
                Select a published template to fill out.
              </p>
              {publishedTemplates.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No published templates available.</p>
                  <p className="text-xs mt-1">Publish a template first to start a new checklist.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {publishedTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => {
                        setShowTemplatePickerModal(false);
                        router.push(`/${company}/dashboard/checklists/fill/${template.id}`);
                      }}
                      className="flex items-start gap-3 p-4 rounded-lg border hover:bg-muted/50 text-left transition-colors"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                        <ClipboardCheck className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{template.name}</p>
                        {template.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground shrink-0">{template.items.length} items</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t p-4 bg-muted/30">
              <p className="text-xs text-muted-foreground text-center">
                Only published templates are shown here. Manage templates in{" "}
                <button
                  type="button"
                  className="underline hover:text-foreground"
                  onClick={() => {
                    setShowTemplatePickerModal(false);
                    router.push(`/${company}/dashboard/checklists/my-templates`);
                  }}
                >
                  My Templates
                </button>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Procedure Picker Modal (Start Procedure) */}
      {showProcedurePickerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowProcedurePickerModal(false)}>
          <div className="bg-background rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold">Start a procedure</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowProcedurePickerModal(false)} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <p className="text-sm text-muted-foreground mb-4">
                Select an active procedure template to begin.
              </p>
              {activeProcedureTemplates.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Layers className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No active procedure templates available.</p>
                  <p className="text-xs mt-1">Create or activate a procedure template first.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {activeProcedureTemplates.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => handleStartProcedure(tpl.id)}
                      className="flex items-start gap-3 p-4 rounded-lg border hover:bg-muted/50 text-left transition-colors"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                        <Layers className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{tpl.name}</p>
                        {tpl.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{tpl.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">{tpl.steps.length} steps</span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground capitalize">{tpl.recurrence.replace(/_/g, " ")}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Tabs */}
      <div className="border-b overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 py-3 px-1 text-sm font-medium transition-colors relative whitespace-nowrap",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{tab.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Cards */}
      {getKPIs()}

      {/* Search and Filters */}
      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={(value) => { setSearchQuery(value); setCurrentPage(1); }}
        searchPlaceholder={`Search ${activeTab.replace("-", " ")}...`}
        filters={getFilters()}
        dateRange={dateRange}
        onDateRangeChange={(value) => { setDateRange(value); setCurrentPage(1); }}
        showDateRange
      />

      {/* Drafts Section */}
      {activeTab === "checklists" && checklistDrafts.length > 0 && (
        <Card className="border-dashed">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm font-medium">
                {checklistDrafts.length} {checklistDrafts.length === 1 ? "Draft" : "Drafts"}
              </span>
            </div>
            <div className="space-y-2">
              {checklistDrafts.map((draft) => (
                <div
                  key={draft.id}
                  className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{draft.template_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${draft.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {draft.progress}% — {getRelativeTime(draft.updated_at)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/${company}/dashboard/checklists/fill/${draft.template_id}`)}
                  >
                    Resume
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      removeDraft(draft.id);
                      setChecklistDrafts(getDraftsForType("checklist"));
                    }}
                    className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete draft"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {tableLength} record{tableLength !== 1 ? "s" : ""}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages || 1}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {/* Checklists Submissions Table */}
            {activeTab === "checklists" && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Checklist</th>
                    <th className="pb-3 font-medium">Location</th>
                    <th className="hidden pb-3 font-medium md:table-cell">Submitted By</th>
                    <th className="hidden pb-3 font-medium lg:table-cell">Date</th>
                    <th className="pb-3 font-medium">Score</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedChecklistSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">{t("checklists.empty.noSubmissions")}</td>
                    </tr>
                  ) : (
                    paginatedChecklistSubmissions.map((submission) => (
                      <tr 
                        key={submission.id} 
                        className="border-b last:border-0 cursor-pointer hover:bg-muted/50 active:bg-muted transition-colors group"
                        onClick={() => router.push(
                          submission.source === "inspection"
                            ? `/${company}/dashboard/inspections/${submission.id}`
                            : `/${company}/dashboard/checklists/${submission.id}`
                        )}
                      >
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{submission.template}</p>
                                {submission.source === "inspection" && (
                                  <Badge variant="outline" className="text-[10px]">Inspection</Badge>
                                )}
                              </div>
                              {submission.issues > 0 && (
                                <p className="text-xs text-warning">{submission.issues} issue{submission.issues > 1 ? "s" : ""} found</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-xs">{submission.location}</td>
                        <td className="hidden py-3 md:table-cell text-xs text-muted-foreground">{submission.by}</td>
                        <td className="hidden py-3 lg:table-cell text-xs text-muted-foreground">{submission.date}</td>
                        <td className="py-3">
                          <Badge variant={submission.score === "100%" || submission.score === "Pass" ? "success" : submission.score === "-" ? "secondary" : submission.score === "Fail" ? "destructive" : "outline"} className="text-xs">
                            {submission.score}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <Badge variant={submission.status === "completed" ? "success" : "warning"} className="text-xs">
                            {submission.status.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <Eye className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* Risk Assessment Submissions Table */}
            {activeTab === "risk-assessment" && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Assessment</th>
                    <th className="pb-3 font-medium">Location</th>
                    <th className="hidden pb-3 font-medium md:table-cell">By</th>
                    <th className="pb-3 font-medium">Risk</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRiskSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">{t("checklists.empty.noSubmissions")}</td>
                    </tr>
                  ) : (
                    paginatedRiskSubmissions.map((assessment) => (
                      <tr 
                        key={assessment.id} 
                        className="border-b last:border-0 cursor-pointer hover:bg-muted/50 active:bg-muted transition-colors group"
                        onClick={() => router.push(`/${company}/dashboard/risk-assessments/${assessment.id}`)}
                      >
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">{assessment.template}</p>
                              <p className="text-xs text-muted-foreground">{assessment.date}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-xs">{assessment.location}</td>
                        <td className="hidden py-3 md:table-cell text-xs text-muted-foreground">{assessment.by}</td>
                        <td className="py-3">
                          <Badge variant={assessment.riskLevel === "high" ? "destructive" : assessment.riskLevel === "medium" ? "warning" : "success"} className="text-xs">
                            {assessment.riskLevel} ({assessment.riskScore})
                          </Badge>
                        </td>
                        <td className="py-3">
                          <Badge variant={assessment.status === "completed" ? "success" : "warning"} className="text-xs">
                            {assessment.status.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <Eye className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* Procedure Submissions Table */}
            {activeTab === "procedures" && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Procedure</th>
                    <th className="pb-3 font-medium">Progress</th>
                    <th className="hidden pb-3 font-medium md:table-cell">Started By</th>
                    <th className="hidden pb-3 font-medium lg:table-cell">Started</th>
                    <th className="pb-3 font-medium">Recurrence</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProcedureSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        <Layers className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p>No procedure submissions yet.</p>
                        <p className="text-xs mt-1">Start a procedure to begin tracking progress.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedProcedureSubmissions.map((sub) => (
                      <tr
                        key={sub.id}
                        className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                              <Layers className="h-4 w-4 text-primary" />
                            </div>
                            <p className="font-medium">{sub.name}</p>
                          </div>
                        </td>
                        <td className="py-3 text-xs">{sub.progress}</td>
                        <td className="hidden py-3 md:table-cell text-xs text-muted-foreground">{sub.submitter}</td>
                        <td className="hidden py-3 lg:table-cell text-xs text-muted-foreground">
                          {new Date(sub.startedAt).toLocaleDateString()}
                        </td>
                        <td className="py-3">
                          <Badge variant="secondary" className="text-xs capitalize">
                            {sub.recurrence.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <Badge
                            variant={
                              sub.status === "completed"
                                ? "success"
                                : sub.status === "cancelled"
                                ? "cancelled"
                                : "in_progress"
                            }
                            className="text-xs"
                          >
                            {sub.status.replace(/_/g, " ")}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, tableLength)} of {tableLength}
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {(() => {
                  const pages: (number | "...")[] = totalPages <= 7
                    ? Array.from({ length: totalPages }, (_, i) => i + 1)
                    : (() => {
                        const p: (number | "...")[] = [1];
                        if (currentPage > 3) p.push("...");
                        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) p.push(i);
                        if (currentPage < totalPages - 2) p.push("...");
                        p.push(totalPages);
                        return p;
                      })();
                  return pages.map((p, idx) =>
                    p === "..." ? (
                      <span key={`ellipsis-${idx}`} className="px-2 text-sm text-muted-foreground">…</span>
                    ) : (
                      <Button key={p} variant={currentPage === p ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(p as number)}>
                        {p}
                      </Button>
                    )
                  );
                })()}
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ChecklistsPage() {
  return (
    <RoleGuard requiredPermission="checklists.view">
    <React.Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }
    >
      <ChecklistsPageContent />
    </React.Suspense>
    </RoleGuard>
  );
}
