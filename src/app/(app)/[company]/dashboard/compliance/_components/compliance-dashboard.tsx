"use client";

import * as React from "react";
import {
  Plus,
  ShieldCheck,
  Clock,
  AlertTriangle,
  FileText,
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
  CheckCircle,
  ClipboardList,
  Calendar,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
import { SortableTh, sortData, type SortDirection } from "@/components/ui/sortable-th";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { useCompanyData } from "@/hooks/use-company-data";
import { LoadingPage } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/i18n";
import { RoleGuard } from "@/components/auth/role-guard";
import { PAGINATION } from "@/lib/constants";
import { getUserDisplayName } from "@/lib/status-utils";
import { getBuiltInObligations } from "@/data/compliance-obligations";
import type { ComplianceObligation, ComplianceDocument, Country } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ITEMS_PER_PAGE = PAGINATION.DEFAULT_PAGE_SIZE;

type SubTab = "obligations" | "documents" | "calendar";

const OBLIGATION_STATUS_BADGE: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  compliant: { variant: "default", label: "compliance.compliant" },
  due_soon: { variant: "outline", label: "compliance.dueSoon" },
  overdue: { variant: "destructive", label: "compliance.overdue" },
  not_started: { variant: "secondary", label: "Not Started" },
};

const DOC_STATUS_BADGE: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  current: { variant: "default", label: "Current" },
  draft: { variant: "outline", label: "Draft" },
  archived: { variant: "secondary", label: "Archived" },
};

const CATEGORY_LABELS: Record<ComplianceObligation["category"], string> = {
  incident_reporting: "compliance.incidentReporting",
  risk_assessment: "compliance.riskAssessment",
  training: "Training",
  inspection: "compliance.inspection",
  environmental: "compliance.environmental",
  general: "compliance.general",
};

const FREQUENCY_LABELS: Record<ComplianceObligation["frequency"], string> = {
  one_time: "One Time",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
  custom: "Custom",
};

const DOC_CATEGORY_LABELS: Record<ComplianceDocument["category"], string> = {
  policy: "Policy",
  procedure: "Procedure",
  sds: "SDS",
  certificate: "Certificate",
  report: "Report",
  plan: "Plan",
  other: "Other",
};

