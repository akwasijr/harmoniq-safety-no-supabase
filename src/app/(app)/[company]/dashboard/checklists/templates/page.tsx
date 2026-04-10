"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCompanyData } from "@/hooks/use-company-data";
import { useCompanyParam } from "@/hooks/use-company-param";
import { useTranslation } from "@/i18n";
import { useCompanyStore } from "@/stores/company-store";
import { useChecklistTemplatesStore } from "@/stores/checklists-store";
import { useToast } from "@/components/ui/toast";
import { RoleGuard } from "@/components/auth/role-guard";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import {
  getAllTemplatesForCountry,
  getTemplatesForCountry,
  INDUSTRY_METADATA,
  resolveTemplateRegulation,
} from "@/data/industry-templates";
import {
  activateIndustryTemplate,
  cloneChecklistTemplate,
  isTemplateActivated,
  getActivatedTemplate,
} from "@/lib/template-activation";
import type {
  ChecklistTemplate,
  Country,
  IndustryCode,
  IndustryChecklistTemplate,
} from "@/types";

import {
  Search,
  ChevronDown,
  ChevronUp,
  Check,
  Plus,
  FileText,
  Shield,
  Clock,
  Filter,
  HardHat,
  Factory,
  Droplets,
  Stethoscope,
  Warehouse as WarehouseIcon,
  Pickaxe,
  UtensilsCrossed,
  BatteryCharging,
  Truck,
  GraduationCap,
  Plane,
  Send,
  Eye,
  ClipboardCheck,
  Library,
  Upload,
  Download,
  X,
} from "lucide-react";
import { parseCsv } from "@/lib/csv";
import type { ChecklistItem } from "@/types";

// ---------------------------------------------------------------------------
// Industry icon mapping
// ---------------------------------------------------------------------------
const INDUSTRY_ICONS: Record<
  IndustryCode,
  React.ComponentType<{ className?: string }>
> = {
  construction: HardHat,
  manufacturing: Factory,
  oil_gas: Droplets,
  healthcare: Stethoscope,
  warehousing: WarehouseIcon,
  mining: Pickaxe,
  food_beverage: UtensilsCrossed,
  utilities: BatteryCharging,
  transportation: Truck,
  education: GraduationCap,
  airports: Plane,
};

// ---------------------------------------------------------------------------
// Frequency label helper
// ---------------------------------------------------------------------------
const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  per_event: "Per event",
  per_shift: "Per shift",
  continuous: "Continuous",
};

