"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCompanyParam } from "@/hooks/use-company-param";
import {
  ClipboardCheck,
  Plus,
  Library,
  Search,
  MoreHorizontal,
  Pencil,
  Send,
  Archive,
  RotateCcw,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  CheckCircle,
  FileText,
  ShieldAlert,
  Upload,
  Download,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useCompanyData } from "@/hooks/use-company-data";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyStore } from "@/stores/company-store";
import { useToast } from "@/components/ui/toast";
import { useTranslation } from "@/i18n";
import { RoleGuard } from "@/components/auth/role-guard";
import type { ChecklistTemplate, ChecklistItem, Country } from "@/types";
import { cloneChecklistTemplate, getTemplatePublishStatus } from "@/lib/template-activation";
import { parseCsv } from "@/lib/csv";
import {
  resolveRiskAssessmentCatalogCountry,
} from "@/lib/country-config";

type StatusFilter = "all" | "draft" | "published" | "archived";
type MyTemplatesSubTab = "checklists" | "risk-assessments";

// ---------------------------------------------------------------------------
// Risk assessment form definitions per country catalog
// ---------------------------------------------------------------------------
interface RiskFormDef {
  id: string;
  name: string;
  description: string;
  regulation: string;
}

const RISK_FORMS: Record<string, RiskFormDef[]> = {
  US: [
    { id: "jha", name: "Job Hazard Analysis (JHA)", description: "Identify hazards for specific job tasks and determine controls to mitigate risk.", regulation: "OSHA" },
    { id: "jsa", name: "Job Safety Analysis (JSA)", description: "Break down job steps and analyze safety risks for each task sequence.", regulation: "OSHA" },
  ],
  NL: [
    { id: "rie", name: "RI&E Assessment", description: "Risico-Inventarisatie en -Evaluatie: Identify and evaluate workplace risks per Arbowet.", regulation: "Arbowet" },
    { id: "arbowet", name: "Arbowet Compliance Audit", description: "Audit compliance with Dutch occupational health and safety regulations.", regulation: "Arbowet" },
  ],
  SE: [
    { id: "sam", name: "SAM Assessment", description: "Systematiskt Arbetsmiljöarbete: Systematic work environment management assessment.", regulation: "AFS" },
    { id: "osa", name: "OSA Assessment", description: "Organisatorisk och Social Arbetsmiljö: Organizational and social work environment assessment.", regulation: "AFS" },
  ],
};

// ---------------------------------------------------------------------------
// Template import helpers (moved from checklists page)
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

