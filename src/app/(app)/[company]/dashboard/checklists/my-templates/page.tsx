"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCompanyParam } from "@/hooks/use-company-param";
import {
  ClipboardCheck, Plus, Search, ShieldAlert, Layers, Trash2, Upload,
  Download, X, Shield, Clock, Check, Eye, Send, FileText, Filter,
  ChevronDown, ChevronUp, HardHat, Factory, Droplets, Stethoscope,
  Warehouse as WarehouseIcon, Pickaxe, UtensilsCrossed, BatteryCharging,
  Truck, GraduationCap, Plane,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCompanyData } from "@/hooks/use-company-data";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyStore } from "@/stores/company-store";
import { useChecklistTemplatesStore } from "@/stores/checklists-store";
import { useTranslation } from "@/i18n";
import { useToast } from "@/components/ui/toast";
import { RoleGuard } from "@/components/auth/role-guard";
import {
  getTemplatePublishStatus,
  activateIndustryTemplate,
  cloneChecklistTemplate,
  isTemplateActivated,
  getActivatedTemplate,
} from "@/lib/template-activation";
import { WORK_ORDER_PROCEDURE_TEMPLATES } from "@/data/work-order-procedure-templates";
import { getBuiltInProcedureTemplates } from "@/data/procedure-templates";
import {
  getAllTemplatesForCountry,
  getTemplatesForCountry,
  INDUSTRY_METADATA,
  resolveTemplateRegulation,
} from "@/data/industry-templates";
import { parseCsv } from "@/lib/csv";
import type { ChecklistTemplate, ChecklistItem, IndustryChecklistTemplate, IndustryCode, Country } from "@/types";

type MainTab = "checklists" | "assessments" | "procedures";
type SubTab = "active" | "all" | "drafts";

const RISK_FORMS = [
  { id: "jha", name: "Job Hazard Analysis (JHA)", region: "US", regulation: "OSHA" },
  { id: "jsa", name: "Job Safety Analysis (JSA)", region: "US", regulation: "OSHA" },
  { id: "rie", name: "RI&E Assessment", region: "NL", regulation: "Arbowet Art. 5" },
  { id: "arbowet", name: "Arbowet Compliance Audit", region: "NL", regulation: "Arbowet" },
  { id: "sam", name: "SAM Assessment", region: "SE", regulation: "AFS 2001:1" },
  { id: "osa", name: "OSA Assessment", region: "SE", regulation: "AFS" },
];

const INDUSTRY_ICONS: Record<IndustryCode, React.ComponentType<{ className?: string }>> = {
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

const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Daily", weekly: "Weekly", monthly: "Monthly", quarterly: "Quarterly",
  per_event: "Per event", per_shift: "Per shift", continuous: "Continuous",
};

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

const VALID_ITEM_TYPES: ChecklistItem["type"][] = [
  "yes_no_na", "pass_fail", "rating", "text", "number", "photo", "date", "signature", "select",
];

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
    return {
      name,
      description: ((t.description || t.desc || "") as string).trim(),
      category: ((t.category || t.type || "general") as string).trim(),
      items, errors,
    };
  });
}

