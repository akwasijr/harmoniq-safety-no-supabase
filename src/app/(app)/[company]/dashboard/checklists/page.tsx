"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCompanyParam } from "@/hooks/use-company-param";
import {
  Plus,
  ClipboardCheck,
  CheckCircle,
  ShieldAlert,
  FileCheck,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
  Lock,
  X,
  Download,
  Trash2,
  Upload,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { Switch } from "@/components/ui/switch";
import { useCompanyData } from "@/hooks/use-company-data";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyStore } from "@/stores/company-store";
import { LoadingPage } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { isWithinDateRange, DateRangeValue } from "@/lib/date-utils";
import { getTemplatePublishStatus } from "@/lib/template-activation";
import type { ChecklistTemplate, ChecklistItem } from "@/types";
import { useTranslation } from "@/i18n";
import { RoleGuard } from "@/components/auth/role-guard";
import { PAGINATION } from "@/lib/constants";
import { downloadCsv, parseCsv } from "@/lib/csv";

const mockRiskTemplates: { id: string; name: string; description: string; type: string; status: string; sections: number; submissions: number; lastUpdated?: string; locked: boolean }[] = [];
const mockRiskAssessments: { id: string; template: string; templateId: string; type: string; location: string; date: string; status: string; by: string; riskLevel: string; riskScore: number }[] = [];

type MainTabType = "checklists" | "risk-assessment";
type SubTabType = "submissions" | "active";

const ITEMS_PER_PAGE = PAGINATION.DEFAULT_PAGE_SIZE;

// ---------------------------------------------------------------------------
// Template import helpers
// ---------------------------------------------------------------------------
type ParsedTemplateImport = {
  name: string;
  description: string;
  category: string;
  items: { question: string; type: ChecklistItem["type"]; required: boolean }[];
  errors: string[];
};

const VALID_ITEM_TYPES: ChecklistItem["type"][] = ["yes_no_na", "pass_fail", "rating", "text", "number", "photo", "date", "signature", "select"];

function parseTemplateJSON(text: string): ParsedTemplateImport[] {
  const raw = JSON.parse(text);
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr.map((t) => {
    const errors: string[] = [];
    const name = (t.name || t.title || "").trim();
    if (!name) errors.push("Missing name");
    const items: ParsedTemplateImport["items"] = [];
    const rawItems = t.items || t.questions || t.checklist_items || [];
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      errors.push("No items/questions");
    } else {
      rawItems.forEach((item: Record<string, unknown>, idx: number) => {
        const question = ((item.question || item.text || item.label || item.title || "") as string).trim();
        if (!question) { errors.push(`Item ${idx + 1}: missing question`); return; }
        const rawType = ((item.type || item.response_type || "yes_no_na") as string).toLowerCase().trim().replace(/\s+/g, "_");
        const type = VALID_ITEM_TYPES.includes(rawType as ChecklistItem["type"]) ? rawType as ChecklistItem["type"] : "yes_no_na";
        const required = item.required !== false;
        items.push({ question, type, required });
      });
    }
    return { name, description: ((t.description || t.desc || "") as string).trim(), category: ((t.category || t.type || "general") as string).trim(), items, errors };
  });
}

function parseTemplateCSV(data: { headers: string[]; rows: Record<string, string>[] }): ParsedTemplateImport[] {
  const groups = new Map<string, { description: string; category: string; items: { question: string; type: ChecklistItem["type"]; required: boolean }[] }>();
  for (const row of data.rows) {
    const name = (row.template_name || row.name || row.template || "").trim();
    if (!name) continue;
    if (!groups.has(name)) {
      groups.set(name, { description: (row.description || row.desc || "").trim(), category: (row.category || "general").trim(), items: [] });
    }
    const question = (row.question || row.item || row.text || "").trim();
    if (!question) continue;
    const rawType = (row.type || row.item_type || row.response_type || "yes_no_na").toLowerCase().trim().replace(/\s+/g, "_");
    const type = VALID_ITEM_TYPES.includes(rawType as ChecklistItem["type"]) ? rawType as ChecklistItem["type"] : "yes_no_na";
    const required = row.required?.toLowerCase().trim() !== "false" && row.required?.toLowerCase().trim() !== "no";
    groups.get(name)!.items.push({ question, type, required });
  }
  return Array.from(groups.entries()).map(([name, g]) => ({
    name, description: g.description, category: g.category, items: g.items,
    errors: g.items.length === 0 ? ["No items/questions"] : [],
  }));
}

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

function ChecklistsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const company = useCompanyParam();
  const [activeTab, setActiveTab] = React.useState<MainTabType>("checklists");
  const [subTab, setSubTab] = React.useState<SubTabType>("submissions");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [dateRange, setDateRange] = React.useState("last_30_days");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [statusFilter, setStatusFilter] = React.useState("");
  const [showNewAssessmentModal, setShowNewAssessmentModal] = React.useState(false);
  const [showTemplatePickerModal, setShowTemplatePickerModal] = React.useState(false);
  const [showImportModal, setShowImportModal] = React.useState(false);
  const [templateImportData, setTemplateImportData] = React.useState<ParsedTemplateImport[] | null>(null);

  // Read tab from URL query params on mount
  React.useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "risk-assessment" || tabParam === "checklists") {
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
    workOrders,
    stores,
  } = useCompanyData();
  const { isLoading } = stores.checklistTemplates;
  const { t, formatDate, formatNumber } = useTranslation();
  const { currentCompany } = useAuth();
  const { toast } = useToast();
  const { update: updateCompany } = useCompanyStore();

  // Toggle assessment type visibility for field app
  const toggleAssessmentVisibility = React.useCallback((templateId: string) => {
    if (!currentCompany) return;
    const hidden = currentCompany.hidden_assessment_types || [];
    const isHidden = hidden.includes(templateId);
    const updated = isHidden
      ? hidden.filter((id: string) => id !== templateId)
      : [...hidden, templateId];
    updateCompany(currentCompany.id, { hidden_assessment_types: updated });
  }, [currentCompany, updateCompany]);

  const isAssessmentHidden = React.useCallback((templateId: string) => {
    return (currentCompany?.hidden_assessment_types || []).includes(templateId);
  }, [currentCompany?.hidden_assessment_types]);

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

  const deriveChecklistCategory = (template: ChecklistTemplate) => {
    if (template.category) return template.category;
    const name = template.name.toLowerCase();
    if (name.includes("fire")) return "fire_safety";
    if (name.includes("ppe")) return "ppe";
    if (name.includes("forklift") || name.includes("ladder") || name.includes("equipment")) {
      return "equipment";
    }
    return "general";
  };

  const mainTabs = [
    { id: "checklists" as MainTabType, label: t("checklists.tabs.checklists"), icon: ClipboardCheck },
    { id: "risk-assessment" as MainTabType, label: t("checklists.tabs.assessments"), icon: ShieldAlert },
  ];

  const subTabs = [
    { id: "submissions" as SubTabType, label: "Submissions" },
    { id: "active" as SubTabType, label: "Templates" },
  ];

  const getFilters = () => {
    const baseFilters = [
      {
        id: "status",
        label: "All statuses",
        options: [
          { value: "active", label: "Active" },
          { value: "draft", label: "Draft" },
          { value: "archived", label: "Archived" },
          { value: "completed", label: "Completed" },
          { value: "in_progress", label: "In Progress" },
          { value: "passed", label: "Passed" },
          { value: "failed", label: "Failed" },
        ],
        value: statusFilter,
        onChange: (v: string) => { setStatusFilter(v); setCurrentPage(1); },
      },
    ];

    return baseFilters;
  };

  // Get data based on active tab and sub tab
  const getChecklistTemplates = () => {
    let data = checklistTemplatesStore.map((template) => {
      const used = checklistSubmissionsStore.filter((submission) => submission.template_id === template.id).length;
      return {
        id: template.id,
        name: template.name,
        description: template.description || "",
        items: template.items.length,
        used,
        status:
          getTemplatePublishStatus(template) === "published"
            ? "active"
            : getTemplatePublishStatus(template) === "archived"
              ? "archived"
              : "draft",
        publishStatus: getTemplatePublishStatus(template),
        category: deriveChecklistCategory(template),
      };
    });
    if (statusFilter) {
      data = data.filter((item) => item.status === statusFilter);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      data = data.filter((item) =>
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      );
    }
    return data;
  };

  const getChecklistSubmissions = () => {
    // Checklist submissions from store
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

    // Merge inspection submissions
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

  const getRiskTemplates = () => {
    let data = [...mockRiskTemplates];
    if (statusFilter) {
      data = data.filter((item) => item.status === statusFilter);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      data = data.filter((item) => item.name.toLowerCase().includes(query));
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

  // Get data counts for each category
  const checklistTemplates = getChecklistTemplates();
  const checklistSubmissions = getChecklistSubmissions();
  const riskTemplates = getRiskTemplates();
  const riskSubmissions = getRiskSubmissions();

  // Published templates for the "Start New" picker
  const publishedTemplates = React.useMemo(() => {
    return checklistTemplatesStore.filter(
      (t) => getTemplatePublishStatus(t) === "published"
    );
  }, [checklistTemplatesStore]);

  // Calculate totals and pagination
  const getTableLength = () => {
    if (activeTab === "checklists") return subTab === "active" ? checklistTemplates.length : checklistSubmissions.length;
    if (activeTab === "risk-assessment") return subTab === "active" ? riskTemplates.length : riskSubmissions.length;
    return 0;
  };

  const tableLength = getTableLength();
  const totalPages = Math.ceil(tableLength / ITEMS_PER_PAGE);

  // Get paginated data
  const paginatedChecklistTemplates = checklistTemplates.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const paginatedChecklistSubmissions = checklistSubmissions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const paginatedRiskTemplates = riskTemplates.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const paginatedRiskSubmissions = riskSubmissions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset sub tab when main tab changes
  React.useEffect(() => {
    setSubTab("submissions");
    setCurrentPage(1);
    setSearchQuery("");
    setStatusFilter("");
  }, [activeTab]);

  // Toggle template publish status (activate/deactivate for field app)
  const handleTogglePublishStatus = (templateId: string, currentStatus: string) => {
    const newStatus = currentStatus === "published" ? "draft" : "published";
    stores.checklistTemplates.update(templateId, {
      publish_status: newStatus,
      is_active: newStatus === "published",
      updated_at: new Date().toISOString(),
    });
    toast(newStatus === "published" ? "Template activated for field app" : "Template deactivated from field app");
  };

  const getKPIs = () => {
    if (activeTab === "checklists" && subTab === "submissions") {
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
    if (activeTab === "risk-assessment" && subTab === "submissions") {
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
    return null;
  };

  const handleStartNew = () => {
    if (activeTab === "risk-assessment") {
      setShowNewAssessmentModal(true);
    } else {
      setShowTemplatePickerModal(true);
    }
  };

  const handleExportCSV = () => {
    if (activeTab === "checklists" && subTab === "submissions") {
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
    } else if (activeTab === "checklists" && subTab === "active") {
      downloadCsv("checklist-templates.csv", checklistTemplates.map((t_) => ({
        name: t_.name,
        description: t_.description,
        category: t_.category,
        items: t_.items,
        status: t_.status,
        times_used: t_.used,
      })));
    } else if (activeTab === "risk-assessment" && subTab === "submissions") {
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

  if (isLoading && checklistTemplates.length === 0) {
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
          {activeTab === "checklists" && subTab === "active" && (
            <>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowImportModal(true)}>
                <Upload className="h-4 w-4" />
                Import
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => router.push(`/${company}/dashboard/checklists/new`)}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                New Template
              </Button>
            </>
          )}
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
                        router.push(`/${company}/dashboard/checklists/${template.id}?mode=new`);
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
                Only published templates are shown here. Manage templates in the Templates tab.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* New Assessment Modal */}
      {showNewAssessmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold">Start New Risk Assessment</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowNewAssessmentModal(false)} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <p className="text-sm text-muted-foreground mb-4">
                Select a template to start a new risk assessment.
              </p>
              
              <div className="grid gap-3">
                {mockRiskTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => {
                      setShowNewAssessmentModal(false);
                      router.push(`/${company}/app/risk-assessment/${template.id}`);
                    }}
                    className="flex items-start gap-3 p-4 rounded-lg border hover:bg-muted/50 text-left transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                      <FileCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{template.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
                    </div>
                    <span className="text-sm text-muted-foreground shrink-0">{template.sections} sections</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t p-4 bg-muted/30">
              <p className="text-xs text-muted-foreground text-center">
                Templates are based on regulatory requirements.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Import Template Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setShowImportModal(false); setTemplateImportData(null); }}>
          <div className="relative w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto rounded-lg bg-background p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Import checklist templates</h2>
              <button onClick={() => { setShowImportModal(false); setTemplateImportData(null); }} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {!templateImportData ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Upload a JSON or CSV file to import checklist templates.
                </p>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">JSON format (recommended):</p>
                  <pre className="text-[10px] bg-muted p-2 rounded overflow-x-auto">{`[{
  "name": "Fire Safety Checklist",
  "description": "Monthly fire check",
  "category": "safety",
  "items": [
    { "question": "Are exits clear?", "type": "yes_no_na", "required": true },
    { "question": "Extinguishers OK?", "type": "yes_no_na", "required": true }
  ]
}]`}</pre>
                  <p className="text-xs font-medium text-muted-foreground mt-3">CSV format (one row per question):</p>
                  <pre className="text-[10px] bg-muted p-2 rounded overflow-x-auto">{`template_name,description,category,question,type,required
Fire Safety,Monthly check,safety,Are exits clear?,yes_no_na,true
Fire Safety,Monthly check,safety,Extinguishers OK?,yes_no_na,true`}</pre>
                </div>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => {
                  const sample = JSON.stringify([{
                    name: "Example Checklist",
                    description: "Template description",
                    category: "general",
                    items: [
                      { question: "Example question 1", type: "yes_no_na", required: true },
                      { question: "Example question 2", type: "text", required: false },
                    ],
                  }], null, 2);
                  const blob = new Blob([sample], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = "template-example.json"; a.click();
                  URL.revokeObjectURL(url);
                }}>
                  <Download className="h-4 w-4" /> Download example JSON
                </Button>
                <label className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 cursor-pointer hover:bg-muted/50 transition-colors">
                  <input type="file" accept=".json,.csv,.txt" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const text = await file.text();
                      let templates: ParsedTemplateImport[];
                      if (file.name.endsWith(".json") || text.trim().startsWith("[") || text.trim().startsWith("{")) {
                        templates = parseTemplateJSON(text);
                      } else {
                        const data = await parseCsv(file);
                        if (data.rows.length === 0) { toast("File is empty"); return; }
                        templates = parseTemplateCSV(data);
                      }
                      if (templates.length === 0) { toast("No templates found in file"); return; }
                      setTemplateImportData(templates);
                    } catch (err) {
                      toast(`Failed to parse: ${err instanceof Error ? err.message : "unknown error"}`);
                    }
                    e.target.value = "";
                  }} />
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Choose JSON or CSV file</span>
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-medium">{templateImportData.length} template{templateImportData.length !== 1 ? "s" : ""}</span>
                  <Badge variant="success" className="text-[10px]">{templateImportData.filter((ti) => ti.errors.length === 0).length} valid</Badge>
                  {templateImportData.some((ti) => ti.errors.length > 0) && (
                    <Badge variant="destructive" className="text-[10px]">{templateImportData.filter((ti) => ti.errors.length > 0).length} errors</Badge>
                  )}
                </div>
                <div className="max-h-72 overflow-auto rounded border text-xs">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted sticky top-0 z-10">
                        <th className="px-2 py-1 text-left font-medium">Template</th>
                        <th className="px-2 py-1 text-left font-medium w-16">Items</th>
                        <th className="px-2 py-1 text-left font-medium w-20">Category</th>
                        <th className="px-2 py-1 text-left font-medium w-16">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {templateImportData.map((ti, i) => (
                        <tr key={i} className={`border-t ${ti.errors.length > 0 ? "bg-destructive/5" : ""}`}>
                          <td className="px-2 py-1.5">
                            <p className="font-medium">{ti.name || <span className="text-destructive italic">No name</span>}</p>
                            {ti.description && <p className="text-muted-foreground truncate max-w-[200px]">{ti.description}</p>}
                          </td>
                          <td className="px-2 py-1.5">{ti.items.length}</td>
                          <td className="px-2 py-1.5 capitalize">{ti.category}</td>
                          <td className="px-2 py-1.5">
                            {ti.errors.length === 0 ? (
                              <span className="text-green-600 dark:text-green-400">Ready</span>
                            ) : (
                              <span className="text-destructive" title={ti.errors.join(", ")}>{ti.errors[0]}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {templateImportData.length === 1 && templateImportData[0].items.length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Preview {templateImportData[0].items.length} items</summary>
                    <ul className="mt-2 space-y-1 pl-4">
                      {templateImportData[0].items.map((item, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="text-muted-foreground">{i + 1}.</span>
                          <span>{item.question}</span>
                          <Badge variant="outline" className="text-[9px] ml-auto">{item.type.replace(/_/g, " ")}</Badge>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setTemplateImportData(null)}>Back</Button>
                  <Button
                    className="flex-1"
                    disabled={templateImportData.every((ti) => ti.errors.length > 0)}
                    onClick={() => {
                      const now = new Date().toISOString();
                      let imported = 0;
                      templateImportData.forEach((ti) => {
                        if (ti.errors.length > 0) return;
                        stores.checklistTemplates.add({
                          id: crypto.randomUUID(),
                          company_id: currentCompany?.id || "",
                          name: ti.name,
                          description: ti.description || null,
                          category: ti.category,
                          items: ti.items.map((item, idx) => ({
                            id: crypto.randomUUID(),
                            question: item.question,
                            type: item.type,
                            required: item.required,
                            order: idx + 1,
                          })),
                          is_active: true,
                          publish_status: "draft",
                          created_at: now,
                          updated_at: now,
                        });
                        imported++;
                      });
                      toast(`${imported} template${imported !== 1 ? "s" : ""} imported as drafts`);
                      setShowImportModal(false);
                      setTemplateImportData(null);
                    }}
                  >
                    Import {templateImportData.filter((ti) => ti.errors.length === 0).length} template{templateImportData.filter((ti) => ti.errors.length === 0).length !== 1 ? "s" : ""}
                  </Button>
                </div>
              </div>
            )}
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


      {/* Sub Tabs */}
      <div className="flex gap-2">
        {subTabs.map((tab) => (
          <Button
            key={tab.id}
            variant={subTab === tab.id ? "default" : "outline"}
            size="sm"
            onClick={() => { setSubTab(tab.id); setCurrentPage(1); }}
          >
            {tab.label}
          </Button>
        ))}
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
        showDateRange={subTab === "submissions"}
      />

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {tableLength} {subTab === "active" ? "active task" : "record"}{tableLength !== 1 ? "s" : ""}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages || 1}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {/* Checklists Templates Table */}
            {activeTab === "checklists" && subTab === "active" && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Template</th>
                    <th className="pb-3 font-medium">Items</th>
                    <th className="hidden pb-3 font-medium md:table-cell">Category</th>
                    <th className="hidden pb-3 font-medium lg:table-cell">Used</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium w-24">Active</th>
                    <th className="pb-3 font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedChecklistTemplates.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">{t("checklists.empty.noChecklists")}</td>
                    </tr>
                  ) : (
                    paginatedChecklistTemplates.map((template) => (
                      <tr 
                        key={template.id} 
                        className="border-b last:border-0 cursor-pointer hover:bg-muted/50 active:bg-muted transition-colors group"
                        onClick={() => router.push(`/${company}/dashboard/checklists/${template.id}`)}
                      >
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">{template.name}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1">{template.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-xs">{template.items} {t("checklists.labels.items")}</td>
                        <td className="hidden py-3 md:table-cell">
                          <Badge variant="outline" className="text-xs">{template.category.replace(/_/g, " ")}</Badge>
                        </td>
                        <td className="hidden py-3 lg:table-cell text-xs text-muted-foreground">{template.used} times</td>
                        <td className="py-3">
                          <Badge variant={template.status === "active" ? "success" : template.status === "draft" ? "warning" : "secondary"} className="text-xs">
                            {template.status}
                          </Badge>
                        </td>
                        <td className="py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={template.publishStatus === "published"}
                              onCheckedChange={() => handleTogglePublishStatus(template.id, template.publishStatus)}
                              aria-label={template.publishStatus === "published" ? "Deactivate template" : "Activate template"}
                            />
                            <span className="text-[11px] text-muted-foreground hidden sm:inline">
                              {template.publishStatus === "published" ? "On" : "Off"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1">
                            <Eye className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            <button
                              type="button"
                              title="Delete template"
                              className="p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Delete "${template.name}"? This cannot be undone.`)) {
                                  stores.checklistTemplates.remove(template.id);
                                  toast(`Deleted "${template.name}"`);
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* Checklists Submissions Table */}
            {activeTab === "checklists" && subTab === "submissions" && (
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

            {/* Risk Assessment Templates Table */}
            {activeTab === "risk-assessment" && subTab === "active" && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Template</th>
                    <th className="hidden pb-3 font-medium md:table-cell">Type</th>
                    <th className="hidden pb-3 font-medium lg:table-cell">Submissions</th>
                    <th className="pb-3 font-medium">Standard</th>
                    <th className="pb-3 font-medium w-20 text-right">Visibility</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRiskTemplates.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">{t("checklists.empty.noChecklists")}</td>
                    </tr>
                  ) : (
                    paginatedRiskTemplates.map((template) => {
                      const hidden = isAssessmentHidden(template.id);
                      return (
                      <tr 
                        key={template.id} 
                        className={cn(
                          "border-b last:border-0 hover:bg-muted/50 active:bg-muted transition-colors group",
                          hidden && "opacity-60"
                        )}
                      >
                        <td 
                          className="py-3 cursor-pointer"
                          onClick={() => router.push(`/${company}/dashboard/risk-assessments/${template.id}`)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                              <FileCheck className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{template.name}</p>
                                {hidden && <Badge variant="outline" className="text-[10px] text-muted-foreground">Hidden</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-1 max-w-[300px]">{template.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden py-3 md:table-cell">
                          <Badge variant="outline" className="text-xs">{template.type}</Badge>
                        </td>
                        <td className="hidden py-3 lg:table-cell text-xs text-muted-foreground">{template.submissions}</td>
                        <td className="py-3">
                          {template.locked && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <Lock className="h-3 w-3" />
                              Standard
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleAssessmentVisibility(template.id); }}
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors",
                              hidden
                                ? "text-muted-foreground hover:text-foreground hover:bg-muted"
                                : "text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                            )}
                            title={hidden ? "Show on field app" : "Hide from field app"}
                          >
                            {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            <span className="hidden sm:inline">{hidden ? "Show" : "Visible"}</span>
                          </button>
                        </td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

            {/* Risk Assessment Submissions Table */}
            {activeTab === "risk-assessment" && subTab === "submissions" && (
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