// ---------------------------------------------------------------------------
// Item type badge variant helper
// ---------------------------------------------------------------------------
function itemTypeBadge(type: string) {
  const map: Record<string, string> = {
    yes_no_na: "Yes / No / NA",
    pass_fail: "Pass / Fail",
    rating: "Rating",
    text: "Text",
    number: "Number",
    photo: "Photo",
  };
  return map[type] ?? type;
}

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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function TemplateLibraryPage() {
  const company = useCompanyParam();
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();

  const { items: companies } = useCompanyStore();
  const currentCompany = companies.find((c) => c.slug === company) || companies[0];
  const companyIndustry = currentCompany?.industry;

  const { checklistTemplates: existingTemplates } = useCompanyData();
  const { add: addTemplate } = useChecklistTemplatesStore();

  // ---- State ----------------------------------------------------------------
  const [selectedIndustry, setSelectedIndustry] = React.useState<
    IndustryCode | "all"
  >("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [expandedTemplate, setExpandedTemplate] = React.useState<string | null>(
    null,
  );
  const [showIndustryDropdown, setShowIndustryDropdown] = React.useState(false);
  const [showTemplateImport, setShowTemplateImport] = React.useState(false);
  const [templateImportData, setTemplateImportData] = React.useState<ParsedTemplateImport[] | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Default to company's industry when available
  React.useEffect(() => {
    if (companyIndustry) setSelectedIndustry(companyIndustry);
  }, [companyIndustry]);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowIndustryDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ---- Derived data ---------------------------------------------------------
  const companyCountry = currentCompany?.country ?? "US";

  const filteredTemplates = React.useMemo(() => {
    let templates =
      selectedIndustry === "all"
        ? getAllTemplatesForCountry(companyCountry)
        : getTemplatesForCountry(selectedIndustry, companyCountry);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      templates = templates.filter(
        (tmpl) =>
          t(tmpl.name_key).toLowerCase().includes(q) ||
          t(tmpl.description_key).toLowerCase().includes(q) ||
          resolveTemplateRegulation(tmpl, companyCountry).toLowerCase().includes(q) ||
          tmpl.tags.some((tag) => tag.toLowerCase().includes(q)),
      );
    }

    return templates;
  }, [selectedIndustry, searchQuery, t, companyCountry]);

  const groupedTemplates = React.useMemo(() => {
    const groups: Record<string, IndustryChecklistTemplate[]> = {};
    filteredTemplates.forEach((tmpl) => {
      if (!groups[tmpl.industry]) groups[tmpl.industry] = [];
      groups[tmpl.industry].push(tmpl);
    });
    return Object.entries(groups).sort(([a], [b]) => {
      if (a === companyIndustry) return -1;
      if (b === companyIndustry) return 1;
      return a.localeCompare(b);
    });
  }, [filteredTemplates, companyIndustry]);

  // ---- Handlers -------------------------------------------------------------
  const handleActivate = (industryTemplate: IndustryChecklistTemplate, mode: "edit" | "push") => {
    if (!currentCompany) return;
    const newTemplate = activateIndustryTemplate(
      industryTemplate,
      currentCompany.id,
      currentCompany.country,
      t,
    );
    if (mode === "push") {
      newTemplate.publish_status = "published";
      newTemplate.is_active = true;
    }
    addTemplate(newTemplate);
    if (mode === "push") {
      toast(`"${newTemplate.name}" pushed to field workers`, "success");
    } else {
      toast("Template saved as draft", "success");
      router.push(`/${company}/dashboard/checklists/${newTemplate.id}`);
    }
  };

  const handleCloneFromActive = (template: ChecklistTemplate) => {
    const clonedTemplate = cloneChecklistTemplate(template);
    addTemplate(clonedTemplate);
    toast("Active template cloned as draft", "success");
    router.push(`/${company}/dashboard/checklists/${clonedTemplate.id}`);
  };

  // ---- Industry options for dropdown ----------------------------------------
  const industryOptions = React.useMemo(() => {
    const codes = Object.keys(INDUSTRY_METADATA) as IndustryCode[];
    // Put company industry first
    return codes.sort((a, b) => {
      if (a === companyIndustry) return -1;
      if (b === companyIndustry) return 1;
      return t(INDUSTRY_METADATA[a].label_key).localeCompare(
        t(INDUSTRY_METADATA[b].label_key),
      );
    });
  }, [companyIndustry, t]);

  // ---- Render ---------------------------------------------------------------
  return (
    <RoleGuard requiredPermission="checklists.create_templates">
      <div className="space-y-6">
        {/* Page Title */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Checklist Templates</h1>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowTemplateImport(true)}>
            <Upload className="h-4 w-4" />
            Import Template
          </Button>
        </div>

        {/* Top-level Tabs: My Templates / Template Library */}
        <div className="border-b">
          <div className="flex gap-4">
            <Link
              href={`/${company}/dashboard/checklists/my-templates`}
              className="flex items-center gap-2 py-3 px-1 text-sm font-medium transition-colors relative whitespace-nowrap text-muted-foreground hover:text-foreground"
            >
              <ClipboardCheck className="h-4 w-4 shrink-0" />
              {t("industry_templates._ui.myTemplates")}
            </Link>
            <button
              className={cn(
                "flex items-center gap-2 py-3 px-1 text-sm font-medium transition-colors relative whitespace-nowrap",
                "text-primary"
              )}
            >
              <Library className="h-4 w-4 shrink-0" />
              {t("industry_templates._ui.templateLibrary")}
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            </button>
            <Link
              href={`/${company}/dashboard/checklists/procedures`}
              className="flex items-center gap-2 py-3 px-1 text-sm font-medium transition-colors relative whitespace-nowrap text-muted-foreground hover:text-foreground"
            >
              <FileText className="h-4 w-4 shrink-0" />
              Procedure Templates
            </Link>
          </div>
        </div>

        {/* Filter bar */}
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Industry dropdown */}
            <div ref={dropdownRef} className="relative">
              <Button
                variant="outline"
                className="w-full justify-between gap-2 sm:w-[220px]"
                onClick={() => setShowIndustryDropdown((prev) => !prev)}
              >
                <span className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">
                    {selectedIndustry === "all"
                      ? t("industry_templates._ui.allIndustries")
                      : t(INDUSTRY_METADATA[selectedIndustry].label_key)}
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>

              {showIndustryDropdown && (
                <div className="absolute left-0 z-20 mt-1 w-full min-w-[240px] rounded-md border bg-popover p-1 shadow-md">
                  <button
                    className={cn(
                      "flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent",
                      selectedIndustry === "all" && "bg-accent font-medium",
                    )}
                    onClick={() => {
                      setSelectedIndustry("all");
                      setShowIndustryDropdown(false);
                    }}
                  >
                    {t("industry_templates._ui.allIndustries")}
                  </button>
                  {industryOptions.map((code) => {
                    const Icon = INDUSTRY_ICONS[code];
                    const isRecommended = code === companyIndustry;
                    return (
                      <button
                        key={code}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent",
                          selectedIndustry === code && "bg-accent font-medium",
                        )}
                        onClick={() => {
                          setSelectedIndustry(code);
                          setShowIndustryDropdown(false);
                        }}
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 text-left">
                          {t(INDUSTRY_METADATA[code].label_key)}
                        </span>
                        {isRecommended && (
                          <Badge variant="secondary" className="text-xs">
                            {t("industry_templates._ui.recommended")}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("industry_templates._ui.searchTemplates")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {/* Results summary */}
        <p className="text-sm text-muted-foreground">
          {t("industry_templates._ui.templateCount", { count: filteredTemplates.length })}
        </p>

        {/* Template groups */}
        {groupedTemplates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              {t("industry_templates._ui.noTemplatesFound")}
            </p>
          </div>
        )}

        <div className="space-y-8">
          {groupedTemplates.map(([industryCode, templates]) => {
            const code = industryCode as IndustryCode;
            const Icon = INDUSTRY_ICONS[code];
            const meta = INDUSTRY_METADATA[code];
            const isRecommended = code === companyIndustry;

            return (
              <section key={code} className="space-y-3">
                {/* Industry group header */}
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-base font-semibold">
                    {t(meta.label_key)}
                  </h2>
                  <span className="text-sm text-muted-foreground">
                    ({templates.length})
                  </span>
                  {isRecommended && (
                    <Badge variant="secondary" className="text-xs">
                      {t("industry_templates._ui.recommended")}
                    </Badge>
                  )}
                </div>

                {/* Template cards grid */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {templates.map((tmpl) => {
                    const activatedTemplate = getActivatedTemplate(
                      tmpl.id,
                      existingTemplates,
                    );
                    return (
                    <TemplateCard
                      key={tmpl.id}
                      template={tmpl}
                      expanded={expandedTemplate === tmpl.id}
                      onToggleExpand={() =>
                        setExpandedTemplate(
                          expandedTemplate === tmpl.id ? null : tmpl.id,
                        )
                      }
                      alreadyActivated={isTemplateActivated(tmpl.id, existingTemplates)}
                      activatedTemplate={activatedTemplate}
                      companySlug={company}
                      companyCountry={currentCompany?.country ?? "US"}
                      onActivate={(mode) => handleActivate(tmpl, mode)}
                      onCloneFromActive={
                        activatedTemplate
                          ? () => handleCloneFromActive(activatedTemplate)
                          : undefined
                      }
                      t={t}
                    />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {/* Template Import Modal */}
        {showTemplateImport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setShowTemplateImport(false); setTemplateImportData(null); }}>
            <div className="relative w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto rounded-lg bg-background p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Import checklist templates</h2>
                <button onClick={() => { setShowTemplateImport(false); setTemplateImportData(null); }} className="text-muted-foreground hover:text-foreground">
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
                          addTemplate({
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
                        setShowTemplateImport(false);
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
    </RoleGuard>
  );
}

// ---------------------------------------------------------------------------
// Template Card
// ---------------------------------------------------------------------------
interface TemplateCardProps {
  template: IndustryChecklistTemplate;
  expanded: boolean;
  onToggleExpand: () => void;
  alreadyActivated: boolean;
  activatedTemplate?: ChecklistTemplate;
  companySlug: string;
  companyCountry: Country;
  onActivate: (mode: "edit" | "push") => void;
  onCloneFromActive?: () => void;
  t: (key: string) => string;
}

function TemplateCard({
  template,
  expanded,
  onToggleExpand,
  alreadyActivated,
  activatedTemplate,
  companySlug,
  companyCountry,
  onActivate,
  onCloneFromActive,
  t,
}: TemplateCardProps) {
  return (
    <Card
      className={cn(
        "transition-colors hover:bg-muted/30",
        expanded && "ring-1 ring-border",
      )}
    >
      <CardContent className="p-4 space-y-3">
        {/* Top row: name + expand toggle */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <button
              onClick={onToggleExpand}
              className="text-left w-full group"
            >
              <h3 className="text-sm font-semibold leading-tight group-hover:text-primary transition-colors">
                {t(template.name_key)}
              </h3>
            </button>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {t(template.description_key)}
            </p>
          </div>
          <button
            onClick={onToggleExpand}
            className="shrink-0 p-1 rounded hover:bg-muted transition-colors"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </div>

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-1.5">
          {template.regulation && (
            <Badge variant="outline" className="text-xs gap-1">
              <Shield className="h-3 w-3" />
              {resolveTemplateRegulation(template, companyCountry)}
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs gap-1">
            <Clock className="h-3 w-3" />
            {t(`industry_templates._frequencies.${template.frequency}`)}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {template.items.length} {t("industry_templates._ui.items")}
          </span>
        </div>

        {/* Collapsed: show expand prompt or activated badge */}
        {!expanded && (
          <div className="flex items-center justify-between pt-1">
            {alreadyActivated ? (
              <div className="flex items-center gap-2">
                <Badge variant="active" className="text-xs gap-1">
                  <Check className="h-3 w-3" />
                  {t("industry_templates._ui.alreadyActivated")}
                </Badge>
              </div>
            ) : (
              <button
                onClick={onToggleExpand}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Eye className="h-3 w-3" />
                {t("industry_templates._ui.previewItems")}
              </button>
            )}
          </div>
        )}

        {/* Expanded: item list + action buttons */}
        {expanded && (
          <div className="border-t pt-3 mt-1 space-y-3">
            <p className="text-xs font-medium text-muted-foreground">
              {t("industry_templates._ui.previewItems")}
            </p>
            <ol className="space-y-1">
              {template.items.map((item, idx) => (
                <li key={item.key} className="flex items-start gap-2 text-xs">
                  <span className="shrink-0 w-5 text-right text-muted-foreground tabular-nums">
                    {idx + 1}.
                  </span>
                  <span className="flex-1 text-foreground">
                    {t(item.question_key)}
                  </span>
                  <Badge
                    variant="outline"
                    className="shrink-0 text-[10px] px-1.5 py-0"
                  >
                    {itemTypeBadge(item.type)}
                  </Badge>
                </li>
              ))}
            </ol>

            {/* Action buttons */}
            <div className="border-t pt-3">
              {alreadyActivated ? (
                <div className="flex items-center justify-between">
                  <Badge variant="active" className="text-xs gap-1">
                  <Check className="h-3 w-3" />
                  Already active
                </Badge>
                  <div className="flex items-center gap-2">
                    {onCloneFromActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onCloneFromActive}
                        className="gap-1.5 text-xs"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        {t("industry_templates._ui.editRefine")}
                      </Button>
                    )}
                    {activatedTemplate && (
                      <Link href={`/${companySlug}/dashboard/checklists/${activatedTemplate.id}`}>
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                          <Eye className="h-3.5 w-3.5" />
                          {t("industry_templates._ui.viewMyTemplates")}
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onToggleExpand}
                    className="text-xs"
                  >
                    {t("common.close")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onActivate("edit")}
                    className="flex-1 gap-1.5 text-xs"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    {t("industry_templates._ui.editRefine")}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onActivate("push")}
                    className="flex-1 gap-1.5 text-xs"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {t("industry_templates._ui.pushAsIs")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
