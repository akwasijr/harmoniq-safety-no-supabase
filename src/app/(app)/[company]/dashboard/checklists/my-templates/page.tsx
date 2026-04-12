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
import {
  getAllRiskAssessmentTemplatesForCountry,
  getRiskAssessmentTemplatesByIndustry,
  resolveRARegulation,
} from "@/data/risk-assessment-templates";
import { parseCsv } from "@/lib/csv";
import type {
  ChecklistTemplate, ChecklistItem, IndustryChecklistTemplate,
  IndustryCode, Country, ProcedureTemplate,
} from "@/types";

type MainTab = "checklists" | "assessments" | "procedures";
type SubTab = "all" | "active" | "drafts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const INDUSTRY_ICONS: Record<IndustryCode, React.ComponentType<{ className?: string }>> = {
  construction: HardHat, manufacturing: Factory, oil_gas: Droplets,
  healthcare: Stethoscope, warehousing: WarehouseIcon, mining: Pickaxe,
  food_beverage: UtensilsCrossed, utilities: BatteryCharging,
  transportation: Truck, education: GraduationCap, airports: Plane,
};

const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Daily", weekly: "Weekly", monthly: "Monthly", quarterly: "Quarterly",
  per_event: "Per event", per_shift: "Per shift", continuous: "Continuous",
};

// ---------------------------------------------------------------------------
// Template import helpers
// ---------------------------------------------------------------------------
type ParsedTemplateImport = {
  name: string; description: string; category: string;
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
        items.push({ question, type, required: item.required !== false });
      });
    }
    return { name, description: ((t.description || t.desc || "") as string).trim(), category: ((t.category || t.type || "general") as string).trim(), items, errors };
  });
}

function parseTemplateCSV(data: { headers: string[]; rows: Record<string, string>[] }): ParsedTemplateImport[] {
  const groups = new Map<string, { description: string; category: string; items: ParsedTemplateImport["items"] }>();
  for (const row of data.rows) {
    const name = (row.template_name || row.name || row.template || "").trim();
    if (!name) continue;
    if (!groups.has(name)) groups.set(name, { description: (row.description || "").trim(), category: (row.category || "general").trim(), items: [] });
    const question = (row.question || row.item || row.text || "").trim();
    if (!question) continue;
    const rawType = (row.type || row.item_type || "yes_no_na").toLowerCase().trim().replace(/\s+/g, "_");
    const type = VALID_ITEM_TYPES.includes(rawType as ChecklistItem["type"]) ? rawType as ChecklistItem["type"] : "yes_no_na";
    groups.get(name)!.items.push({ question, type, required: row.required?.toLowerCase() !== "false" });
  }
  return Array.from(groups.entries()).map(([name, g]) => ({
    name, ...g, errors: g.items.length === 0 ? ["No items"] : [],
  }));
}

function itemTypeBadge(type: string) {
  return ({ yes_no_na: "Yes / No / NA", pass_fail: "Pass / Fail", rating: "Rating", text: "Text", number: "Number", photo: "Photo", date: "Date", signature: "Signature", select: "Select" })[type] ?? type;
}