function parseTemplateCSV(data: { headers: string[]; rows: Record<string, string>[] }): ParsedTemplateImport[] {
  const groups = new Map<string, { description: string; category: string; items: { question: string; type: ChecklistItem["type"]; required: boolean }[] }>();
  for (const row of data.rows) {
    const name = (row.template_name || row.name || row.template || "").trim();
    if (!name) continue;
    if (!groups.has(name)) groups.set(name, { description: (row.description || row.desc || "").trim(), category: (row.category || "general").trim(), items: [] });
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

function itemTypeBadge(type: string) {
  const map: Record<string, string> = {
    yes_no_na: "Yes / No / NA", pass_fail: "Pass / Fail", rating: "Rating",
    text: "Text", number: "Number", photo: "Photo", date: "Date",
    signature: "Signature", select: "Select",
  };
  return map[type] ?? type;
}

// ---------------------------------------------------------------------------
// Toggle switch
// ---------------------------------------------------------------------------
function Toggle({ active, onChange }: { active: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
        active ? "bg-primary" : "bg-muted",
      )}
    >
      <span className={cn(
        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
        active ? "translate-x-6" : "translate-x-1",
      )} />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Industry Template Card
// ---------------------------------------------------------------------------
const IndustryTemplateCard = React.memo(function IndustryTemplateCard({
  template, expanded, onToggleExpand, alreadyActivated, activatedTemplate,
  companySlug, companyCountry, onActivate, onCloneFromActive, t,
}: {
  template: IndustryChecklistTemplate; expanded: boolean; onToggleExpand: () => void;
  alreadyActivated: boolean; activatedTemplate?: ChecklistTemplate;
  companySlug: string; companyCountry: Country;
  onActivate: (mode: "edit" | "push") => void; onCloneFromActive?: () => void;
  t: (key: string) => string;
}) {
  return (
    <Card className={cn("transition-colors hover:bg-muted/30", expanded && "ring-1 ring-border")}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <button onClick={onToggleExpand} className="text-left w-full group">
              <h3 className="text-sm font-semibold leading-tight group-hover:text-primary transition-colors">
                {t(template.name_key)}
              </h3>
            </button>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {t(template.description_key)}
            </p>
          </div>
          <button onClick={onToggleExpand} className="shrink-0 p-1 rounded hover:bg-muted transition-colors" aria-label={expanded ? "Collapse" : "Expand"}>
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {template.regulation && (
            <Badge variant="outline" className="text-xs gap-1">
              <Shield className="h-3 w-3" />{resolveTemplateRegulation(template, companyCountry)}
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs gap-1">
            <Clock className="h-3 w-3" />{FREQUENCY_LABELS[template.frequency] || template.frequency}
          </Badge>
          <span className="text-xs text-muted-foreground">{template.items.length} items</span>
        </div>

        {!expanded && (
          <div className="flex items-center justify-between pt-1">
            {alreadyActivated ? (
              <Badge variant="active" className="text-xs gap-1"><Check className="h-3 w-3" />Already active</Badge>
            ) : (
              <button onClick={onToggleExpand} className="text-xs text-primary hover:underline flex items-center gap-1">
                <Eye className="h-3 w-3" />Preview items
              </button>
            )}
          </div>
        )}

        {expanded && (
          <div className="border-t pt-3 mt-1 space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Preview items</p>
            <ol className="space-y-1">
              {template.items.map((item, idx) => (
                <li key={item.key} className="flex items-start gap-2 text-xs">
                  <span className="shrink-0 w-5 text-right text-muted-foreground tabular-nums">{idx + 1}.</span>
                  <span className="flex-1 text-foreground">{t(item.question_key)}</span>
                  <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0">{itemTypeBadge(item.type)}</Badge>
                </li>
              ))}
            </ol>
            <div className="border-t pt-3">
              {alreadyActivated ? (
                <div className="flex items-center justify-between">
                  <Badge variant="active" className="text-xs gap-1"><Check className="h-3 w-3" />Already active</Badge>
                  <div className="flex items-center gap-2">
                    {onCloneFromActive && (
                      <Button variant="outline" size="sm" onClick={onCloneFromActive} className="gap-1.5 text-xs">
                        <FileText className="h-3.5 w-3.5" />Clone &amp; edit
                      </Button>
                    )}
                    {activatedTemplate && (
                      <Link href={`/${companySlug}/dashboard/checklists/${activatedTemplate.id}`}>
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                          <Eye className="h-3.5 w-3.5" />View template
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={onToggleExpand} className="text-xs">Close</Button>
                  <Button variant="outline" size="sm" onClick={() => onActivate("edit")} className="flex-1 gap-1.5 text-xs">
                    <FileText className="h-3.5 w-3.5" />Edit &amp; refine
                  </Button>
                  <Button size="sm" onClick={() => onActivate("push")} className="flex-1 gap-1.5 text-xs">
                    <Send className="h-3.5 w-3.5" />Activate as-is
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

// ---------------------------------------------------------------------------
// Import Modal
// ---------------------------------------------------------------------------
function ImportModal({
  onClose,
  onImport,
}: {
  onClose: () => void;
  onImport: (templates: ParsedTemplateImport[]) => void;
}) {
  const [importData, setImportData] = React.useState<ParsedTemplateImport[] | null>(null);
  const { toast } = useToast();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="relative w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto rounded-lg bg-background p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Import Checklist Templates</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>

        {!importData ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Upload a JSON or CSV file to import checklist templates.</p>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">JSON format (recommended):</p>
              <pre className="text-[10px] bg-muted p-2 rounded overflow-x-auto">{`[{
  "name": "Fire Safety Checklist",
  "description": "Monthly fire check",
  "items": [
    { "question": "Are exits clear?", "type": "yes_no_na", "required": true }
  ]
}]`}</pre>
              <p className="text-xs font-medium text-muted-foreground mt-3">CSV format (one row per question):</p>
              <pre className="text-[10px] bg-muted p-2 rounded overflow-x-auto">{`template_name,description,category,question,type,required
Fire Safety,Monthly check,safety,Are exits clear?,yes_no_na,true`}</pre>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => {
              const sample = JSON.stringify([{
                name: "Example Checklist", description: "Template description", category: "general",
                items: [{ question: "Example question", type: "yes_no_na", required: true }],
              }], null, 2);
              const blob = new Blob([sample], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url; a.download = "template-example.json"; a.click();
              URL.revokeObjectURL(url);
            }}>
              <Download className="h-4 w-4" /> Download example
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
                  setImportData(templates);
                } catch (err) {
                  toast(`Parse failed: ${err instanceof Error ? err.message : "unknown error"}`);
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
              <span className="font-medium">{importData.length} template{importData.length !== 1 ? "s" : ""}</span>
              <Badge variant="success" className="text-[10px]">{importData.filter((ti) => ti.errors.length === 0).length} valid</Badge>
              {importData.some((ti) => ti.errors.length > 0) && (
                <Badge variant="destructive" className="text-[10px]">{importData.filter((ti) => ti.errors.length > 0).length} errors</Badge>
              )}
            </div>
            <div className="max-h-72 overflow-auto rounded border text-xs">
              <table className="w-full">
                <thead><tr className="bg-muted sticky top-0 z-10">
                  <th className="px-2 py-1 text-left font-medium">Template</th>
                  <th className="px-2 py-1 text-left font-medium w-16">Items</th>
                  <th className="px-2 py-1 text-left font-medium w-16">Status</th>
                </tr></thead>
                <tbody>
                  {importData.map((ti, i) => (
                    <tr key={i} className={`border-t ${ti.errors.length > 0 ? "bg-destructive/5" : ""}`}>
                      <td className="px-2 py-1.5"><p className="font-medium">{ti.name || <span className="text-destructive italic">No name</span>}</p></td>
                      <td className="px-2 py-1.5">{ti.items.length}</td>
                      <td className="px-2 py-1.5">
                        {ti.errors.length === 0
                          ? <span className="text-green-600 dark:text-green-400">Ready</span>
                          : <span className="text-destructive" title={ti.errors.join(", ")}>{ti.errors[0]}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setImportData(null)}>Back</Button>
              <Button
                className="flex-1"
                disabled={importData.every((ti) => ti.errors.length > 0)}
                onClick={() => { onImport(importData.filter((ti) => ti.errors.length === 0)); onClose(); }}
              >
                Import {importData.filter((ti) => ti.errors.length === 0).length} template{importData.filter((ti) => ti.errors.length === 0).length !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page content
// ---------------------------------------------------------------------------
function MyTemplatesContent() {
  const company = useCompanyParam();
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { currentCompany } = useAuth();
  const { update: updateCompany } = useCompanyStore();
  const { items: companies } = useCompanyStore();
  const resolvedCompany = companies.find((c) => c.slug === company) || companies[0];
  const { checklistTemplates: templates, procedureTemplates, stores } = useCompanyData();
  const { update: updateTemplate, remove: removeTemplate } = stores.checklistTemplates;
  const { update: updateProcedure } = stores.procedureTemplates;
  const { add: addTemplate } = useChecklistTemplatesStore();

  const [mainTab, setMainTab] = React.useState<MainTab>("checklists");
  const [subTab, setSubTab] = React.useState<SubTab>("active");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showImport, setShowImport] = React.useState(false);
  const [expandedIndustryTpl, setExpandedIndustryTpl] = React.useState<string | null>(null);
  const [selectedIndustry, setSelectedIndustry] = React.useState<IndustryCode | "all">("all");
  const [showIndustryDropdown, setShowIndustryDropdown] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => { setSubTab("active"); setSearchQuery(""); setSelectedIndustry("all"); }, [mainTab]);

  const companyIndustry = resolvedCompany?.industry;
  React.useEffect(() => { if (companyIndustry) setSelectedIndustry(companyIndustry); }, [companyIndustry]);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowIndustryDropdown(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const companyCountry: Country = resolvedCompany?.country ?? "US";

  const isPublished = (tpl: ChecklistTemplate) => getTemplatePublishStatus(tpl) === "published";
  const isDraft = (tpl: ChecklistTemplate) => getTemplatePublishStatus(tpl) === "draft";
  const togglePublish = (tpl: ChecklistTemplate) => {
    const next = isPublished(tpl) ? "draft" : "published";
    updateTemplate(tpl.id, { publish_status: next, is_active: next === "published" });
  };

  const activeChecklists = React.useMemo(() => templates.filter(isPublished), [templates]);
  const draftChecklists = React.useMemo(() => templates.filter(isDraft), [templates]);
  const filteredChecklists = React.useMemo(
    () => templates.filter((tpl) => !searchQuery || tpl.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [templates, searchQuery],
  );

  const industryTemplates = React.useMemo(() => {
    let tpls = selectedIndustry === "all"
      ? getAllTemplatesForCountry(companyCountry)
      : getTemplatesForCountry(selectedIndustry, companyCountry);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      tpls = tpls.filter((tmpl) =>
        t(tmpl.name_key).toLowerCase().includes(q) ||
        t(tmpl.description_key).toLowerCase().includes(q) ||
        resolveTemplateRegulation(tmpl, companyCountry).toLowerCase().includes(q) ||
        tmpl.tags.some((tag) => tag.toLowerCase().includes(q)),
      );
    }
    return tpls;
  }, [selectedIndustry, searchQuery, t, companyCountry]);

  const groupedIndustryTemplates = React.useMemo(() => {
    const groups: Record<string, IndustryChecklistTemplate[]> = {};
    industryTemplates.forEach((tmpl) => {
      if (!groups[tmpl.industry]) groups[tmpl.industry] = [];
      groups[tmpl.industry].push(tmpl);
    });
    return Object.entries(groups).sort(([a], [b]) => {
      if (a === companyIndustry) return -1;
      if (b === companyIndustry) return 1;
      return a.localeCompare(b);
    });
  }, [industryTemplates, companyIndustry]);

  const industryOptions = React.useMemo(() => {
    const codes = Object.keys(INDUSTRY_METADATA) as IndustryCode[];
    return codes.sort((a, b) => {
      if (a === companyIndustry) return -1;
      if (b === companyIndustry) return 1;
      return t(INDUSTRY_METADATA[a].label_key).localeCompare(t(INDUSTRY_METADATA[b].label_key));
    });
  }, [companyIndustry, t]);

  const hiddenTypes = currentCompany?.hidden_assessment_types || [];
  const builtInProcs = React.useMemo(
    () => getBuiltInProcedureTemplates().filter((p) => !p.industry || p.industry === currentCompany?.industry),
    [currentCompany?.industry],
  );
  const allProcedures = React.useMemo(
    () => [...procedureTemplates, ...builtInProcs.filter((b) => !procedureTemplates.some((p) => p.id === b.id))],
    [procedureTemplates, builtInProcs],
  );
  const activeProcedures = React.useMemo(() => allProcedures.filter((p) => p.is_active), [allProcedures]);

  const handleActivateIndustry = React.useCallback((industryTemplate: IndustryChecklistTemplate, mode: "edit" | "push") => {
    if (!resolvedCompany) return;
    const newTemplate = activateIndustryTemplate(industryTemplate, resolvedCompany.id, companyCountry, t);
    if (mode === "push") { newTemplate.publish_status = "published"; newTemplate.is_active = true; }
    addTemplate(newTemplate);
    if (mode === "push") toast(`"${newTemplate.name}" activated for field workers`, "success");
    else { toast("Template saved as draft", "success"); router.push(`/${company}/dashboard/checklists/${newTemplate.id}`); }
  }, [resolvedCompany, companyCountry, t, addTemplate, toast, router, company]);

  const handleCloneFromActive = React.useCallback((template: ChecklistTemplate) => {
    const cloned = cloneChecklistTemplate(template);
    addTemplate(cloned);
    toast("Template cloned as draft", "success");
    router.push(`/${company}/dashboard/checklists/${cloned.id}`);
  }, [addTemplate, toast, router, company]);

  const handleImport = React.useCallback((validTemplates: ParsedTemplateImport[]) => {
    const now = new Date().toISOString();
    let imported = 0;
    validTemplates.forEach((ti) => {
      addTemplate({
        id: crypto.randomUUID(),
        company_id: resolvedCompany?.id || "",
        name: ti.name,
        description: ti.description || null,
        category: ti.category,
        items: ti.items.map((item, idx) => ({
          id: crypto.randomUUID(), question: item.question, type: item.type, required: item.required, order: idx + 1,
        })),
        is_active: true,
        publish_status: "draft",
        created_at: now,
        updated_at: now,
      });
      imported++;
    });
    toast(`${imported} template${imported !== 1 ? "s" : ""} imported as drafts`, "success");
  }, [addTemplate, resolvedCompany?.id, toast]);

  const mainTabs: { id: MainTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "checklists", label: "Checklists", icon: ClipboardCheck },
    { id: "assessments", label: "Assessments", icon: ShieldAlert },
    { id: "procedures", label: "Procedures", icon: Layers },
  ];

  const subTabs: { id: SubTab; label: string }[] = [
    { id: "active", label: "Active for Field App" },
    { id: "all", label: "All Templates" },
    { id: "drafts", label: "Drafts" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Template Library</h1>
        <div className="flex gap-2">
          {mainTab === "checklists" && (
            <>
              <Link href={`/${company}/dashboard/checklists/new`}>
                <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />New Template</Button>
              </Link>
              <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowImport(true)}>
                <Upload className="h-4 w-4" />Import
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Tabs (underline style) */}
      <div className="border-b">
        <div className="flex gap-6">
          {mainTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMainTab(tab.id)}
              className={cn(
                "flex items-center gap-2 pb-3 text-sm font-medium transition-colors relative",
                mainTab === tab.id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {mainTab === tab.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />}
            </button>
          ))}
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-2">
        {subTabs.map((tab) => (
          <Button key={tab.id} variant={subTab === tab.id ? "default" : "outline"} size="sm" onClick={() => { setSubTab(tab.id); setSearchQuery(""); }}>
            {tab.label}
          </Button>
        ))}
      </div>

      {/* ═══════════ CHECKLISTS ═══════════ */}
      {mainTab === "checklists" && subTab === "active" && (
        <Card>
          <CardContent className="pt-6 space-y-2">
            {activeChecklists.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No checklists active for the field app. Go to &ldquo;All Templates&rdquo; to activate.</p>
            ) : activeChecklists.map((tpl) => (
              <div key={tpl.id} className="flex items-center justify-between py-2 px-1">
                <div><p className="text-sm font-medium">{tpl.name}</p><p className="text-xs text-muted-foreground">{tpl.items.length} items</p></div>
                <Toggle active onChange={() => togglePublish(tpl)} />
              </div>
            ))}
            {WORK_ORDER_PROCEDURE_TEMPLATES.length > 0 && (
              <>
                <div className="border-t pt-3 mt-3"><p className="text-xs font-medium text-muted-foreground mb-2">Work Order Procedures (auto-assigned)</p></div>
                {WORK_ORDER_PROCEDURE_TEMPLATES.map((tpl) => (
                  <div key={tpl.id} className="flex items-center justify-between py-2 px-1">
                    <div><p className="text-sm font-medium">{tpl.name}</p><p className="text-xs text-muted-foreground">{tpl.items.length} steps</p></div>
                    <Badge variant="success" className="text-[10px]">Auto</Badge>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {mainTab === "checklists" && subTab === "all" && (
        <div className="space-y-6">
          {/* Search + Industry filter */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div ref={dropdownRef} className="relative">
              <Button
                variant="outline"
                className="w-full justify-between gap-2 sm:w-[220px]"
                onClick={() => setShowIndustryDropdown((prev) => !prev)}
              >
                <span className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">
                    {selectedIndustry === "all" ? "All industries" : t(INDUSTRY_METADATA[selectedIndustry].label_key)}
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
              {showIndustryDropdown && (
                <div className="absolute left-0 z-20 mt-1 w-full min-w-[240px] rounded-md border bg-popover p-1 shadow-md">
                  <button
                    className={cn("flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent", selectedIndustry === "all" && "bg-accent font-medium")}
                    onClick={() => { setSelectedIndustry("all"); setShowIndustryDropdown(false); }}
                  >
                    All industries
                  </button>
                  {industryOptions.map((code) => {
                    const Icon = INDUSTRY_ICONS[code];
                    return (
                      <button
                        key={code}
                        className={cn("flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent", selectedIndustry === code && "bg-accent font-medium")}
                        onClick={() => { setSelectedIndustry(code); setShowIndustryDropdown(false); }}
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 text-left">{t(INDUSTRY_METADATA[code].label_key)}</span>
                        {code === companyIndustry && <Badge variant="secondary" className="text-xs">Recommended</Badge>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search all templates..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
          </div>

          {/* Your custom templates */}
          {filteredChecklists.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Your Templates ({filteredChecklists.length})
              </h2>
              <Card>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="px-4 py-3 font-medium">Template</th>
                        <th className="px-4 py-3 font-medium hidden md:table-cell">Items</th>
                        <th className="px-4 py-3 font-medium hidden lg:table-cell">Source</th>
                        <th className="px-4 py-3 font-medium w-20">Active</th>
                        <th className="px-4 py-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredChecklists.map((tpl) => (
                        <tr key={tpl.id} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="px-4 py-3">
                            <Link href={`/${company}/dashboard/checklists/${tpl.id}`} className="hover:underline">
                              <p className="font-medium">{tpl.name}</p>
                              {tpl.description && <p className="text-xs text-muted-foreground line-clamp-1">{tpl.description}</p>}
                            </Link>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{tpl.items.length} items</td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <Badge variant="outline" className="text-[10px]">{tpl.source_template_id ? "Industry" : "Custom"}</Badge>
                          </td>
                          <td className="px-4 py-3"><Toggle active={isPublished(tpl)} onChange={() => togglePublish(tpl)} /></td>
                          <td className="px-4 py-3">
                            <button onClick={() => { if (confirm("Delete this template?")) removeTemplate(tpl.id); }} className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Industry library templates */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Industry Library ({industryTemplates.length} templates)
            </h2>
            {groupedIndustryTemplates.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">No templates match your search.</p>
              </div>
            )}
            {groupedIndustryTemplates.map(([industryCode, iTpls]) => {
              const code = industryCode as IndustryCode;
              const Icon = INDUSTRY_ICONS[code];
              const meta = INDUSTRY_METADATA[code];
              return (
                <div key={code} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-base font-semibold">{t(meta.label_key)}</h3>
                    <span className="text-sm text-muted-foreground">({iTpls.length})</span>
                    {code === companyIndustry && <Badge variant="secondary" className="text-xs">Recommended</Badge>}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {iTpls.map((tmpl) => {
                      const activatedTpl = getActivatedTemplate(tmpl.id, templates);
                      return (
                        <IndustryTemplateCard
                          key={tmpl.id}
                          template={tmpl}
                          expanded={expandedIndustryTpl === tmpl.id}
                          onToggleExpand={() => setExpandedIndustryTpl(expandedIndustryTpl === tmpl.id ? null : tmpl.id)}
                          alreadyActivated={isTemplateActivated(tmpl.id, templates)}
                          activatedTemplate={activatedTpl}
                          companySlug={company}
                          companyCountry={companyCountry}
                          onActivate={(mode) => handleActivateIndustry(tmpl, mode)}
                          onCloneFromActive={activatedTpl ? () => handleCloneFromActive(activatedTpl) : undefined}
                          t={t}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </section>
        </div>
      )}

      {mainTab === "checklists" && subTab === "drafts" && (
        <Card>
          <CardContent className="pt-6 space-y-2">
            {draftChecklists.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No draft templates. Drafts are templates being worked on but not yet activated.</p>
            ) : draftChecklists.map((tpl) => (
              <div key={tpl.id} className="flex items-center justify-between py-2 px-1">
                <Link href={`/${company}/dashboard/checklists/${tpl.id}`} className="hover:underline flex-1">
                  <p className="text-sm font-medium">{tpl.name}</p>
                  <p className="text-xs text-muted-foreground">{tpl.items.length} items</p>
                </Link>
                <div className="flex items-center gap-2">
                  <Badge variant="warning" className="text-[10px]">Draft</Badge>
                  <Button size="sm" variant="outline" onClick={() => togglePublish(tpl)}>Activate</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ═══════════ ASSESSMENTS ═══════════ */}
      {mainTab === "assessments" && subTab === "active" && (
        <Card>
          <CardContent className="pt-6 space-y-2">
            <p className="text-xs text-muted-foreground mb-3">Active risk assessment forms available to field workers.</p>
            {RISK_FORMS.filter((f) => !hiddenTypes.includes(f.id)).length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No assessment forms active. Go to &ldquo;All Templates&rdquo; to activate.</p>
            ) : RISK_FORMS.filter((f) => !hiddenTypes.includes(f.id)).map((form) => (
              <div key={form.id} className="flex items-center justify-between py-2 px-1">
                <div><p className="text-sm font-medium">{form.name}</p><p className="text-xs text-muted-foreground">{form.region} &middot; {form.regulation}</p></div>
                <Toggle active onChange={() => {
                  if (!currentCompany) return;
                  updateCompany(currentCompany.id, { hidden_assessment_types: [...(currentCompany.hidden_assessment_types || []), form.id] });
                }} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {mainTab === "assessments" && subTab === "all" && (
        <Card>
          <CardContent className="pt-6 space-y-2">
            <p className="text-xs text-muted-foreground mb-3">Toggle forms to make them available for field workers.</p>
            {RISK_FORMS.map((form) => {
              const isActive = !hiddenTypes.includes(form.id);
              return (
                <div key={form.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <div><p className="text-sm font-medium">{form.name}</p><p className="text-xs text-muted-foreground">{form.region} &middot; {form.regulation}</p></div>
                  <Toggle active={isActive} onChange={() => {
                    if (!currentCompany) return;
                    const hidden = currentCompany.hidden_assessment_types || [];
                    const updated = isActive ? [...hidden, form.id] : hidden.filter((id) => id !== form.id);
                    updateCompany(currentCompany.id, { hidden_assessment_types: updated });
                  }} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {mainTab === "assessments" && subTab === "drafts" && (
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground py-6 text-center">Risk assessment forms are pre-built. Custom assessment templates coming soon.</p></CardContent></Card>
      )}

      {/* ═══════════ PROCEDURES ═══════════ */}
      {mainTab === "procedures" && subTab === "active" && (
        <Card>
          <CardContent className="pt-6 space-y-2">
            {activeProcedures.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No procedures active for the field app.</p>
            ) : activeProcedures.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 px-1">
                <div><p className="text-sm font-medium">{p.name}</p><p className="text-xs text-muted-foreground">{p.steps.length} steps &middot; {p.recurrence.replace(/_/g, " ")}</p></div>
                <Toggle active onChange={() => updateProcedure(p.id, { is_active: false })} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {mainTab === "procedures" && subTab === "all" && (
        <div className="space-y-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search procedures..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Procedure</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Steps</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">Industry</th>
                  <th className="px-4 py-3 font-medium w-20">Active</th>
                </tr></thead>
                <tbody>
                  {allProcedures.filter((p) => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())).map((p) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{p.name}</p>
                        {p.description && <p className="text-xs text-muted-foreground line-clamp-1">{p.description}</p>}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{p.steps.length}</td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {p.industry ? <Badge variant="outline" className="text-[10px]">{p.industry}</Badge> : <span className="text-muted-foreground">&mdash;</span>}
                      </td>
                      <td className="px-4 py-3"><Toggle active={p.is_active} onChange={() => updateProcedure(p.id, { is_active: !p.is_active })} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {mainTab === "procedures" && subTab === "drafts" && (
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground py-6 text-center">No draft procedures.</p></CardContent></Card>
      )}

      {/* Import modal */}
      {showImport && <ImportModal onClose={() => setShowImport(false)} onImport={handleImport} />}
    </div>
  );
}

export default function MyTemplatesPage() {
  return (
    <RoleGuard requiredPermission="checklists.view">
      <React.Suspense fallback={<div className="flex min-h-[400px] items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
        <MyTemplatesContent />
      </React.Suspense>
    </RoleGuard>
  );
}