function MyTemplatesContent() {
  const router = useRouter();
  const company = useCompanyParam();
  const { t } = useTranslation();
  const { checklistTemplates: templates, checklistSubmissions: submissions, riskEvaluations, stores } = useCompanyData();
  const { add: addItem, update: updateItem, remove: removeItem } = stores.checklistTemplates;
  const { currentCompany } = useAuth();
  const { update: updateCompany } = useCompanyStore();
  const { toast } = useToast();

  const [subTab, setSubTab] = React.useState<MyTemplatesSubTab>("checklists");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [menuOpenId, setMenuOpenId] = React.useState<string | null>(null);
  const [showImportModal, setShowImportModal] = React.useState(false);
  const [templateImportData, setTemplateImportData] = React.useState<ParsedTemplateImport[] | null>(null);

  // Reset filters when sub-tab changes
  React.useEffect(() => {
    setStatusFilter("all");
    setSearchQuery("");
    setSelectedIds(new Set());
    setMenuOpenId(null);
  }, [subTab]);

  // -----------------------------------------------------------------------
  // Checklist templates logic
  // -----------------------------------------------------------------------
  const companyTemplates = templates;

  const filteredTemplates = companyTemplates.filter((t) => {
    const status = getTemplatePublishStatus(t);
    const matchesStatus = statusFilter === "all" || statusFilter === status;
    const matchesSearch =
      !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const statusCounts = {
    all: companyTemplates.length,
    draft: companyTemplates.filter((t) => getTemplatePublishStatus(t) === "draft").length,
    published: companyTemplates.filter((t) => getTemplatePublishStatus(t) === "published").length,
    archived: companyTemplates.filter((t) => getTemplatePublishStatus(t) === "archived").length,
  };

  const getSubmissionCount = (templateId: string) =>
    submissions.filter((s) => s.template_id === templateId).length;

  const getStatusBadge = (template: ChecklistTemplate) => {
    const status = getTemplatePublishStatus(template);
    switch (status) {
      case "published":
        return <Badge variant="active" className="text-xs gap-1"><CheckCircle className="h-3 w-3" />Active</Badge>;
      case "draft":
        return <Badge variant="secondary" className="text-xs gap-1"><FileText className="h-3 w-3" />Draft</Badge>;
      case "archived":
        return <Badge variant="archived" className="text-xs gap-1"><Archive className="h-3 w-3" />Archived</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">Unknown</Badge>;
    }
  };

  const handlePublish = (template: ChecklistTemplate) => {
    updateItem(template.id, { publish_status: "published", is_active: true, updated_at: new Date().toISOString() });
  };

  const handleUnpublish = (template: ChecklistTemplate) => {
    updateItem(template.id, { publish_status: "draft", is_active: false, updated_at: new Date().toISOString() });
  };

  const handleArchive = (template: ChecklistTemplate) => {
    updateItem(template.id, { publish_status: "archived", is_active: false, updated_at: new Date().toISOString() });
  };

  const handleRestore = (template: ChecklistTemplate) => {
    updateItem(template.id, { publish_status: "draft", is_active: false, updated_at: new Date().toISOString() });
  };

  const handleDuplicate = (template: ChecklistTemplate) => {
    const copy = cloneChecklistTemplate(template);
    addItem(copy);
    router.push(`/${company}/dashboard/checklists/${copy.id}`);
    setMenuOpenId(null);
  };

  const handleDelete = (template: ChecklistTemplate) => {
    if (confirm(`Delete "${template.name}" permanently? This cannot be undone.`)) {
      removeItem(template.id);
    }
    setMenuOpenId(null);
  };

  const handleBulkPublish = () => {
    selectedIds.forEach((id) => {
      const t = templates.find((x) => x.id === id);
      if (t && getTemplatePublishStatus(t) !== "published") {
        updateItem(id, { publish_status: "published", is_active: true, updated_at: new Date().toISOString() });
      }
    });
    setSelectedIds(new Set());
  };

  const handleBulkArchive = () => {
    selectedIds.forEach((id) => {
      updateItem(id, { publish_status: "archived", is_active: false, updated_at: new Date().toISOString() });
    });
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTemplates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTemplates.map((t) => t.id)));
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  const statusTabs: { id: StatusFilter; label: string }[] = [
    { id: "all", label: `${t("common.all")} (${statusCounts.all})` },
    { id: "draft", label: `${t("industry_templates._ui.draft")} (${statusCounts.draft})` },
    { id: "published", label: `${t("industry_templates._ui.published")} (${statusCounts.published})` },
    { id: "archived", label: `${t("industry_templates._ui.archived")} (${statusCounts.archived})` },
  ];

  // -----------------------------------------------------------------------
  // Risk assessment forms logic
  // -----------------------------------------------------------------------
  const companyCountry = (currentCompany?.country as Country) || "US";
  const catalogCountry = resolveRiskAssessmentCatalogCountry(companyCountry);
  const riskForms = RISK_FORMS[catalogCountry] || RISK_FORMS.US;

  const toggleAssessmentVisibility = React.useCallback((formId: string) => {
    if (!currentCompany) return;
    const hidden = currentCompany.hidden_assessment_types || [];
    const isHidden = hidden.includes(formId);
    const updated = isHidden
      ? hidden.filter((id: string) => id !== formId)
      : [...hidden, formId];
    updateCompany(currentCompany.id, { hidden_assessment_types: updated });
    toast(isHidden ? "Assessment form activated" : "Assessment form deactivated");
  }, [currentCompany, updateCompany, toast]);

  const isAssessmentHidden = React.useCallback((formId: string) => {
    return (currentCompany?.hidden_assessment_types || []).includes(formId);
  }, [currentCompany?.hidden_assessment_types]);

  const getRiskSubmissionCount = (formId: string) =>
    riskEvaluations.filter((re) => re.form_type.toLowerCase() === formId.toLowerCase()).length;

  const filteredRiskForms = riskForms.filter((form) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return form.name.toLowerCase().includes(query) || form.description.toLowerCase().includes(query) || form.regulation.toLowerCase().includes(query);
  });

  return (
    <div className="space-y-6">
      {/* Page Title + Actions */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">My Templates</h1>
        <div className="flex items-center gap-2">
          {subTab === "checklists" && (
            <>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowImportModal(true)}>
                <Upload className="h-4 w-4" />
                Import
              </Button>
              <Link href={`/${company}/dashboard/checklists/new`}>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t("industry_templates._ui.createTemplate")}
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Top-level Tabs: My Templates / Template Library / Procedure Templates */}
      <div className="border-b">
        <div className="flex gap-4">
          <button
            className={cn(
              "flex items-center gap-2 py-3 px-1 text-sm font-medium transition-colors relative whitespace-nowrap",
              "text-primary"
            )}
          >
            <ClipboardCheck className="h-4 w-4 shrink-0" />
            {t("industry_templates._ui.myTemplates")}
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          </button>
          <Link
            href={`/${company}/dashboard/checklists/templates`}
            className="flex items-center gap-2 py-3 px-1 text-sm font-medium transition-colors relative whitespace-nowrap text-muted-foreground hover:text-foreground"
          >
            <Library className="h-4 w-4 shrink-0" />
            {t("industry_templates._ui.templateLibrary")}
          </Link>
          <Link
            href={`/${company}/dashboard/checklists/procedures`}
            className="flex items-center gap-2 py-3 px-1 text-sm font-medium transition-colors relative whitespace-nowrap text-muted-foreground hover:text-foreground"
          >
            <FileText className="h-4 w-4 shrink-0" />
            Procedure Templates
          </Link>
        </div>
      </div>

      {/* Sub-tabs: Checklists / Risk Assessments */}
      <div className="flex gap-2">
        <Button
          variant={subTab === "checklists" ? "default" : "outline"}
          size="sm"
          className="gap-2"
          onClick={() => setSubTab("checklists")}
        >
          <ClipboardCheck className="h-4 w-4" />
          Checklists
        </Button>
        <Button
          variant={subTab === "risk-assessments" ? "default" : "outline"}
          size="sm"
          className="gap-2"
          onClick={() => setSubTab("risk-assessments")}
        >
          <ShieldAlert className="h-4 w-4" />
          Risk Assessments
        </Button>
      </div>

      {/* ============================================================== */}
      {/* CHECKLISTS SUB-TAB */}
      {/* ============================================================== */}
      {subTab === "checklists" && (
        <>
          {/* Status Sub-tabs */}
          <div className="flex items-center gap-2">
            {statusTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setStatusFilter(tab.id); setSelectedIds(new Set()); }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  statusFilter === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search + Bulk Actions */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("industry_templates._ui.searchTemplates")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={handleBulkPublish}>
                  <Send className="h-3.5 w-3.5" />Push Selected
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={handleBulkArchive}>
                  <Archive className="h-3.5 w-3.5" />Archive Selected
                </Button>
              </div>
            )}
          </div>

          {/* Template List */}
          <Card>
            <CardContent className="p-0">
              {filteredTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <ClipboardCheck className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium">{t("industry_templates._ui.noTemplatesFound")}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("industry_templates._ui.browseTemplates")}
                  </p>
                  <Link href={`/${company}/dashboard/checklists/templates`}>
                    <Button variant="outline" size="sm" className="mt-4 gap-2">
                      <Library className="h-3.5 w-3.5" />{t("industry_templates._ui.templateLibrary")}
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-3 pl-4 pt-3 w-8">
                          <input
                            type="checkbox"
                            checked={selectedIds.size === filteredTemplates.length && filteredTemplates.length > 0}
                            onChange={toggleSelectAll}
                            className="rounded border-border"
                          />
                        </th>
                        <th className="pb-3 pt-3 font-medium">Template</th>
                        <th className="pb-3 pt-3 font-medium">Items</th>
                        <th className="hidden pb-3 pt-3 font-medium md:table-cell">Category</th>
                        <th className="hidden pb-3 pt-3 font-medium lg:table-cell">Used</th>
                        <th className="pb-3 pt-3 font-medium">Status</th>
                        <th className="hidden pb-3 pt-3 font-medium lg:table-cell">Updated</th>
                        <th className="pb-3 pt-3 pr-4 font-medium w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTemplates.map((template) => {
                        const subCount = getSubmissionCount(template.id);
                        const status = getTemplatePublishStatus(template);
                        const category = (template as unknown as Record<string, unknown>).category as string || "general";

                        return (
                          <tr
                            key={template.id}
                            className="border-b last:border-0 hover:bg-muted/50 transition-colors group"
                          >
                            <td className="py-3 pl-4 w-8">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(template.id)}
                                onChange={() => toggleSelect(template.id)}
                                className="rounded border-border"
                              />
                            </td>
                            <td
                              className="py-3 cursor-pointer"
                              onClick={() => router.push(`/${company}/dashboard/checklists/${template.id}`)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">
                                  <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium truncate group-hover:text-primary transition-colors">{template.name}</p>
                                  <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                                    {template.description || "No description"}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 text-xs">{template.items?.length || 0} items</td>
                            <td className="hidden py-3 md:table-cell">
                              <Badge variant="outline" className="text-xs">{category.replace(/_/g, " ")}</Badge>
                            </td>
                            <td className="hidden py-3 lg:table-cell text-xs text-muted-foreground">{subCount} times</td>
                            <td className="py-3">
                              {getStatusBadge(template)}
                            </td>
                            <td className="hidden py-3 lg:table-cell text-xs text-muted-foreground">
                              {formatDate(template.updated_at)}
                            </td>
                            <td className="py-3 pr-4">
                              <div className="relative">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === template.id ? null : template.id); }}
                                  className="p-1 rounded hover:bg-muted"
                                >
                                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                </button>
                                {menuOpenId === template.id && (
                                  <>
                                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpenId(null)} />
                                    <div className="absolute right-0 top-8 z-50 w-48 rounded-md border bg-popover p-1 shadow-md">
                                      <button
                                        className="flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-sm hover:bg-accent"
                                        onClick={() => { router.push(`/${company}/dashboard/checklists/${template.id}`); setMenuOpenId(null); }}
                                      >
                                        <Pencil className="h-3.5 w-3.5" />Edit
                                      </button>
                                      {status !== "published" && (
                                        <button
                                          className="flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-sm hover:bg-accent"
                                          onClick={() => { handlePublish(template); setMenuOpenId(null); }}
                                        >
                                          <Send className="h-3.5 w-3.5" />Push to field app
                                        </button>
                                      )}
                                      {status === "published" && (
                                        <button
                                          className="flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-sm hover:bg-accent"
                                          onClick={() => { handleUnpublish(template); setMenuOpenId(null); }}
                                        >
                                          <Eye className="h-3.5 w-3.5" />Unpublish
                                        </button>
                                      )}
                                      <button
                                        className="flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-sm hover:bg-accent"
                                        onClick={() => { handleDuplicate(template); }}
                                      >
                                        <Copy className="h-3.5 w-3.5" />Duplicate
                                      </button>
                                      {status !== "archived" ? (
                                        <button
                                          className="flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-sm hover:bg-accent"
                                          onClick={() => { handleArchive(template); setMenuOpenId(null); }}
                                        >
                                          <Archive className="h-3.5 w-3.5" />Archive
                                        </button>
                                      ) : (
                                        <button
                                          className="flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-sm hover:bg-accent"
                                          onClick={() => { handleRestore(template); setMenuOpenId(null); }}
                                        >
                                          <RotateCcw className="h-3.5 w-3.5" />Restore
                                        </button>
                                      )}
                                      <div className="my-1 border-t" />
                                      <button
                                        className="flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDelete(template)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />Delete permanently
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ============================================================== */}
      {/* RISK ASSESSMENTS SUB-TAB */}
      {/* ============================================================== */}
      {subTab === "risk-assessments" && (
        <>
          {/* Search */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assessment forms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <p className="text-sm text-muted-foreground ml-auto">
              Country: <span className="font-medium text-foreground">{companyCountry}</span>
            </p>
          </div>

          {/* Info */}
          <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Risk assessment forms are determined by your company&apos;s country ({companyCountry}).
              Toggle forms on or off to control which ones appear in the field app.
            </p>
          </div>

          {/* Risk Assessment Forms Table */}
          <Card>
            <CardContent className="p-0">
              {filteredRiskForms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <ShieldAlert className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium">No assessment forms found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    No forms match your search.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-3 pl-4 pt-3 font-medium">Assessment Form</th>
                        <th className="pb-3 pt-3 font-medium">Regulation</th>
                        <th className="hidden pb-3 pt-3 font-medium md:table-cell">Form Type</th>
                        <th className="hidden pb-3 pt-3 font-medium lg:table-cell">Submissions</th>
                        <th className="pb-3 pt-3 font-medium">Status</th>
                        <th className="pb-3 pt-3 pr-4 font-medium w-28 text-right">Active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRiskForms.map((form) => {
                        const hidden = isAssessmentHidden(form.id);
                        const subCount = getRiskSubmissionCount(form.id);
                        return (
                          <tr
                            key={form.id}
                            className={cn(
                              "border-b last:border-0 hover:bg-muted/50 transition-colors",
                              hidden && "opacity-60"
                            )}
                          >
                            <td className="py-3 pl-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">
                                  <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium">{form.name}</p>
                                  <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                                    {form.description}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3">
                              <Badge variant="outline" className="text-xs">{form.regulation}</Badge>
                            </td>
                            <td className="hidden py-3 md:table-cell">
                              <Badge variant="secondary" className="text-xs uppercase">{form.id}</Badge>
                            </td>
                            <td className="hidden py-3 lg:table-cell text-xs text-muted-foreground">
                              {subCount} submission{subCount !== 1 ? "s" : ""}
                            </td>
                            <td className="py-3">
                              {hidden ? (
                                <Badge variant="secondary" className="text-xs gap-1">
                                  <EyeOff className="h-3 w-3" />Hidden
                                </Badge>
                              ) : (
                                <Badge variant="active" className="text-xs gap-1">
                                  <Eye className="h-3 w-3" />Visible
                                </Badge>
                              )}
                            </td>
                            <td className="py-3 pr-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Switch
                                  checked={!hidden}
                                  onCheckedChange={() => toggleAssessmentVisibility(form.id)}
                                  aria-label={hidden ? `Activate ${form.name}` : `Deactivate ${form.name}`}
                                />
                                <span className="text-[11px] text-muted-foreground hidden sm:inline w-6">
                                  {hidden ? "Off" : "On"}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ============================================================== */}
      {/* IMPORT TEMPLATE MODAL */}
      {/* ============================================================== */}
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
                      let importedTemplates: ParsedTemplateImport[];
                      if (file.name.endsWith(".json") || text.trim().startsWith("[") || text.trim().startsWith("{")) {
                        importedTemplates = parseTemplateJSON(text);
                      } else {
                        const data = await parseCsv(file);
                        if (data.rows.length === 0) { toast("File is empty"); return; }
                        importedTemplates = parseTemplateCSV(data);
                      }
                      if (importedTemplates.length === 0) { toast("No templates found in file"); return; }
                      setTemplateImportData(importedTemplates);
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
    </div>
  );
}

export default function MyTemplatesPage() {
  return (
    <RoleGuard requiredPermission="checklists.view">
      <MyTemplatesContent />
    </RoleGuard>
  );
}