const COUNTRY_LABELS: Record<Country, string> = {
  US: "United States",
  NL: "Netherlands",
  SE: "Sweden",
  GB: "United Kingdom",
  DE: "Germany",
  FR: "France",
  ES: "Spain",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeObligationStatus(ob: Pick<ComplianceObligation, "next_due_date" | "last_completed_date" | "status">): ComplianceObligation["status"] {
  if (ob.status === "compliant") return "compliant";
  if (!ob.next_due_date) return "not_started";
  const now = new Date();
  const due = new Date(ob.next_due_date);
  if (due < now) return "overdue";
  const fourteenDays = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  if (due < fourteenDays) return "due_soon";
  if (ob.last_completed_date) return "compliant";
  return "not_started";
}

function computeNextDueDate(frequency: ComplianceObligation["frequency"], fromDate: Date = new Date()): string {
  const d = new Date(fromDate);
  switch (frequency) {
    case "daily":
      d.setDate(d.getDate() + 1);
      break;
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    case "quarterly":
      d.setMonth(d.getMonth() + 3);
      break;
    case "annual":
      d.setFullYear(d.getFullYear() + 1);
      break;
    case "one_time":
      return "";
    default:
      d.setFullYear(d.getFullYear() + 1);
  }
  return d.toISOString().split("T")[0];
}

// ---------------------------------------------------------------------------
// Pagination component (shared)
// ---------------------------------------------------------------------------

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-4 border-t mt-4">
      <p className="text-sm text-muted-foreground">
        Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
        {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of {totalItems}
      </p>
      <div className="flex gap-1">
        <Button variant="outline" size="sm" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {(() => {
          const pages: (number | "...")[] =
            totalPages <= 7
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
              <Button key={p} variant={currentPage === p ? "default" : "outline"} size="sm" onClick={() => onPageChange(p as number)}>
                {p}
              </Button>
            ),
          );
        })()}
        <Button variant="outline" size="sm" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ComplianceDashboard() {
  const { user, currentCompany } = useAuth();
  const { t, formatDate } = useTranslation();
  const { toast } = useToast();
  const {
    users,
    complianceObligations: companyObligations,
    complianceDocuments,
    stores,
    companyId,
  } = useCompanyData();

  const obligationsStore = stores.complianceObligations;
  const documentsStore = stores.complianceDocuments;

  // ── All obligations (built-in country-filtered + company custom) ──
  const allObligations = React.useMemo<ComplianceObligation[]>(() => {
    const builtIn = getBuiltInObligations().filter(
      (ob) => ob.country === currentCompany?.country,
    );
    return [...builtIn, ...companyObligations];
  }, [companyObligations, currentCompany?.country]);

  // ── Enrich obligations with computed status ──
  const obligationsWithStatus = React.useMemo(
    () =>
      allObligations.map((ob) => ({
        ...ob,
        _status: computeObligationStatus(ob),
      })),
    [allObligations],
  );

  // ── Tab / page state ──
  const [activeTab, setActiveTab] = React.useState<SubTab>("obligations");
  const [currentPage, setCurrentPage] = React.useState(1);

  // ── Filters ──
  const [searchQuery, setSearchQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");

  // ── Sort ──
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDir, setSortDir] = React.useState<SortDirection>(null);

  // ── Modals ──
  const [showAddObligation, setShowAddObligation] = React.useState(false);
  const [showAddDocument, setShowAddDocument] = React.useState(false);

  // Reset page on filter/tab changes
  React.useEffect(() => { setCurrentPage(1); }, [searchQuery, categoryFilter, statusFilter, activeTab]);

  // ── KPI computations ──
  const kpis = React.useMemo(() => {
    const compliant = obligationsWithStatus.filter((ob) => ob._status === "compliant").length;
    const dueSoon = obligationsWithStatus.filter((ob) => ob._status === "due_soon").length;
    const overdue = obligationsWithStatus.filter((ob) => ob._status === "overdue").length;
    const totalDocs = complianceDocuments.length;
    return { compliant, dueSoon, overdue, totalDocs };
  }, [obligationsWithStatus, complianceDocuments]);

  // ── Obligations tab filtering ──
  const filteredObligations = React.useMemo(() => {
    let data = obligationsWithStatus;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter((ob) =>
        ob.title.toLowerCase().includes(q) ||
        ob.regulation.toLowerCase().includes(q) ||
        (ob.description ?? "").toLowerCase().includes(q),
      );
    }
    if (categoryFilter) data = data.filter((ob) => ob.category === categoryFilter);
    if (statusFilter) data = data.filter((ob) => ob._status === statusFilter);
    return data;
  }, [obligationsWithStatus, searchQuery, categoryFilter, statusFilter]);

  const sortedObligations = React.useMemo(
    () =>
      sortData(filteredObligations, sortKey, sortDir, (item, key) => {
        if (key === "title") return item.title;
        if (key === "regulation") return item.regulation;
        if (key === "category") return item.category;
        if (key === "frequency") return item.frequency;
        if (key === "next_due_date") return item.next_due_date;
        if (key === "owner") return getUserDisplayName(item.owner_id, users, "");
        if (key === "status") return item._status;
        return (item as Record<string, unknown>)[key] as string;
      }),
    [filteredObligations, sortKey, sortDir, users],
  );

  const obligationTotalPages = Math.ceil(sortedObligations.length / ITEMS_PER_PAGE);
  const obligationPageData = sortedObligations.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // ── Documents tab filtering ──
  const filteredDocuments = React.useMemo(() => {
    let data = complianceDocuments;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter((doc) =>
        doc.title.toLowerCase().includes(q) ||
        doc.tags.some((tag) => tag.toLowerCase().includes(q)),
      );
    }
    if (categoryFilter) data = data.filter((doc) => doc.category === categoryFilter);
    if (statusFilter) data = data.filter((doc) => doc.status === statusFilter);
    return data;
  }, [complianceDocuments, searchQuery, categoryFilter, statusFilter]);

  const sortedDocuments = React.useMemo(
    () =>
      sortData(filteredDocuments, sortKey, sortDir, (item, key) => {
        if (key === "title") return item.title;
        if (key === "category") return item.category;
        if (key === "version") return item.version;
        if (key === "status") return item.status;
        if (key === "review_date") return item.review_date ?? "";
        if (key === "owner") return getUserDisplayName(item.owner_id, users, "");
        return (item as unknown as Record<string, unknown>)[key] as string;
      }),
    [filteredDocuments, sortKey, sortDir, users],
  );

  const docTotalPages = Math.ceil(sortedDocuments.length / ITEMS_PER_PAGE);
  const docPageData = sortedDocuments.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // ── Sort handler ──
  const handleSort = React.useCallback((key: string, dir: SortDirection) => {
    setSortKey(dir ? key : null);
    setSortDir(dir);
  }, []);

  // ── Obligation filters ──
  const obligationFilters = React.useMemo(
    () => [
      {
        id: "category",
        label: t("compliance.category"),
        options: Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label: t(label) })),
        value: categoryFilter,
        onChange: setCategoryFilter,
      },
      {
        id: "status",
        label: "Status",
        options: [
          { value: "compliant", label: t("compliance.compliant") },
          { value: "due_soon", label: t("compliance.dueSoon") },
          { value: "overdue", label: t("compliance.overdue") },
          { value: "not_started", label: "Not Started" },
        ],
        value: statusFilter,
        onChange: setStatusFilter,
      },
    ],
    [categoryFilter, statusFilter, t],
  );

  // ── Document filters ──
  const documentFilters = React.useMemo(
    () => [
      {
        id: "category",
        label: t("compliance.category"),
        options: Object.entries(DOC_CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
        value: categoryFilter,
        onChange: setCategoryFilter,
      },
      {
        id: "status",
        label: "Status",
        options: [
          { value: "current", label: "Current" },
          { value: "draft", label: "Draft" },
          { value: "archived", label: "Archived" },
        ],
        value: statusFilter,
        onChange: setStatusFilter,
      },
    ],
    [categoryFilter, statusFilter, t],
  );

  // ── Add Obligation form ──
  const [obligationForm, setObligationForm] = React.useState({
    title: "",
    regulation: "",
    country: (currentCompany?.country ?? "US") as Country,
    category: "" as ComplianceObligation["category"] | "",
    frequency: "" as ComplianceObligation["frequency"] | "",
    next_due_date: "",
    owner_id: "",
    evidence_type: "manual" as ComplianceObligation["evidence_type"],
  });

  const resetObligationForm = () => {
    setObligationForm({
      title: "",
      regulation: "",
      country: (currentCompany?.country ?? "US") as Country,
      category: "",
      frequency: "",
      next_due_date: "",
      owner_id: "",
      evidence_type: "manual",
    });
  };

  const handleSaveObligation = React.useCallback(() => {
    if (!obligationForm.title || !obligationForm.regulation || !obligationForm.category || !obligationForm.frequency || !obligationForm.next_due_date) return;
    const now = new Date().toISOString();

    const newObligation: ComplianceObligation = {
      id: crypto.randomUUID(),
      company_id: companyId ?? "",
      title: obligationForm.title,
      description: null,
      regulation: obligationForm.regulation,
      country: obligationForm.country,
      category: obligationForm.category as ComplianceObligation["category"],
      frequency: obligationForm.frequency as ComplianceObligation["frequency"],
      custom_frequency_days: null,
      next_due_date: obligationForm.next_due_date,
      last_completed_date: null,
      owner_id: obligationForm.owner_id || null,
      evidence_type: obligationForm.evidence_type,
      auto_evidence_source: null,
      status: "not_started",
      is_builtin: false,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    obligationsStore.add(newObligation);
    toast("Obligation added");
    resetObligationForm();
    setShowAddObligation(false);
  }, [obligationForm, companyId, obligationsStore, toast, resetObligationForm]);

  // ── Mark obligation as complete ──
  const handleMarkComplete = React.useCallback(
    (ob: ComplianceObligation) => {
      if (ob.is_builtin) return;
      const now = new Date();
      const nextDue = computeNextDueDate(ob.frequency, now);
      obligationsStore.update(ob.id, {
        ...ob,
        last_completed_date: now.toISOString().split("T")[0],
        next_due_date: nextDue || ob.next_due_date,
        status: "compliant",
        updated_at: now.toISOString(),
      });
      toast("Obligation marked as complete");
    },
    [obligationsStore, toast],
  );

  // ── Delete obligation ──
  const handleDeleteObligation = React.useCallback(
    (id: string) => {
      obligationsStore.remove(id);
      toast("Obligation removed");
    },
    [obligationsStore, toast],
  );

  // ── Upload Document form ──
  const [docForm, setDocForm] = React.useState({
    title: "",
    category: "" as ComplianceDocument["category"] | "",
    version: "1.0",
    review_date: "",
    owner_id: "",
    tags: "",
  });

  const resetDocForm = () => {
    setDocForm({ title: "", category: "", version: "1.0", review_date: "", owner_id: "", tags: "" });
  };

  const handleSaveDocument = () => {
    if (!docForm.title || !docForm.category) return;
    const now = new Date().toISOString();

    const newDoc: ComplianceDocument = {
      id: crypto.randomUUID(),
      company_id: companyId ?? "",
      title: docForm.title,
      category: docForm.category as ComplianceDocument["category"],
      document_url: "",
      version: docForm.version || "1.0",
      status: "draft",
      review_date: docForm.review_date || null,
      owner_id: docForm.owner_id || null,
      tags: docForm.tags ? docForm.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      applicable_countries: currentCompany?.country ? [currentCompany.country] : [],
      created_at: now,
      updated_at: now,
    };

    documentsStore.add(newDoc);
    toast("Document uploaded");
    resetDocForm();
    setShowAddDocument(false);
  };

  // ── Delete document ──
  const handleDeleteDocument = React.useCallback(
    (id: string) => {
      documentsStore.remove(id);
      toast("Document removed");
    },
    [documentsStore, toast],
  );

  // ── Calendar data ──
  const calendarData = React.useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const months: { year: number; month: number; label: string; obligations: typeof obligationsWithStatus }[] = [];

    for (let i = 0; i < 3; i++) {
      const m = (month + i) % 12;
      const y = year + Math.floor((month + i) / 12);
      const monthLabel = new Date(y, m, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
      const obs = obligationsWithStatus.filter((ob) => {
        const d = new Date(ob.next_due_date);
        return d.getFullYear() === y && d.getMonth() === m;
      });
      months.push({ year: y, month: m, label: monthLabel, obligations: obs });
    }
    return months;
  }, [obligationsWithStatus]);

  // ── Loading ──
  if (obligationsStore.isLoading || documentsStore.isLoading) {
    return <LoadingPage />;
  }

  // ── Render ──
  return (
    <RoleGuard allowedRoles={["company_admin", "manager", "super_admin", "viewer"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("compliance.title")}</h1>
            <p className="text-sm text-muted-foreground">Manage regulatory obligations, documents, and compliance calendar</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                resetObligationForm();
                setShowAddObligation(true);
              }}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t("compliance.addObligation")}
            </Button>
            <Button
              size="sm"
              className="gap-2"
              onClick={() => {
                resetDocForm();
                setShowAddDocument(true);
              }}
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              {t("compliance.uploadDocument")}
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard title={t("compliance.compliant")} value={kpis.compliant} icon={ShieldCheck} description={t("compliance.obligationsMet")} />
          <KPICard
            title={t("compliance.dueSoon")}
            value={kpis.dueSoon}
            icon={Clock}
            className={kpis.dueSoon > 0 ? "border-amber-500/50" : undefined}
            description={t("compliance.within14Days")}
          />
          <KPICard
            title={t("compliance.overdue")}
            value={kpis.overdue}
            icon={AlertTriangle}
            className={kpis.overdue > 0 ? "border-destructive/50" : undefined}
            description={t("compliance.pastDueDate")}
          />
          <KPICard title={t("compliance.documents")} value={kpis.totalDocs} icon={FileText} description={t("compliance.complianceDocs")} />
        </div>

        {/* Sub Tabs */}
        <div className="border-b">
          <div className="flex gap-4">
            {([
              { key: "obligations" as const, label: t("compliance.obligations"), icon: ClipboardList },
              { key: "documents" as const, label: t("compliance.documents"), icon: FileText },
              { key: "calendar" as const, label: t("compliance.calendar"), icon: Calendar },
            ] as const).map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex items-center gap-2 py-3 px-1 text-sm font-medium transition-colors relative",
                    activeTab === tab.key ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{tab.label}</span>
                  {activeTab === tab.key && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* ================================================================ */}
        {/* Obligations Tab                                                  */}
        {/* ================================================================ */}
        {activeTab === "obligations" && (
          <>
            <SearchFilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search by title, regulation..."
              filters={obligationFilters}
              showDateRange={false}
            />
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Compliance Obligations ({filteredObligations.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b">
                        <SortableTh sortKey="title" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>{t("compliance.obligationTitle")}</SortableTh>
                        <SortableTh sortKey="regulation" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>{t("compliance.regulation")}</SortableTh>
                        <SortableTh sortKey="category" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>{t("compliance.category")}</SortableTh>
                        <SortableTh sortKey="frequency" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>{t("compliance.frequency")}</SortableTh>
                        <SortableTh sortKey="next_due_date" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>{t("compliance.nextDue")}</SortableTh>
                        <SortableTh sortKey="owner" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>{t("compliance.owner")}</SortableTh>
                        <SortableTh sortKey="status" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>Status</SortableTh>
                        <th className="pb-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {obligationPageData.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-muted-foreground">
                            No compliance obligations found
                          </td>
                        </tr>
                      ) : (
                        obligationPageData.map((ob) => {
                          const badge = OBLIGATION_STATUS_BADGE[ob._status] ?? OBLIGATION_STATUS_BADGE.not_started;
                          return (
                            <tr key={ob.id} className="hover:bg-muted/50 transition-colors">
                              <td className="py-3 pr-4">
                                <div>
                                  <p className="font-medium">{ob.title}</p>
                                  {ob.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-1">{ob.description}</p>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 pr-4 text-muted-foreground">{ob.regulation}</td>
                              <td className="py-3 pr-4">
                                <Badge variant="secondary">{t(CATEGORY_LABELS[ob.category])}</Badge>
                              </td>
                              <td className="py-3 pr-4">{FREQUENCY_LABELS[ob.frequency]}</td>
                              <td className="py-3 pr-4">{formatDate(ob.next_due_date)}</td>
                              <td className="py-3 pr-4 text-muted-foreground">{getUserDisplayName(ob.owner_id, users)}</td>
                              <td className="py-3 pr-4">
                                <Badge variant={badge.variant}>{t(badge.label)}</Badge>
                              </td>
                              <td className="py-3 text-right">
                                <div className="flex justify-end gap-1">
                                  {!ob.is_builtin && ob._status !== "compliant" && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-green-600 hover:text-green-700"
                                      onClick={() => handleMarkComplete(ob)}
                                      title={t("compliance.markComplete")}
                                    >
                                      <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                                      <span className="sr-only">{t("compliance.markComplete")}</span>
                                    </Button>
                                  )}
                                  {!ob.is_builtin && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() => handleDeleteObligation(ob.id)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                      <span className="sr-only">Delete</span>
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <Pagination currentPage={currentPage} totalPages={obligationTotalPages} totalItems={filteredObligations.length} onPageChange={setCurrentPage} />
              </CardContent>
            </Card>
          </>
        )}

        {/* ================================================================ */}
        {/* Documents Tab                                                    */}
        {/* ================================================================ */}
        {activeTab === "documents" && (
          <>
            <SearchFilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search by title, tags..."
              filters={documentFilters}
              showDateRange={false}
            />
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Compliance Documents ({filteredDocuments.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b">
                        <SortableTh sortKey="title" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>{t("compliance.document")}</SortableTh>
                        <SortableTh sortKey="category" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>{t("compliance.category")}</SortableTh>
                        <SortableTh sortKey="version" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>{t("compliance.version")}</SortableTh>
                        <SortableTh sortKey="status" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>Status</SortableTh>
                        <SortableTh sortKey="review_date" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>{t("compliance.reviewDate")}</SortableTh>
                        <SortableTh sortKey="owner" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>{t("compliance.owner")}</SortableTh>
                        <th className="pb-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {docPageData.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-muted-foreground">
                            No compliance documents found
                          </td>
                        </tr>
                      ) : (
                        docPageData.map((doc) => {
                          const badge = DOC_STATUS_BADGE[doc.status] ?? DOC_STATUS_BADGE.draft;
                          return (
                            <tr key={doc.id} className="hover:bg-muted/50 transition-colors">
                              <td className="py-3 pr-4">
                                <div>
                                  <p className="font-medium">{doc.title}</p>
                                  {doc.tags.length > 0 && (
                                    <div className="flex gap-1 mt-0.5">
                                      {doc.tags.slice(0, 3).map((tag) => (
                                        <span key={tag} className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{tag}</span>
                                      ))}
                                      {doc.tags.length > 3 && <span className="text-xs text-muted-foreground">+{doc.tags.length - 3}</span>}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 pr-4">
                                <Badge variant="secondary">{DOC_CATEGORY_LABELS[doc.category]}</Badge>
                              </td>
                              <td className="py-3 pr-4 text-muted-foreground">v{doc.version}</td>
                              <td className="py-3 pr-4">
                                <Badge variant={badge.variant}>{badge.label}</Badge>
                              </td>
                              <td className="py-3 pr-4">{doc.review_date ? formatDate(doc.review_date) : "—"}</td>
                              <td className="py-3 pr-4 text-muted-foreground">{getUserDisplayName(doc.owner_id, users)}</td>
                              <td className="py-3 text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteDocument(doc.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span className="sr-only">Delete</span>
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <Pagination currentPage={currentPage} totalPages={docTotalPages} totalItems={filteredDocuments.length} onPageChange={setCurrentPage} />
              </CardContent>
            </Card>
          </>
        )}

        {/* ================================================================ */}
        {/* Calendar Tab                                                     */}
        {/* ================================================================ */}
        {activeTab === "calendar" && (
          <div className="space-y-6">
            {calendarData.map((monthData) => (
              <Card key={`${monthData.year}-${monthData.month}`}>
                <CardHeader>
                  <CardTitle className="text-base">{monthData.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  {monthData.obligations.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      No obligations due this month
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {monthData.obligations
                        .sort((a, b) => a.next_due_date.localeCompare(b.next_due_date))
                        .map((ob) => {
                          const badge = OBLIGATION_STATUS_BADGE[ob._status] ?? OBLIGATION_STATUS_BADGE.not_started;
                          const dueDay = new Date(ob.next_due_date).getDate();
                          return (
                            <div
                              key={ob.id}
                              className="flex items-center gap-4 rounded-md border px-4 py-3 hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-sm font-semibold">
                                {dueDay}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{ob.title}</p>
                                <p className="text-xs text-muted-foreground">{ob.regulation} &middot; {FREQUENCY_LABELS[ob.frequency]}</p>
                              </div>
                              <Badge variant={badge.variant}>{t(badge.label)}</Badge>
                              {getUserDisplayName(ob.owner_id, users, "") && (
                                <span className="text-xs text-muted-foreground hidden sm:inline">
                                  {getUserDisplayName(ob.owner_id, users)}
                                </span>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" /> {t("compliance.compliant")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" /> {t("compliance.dueSoon")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" /> {t("compliance.overdue")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-muted-foreground/30" /> Not Started
              </span>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* Add Obligation Modal                                             */}
        {/* ================================================================ */}
        {showAddObligation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setShowAddObligation(false); resetObligationForm(); }}>
            <div
              className="relative z-50 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto rounded-lg bg-background p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold">{t("compliance.addObligation")}</h2>
                  <p className="text-sm text-muted-foreground">Define a new regulatory obligation to track</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setShowAddObligation(false); resetObligationForm(); }}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <Label htmlFor="ob-title">{t("compliance.obligationTitle")} *</Label>
                  <Input
                    id="ob-title"
                    value={obligationForm.title}
                    onChange={(e) => setObligationForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Annual Fire Drill"
                    className="mt-1"
                  />
                </div>

                {/* Regulation */}
                <div>
                  <Label htmlFor="ob-regulation">{t("compliance.regulation")} *</Label>
                  <Input
                    id="ob-regulation"
                    value={obligationForm.regulation}
                    onChange={(e) => setObligationForm((f) => ({ ...f, regulation: e.target.value }))}
                    placeholder="e.g. OSHA 29 CFR 1910.157"
                    className="mt-1"
                  />
                </div>

                {/* Country + Category */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ob-country">Country *</Label>
                    <select
                      id="ob-country"
                      aria-label="Select country"
                      value={obligationForm.country}
                      onChange={(e) => setObligationForm((f) => ({ ...f, country: e.target.value as Country }))}
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {Object.entries(COUNTRY_LABELS).map(([code, label]) => (
                        <option key={code} value={code}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="ob-category">{t("compliance.category")} *</Label>
                    <select
                      id="ob-category"
                      aria-label="Select category"
                      value={obligationForm.category}
                      onChange={(e) => setObligationForm((f) => ({ ...f, category: e.target.value as ComplianceObligation["category"] }))}
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select category...</option>
                      {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{t(label)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Frequency + Next Due Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ob-frequency">{t("compliance.frequency")} *</Label>
                    <select
                      id="ob-frequency"
                      aria-label="Select frequency"
                      value={obligationForm.frequency}
                      onChange={(e) => setObligationForm((f) => ({ ...f, frequency: e.target.value as ComplianceObligation["frequency"] }))}
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select frequency...</option>
                      {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="ob-due-date">{t("compliance.nextDue")} *</Label>
                    <Input
                      id="ob-due-date"
                      type="date"
                      value={obligationForm.next_due_date}
                      onChange={(e) => setObligationForm((f) => ({ ...f, next_due_date: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Owner + Evidence Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ob-owner">{t("compliance.owner")}</Label>
                    <select
                      id="ob-owner"
                      aria-label="Select owner"
                      value={obligationForm.owner_id}
                      onChange={(e) => setObligationForm((f) => ({ ...f, owner_id: e.target.value }))}
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Unassigned</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.full_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="ob-evidence">{t("compliance.evidenceType")}</Label>
                    <select
                      id="ob-evidence"
                      aria-label="Select evidence type"
                      value={obligationForm.evidence_type}
                      onChange={(e) => setObligationForm((f) => ({ ...f, evidence_type: e.target.value as ComplianceObligation["evidence_type"] }))}
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="manual">{t("compliance.manual")}</option>
                      <option value="auto">{t("compliance.auto")}</option>
                      <option value="document">{t("compliance.document")}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <Button variant="outline" onClick={() => { setShowAddObligation(false); resetObligationForm(); }}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveObligation}
                  disabled={!obligationForm.title || !obligationForm.regulation || !obligationForm.category || !obligationForm.frequency || !obligationForm.next_due_date}
                >
                  {t("compliance.addObligation")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* Upload Document Modal                                            */}
        {/* ================================================================ */}
        {showAddDocument && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setShowAddDocument(false); resetDocForm(); }}>
            <div
              className="relative z-50 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto rounded-lg bg-background p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold">{t("compliance.uploadDocument")}</h2>
                  <p className="text-sm text-muted-foreground">Add a new compliance document to track</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setShowAddDocument(false); resetDocForm(); }}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <Label htmlFor="doc-title">{t("compliance.obligationTitle")} *</Label>
                  <Input
                    id="doc-title"
                    value={docForm.title}
                    onChange={(e) => setDocForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Health & Safety Policy 2024"
                    className="mt-1"
                  />
                </div>

                {/* Category */}
                <div>
                  <Label htmlFor="doc-category">{t("compliance.category")} *</Label>
                  <select
                    id="doc-category"
                    aria-label="Select document category"
                    value={docForm.category}
                    onChange={(e) => setDocForm((f) => ({ ...f, category: e.target.value as ComplianceDocument["category"] }))}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select category...</option>
                    {Object.entries(DOC_CATEGORY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Version + Review Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="doc-version">{t("compliance.version")}</Label>
                    <Input
                      id="doc-version"
                      value={docForm.version}
                      onChange={(e) => setDocForm((f) => ({ ...f, version: e.target.value }))}
                      placeholder="1.0"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="doc-review">{t("compliance.reviewDate")}</Label>
                    <Input
                      id="doc-review"
                      type="date"
                      value={docForm.review_date}
                      onChange={(e) => setDocForm((f) => ({ ...f, review_date: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Owner */}
                <div>
                  <Label htmlFor="doc-owner">{t("compliance.owner")}</Label>
                  <select
                    id="doc-owner"
                    aria-label="Select document owner"
                    value={docForm.owner_id}
                    onChange={(e) => setDocForm((f) => ({ ...f, owner_id: e.target.value }))}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.full_name}</option>
                    ))}
                  </select>
                </div>

                {/* Tags */}
                <div>
                  <Label htmlFor="doc-tags">{t("compliance.tags")}</Label>
                  <Input
                    id="doc-tags"
                    value={docForm.tags}
                    onChange={(e) => setDocForm((f) => ({ ...f, tags: e.target.value }))}
                    placeholder="safety, fire, annual (comma separated)"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <Button variant="outline" onClick={() => { setShowAddDocument(false); resetDocForm(); }}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveDocument}
                  disabled={!docForm.title || !docForm.category}
                >
                  {t("compliance.uploadDocument")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
