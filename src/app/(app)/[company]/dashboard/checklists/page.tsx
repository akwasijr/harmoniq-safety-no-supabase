"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCompanyParam } from "@/hooks/use-company-param";
import {
  Plus,
  ClipboardCheck,
  CheckCircle,
  ShieldAlert,
  Wrench,
  FileCheck,
  Eye,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
  Lock,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { useChecklistTemplatesStore, useChecklistSubmissionsStore } from "@/stores/checklists-store";
import { useRiskEvaluationsStore } from "@/stores/risk-evaluations-store";
import { useAssetInspectionsStore } from "@/stores/inspections-store";
import { useAssetsStore } from "@/stores/assets-store";
import { useUsersStore } from "@/stores/users-store";
import { useLocationsStore } from "@/stores/locations-store";
import { cn } from "@/lib/utils";
import { isWithinDateRange, DateRangeValue } from "@/lib/date-utils";
import type { ChecklistTemplate } from "@/types";
import { useTranslation } from "@/i18n";

type MainTabType = "checklists" | "risk-assessment" | "inspection";
type SubTabType = "submissions" | "templates";

const ITEMS_PER_PAGE = 10;

// Risk assessment templates
const mockRiskTemplates = [
  // USA Templates (OSHA)
  { id: "jha", name: "Job Hazard Analysis (JHA)", type: "JHA", sections: 5, submissions: 45, status: "active", locked: true, 
    description: "OSHA-compliant step-by-step task analysis with hazard identification and control hierarchy" },
  { id: "jsa", name: "Job Safety Analysis (JSA)", type: "JSA", sections: 4, submissions: 32, status: "active", locked: true,
    description: "Daily pre-work safety checklist for crew briefings" },
  
  // Netherlands Templates (Arbowet)
  { id: "rie", name: "RI&E Assessment", type: "RIE", sections: 5, submissions: 28, status: "active", locked: true,
    description: "Risico-Inventarisatie en -Evaluatie per Arbowet Article 5" },
  { id: "arbowet", name: "Arbowet Compliance Audit", type: "ARBOWET", sections: 4, submissions: 15, status: "active", locked: true,
    description: "Dutch Working Conditions Act compliance check (Articles 3, 5, 8, 13, 14)" },
  
  // Sweden Templates (AFS)
  { id: "sam", name: "SAM Assessment", type: "SAM", sections: 4, submissions: 22, status: "active", locked: true,
    description: "Systematiskt Arbetsmiljöarbete per AFS 2023:1" },
  { id: "osa", name: "OSA - Psykosocial Riskbedömning", type: "OSA", sections: 8, submissions: 18, status: "active", locked: true,
    description: "Organisatorisk och Social Arbetsmiljö per AFS 2015:4" },
];

// Mock risk assessment submissions
const mockRiskAssessments = [
  { id: "ra1", template: "Job Hazard Analysis (JHA)", templateId: "jha", type: "JHA", location: "Warehouse A", date: "2024-01-28", status: "completed", by: "John Doe", riskLevel: "medium", riskScore: 9 },
  { id: "ra2", template: "RI&E Assessment", templateId: "rie", type: "RIE", location: "Amsterdam Office", date: "2024-01-27", status: "in_progress", by: "Jan van Berg", riskLevel: "high", riskScore: 16 },
  { id: "ra3", template: "SAM Assessment", templateId: "sam", type: "SAM", location: "Stockholm Plant", date: "2024-01-25", status: "completed", by: "Erik Lindqvist", riskLevel: "low", riskScore: 4 },
  { id: "ra4", template: "Job Safety Analysis (JSA)", templateId: "jsa", type: "JSA", location: "Production Floor", date: "2024-01-24", status: "completed", by: "Sarah Wilson", riskLevel: "low", riskScore: 3 },
  { id: "ra5", template: "OSA - Psykosocial Riskbedömning", templateId: "osa", type: "OSA", location: "Malmö Warehouse", date: "2024-01-22", status: "completed", by: "Anna Svensson", riskLevel: "medium", riskScore: 8 },
  { id: "ra6", template: "Arbowet Compliance Audit", templateId: "arbowet", type: "ARBOWET", location: "Rotterdam Factory", date: "2024-01-20", status: "completed", by: "Pieter de Jong", riskLevel: "high", riskScore: 15 },
];


// Mock data for inspections
const mockInspections = [
  { id: "ins1", asset: "Forklift FL-001", assetId: "asset1", template: "Heavy Machinery Inspection", date: "2024-01-28", status: "passed", by: "John Doe", issues: 0, nextDue: "2024-02-28" },
  { id: "ins2", asset: "Crane CR-003", assetId: "asset2", template: "Heavy Machinery Inspection", date: "2024-01-27", status: "failed", by: "Jane Smith", issues: 2, nextDue: "2024-02-03" },
  { id: "ins3", asset: "Safety Harness SH-012", assetId: "asset3", template: "PPE Equipment Check", date: "2024-01-26", status: "passed", by: "Mike Johnson", issues: 0, nextDue: "2024-04-26" },
  { id: "ins4", asset: "Delivery Truck DT-007", assetId: "asset4", template: "Vehicle Pre-Trip Inspection", date: "2024-01-25", status: "passed", by: "Sarah Wilson", issues: 1, nextDue: "2024-01-26" },
  { id: "ins5", asset: "Welding Machine WM-002", assetId: "asset5", template: "Electrical Equipment Check", date: "2024-01-24", status: "passed", by: "Tom Brown", issues: 0, nextDue: "2024-03-24" },
  { id: "ins6", asset: "Fire Extinguisher FE-101", assetId: "asset6", template: "Fire Safety Equipment Check", date: "2024-01-23", status: "passed", by: "Emma Davis", issues: 0, nextDue: "2024-07-23" },
];

// Industry-standard inspection templates by category
const mockInspectionTemplates = [
  { id: "it1", name: "Heavy Machinery Inspection", category: "machinery", checkpoints: 24, used: 145, status: "active", description: "Comprehensive check for forklifts, cranes, and industrial equipment" },
  { id: "it2", name: "Vehicle Pre-Trip Inspection", category: "vehicle", checkpoints: 18, used: 256, status: "active", description: "DOT-compliant pre-trip inspection for commercial vehicles" },
  { id: "it3", name: "Fire Safety Equipment Check", category: "fire_safety", checkpoints: 10, used: 189, status: "active", description: "Extinguishers, alarms, sprinklers, and emergency lighting" },
  { id: "it4", name: "PPE Equipment Check", category: "ppe", checkpoints: 8, used: 98, status: "active", description: "Harnesses, helmets, gloves, and safety footwear" },
  { id: "it5", name: "Electrical Equipment Check", category: "electrical", checkpoints: 15, used: 67, status: "active", description: "Welding machines, power tools, and electrical panels" },
  { id: "it6", name: "Scaffolding Inspection", category: "construction", checkpoints: 20, used: 34, status: "active", description: "Scaffold structure, platforms, and fall protection" },
];

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

  // Read tab from URL query params on mount
  React.useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "risk-assessment" || tabParam === "inspection" || tabParam === "checklists") {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const { items: checklistTemplatesStore } = useChecklistTemplatesStore();
  const { items: checklistSubmissionsStore } = useChecklistSubmissionsStore();
  const { items: riskEvaluations } = useRiskEvaluationsStore();
  const { items: inspections } = useAssetInspectionsStore();
  const { items: assets } = useAssetsStore();
  const { items: users } = useUsersStore();
  const { items: locations } = useLocationsStore();
  const { t, formatDate, formatNumber } = useTranslation();

  // Map store risk evaluations to the display format
  const storeRiskAssessments = React.useMemo(() => {
    return riskEvaluations.map(re => {
      const submitter = users.find(u => u.id === re.submitter_id);
      const location = locations.find(l => l.id === re.location_id);
      return {
        id: re.id,
        template: getFormTypeName(re.form_type),
        templateId: re.form_type.toLowerCase(),
        type: re.form_type.toUpperCase(),
        location: location?.name || "Unknown",
        date: re.submitted_at.split("T")[0],
        status: re.status === "reviewed" ? "completed" : re.status === "submitted" ? "in_progress" : "draft",
        by: submitter?.full_name || "Unknown",
        riskLevel: "medium" as const,
        riskScore: 0,
      };
    });
  }, [riskEvaluations, users, locations]);

  // Combine store data with mock data (use store data if available, fall back to mock)
  const combinedRiskAssessments = React.useMemo(() => {
    if (storeRiskAssessments.length > 0) {
      return storeRiskAssessments;
    }
    return mockRiskAssessments;
  }, [storeRiskAssessments]);

  // Map store inspections to the display format
  const storeInspectionsList = React.useMemo(() => {
    return inspections.map(ins => {
      const asset = assets.find(a => a.id === ins.asset_id);
      const inspector = users.find(u => u.id === ins.inspector_id);
      return {
        id: ins.id,
        asset: asset?.name || "Unknown Asset",
        assetId: ins.asset_id,
        template: "Equipment Inspection",
        date: ins.inspected_at.split("T")[0],
        status: ins.result === "pass" ? "passed" : ins.result === "fail" ? "failed" : "pending",
        by: inspector?.full_name || "Unknown",
        issues: 0, // AssetInspection doesn't track individual issues
        nextDue: "—", // No next inspection date in this type
      };
    });
  }, [inspections, assets, users]);

  // Combine store data with mock data
  const combinedInspections = React.useMemo(() => {
    if (storeInspectionsList.length > 0) {
      return storeInspectionsList;
    }
    return mockInspections;
  }, [storeInspectionsList]);

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
    { id: "inspection" as MainTabType, label: t("checklists.tabs.inspections"), icon: Wrench },
  ];

  const subTabs = [
    { id: "submissions" as SubTabType, label: "Submissions" },
    { id: "templates" as SubTabType, label: "Templates" },
  ];

  const getFilters = () => {
    const baseFilters = [
      {
        id: "status",
        label: "All statuses",
        options: [
          { value: "active", label: "Active" },
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
        status: template.is_active ? "active" : "inactive",
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
    let data = checklistSubmissionsStore
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
        };
      });
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

  const getInspectionTemplates = () => {
    let data = [...mockInspectionTemplates];
    if (statusFilter) {
      data = data.filter((item) => item.status === statusFilter);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      data = data.filter((item) => 
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      );
    }
    return data;
  };

  const getInspectionSubmissions = () => {
    let data = [...combinedInspections];
    if (statusFilter) {
      data = data.filter((item) => item.status === statusFilter);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      data = data.filter((item) => 
        item.asset.toLowerCase().includes(query) ||
        item.template.toLowerCase().includes(query)
      );
    }
    return data;
  };

  // Get data counts for each category
  const checklistTemplates = getChecklistTemplates();
  const checklistSubmissions = getChecklistSubmissions();
  const riskTemplates = getRiskTemplates();
  const riskSubmissions = getRiskSubmissions();
  const inspectionTemplates = getInspectionTemplates();
  const inspectionSubmissions = getInspectionSubmissions();

  // Calculate totals and pagination
  const getTableLength = () => {
    if (activeTab === "checklists") return subTab === "templates" ? checklistTemplates.length : checklistSubmissions.length;
    if (activeTab === "risk-assessment") return subTab === "templates" ? riskTemplates.length : riskSubmissions.length;
    if (activeTab === "inspection") return subTab === "templates" ? inspectionTemplates.length : inspectionSubmissions.length;
    return 0;
  };

  const tableLength = getTableLength();
  const totalPages = Math.ceil(tableLength / ITEMS_PER_PAGE);

  // Get paginated data
  const paginatedChecklistTemplates = checklistTemplates.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const paginatedChecklistSubmissions = checklistSubmissions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const paginatedRiskTemplates = riskTemplates.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const paginatedRiskSubmissions = riskSubmissions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const paginatedInspectionTemplates = inspectionTemplates.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const paginatedInspectionSubmissions = inspectionSubmissions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset sub tab when main tab changes
  React.useEffect(() => {
    setSubTab("submissions");
    setCurrentPage(1);
    setSearchQuery("");
    setStatusFilter("");
  }, [activeTab]);

  const getAddButtonLabel = () => {
    if (activeTab === "checklists") return "Create Checklist";
    if (activeTab === "risk-assessment") return subTab === "templates" ? "Templates are standard" : t("checklists.buttons.newAssessment");
    if (activeTab === "inspection") return subTab === "templates" ? "Create Template" : "New Inspection";
    return "Create";
  };

  const getKPIs = () => {
    if (activeTab === "checklists" && subTab === "submissions") {
      const completedThisWeek = checklistSubmissionsStore.filter(
        (submission) =>
          submission.status === "submitted" &&
          isWithinDateRange(submission.submitted_at || submission.created_at, "last_7_days")
      ).length;
      const pending = checklistSubmissionsStore.filter((submission) => submission.status === "draft").length;
      const overdue = checklistSubmissionsStore.filter(
        (submission) =>
          submission.status === "draft" &&
          !isWithinDateRange(submission.created_at, "last_30_days")
      ).length;
      const booleanResponses = checklistSubmissionsStore.flatMap((submission) =>
        submission.responses.filter((response) => typeof response.value === "boolean")
      );
      const passCount = booleanResponses.filter((response) => response.value === true).length;
      const passRate = booleanResponses.length
        ? `${Math.round((passCount / booleanResponses.length) * 100)}%`
        : "—";
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
    if (activeTab === "inspection" && subTab === "submissions") {
      const passed = combinedInspections.filter(i => i.status === "passed").length;
      const failed = combinedInspections.filter(i => i.status === "failed").length;
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard title="Total Inspections" value={combinedInspections.length} icon={ClipboardCheck} />
          <KPICard title="Due Soon" value={3} icon={Clock} />
          <KPICard title="Failed" value={failed} icon={AlertTriangle} />
          <KPICard title="Pass Rate" value={`${Math.round(passed / combinedInspections.length * 100)}%`} icon={CheckCircle} />
        </div>
      );
    }
    return null;
  };

  const handleAddButtonClick = () => {
    if (activeTab === "risk-assessment" && subTab === "submissions") {
      setShowNewAssessmentModal(true);
    } else if (activeTab === "checklists") {
      router.push(`/${company}/dashboard/checklists/new`);
    } else if (activeTab === "inspection" && subTab === "submissions") {
      router.push(`/${company}/dashboard/inspections/new`);
    } else if (activeTab === "inspection" && subTab === "templates") {
      router.push(`/${company}/dashboard/checklists/new?type=inspection`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold truncate">{t("checklists.safetyTasks")}</h1>
        <Button 
          size="sm" 
          className="gap-2"
          onClick={handleAddButtonClick}
          disabled={activeTab === "risk-assessment" && subTab === "templates"}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {getAddButtonLabel()}
        </Button>
      </div>

      {/* New Assessment Modal */}
      {showNewAssessmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold">Start New Risk Assessment</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowNewAssessmentModal(false)}>
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
              {tableLength} {subTab === "templates" ? "template" : "record"}{tableLength !== 1 ? "s" : ""}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages || 1}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {/* Checklists Templates Table */}
            {activeTab === "checklists" && subTab === "templates" && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Template</th>
                    <th className="pb-3 font-medium">Items</th>
                    <th className="hidden pb-3 font-medium md:table-cell">Category</th>
                    <th className="hidden pb-3 font-medium lg:table-cell">Used</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedChecklistTemplates.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">{t("checklists.empty.noChecklists")}</td>
                    </tr>
                  ) : (
                    paginatedChecklistTemplates.map((template) => (
                      <tr 
                        key={template.id} 
                        className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors group"
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
                          <Badge variant="outline" className="text-xs capitalize">{template.category.replace(/_/g, " ")}</Badge>
                        </td>
                        <td className="hidden py-3 lg:table-cell text-xs text-muted-foreground">{template.used} times</td>
                        <td className="py-3">
                          <Badge variant={template.status === "active" ? "success" : "secondary"} className="text-xs capitalize">
                            {template.status}
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
                        className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors group"
                        onClick={() => router.push(`/${company}/dashboard/checklists/${submission.id}`)}
                      >
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">{submission.template}</p>
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
                          <Badge variant={submission.score === "100%" ? "success" : submission.score === "-" ? "secondary" : "outline"} className="text-xs">
                            {submission.score}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <Badge variant={submission.status === "completed" ? "success" : "warning"} className="text-xs capitalize">
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
            {activeTab === "risk-assessment" && subTab === "templates" && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Template</th>
                    <th className="hidden pb-3 font-medium md:table-cell">Type</th>
                    <th className="hidden pb-3 font-medium lg:table-cell">Submissions</th>
                    <th className="pb-3 font-medium">Standard</th>
                    <th className="pb-3 font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRiskTemplates.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">{t("checklists.empty.noChecklists")}</td>
                    </tr>
                  ) : (
                    paginatedRiskTemplates.map((template) => (
                      <tr 
                        key={template.id} 
                        className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors group"
                        onClick={() => router.push(`/${company}/dashboard/risk-assessments/${template.id}`)}
                      >
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                              <FileCheck className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">{template.name}</p>
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
                        className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors group"
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
                          <Badge variant={assessment.riskLevel === "high" ? "destructive" : assessment.riskLevel === "medium" ? "warning" : "success"} className="text-xs capitalize">
                            {assessment.riskLevel} ({assessment.riskScore})
                          </Badge>
                        </td>
                        <td className="py-3">
                          <Badge variant={assessment.status === "completed" ? "success" : "warning"} className="text-xs capitalize">
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

            {/* Inspection Templates Table */}
            {activeTab === "inspection" && subTab === "templates" && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Template</th>
                    <th className="pb-3 font-medium">Category</th>
                    <th className="hidden pb-3 font-medium md:table-cell">Checkpoints</th>
                    <th className="hidden pb-3 font-medium lg:table-cell">Used</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInspectionTemplates.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">{t("checklists.empty.noChecklists")}</td>
                    </tr>
                  ) : (
                    paginatedInspectionTemplates.map((template) => (
                      <tr 
                        key={template.id} 
                        className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors group"
                        onClick={() => router.push(`/${company}/dashboard/inspections/${template.id}`)}
                      >
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                              <Wrench className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">{template.name}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1">{template.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3"><Badge variant="outline" className="text-xs capitalize">{template.category.replace("_", " ")}</Badge></td>
                        <td className="hidden py-3 md:table-cell text-xs">{template.checkpoints} {t("checklists.labels.items")}</td>
                        <td className="hidden py-3 lg:table-cell text-xs text-muted-foreground">{template.used} times</td>
                        <td className="py-3">
                          <Badge variant={template.status === "active" ? "success" : "secondary"} className="text-xs capitalize">{template.status}</Badge>
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

            {/* Inspection Submissions Table */}
            {activeTab === "inspection" && subTab === "submissions" && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Asset</th>
                    <th className="pb-3 font-medium">Template</th>
                    <th className="hidden pb-3 font-medium md:table-cell">By</th>
                    <th className="hidden pb-3 font-medium lg:table-cell">Next Due</th>
                    <th className="pb-3 font-medium">Issues</th>
                    <th className="pb-3 font-medium">Result</th>
                    <th className="pb-3 font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInspectionSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">{t("checklists.empty.noActiveAssets")}</td>
                    </tr>
                  ) : (
                    paginatedInspectionSubmissions.map((inspection) => (
                      <tr 
                        key={inspection.id} 
                        className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors group"
                        onClick={() => router.push(`/${company}/dashboard/inspections/${inspection.id}`)}
                      >
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                              <Wrench className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">{inspection.asset}</p>
                              <p className="text-xs text-muted-foreground">{inspection.date}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-xs">{inspection.template}</td>
                        <td className="hidden py-3 md:table-cell text-xs text-muted-foreground">{inspection.by}</td>
                        <td className="hidden py-3 lg:table-cell text-xs text-muted-foreground">{inspection.nextDue}</td>
                        <td className="py-3 text-xs">
                          {inspection.issues > 0 ? (
                            <Badge variant="warning" className="text-xs">{inspection.issues} issue{inspection.issues > 1 ? "s" : ""}</Badge>
                          ) : (
                            <span className="text-muted-foreground">None</span>
                          )}
                        </td>
                        <td className="py-3">
                          <Badge variant={inspection.status === "passed" ? "success" : "destructive"} className="text-xs capitalize">{inspection.status}</Badge>
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
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => (
                  <Button key={i + 1} variant={currentPage === i + 1 ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(i + 1)}>
                    {i + 1}
                  </Button>
                ))}
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
    <React.Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }
    >
      <ChecklistsPageContent />
    </React.Suspense>
  );
}
