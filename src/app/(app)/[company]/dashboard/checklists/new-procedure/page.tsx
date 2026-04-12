"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCompanyParam } from "@/hooks/use-company-param";
import {
  Layers, Plus, Trash2, GripVertical, ShieldAlert, ClipboardCheck,
  ChevronDown, ArrowUp, ArrowDown, Search, Save, Send,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCompanyData } from "@/hooks/use-company-data";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyStore } from "@/stores/company-store";
import { useToast } from "@/components/ui/toast";
import { useTranslation } from "@/i18n";
import { RoleGuard } from "@/components/auth/role-guard";
import { getTemplatePublishStatus } from "@/lib/template-activation";
import { getBuiltInProcedureTemplates } from "@/data/procedure-templates";
import type { ProcedureStep, ProcedureRecurrence, ProcedureTemplate } from "@/types";

const RECURRENCE_OPTIONS: { value: ProcedureRecurrence; label: string }[] = [
  { value: "per_event", label: "Per event (triggered manually)" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annually" },
];

interface DraftStep {
  id: string;
  type: "checklist" | "risk_assessment";
  template_id: string;
  template_name: string;
  required: boolean;
}

function ProcedureEditorContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const company = useCompanyParam();
  const { toast } = useToast();
  const { user } = useAuth();
  const { items: companies } = useCompanyStore();
  const { checklistTemplates, procedureTemplates, stores } = useCompanyData();
  const { add: addProcedure, update: updateProcedure } = stores.procedureTemplates;

  const companyId =
    (companies.find((c) => c.slug === company) || companies[0])?.id ||
    user?.company_id ||
    "";

  // Edit mode: load existing procedure
  const editId = searchParams.get("edit");
  const builtInProcs = getBuiltInProcedureTemplates();
  const existingProcedure = editId
    ? procedureTemplates.find((p) => p.id === editId) || builtInProcs.find((p) => p.id === editId)
    : null;
  const isEditing = !!existingProcedure;

  const [name, setName] = React.useState(existingProcedure?.name || "");
  const [description, setDescription] = React.useState(existingProcedure?.description || "");
  const [recurrence, setRecurrence] = React.useState<ProcedureRecurrence>(existingProcedure?.recurrence || "per_event");
  const [industry, setIndustry] = React.useState(existingProcedure?.industry || "");
  const [steps, setSteps] = React.useState<DraftStep[]>(
    existingProcedure?.steps.map((s) => ({
      id: s.id,
      type: s.type,
      template_id: s.template_id,
      template_name: s.template_name,
      required: s.required,
    })) || [],
  );
  const [showStepPicker, setShowStepPicker] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // All templates for step picker (published + drafts)
  const allTemplates = React.useMemo(() => checklistTemplates, [checklistTemplates]);
  const checklistOptions = React.useMemo(
    () => allTemplates.filter((t) => t.category !== "risk_assessment"),
    [allTemplates],
  );
  const assessmentOptions = React.useMemo(
    () => allTemplates.filter((t) => t.category === "risk_assessment"),
    [allTemplates],
  );

  const addStep = (templateId: string, templateName: string, type: "checklist" | "risk_assessment") => {
    setSteps((prev) => [...prev, { id: crypto.randomUUID(), type, template_id: templateId, template_name: templateName, required: true }]);
    setShowStepPicker(false);
  };

  const removeStep = (id: string) => setSteps((prev) => prev.filter((s) => s.id !== id));

  const moveStep = (idx: number, dir: -1 | 1) => {
    setSteps((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const toggleRequired = (id: string) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, required: !s.required } : s)));
  };

  const buildProcedure = (activate: boolean): ProcedureTemplate => {
    const now = new Date().toISOString();
    const procedureSteps: ProcedureStep[] = steps.map((s, idx) => ({
      id: s.id, order: idx + 1, type: s.type, template_id: s.template_id, template_name: s.template_name, required: s.required,
    }));
    return {
      id: isEditing ? existingProcedure!.id : crypto.randomUUID(),
      company_id: companyId,
      name: name.trim(),
      description: description.trim() || null,
      industry: industry.trim() || null,
      steps: procedureSteps,
      recurrence,
      is_builtin: false,
      is_active: activate,
      created_at: isEditing ? existingProcedure!.created_at : now,
      updated_at: now,
    };
  };

  const handleSave = (activate: boolean) => {
    if (!name.trim() || steps.length === 0) return;
    setIsSubmitting(true);
    const proc = buildProcedure(activate);

    if (isEditing) {
      updateProcedure(proc.id, proc);
      toast(activate ? "Procedure updated and activated" : "Procedure updated", "success");
    } else {
      addProcedure(proc);
      toast(activate ? "Procedure created and pushed to field app" : "Procedure saved as draft", "success");
    }
    router.push(`/${company}/dashboard/checklists/my-templates`);
    setIsSubmitting(false);
  };

  const isValid = name.trim().length > 0 && steps.length > 0;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{isEditing ? "Edit Procedure" : "Create Procedure"}</h1>
          <p className="text-sm text-muted-foreground">
            {isEditing
              ? "Update this procedure's details, steps, and recurrence schedule."
              : "Build a multi-step procedure by combining risk assessments and checklists."}
          </p>
        </div>
        <Link href={`/${company}/dashboard/checklists/my-templates`}>
          <Button variant="outline">Back to Templates</Button>
        </Link>
      </div>

      {/* Details */}
      <Card>
        <CardHeader><CardTitle>Procedure Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="proc-name">Procedure Name</Label>
            <Input id="proc-name" placeholder="e.g. Confined Space Entry Procedure" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="proc-desc">Description (optional)</Label>
            <Textarea id="proc-desc" placeholder="Describe what this procedure covers and when it should be performed..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="proc-recurrence">Recurrence / Trigger</Label>
              <div className="relative">
                <select id="proc-recurrence" value={recurrence} onChange={(e) => setRecurrence(e.target.value as ProcedureRecurrence)} className="w-full rounded-md border bg-background px-3 py-2 text-sm appearance-none pr-8">
                  {RECURRENCE_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="proc-industry">Industry (optional)</Label>
              <Input id="proc-industry" placeholder="e.g. construction, oil_gas" value={industry} onChange={(e) => setIndustry(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Steps */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Procedure Steps ({steps.length})</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Add risk assessments and checklists in the order they should be completed.</p>
            </div>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowStepPicker(true)}>
              <Plus className="h-4 w-4" />Add Step
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {steps.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed rounded-lg">
              <Layers className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="mt-3 text-sm text-muted-foreground">No steps yet.</p>
              <p className="text-xs text-muted-foreground mt-1">A procedure needs at least one risk assessment or checklist step.</p>
              <Button size="sm" className="mt-4 gap-2" onClick={() => setShowStepPicker(true)}>
                <Plus className="h-4 w-4" />Add First Step
              </Button>
            </div>
          ) : (
            <>
              {steps.map((step, idx) => (
                <div key={step.id} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/30 transition-colors">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab" />
                  <span className={cn(
                    "shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold",
                    step.type === "risk_assessment" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                  )}>{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{step.template_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className={cn("text-xs", step.type === "risk_assessment" ? "text-orange-600 border-orange-300 dark:text-orange-400 dark:border-orange-700" : "text-blue-600 border-blue-300 dark:text-blue-400 dark:border-blue-700")}>
                        {step.type === "risk_assessment" ? "Risk Assessment" : "Checklist"}
                      </Badge>
                      <button onClick={() => toggleRequired(step.id)} className={cn("text-xs px-1.5 py-0.5 rounded transition-colors", step.required ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground")}>
                        {step.required ? "Required" : "Optional"}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => moveStep(idx, -1)} disabled={idx === 0} className="p-1.5 rounded hover:bg-muted disabled:opacity-30 transition-colors" aria-label="Move up">
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => moveStep(idx, 1)} disabled={idx === steps.length - 1} className="p-1.5 rounded hover:bg-muted disabled:opacity-30 transition-colors" aria-label="Move down">
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => removeStep(step.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors" aria-label="Remove step">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              <Button size="sm" variant="ghost" className="gap-2 w-full border-2 border-dashed text-muted-foreground hover:text-foreground" onClick={() => setShowStepPicker(true)}>
                <Plus className="h-4 w-4" />Add Another Step
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      {steps.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-orange-500" />
                <span>{steps.filter((s) => s.type === "risk_assessment").length} Risk Assessment{steps.filter((s) => s.type === "risk_assessment").length !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ClipboardCheck className="h-4 w-4 text-blue-500" />
                <span>{steps.filter((s) => s.type === "checklist").length} Checklist{steps.filter((s) => s.type === "checklist").length !== 1 ? "s" : ""}</span>
              </div>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{RECURRENCE_OPTIONS.find((o) => o.value === recurrence)?.label}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Link href={`/${company}/dashboard/checklists/my-templates`}>
          <Button variant="outline">{t("common.cancel")}</Button>
        </Link>
        <Button variant="outline" className="gap-2" onClick={() => handleSave(false)} disabled={!isValid || isSubmitting}>
          <Save className="h-4 w-4" />{isEditing ? "Save Changes" : "Save as Draft"}
        </Button>
        <Button className="gap-2 bg-green-600 hover:bg-green-700 text-white" onClick={() => handleSave(true)} disabled={!isValid || isSubmitting}>
          <Send className="h-4 w-4" />{isEditing ? "Save & Activate" : "Save & Push to Field App"}
        </Button>
      </div>

      {/* Step Picker Modal */}
      {showStepPicker && (
        <StepPickerModal
          checklistOptions={checklistOptions}
          assessmentOptions={assessmentOptions}
          onSelect={addStep}
          onClose={() => setShowStepPicker(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step Picker Modal — searchable, grouped by type
// ---------------------------------------------------------------------------
function StepPickerModal({
  checklistOptions, assessmentOptions, onSelect, onClose,
}: {
  checklistOptions: { id: string; name: string; items: unknown[]; category?: string }[];
  assessmentOptions: { id: string; name: string; items: unknown[]; category?: string }[];
  onSelect: (id: string, name: string, type: "checklist" | "risk_assessment") => void;
  onClose: () => void;
}) {
  const [search, setSearch] = React.useState("");
  const q = search.toLowerCase();

  const filteredRA = assessmentOptions.filter((t) => !q || t.name.toLowerCase().includes(q));
  const filteredCL = checklistOptions.filter((t) => !q || t.name.toLowerCase().includes(q));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="relative w-full max-w-lg mx-4 max-h-[75vh] flex flex-col rounded-lg bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 pb-3 space-y-3">
          <h2 className="text-lg font-semibold">Add Step to Procedure</h2>
          <p className="text-sm text-muted-foreground">Select a risk assessment or checklist to add as the next step.</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search templates..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" autoFocus />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
          {filteredRA.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                <ShieldAlert className="h-3.5 w-3.5 text-orange-500" />Risk Assessments ({filteredRA.length})
              </p>
              <div className="space-y-1">
                {filteredRA.map((tpl) => (
                  <button key={tpl.id} onClick={() => onSelect(tpl.id, tpl.name, "risk_assessment")} className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-muted text-left transition-colors">
                    <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-orange-100 dark:bg-orange-900/30"><ShieldAlert className="h-3.5 w-3.5 text-orange-500" /></span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{tpl.name}</p>
                      <p className="text-xs text-muted-foreground">{(tpl.items as unknown[]).length} items</p>
                    </div>
                    <Badge variant="outline" className="text-xs text-orange-600 border-orange-300 dark:text-orange-400 shrink-0">RA</Badge>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredCL.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                <ClipboardCheck className="h-3.5 w-3.5 text-blue-500" />Checklists ({filteredCL.length})
              </p>
              <div className="space-y-1">
                {filteredCL.map((tpl) => (
                  <button key={tpl.id} onClick={() => onSelect(tpl.id, tpl.name, "checklist")} className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-muted text-left transition-colors">
                    <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/30"><ClipboardCheck className="h-3.5 w-3.5 text-blue-500" /></span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{tpl.name}</p>
                      <p className="text-xs text-muted-foreground">{(tpl.items as unknown[]).length} items</p>
                    </div>
                    <Badge variant="outline" className="text-xs text-blue-600 border-blue-300 dark:text-blue-400 shrink-0">CL</Badge>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredRA.length === 0 && filteredCL.length === 0 && (
            <div className="text-center py-10">
              {search ? (
                <p className="text-sm text-muted-foreground">No templates match &ldquo;{search}&rdquo;</p>
              ) : (
                <>
                  <Layers className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                  <p className="mt-2 text-sm text-muted-foreground">No templates available yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Create checklist or risk assessment templates first, then add them as procedure steps.</p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="border-t p-4 flex justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}

export default function NewProcedurePage() {
  return (
    <RoleGuard requiredPermission="checklists.create_templates">
      <React.Suspense fallback={<div className="flex min-h-[400px] items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
        <ProcedureEditorContent />
      </React.Suspense>
    </RoleGuard>
  );
}