// ---------------------------------------------------------------------------
// Toggle switch
// ---------------------------------------------------------------------------
function Toggle({ active, onChange }: { active: boolean; onChange: () => void }) {
  return (
    <button type="button" onClick={onChange} className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors", active ? "bg-primary" : "bg-muted")}>
      <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform", active ? "translate-x-6" : "translate-x-1")} />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Active Template Card — expandable preview with Disable / Remove actions
// ---------------------------------------------------------------------------
const ActiveTemplateCard = React.memo(function ActiveTemplateCard({
  template, expanded, onToggleExpand, onToggleDisable, onRemove, companySlug, isDisabled,
}: {
  template: ChecklistTemplate; expanded: boolean; onToggleExpand: () => void;
  onToggleDisable: () => void; onRemove: () => void; companySlug: string;
  isDisabled: boolean;
}) {
  return (
    <Card className={cn("transition-all hover:bg-muted/30", expanded && "ring-1 ring-border", isDisabled && "opacity-70")}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <button onClick={onToggleExpand} className="text-left w-full group">
              <h3 className={cn("text-base font-bold leading-snug group-hover:text-primary transition-colors", isDisabled && "line-through decoration-1")}>{template.name}</h3>
            </button>
            {template.description && <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed line-clamp-2">{template.description}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isDisabled ? (
              <Badge variant="secondary" className="text-xs gap-1 text-amber-600 dark:text-amber-400">Disabled</Badge>
            ) : (
              <Badge variant="active" className="text-xs gap-1"><Check className="h-3 w-3" />Active</Badge>
            )}
            <button onClick={onToggleExpand} className="p-1.5 rounded-md hover:bg-muted transition-colors" aria-label={expanded ? "Collapse" : "Expand"}>
              {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {template.regulation && <Badge variant="outline" className="text-xs gap-1.5 px-2.5 py-1"><Shield className="h-3 w-3" />{template.regulation}</Badge>}
          <span className="text-sm text-muted-foreground">{template.items.length} items</span>
          {template.source_template_id && <Badge variant="outline" className="text-xs">Industry</Badge>}
        </div>
        {!expanded && (
          <button onClick={onToggleExpand} className="text-sm text-primary hover:underline flex items-center gap-1.5 font-medium pt-1">
            <Eye className="h-3.5 w-3.5" />Preview Items
          </button>
        )}
        {expanded && (
          <div className="border-t pt-4 mt-2 space-y-4">
            <p className="text-sm font-medium text-muted-foreground">Preview Items</p>
            <ol className="space-y-2">
              {template.items.map((item, idx) => (
                <li key={item.id} className="flex items-start gap-3 text-sm">
                  <span className="shrink-0 w-6 text-right text-muted-foreground tabular-nums">{idx + 1}.</span>
                  <span className="flex-1 text-foreground">{item.question}</span>
                  <Badge variant="outline" className="shrink-0 text-xs px-2 py-0.5">{itemTypeBadge(item.type)}</Badge>
                </li>
              ))}
            </ol>
            <div className="border-t pt-4 flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={onToggleExpand}>Close</Button>
              <div className="flex-1" />
              <Link href={`/${companySlug}/dashboard/checklists/${template.id}`}>
                <Button variant="outline" size="sm" className="gap-2"><Eye className="h-4 w-4" />Edit Template</Button>
              </Link>
              {isDisabled ? (
                <Button size="sm" onClick={onToggleDisable} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
                  Enable
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={onToggleDisable} className="gap-2 text-amber-600 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-950">
                  Disable
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => { onRemove(); }} className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/5">
                <Trash2 className="h-4 w-4" />Remove
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

// ---------------------------------------------------------------------------
// Industry Template Card — matches screenshot design exactly
// ---------------------------------------------------------------------------
const IndustryTemplateCard = React.memo(function IndustryTemplateCard({
  template, expanded, onToggleExpand, alreadyActivated, activatedTemplate,
  companySlug, companyCountry, onActivate, onCloneFromActive, t, resolveReg,
}: {
  template: IndustryChecklistTemplate; expanded: boolean; onToggleExpand: () => void;
  alreadyActivated: boolean; activatedTemplate?: ChecklistTemplate;
  companySlug: string; companyCountry: Country;
  onActivate: (mode: "edit" | "push") => void; onCloneFromActive?: () => void;
  t: (key: string) => string;
  resolveReg: (tmpl: IndustryChecklistTemplate, country: Country) => string;
}) {
  const regulation = resolveReg(template, companyCountry);
  return (
    <Card className={cn("transition-all hover:bg-muted/30", expanded && "ring-1 ring-border")}>
      <CardContent className="p-5 space-y-3">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <button onClick={onToggleExpand} className="text-left w-full group">
              <h3 className="text-base font-bold leading-snug group-hover:text-primary transition-colors">
                {t(template.name_key)}
              </h3>
            </button>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed line-clamp-2">
              {t(template.description_key)}
            </p>
          </div>
          <button onClick={onToggleExpand} className="shrink-0 p-1.5 rounded-md hover:bg-muted transition-colors mt-0.5" aria-label={expanded ? "Collapse" : "Expand"}>
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-2">
          {regulation && (
            <Badge variant="outline" className="text-xs gap-1.5 px-2.5 py-1">
              <Shield className="h-3 w-3" />{regulation}
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs gap-1.5 px-2.5 py-1">
            <Clock className="h-3 w-3" />{FREQUENCY_LABELS[template.frequency] || template.frequency}
          </Badge>
          <span className="text-sm text-muted-foreground">{template.items.length} items</span>
        </div>

        {/* Collapsed: Preview Items link or Already Active badge */}
        {!expanded && (
          <div className="flex items-center justify-between pt-1">
            {alreadyActivated ? (
              <Badge variant="active" className="text-xs gap-1"><Check className="h-3 w-3" />Already active</Badge>
            ) : (
              <button onClick={onToggleExpand} className="text-sm text-primary hover:underline flex items-center gap-1.5 font-medium">
                <Eye className="h-3.5 w-3.5" />Preview Items
              </button>
            )}
          </div>
        )}

        {/* Expanded: full item list + action buttons */}
        {expanded && (
          <div className="border-t pt-4 mt-2 space-y-4">
            <p className="text-sm font-medium text-muted-foreground">Preview Items</p>
            <ol className="space-y-2">
              {template.items.map((item, idx) => (
                <li key={item.key} className="flex items-start gap-3 text-sm">
                  <span className="shrink-0 w-6 text-right text-muted-foreground tabular-nums">{idx + 1}.</span>
                  <span className="flex-1 text-foreground">{t(item.question_key)}</span>
                  <Badge variant="outline" className="shrink-0 text-xs px-2 py-0.5">{itemTypeBadge(item.type)}</Badge>
                </li>
              ))}
            </ol>
            <div className="border-t pt-4 flex items-center gap-3">
              {alreadyActivated ? (
                <>
                  <Badge variant="active" className="text-xs gap-1"><Check className="h-3 w-3" />Already active</Badge>
                  <div className="ml-auto flex items-center gap-2">
                    {onCloneFromActive && (
                      <Button variant="outline" size="sm" onClick={onCloneFromActive} className="gap-2">
                        <FileText className="h-4 w-4" />Clone &amp; Edit
                      </Button>
                    )}
                    {activatedTemplate && (
                      <Link href={`/${companySlug}/dashboard/checklists/${activatedTemplate.id}`}>
                        <Button variant="outline" size="sm" className="gap-2"><Eye className="h-4 w-4" />View Template</Button>
                      </Link>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={onToggleExpand}>Close</Button>
                  <Button variant="outline" size="sm" onClick={() => onActivate("edit")} className="flex-1 gap-2">
                    <FileText className="h-4 w-4" />Clone &amp; Edit
                  </Button>
                  <Button size="sm" onClick={() => onActivate("push")} className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white">
                    <Send className="h-4 w-4" />Push to Field App
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

// ---------------------------------------------------------------------------
// Procedure Card — expandable with step preview, recurrence, and actions
// ---------------------------------------------------------------------------
const ProcedureCard = React.memo(function ProcedureCard({
  procedure, expanded, onToggleExpand, isActive, onToggleActive, onClone, onPush, onDisable, onRemove, mode = "library",
}: {
  procedure: ProcedureTemplate; expanded: boolean; onToggleExpand: () => void;
  isActive: boolean; onToggleActive: () => void;
  onClone?: () => void; onPush?: () => void;
  onDisable?: () => void; onRemove?: () => void;
  mode?: "library" | "active";
}) {
  const raCount = procedure.steps.filter((s) => s.type === "risk_assessment").length;
  const clCount = procedure.steps.filter((s) => s.type === "checklist").length;
  return (
    <Card className={cn("transition-all hover:bg-muted/30", expanded && "ring-1 ring-border")}>
      <CardContent className="p-5 space-y-3">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <button onClick={onToggleExpand} className="text-left w-full group">
              <h3 className="text-base font-bold leading-snug group-hover:text-primary transition-colors">
                {procedure.name}
              </h3>
            </button>
            {procedure.description && (
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed line-clamp-2">{procedure.description}</p>
            )}
          </div>
          <button onClick={onToggleExpand} className="shrink-0 p-1.5 rounded-md hover:bg-muted transition-colors mt-0.5" aria-label={expanded ? "Collapse" : "Expand"}>
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-2">
          {procedure.industry && (
            <Badge variant="outline" className="text-xs gap-1.5 px-2.5 py-1 capitalize">
              {procedure.industry.replace(/_/g, " ")}
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs gap-1.5 px-2.5 py-1">
            <Clock className="h-3 w-3" />{FREQUENCY_LABELS[procedure.recurrence] || procedure.recurrence}
          </Badge>
          <span className="text-sm text-muted-foreground">{procedure.steps.length} steps</span>
          {raCount > 0 && <Badge variant="outline" className="text-xs px-2 py-0.5 text-orange-600 border-orange-300 dark:text-orange-400 dark:border-orange-700">{raCount} Risk Assessment{raCount > 1 ? "s" : ""}</Badge>}
          {clCount > 0 && <Badge variant="outline" className="text-xs px-2 py-0.5 text-blue-600 border-blue-300 dark:text-blue-400 dark:border-blue-700">{clCount} Checklist{clCount > 1 ? "s" : ""}</Badge>}
        </div>

        {/* Collapsed: Preview link or Active badge */}
        {!expanded && (
          <div className="flex items-center justify-between pt-1">
            {mode === "active" && !isActive ? (
              <Badge variant="secondary" className="text-xs gap-1 text-amber-600 dark:text-amber-400">Disabled</Badge>
            ) : isActive ? (
              <Badge variant="active" className="text-xs gap-1"><Check className="h-3 w-3" />Active</Badge>
            ) : (
              <button onClick={onToggleExpand} className="text-sm text-primary hover:underline flex items-center gap-1.5 font-medium">
                <Eye className="h-3.5 w-3.5" />Preview Steps
              </button>
            )}
          </div>
        )}

        {/* Expanded: step list + actions */}
        {expanded && (
          <div className="border-t pt-4 mt-2 space-y-4">
            <p className="text-sm font-medium text-muted-foreground">Procedure Steps</p>
            <ol className="space-y-2">
              {procedure.steps.map((s, idx) => (
                <li key={s.id} className="flex items-center gap-3 text-sm">
                  <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium tabular-nums bg-muted text-muted-foreground">{idx + 1}</span>
                  <span className="flex-1 text-foreground font-medium">{s.template_name}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0 text-xs px-2 py-0.5",
                      s.type === "risk_assessment"
                        ? "text-orange-600 border-orange-300 dark:text-orange-400 dark:border-orange-700"
                        : "text-blue-600 border-blue-300 dark:text-blue-400 dark:border-blue-700",
                    )}
                  >
                    {s.type === "risk_assessment" ? "Risk Assessment" : "Checklist"}
                  </Badge>
                  {!s.required && <span className="text-xs text-muted-foreground italic">Optional</span>}
                </li>
              ))}
            </ol>
            <div className="border-t pt-4 flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={onToggleExpand}>Close</Button>
              {mode === "library" ? (
                <>
                  {onClone && (
                    <Button variant="outline" size="sm" onClick={onClone} className="flex-1 gap-2">
                      <FileText className="h-4 w-4" />Clone &amp; Edit
                    </Button>
                  )}
                  {onPush && !isActive && (
                    <Button size="sm" onClick={onPush} className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white">
                      <Send className="h-4 w-4" />Push to Field App
                    </Button>
                  )}
                  {isActive && <Badge variant="active" className="text-xs gap-1 ml-auto"><Check className="h-3 w-3" />Already active</Badge>}
                </>
              ) : (
                <>
                  <div className="flex-1" />
                  {onDisable && (
                    isActive ? (
                      <Button variant="outline" size="sm" onClick={onDisable} className="gap-2 text-amber-600 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-950">
                        Disable
                      </Button>
                    ) : (
                      <Button size="sm" onClick={onDisable} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
                        Enable
                      </Button>
                    )
                  )}
                  {onRemove && (
                    <Button variant="outline" size="sm" onClick={() => { if (onRemove) onRemove(); }} className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/5">
                      <Trash2 className="h-4 w-4" />Remove
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

// ---------------------------------------------------------------------------
// Delete Confirmation Modal
// ---------------------------------------------------------------------------
function DeleteModal({ title, message, onConfirm, onClose }: { title: string; message: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm mx-4 rounded-xl bg-background border p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
            <Trash2 className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h3 className="text-base font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" size="sm" onClick={() => { onConfirm(); onClose(); }}>Remove</Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Import Modal
// ---------------------------------------------------------------------------
function ImportModal({ onClose, onImport }: { onClose: () => void; onImport: (t: ParsedTemplateImport[]) => void }) {
  const [importData, setImportData] = React.useState<ParsedTemplateImport[] | null>(null);
  const { toast } = useToast();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto rounded-xl bg-background border p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Import Templates</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        {!importData ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Upload a JSON or CSV file to import templates.</p>
            <pre className="text-[10px] bg-muted p-2 rounded overflow-x-auto">{`[{ "name": "Fire Safety", "items": [{ "question": "Exits clear?", "type": "yes_no_na" }] }]`}</pre>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => {
              const sample = JSON.stringify([{ name: "Example", items: [{ question: "Sample question", type: "yes_no_na", required: true }] }], null, 2);
              const blob = new Blob([sample], { type: "application/json" }); const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url; a.download = "template-example.json"; a.click(); URL.revokeObjectURL(url);
            }}><Download className="h-4 w-4" />Download example</Button>
            <label className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 cursor-pointer hover:bg-muted/50 transition-colors">
              <input type="file" accept=".json,.csv,.txt" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0]; if (!file) return;
                try {
                  const text = await file.text();
                  const templates = (file.name.endsWith(".json") || text.trim().startsWith("[") || text.trim().startsWith("{"))
                    ? parseTemplateJSON(text) : parseTemplateCSV(await parseCsv(file));
                  if (templates.length === 0) { toast("No templates found"); return; }
                  setImportData(templates);
                } catch (err) { toast(`Parse failed: ${err instanceof Error ? err.message : "unknown"}`); }
                e.target.value = "";
              }} />
              <Upload className="h-5 w-5 text-muted-foreground" /><span className="text-sm text-muted-foreground">Choose JSON or CSV file</span>
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Badge variant="success" className="text-[10px]">{importData.filter((t) => !t.errors.length).length} valid</Badge>
              {importData.some((t) => t.errors.length > 0) && <Badge variant="destructive" className="text-[10px]">{importData.filter((t) => t.errors.length).length} errors</Badge>}
            </div>
            <div className="max-h-60 overflow-auto rounded border text-xs">
              <table className="w-full"><thead><tr className="bg-muted sticky top-0"><th className="px-2 py-1 text-left font-medium">Template</th><th className="px-2 py-1 w-14">Items</th><th className="px-2 py-1 w-14">Status</th></tr></thead>
                <tbody>{importData.map((ti, i) => (<tr key={i} className={`border-t ${ti.errors.length ? "bg-destructive/5" : ""}`}><td className="px-2 py-1.5 font-medium">{ti.name || "—"}</td><td className="px-2 py-1.5">{ti.items.length}</td><td className="px-2 py-1.5">{ti.errors.length ? <span className="text-destructive">{ti.errors[0]}</span> : <span className="text-green-500">OK</span>}</td></tr>))}</tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setImportData(null)}>Back</Button>
              <Button className="flex-1" disabled={importData.every((t) => t.errors.length > 0)} onClick={() => { onImport(importData.filter((t) => !t.errors.length)); onClose(); }}>Import</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Industry-grouped template grid (reused across Checklists & Assessments)
// ---------------------------------------------------------------------------
function IndustryTemplateGrid({
  templates, companyIndustry, companyCountry, companySlug, existingTemplates,
  expandedId, setExpandedId, onActivate, onClone, t, resolveReg,
}: {
  templates: IndustryChecklistTemplate[];
  companyIndustry?: IndustryCode;
  companyCountry: Country;
  companySlug: string;
  existingTemplates: ChecklistTemplate[];
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  onActivate: (tmpl: IndustryChecklistTemplate, mode: "edit" | "push") => void;
  onClone: (tmpl: ChecklistTemplate) => void;
  t: (key: string) => string;
  resolveReg: (tmpl: IndustryChecklistTemplate, country: Country) => string;
}) {
  const grouped = React.useMemo(() => {
    const groups: Record<string, IndustryChecklistTemplate[]> = {};
    templates.forEach((tmpl) => { if (!groups[tmpl.industry]) groups[tmpl.industry] = []; groups[tmpl.industry].push(tmpl); });
    return Object.entries(groups).sort(([a], [b]) => {
      if (a === companyIndustry) return -1; if (b === companyIndustry) return 1; return a.localeCompare(b);
    });
  }, [templates, companyIndustry]);

  if (grouped.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="h-10 w-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm text-muted-foreground">No templates match your search.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {grouped.map(([industryCode, iTpls]) => {
        const code = industryCode as IndustryCode;
        const Icon = INDUSTRY_ICONS[code];
        const meta = INDUSTRY_METADATA[code];
        return (
          <section key={code} className="space-y-3">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-base font-semibold">{t(meta.label_key)}</h2>
              <span className="text-sm text-muted-foreground">({iTpls.length})</span>
              {code === companyIndustry && <Badge variant="secondary" className="text-xs">Recommended</Badge>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {iTpls.map((tmpl) => {
                const activated = getActivatedTemplate(tmpl.id, existingTemplates);
                return (
                  <IndustryTemplateCard
                    key={tmpl.id} template={tmpl}
                    expanded={expandedId === tmpl.id}
                    onToggleExpand={() => setExpandedId(expandedId === tmpl.id ? null : tmpl.id)}
                    alreadyActivated={isTemplateActivated(tmpl.id, existingTemplates)}
                    activatedTemplate={activated}
                    companySlug={companySlug} companyCountry={companyCountry}
                    onActivate={(mode) => onActivate(tmpl, mode)}
                    onCloneFromActive={activated ? () => onClone(activated) : undefined}
                    t={t} resolveReg={resolveReg}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
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
  const [subTab, setSubTab] = React.useState<SubTab>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showImport, setShowImport] = React.useState(false);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [selectedIndustry, setSelectedIndustry] = React.useState<IndustryCode | "all">("all");
  const [showIndustryDropdown, setShowIndustryDropdown] = React.useState(false);
  const [deleteModal, setDeleteModal] = React.useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => { setSubTab("all"); setSearchQuery(""); setSelectedIndustry("all"); setExpandedId(null); }, [mainTab]);

  const companyIndustry = resolvedCompany?.industry;
  React.useEffect(() => { if (companyIndustry) setSelectedIndustry(companyIndustry); }, [companyIndustry]);
  React.useEffect(() => {
    const handler = (e: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowIndustryDropdown(false); };
    document.addEventListener("mousedown", handler); return () => document.removeEventListener("mousedown", handler);
  }, []);

  const companyCountry: Country = resolvedCompany?.country ?? "US";

  const isPublished = (tpl: ChecklistTemplate) => getTemplatePublishStatus(tpl) === "published";
  const isDraft = (tpl: ChecklistTemplate) => getTemplatePublishStatus(tpl) === "draft";
  const togglePublish = (tpl: ChecklistTemplate) => {
    const next = isPublished(tpl) ? "draft" : "published";
    updateTemplate(tpl.id, { publish_status: next, is_active: next === "published" });
  };

  // Checklist templates (industry library)
  const checklistIndustryTpls = React.useMemo(() => {
    let tpls = selectedIndustry === "all" ? getAllTemplatesForCountry(companyCountry) : getTemplatesForCountry(selectedIndustry, companyCountry);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      tpls = tpls.filter((tmpl) => t(tmpl.name_key).toLowerCase().includes(q) || t(tmpl.description_key).toLowerCase().includes(q) || tmpl.tags.some((tag) => tag.toLowerCase().includes(q)));
    }
    return tpls;
  }, [selectedIndustry, searchQuery, t, companyCountry]);

  // Risk assessment templates (industry library)
  const assessmentIndustryTpls = React.useMemo(() => {
    let tpls = selectedIndustry === "all" ? getAllRiskAssessmentTemplatesForCountry(companyCountry) : getRiskAssessmentTemplatesByIndustry(selectedIndustry, companyCountry);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      tpls = tpls.filter((tmpl) => t(tmpl.name_key).toLowerCase().includes(q) || t(tmpl.description_key).toLowerCase().includes(q) || tmpl.tags.some((tag) => tag.toLowerCase().includes(q)));
    }
    return tpls;
  }, [selectedIndustry, searchQuery, t, companyCountry]);

  const activeChecklists = React.useMemo(() => templates.filter(isPublished), [templates]);
  const draftChecklists = React.useMemo(() => templates.filter(isDraft), [templates]);

  // Published templates for "Active for Field App" tab — includes disabled (is_active=false but published)
  const fieldAppChecklists = React.useMemo(() => templates.filter((t) => t.publish_status === "published"), [templates]);

  const toggleFieldAppActive = React.useCallback((tpl: ChecklistTemplate) => {
    updateTemplate(tpl.id, { is_active: !tpl.is_active });
  }, [updateTemplate]);

  const industryOptions = React.useMemo(() => {
    const codes = Object.keys(INDUSTRY_METADATA) as IndustryCode[];
    return codes.sort((a, b) => { if (a === companyIndustry) return -1; if (b === companyIndustry) return 1; return t(INDUSTRY_METADATA[a].label_key).localeCompare(t(INDUSTRY_METADATA[b].label_key)); });
  }, [companyIndustry, t]);

  const builtInProcs = React.useMemo(() => getBuiltInProcedureTemplates().filter((p) => !p.industry || p.industry === currentCompany?.industry), [currentCompany?.industry]);
  const allProcedures = React.useMemo(() => [...procedureTemplates, ...builtInProcs.filter((b) => !procedureTemplates.some((p) => p.id === b.id))], [procedureTemplates, builtInProcs]);
  const activeProcedures = React.useMemo(() => allProcedures.filter((p) => p.is_active), [allProcedures]);
  // All procedures that have been pushed (active or disabled) — for field app tab
  const fieldAppProcedures = React.useMemo(() => allProcedures.filter((p) => p.is_active || (!p.is_builtin && p.company_id === resolvedCompany?.id)), [allProcedures, resolvedCompany?.id]);

  const handleActivateIndustry = React.useCallback((tmpl: IndustryChecklistTemplate, mode: "edit" | "push") => {
    if (!resolvedCompany) return;
    // Determine which resolver to use based on template id prefix
    const isRA = tmpl.id.startsWith("ra_");
    const newTemplate = activateIndustryTemplate(tmpl, resolvedCompany.id, companyCountry, t);
    if (mode === "push") { newTemplate.publish_status = "published"; newTemplate.is_active = true; }
    // Tag it so we know it's a risk assessment template
    if (isRA) { newTemplate.category = "risk_assessment"; }
    addTemplate(newTemplate);
    if (mode === "push") toast(`"${newTemplate.name}" pushed to field app`, "success");
    else { toast("Template saved as draft", "success"); router.push(`/${company}/dashboard/checklists/${newTemplate.id}`); }
  }, [resolvedCompany, companyCountry, t, addTemplate, toast, router, company]);

  const handleClone = React.useCallback((template: ChecklistTemplate) => {
    const cloned = cloneChecklistTemplate(template);
    addTemplate(cloned);
    toast("Template cloned as draft", "success");
    router.push(`/${company}/dashboard/checklists/${cloned.id}`);
  }, [addTemplate, toast, router, company]);

  const handleCloneProcedure = React.useCallback((procedure: ProcedureTemplate) => {
    const now = new Date().toISOString();
    const cloned: ProcedureTemplate = {
      ...procedure,
      id: crypto.randomUUID(),
      company_id: resolvedCompany?.id || "",
      name: `${procedure.name} (Copy)`,
      is_builtin: false,
      is_active: false,
      steps: procedure.steps.map((s) => ({ ...s, id: crypto.randomUUID() })),
      created_at: now,
      updated_at: now,
    };
    stores.procedureTemplates.add(cloned);
    toast("Procedure cloned — opening editor", "success");
    router.push(`/${company}/dashboard/checklists/new-procedure?edit=${cloned.id}`);
  }, [resolvedCompany?.id, stores.procedureTemplates, toast, router, company]);

  const handleImport = React.useCallback((valid: ParsedTemplateImport[]) => {
    const now = new Date().toISOString();
    valid.forEach((ti) => {
      addTemplate({
        id: crypto.randomUUID(), company_id: resolvedCompany?.id || "", name: ti.name, description: ti.description || null,
        category: ti.category, items: ti.items.map((item, idx) => ({ id: crypto.randomUUID(), question: item.question, type: item.type, required: item.required, order: idx + 1 })),
        is_active: true, publish_status: "draft", created_at: now, updated_at: now,
      });
    });
    toast(`${valid.length} template${valid.length !== 1 ? "s" : ""} imported as drafts`, "success");
  }, [addTemplate, resolvedCompany?.id, toast]);

  const mainTabs: { id: MainTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "checklists", label: "Checklists", icon: ClipboardCheck },
    { id: "assessments", label: "Risk Assessments", icon: ShieldAlert },
    { id: "procedures", label: "Procedures", icon: Layers },
  ];

  const subTabs: { id: SubTab; label: string }[] = [
    { id: "all", label: "All Templates" },
    { id: "active", label: "Active for Field App" },
    { id: "drafts", label: "Drafts" },
  ];

  const currentCount = mainTab === "checklists" ? checklistIndustryTpls.length : mainTab === "assessments" ? assessmentIndustryTpls.length : allProcedures.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Template Library</h1>
        <div className="flex gap-2">
          {mainTab === "checklists" && (
            <Link href={`/${company}/dashboard/checklists/new`}>
              <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /><ClipboardCheck className="h-3.5 w-3.5" />New Checklist</Button>
            </Link>
          )}
          {mainTab === "assessments" && (
            <Link href={`/${company}/dashboard/checklists/new-assessment`}>
              <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /><ShieldAlert className="h-3.5 w-3.5" />New Assessment</Button>
            </Link>
          )}
          {mainTab === "procedures" && (
            <Link href={`/${company}/dashboard/checklists/new-procedure`}>
              <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /><Layers className="h-3.5 w-3.5" />New Procedure</Button>
            </Link>
          )}
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowImport(true)}><Upload className="h-4 w-4" />Import</Button>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="border-b">
        <div className="flex gap-6">
          {mainTabs.map((tab) => (
            <button key={tab.id} onClick={() => setMainTab(tab.id)} className={cn("flex items-center gap-2 pb-3 text-sm font-medium transition-colors relative", mainTab === tab.id ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
              <tab.icon className="h-4 w-4" />{tab.label}
              {mainTab === tab.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />}
            </button>
          ))}
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-2">
        {subTabs.map((tab) => (
          <Button key={tab.id} variant={subTab === tab.id ? "default" : "outline"} size="sm" onClick={() => { setSubTab(tab.id); setSearchQuery(""); setExpandedId(null); }}>
            {tab.label}
          </Button>
        ))}
      </div>

      {/* ═══════════ ALL TEMPLATES (shared across Checklists & Assessments) ═══════════ */}
      {subTab === "all" && (mainTab === "checklists" || mainTab === "assessments") && (
        <div className="space-y-6">
          {/* Filter bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div ref={dropdownRef} className="relative">
              <Button variant="outline" className="w-full justify-between gap-2 sm:w-[220px]" onClick={() => setShowIndustryDropdown((p) => !p)}>
                <span className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{selectedIndustry === "all" ? "All Industries" : t(INDUSTRY_METADATA[selectedIndustry].label_key)}</span>
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
              {showIndustryDropdown && (
                <div className="absolute left-0 z-20 mt-1 w-full min-w-[240px] rounded-md border bg-popover p-1 shadow-md">
                  <button className={cn("flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent", selectedIndustry === "all" && "bg-accent font-medium")} onClick={() => { setSelectedIndustry("all"); setShowIndustryDropdown(false); }}>All Industries</button>
                  {industryOptions.map((code) => {
                    const Icon = INDUSTRY_ICONS[code];
                    return (
                      <button key={code} className={cn("flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent", selectedIndustry === code && "bg-accent font-medium")} onClick={() => { setSelectedIndustry(code); setShowIndustryDropdown(false); }}>
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
              <Input placeholder="Search templates..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{currentCount} templates available</p>

          {mainTab === "checklists" && (
            <IndustryTemplateGrid
              templates={checklistIndustryTpls} companyIndustry={companyIndustry} companyCountry={companyCountry}
              companySlug={company} existingTemplates={templates} expandedId={expandedId} setExpandedId={setExpandedId}
              onActivate={handleActivateIndustry} onClone={handleClone} t={t} resolveReg={resolveTemplateRegulation}
            />
          )}
          {mainTab === "assessments" && (
            <IndustryTemplateGrid
              templates={assessmentIndustryTpls} companyIndustry={companyIndustry} companyCountry={companyCountry}
              companySlug={company} existingTemplates={templates} expandedId={expandedId} setExpandedId={setExpandedId}
              onActivate={handleActivateIndustry} onClone={handleClone} t={t} resolveReg={resolveRARegulation}
            />
          )}
        </div>
      )}

      {/* ═══════════ ALL TEMPLATES: PROCEDURES ═══════════ */}
      {subTab === "all" && mainTab === "procedures" && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search procedures..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <p className="text-sm text-muted-foreground">{allProcedures.length} procedures available</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {allProcedures.filter((p) => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())).map((p) => (
              <ProcedureCard
                key={p.id} procedure={p}
                expanded={expandedId === p.id}
                onToggleExpand={() => setExpandedId(expandedId === p.id ? null : p.id)}
                isActive={p.is_active}
                onToggleActive={() => updateProcedure(p.id, { is_active: !p.is_active })}
                onClone={() => handleCloneProcedure(p)}
                onPush={!p.is_active ? () => updateProcedure(p.id, { is_active: true }) : undefined}
                mode="library"
              />
            ))}
          </div>
          {allProcedures.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Layers className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">No procedure templates available. Procedures combine risk assessments and checklists into multi-step workflows.</p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ ACTIVE FOR FIELD APP ═══════════ */}
      {subTab === "active" && mainTab === "checklists" && (
        <div className="space-y-4">
          {fieldAppChecklists.filter((t) => t.category !== "risk_assessment").length === 0 ? (
            <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground py-6 text-center">No checklists pushed to the field app yet. Browse &ldquo;All Templates&rdquo; and push templates to activate.</p></CardContent></Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {fieldAppChecklists.filter((t) => t.category !== "risk_assessment").map((tpl) => (
                <ActiveTemplateCard
                  key={tpl.id} template={tpl}
                  expanded={expandedId === tpl.id}
                  onToggleExpand={() => setExpandedId(expandedId === tpl.id ? null : tpl.id)}
                  isDisabled={!tpl.is_active}
                  onToggleDisable={() => toggleFieldAppActive(tpl)}
                  onRemove={() => setDeleteModal({ title: "Remove Template", message: "This will permanently remove the template from the field app.", onConfirm: () => removeTemplate(tpl.id) })}
                  companySlug={company}
                />
              ))}
            </div>
          )}
          {WORK_ORDER_PROCEDURE_TEMPLATES.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-medium text-muted-foreground">Work Order Procedures (auto-assigned)</p>
              {WORK_ORDER_PROCEDURE_TEMPLATES.map((tpl) => (
                <div key={tpl.id} className="flex items-center justify-between py-2 px-3 rounded-lg border">
                  <div><p className="text-sm font-medium">{tpl.name}</p><p className="text-xs text-muted-foreground">{tpl.items.length} steps</p></div>
                  <Badge variant="success" className="text-[10px]">Auto</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {subTab === "active" && mainTab === "assessments" && (
        <div className="space-y-4">
          {fieldAppChecklists.filter((t) => t.category === "risk_assessment").length === 0 ? (
            <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground py-6 text-center">No risk assessments pushed to the field app yet. Browse &ldquo;All Templates&rdquo; and push templates to activate.</p></CardContent></Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {fieldAppChecklists.filter((t) => t.category === "risk_assessment").map((tpl) => (
                <ActiveTemplateCard
                  key={tpl.id} template={tpl}
                  expanded={expandedId === tpl.id}
                  onToggleExpand={() => setExpandedId(expandedId === tpl.id ? null : tpl.id)}
                  isDisabled={!tpl.is_active}
                  onToggleDisable={() => toggleFieldAppActive(tpl)}
                  onRemove={() => setDeleteModal({ title: "Remove Template", message: "This will permanently remove the template from the field app.", onConfirm: () => removeTemplate(tpl.id) })}
                  companySlug={company}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {subTab === "active" && mainTab === "procedures" && (
        <div className="space-y-4">
          {fieldAppProcedures.length === 0 ? (
            <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground py-6 text-center">No procedures pushed to the field app yet.</p></CardContent></Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {fieldAppProcedures.map((p) => (
                <ProcedureCard
                  key={p.id} procedure={p}
                  expanded={expandedId === p.id}
                  onToggleExpand={() => setExpandedId(expandedId === p.id ? null : p.id)}
                  isActive={p.is_active}
                  onToggleActive={() => updateProcedure(p.id, { is_active: !p.is_active })}
                  onDisable={() => updateProcedure(p.id, { is_active: !p.is_active })}
                  onRemove={() => setDeleteModal({ title: "Remove Procedure", message: "This will permanently remove the procedure from the field app.", onConfirm: () => stores.procedureTemplates.remove(p.id) })}
                  mode="active"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ DRAFTS ═══════════ */}
      {subTab === "drafts" && mainTab === "checklists" && (
        <Card>
          <CardContent className="pt-6 space-y-2">
            {draftChecklists.filter((t) => t.category !== "risk_assessment").length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No draft checklist templates.</p>
            ) : draftChecklists.filter((t) => t.category !== "risk_assessment").map((tpl) => (
              <div key={tpl.id} className="flex items-center justify-between py-2 px-1">
                <Link href={`/${company}/dashboard/checklists/${tpl.id}`} className="hover:underline flex-1">
                  <p className="text-sm font-medium">{tpl.name}</p><p className="text-xs text-muted-foreground">{tpl.items.length} items</p>
                </Link>
                <div className="flex items-center gap-2">
                  <Badge variant="warning" className="text-[10px]">Draft</Badge>
                  <Button size="sm" variant="outline" onClick={() => togglePublish(tpl)}>Activate</Button>
                  <button onClick={() => setDeleteModal({ title: "Delete Draft", message: "This draft template will be permanently deleted.", onConfirm: () => removeTemplate(tpl.id) })} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {subTab === "drafts" && mainTab === "assessments" && (
        <Card>
          <CardContent className="pt-6 space-y-2">
            {draftChecklists.filter((t) => t.category === "risk_assessment").length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No draft risk assessment templates.</p>
            ) : draftChecklists.filter((t) => t.category === "risk_assessment").map((tpl) => (
              <div key={tpl.id} className="flex items-center justify-between py-2 px-1">
                <Link href={`/${company}/dashboard/checklists/${tpl.id}`} className="hover:underline flex-1">
                  <p className="text-sm font-medium">{tpl.name}</p><p className="text-xs text-muted-foreground">{tpl.items.length} items</p>
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

      {subTab === "drafts" && mainTab === "procedures" && (
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground py-6 text-center">No draft procedures.</p></CardContent></Card>
      )}

      {showImport && <ImportModal onClose={() => setShowImport(false)} onImport={handleImport} />}
      {deleteModal && <DeleteModal title={deleteModal.title} message={deleteModal.message} onConfirm={deleteModal.onConfirm} onClose={() => setDeleteModal(null)} />}
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
