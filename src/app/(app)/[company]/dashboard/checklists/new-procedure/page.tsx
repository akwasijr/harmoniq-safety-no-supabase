"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCompanyParam } from "@/hooks/use-company-param";
import {
  Layers, Plus, Trash2, GripVertical, ShieldAlert, ClipboardCheck,
  ChevronDown, ArrowUp, ArrowDown, Search, Save, Send, ArrowRight, ArrowLeft, Check,
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

  const companyId = (companies.find((c) => c.slug === company) || companies[0])?.id || user?.company_id || "";

  const editId = searchParams.get("edit");
  const builtInProcs = getBuiltInProcedureTemplates();
  const existingProcedure = editId ? procedureTemplates.find((p) => p.id === editId) || builtInProcs.find((p) => p.id === editId) : null;
  const isEditing = !!existingProcedure;

  const [step, setStep] = React.useState<1 | 2>(isEditing ? 2 : 1);
  const [name, setName] = React.useState(existingProcedure?.name || "");
  const [description, setDescription] = React.useState(existingProcedure?.description || "");
  const [recurrence, setRecurrence] = React.useState<ProcedureRecurrence>(existingProcedure?.recurrence || "per_event");
  const [industry, setIndustry] = React.useState(existingProcedure?.industry || "");
  const [steps, setSteps] = React.useState<DraftStep[]>(
    existingProcedure?.steps.map((s) => ({ id: s.id, type: s.type, template_id: s.template_id, template_name: s.template_name, required: s.required })) || [],
  );
  const [showStepPicker, setShowStepPicker] = React.useState(false);
  const [stepPickerTab, setStepPickerTab] = React.useState<"risk_assessment" | "checklist">("risk_assessment");
  const [stepPickerSearch, setStepPickerSearch] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const checklistOptions = React.useMemo(() => checklistTemplates.filter((t) => t.category !== "risk_assessment"), [checklistTemplates]);
  const assessmentOptions = React.useMemo(() => checklistTemplates.filter((t) => t.category === "risk_assessment"), [checklistTemplates]);

  const addStep = (templateId: string, templateName: string, type: "checklist" | "risk_assessment") => {
    setSteps((prev) => [...prev, { id: crypto.randomUUID(), type, template_id: templateId, template_name: templateName, required: true }]);
    setShowStepPicker(false);
    setStepPickerSearch("");
  };

  const removeStep = (id: string) => setSteps((prev) => prev.filter((s) => s.id !== id));
  const moveStep = (idx: number, dir: -1 | 1) => {
    setSteps((prev) => { const next = [...prev]; const target = idx + dir; if (target < 0 || target >= next.length) return prev; [next[idx], next[target]] = [next[target], next[idx]]; return next; });
  };
  const toggleRequired = (id: string) => setSteps((prev) => prev.map((s) => s.id === id ? { ...s, required: !s.required } : s));

  const goToStep2 = () => {
    if (!name.trim()) { toast("Please enter a procedure name"); return; }
    setStep(2);
  };

  const handleSave = (activate: boolean) => {
    if (!name.trim() || steps.length === 0) { toast("Name and at least one step required"); return; }
    setIsSubmitting(true);
    const now = new Date().toISOString();
    const procSteps: ProcedureStep[] = steps.map((s, idx) => ({ id: s.id, order: idx + 1, type: s.type, template_id: s.template_id, template_name: s.template_name, required: s.required }));
    const proc: ProcedureTemplate = {
      id: isEditing ? existingProcedure!.id : crypto.randomUUID(),
      company_id: companyId, name: name.trim(), description: description.trim() || null,
      industry: industry.trim() || null, steps: procSteps, recurrence,
      is_builtin: false, is_active: activate,
      created_at: isEditing ? existingProcedure!.created_at : now, updated_at: now,
    };
    if (isEditing) { updateProcedure(proc.id, proc); toast(activate ? "Procedure updated and activated" : "Procedure updated", "success"); }
    else { addProcedure(proc); toast(activate ? "Procedure created and pushed to field app" : "Procedure saved as draft", "success"); }
    router.push(`/${company}/dashboard/checklists/my-templates`);
    setIsSubmitting(false);
  };

  const step1Valid = name.trim().length > 0;
  const q = stepPickerSearch.toLowerCase();
  const filteredRA = assessmentOptions.filter((t) => !q || t.name.toLowerCase().includes(q));
  const filteredCL = checklistOptions.filter((t) => !q || t.name.toLowerCase().includes(q));

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{isEditing ? "Edit Procedure" : "Create Procedure"}</h1>
          <p className="text-sm text-muted-foreground">Build a multi-step procedure by combining risk assessments and checklists.</p>
        </div>
        <Link href={`/${company}/dashboard/checklists/my-templates`}><Button variant="outline">Back to Templates</Button></Link>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-3">
        <button onClick={() => setStep(1)} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors", step === 1 ? "bg-primary text-primary-foreground" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400")}>
          {step > 1 ? <Check className="h-4 w-4" /> : <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-bold">1</span>}
          Procedure Details
        </button>
        <div className="h-px w-8 bg-border" />
        <div className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors", step === 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
          <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-bold">2</span>
          Procedure Steps ({steps.length})
        </div>
      </div>

      {/* ═══════════ STEP 1 ═══════════ */}
      {step === 1 && (
        <>
          <Card>
            <CardHeader><CardTitle>Procedure Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="proc-name">Procedure Name *</Label>
                <Input id="proc-name" placeholder="e.g. Confined Space Entry Procedure" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proc-desc">Description</Label>
                <Textarea id="proc-desc" placeholder="Describe what this procedure covers and when it should be performed..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="proc-recurrence">Recurrence / Trigger</Label>
                  <div className="relative">
                    <select id="proc-recurrence" value={recurrence} onChange={(e) => setRecurrence(e.target.value as ProcedureRecurrence)} className="w-full rounded-md border bg-background px-3 py-2 text-sm appearance-none pr-8">
                      {RECURRENCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proc-industry">Industry (optional)</Label>
                  <Input id="proc-industry" placeholder="e.g. construction, oil & gas" value={industry} onChange={(e) => setIndustry(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <Button className="gap-2" onClick={goToStep2} disabled={!step1Valid}>
              Next: Add Steps <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      {/* ═══════════ STEP 2 ═══════════ */}
      {step === 2 && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Procedure Steps ({steps.length})</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">Add risk assessments and checklists in the order they should be completed.</p>
                </div>
                <Button size="sm" variant="outline" className="gap-2" onClick={() => { setShowStepPicker(true); setStepPickerSearch(""); }}>
                  <Plus className="h-4 w-4" />Add Step
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {steps.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed rounded-lg">
                  <Layers className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                  <p className="mt-3 text-sm text-muted-foreground">No steps yet. A procedure needs at least one step.</p>
                  <Button size="sm" className="mt-4 gap-2" onClick={() => { setShowStepPicker(true); setStepPickerSearch(""); }}>
                    <Plus className="h-4 w-4" />Add First Step
                  </Button>
                </div>
              ) : (
                <>
                  {steps.map((s, idx) => (
                    <div key={s.id} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/30 transition-colors">
                      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className={cn("shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold", s.type === "risk_assessment" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400")}>{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.template_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className={cn("text-xs", s.type === "risk_assessment" ? "text-orange-600 border-orange-300 dark:text-orange-400" : "text-blue-600 border-blue-300 dark:text-blue-400")}>
                            {s.type === "risk_assessment" ? "Risk Assessment" : "Checklist"}
                          </Badge>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">{s.required ? "Required" : "Optional"}</span>
                            <button type="button" onClick={() => toggleRequired(s.id)} className={cn("relative inline-flex h-5 w-9 items-center rounded-full transition-colors", s.required ? "bg-primary" : "bg-muted")}>
                              <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform" style={{ transform: s.required ? "translateX(18px)" : "translateX(2px)" }} />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => moveStep(idx, -1)} disabled={idx === 0} className="p-1.5 rounded hover:bg-muted disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                        <button onClick={() => moveStep(idx, 1)} disabled={idx === steps.length - 1} className="p-1.5 rounded hover:bg-muted disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                        <button onClick={() => removeStep(s.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  ))}
                  <Button variant="ghost" className="w-full gap-2 border-2 border-dashed text-muted-foreground hover:text-foreground" onClick={() => { setShowStepPicker(true); setStepPickerSearch(""); }}>
                    <Plus className="h-4 w-4" />Add Another Step
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {steps.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5"><ShieldAlert className="h-4 w-4 text-orange-500" /><span>{steps.filter((s) => s.type === "risk_assessment").length} Risk Assessment{steps.filter((s) => s.type === "risk_assessment").length !== 1 ? "s" : ""}</span></div>
                  <div className="flex items-center gap-1.5"><ClipboardCheck className="h-4 w-4 text-blue-500" /><span>{steps.filter((s) => s.type === "checklist").length} Checklist{steps.filter((s) => s.type === "checklist").length !== 1 ? "s" : ""}</span></div>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{RECURRENCE_OPTIONS.find((o) => o.value === recurrence)?.label}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4" />Back to Details</Button>
            <div className="flex-1" />
            <Button variant="outline" className="gap-2" onClick={() => handleSave(false)} disabled={!steps.length || isSubmitting}>
              <Save className="h-4 w-4" />{isEditing ? "Save Changes" : "Save as Draft"}
            </Button>
            <Button className="gap-2 bg-green-600 hover:bg-green-700 text-white" onClick={() => handleSave(true)} disabled={!steps.length || isSubmitting}>
              <Send className="h-4 w-4" />{isEditing ? "Save & Activate" : "Save & Push to Field App"}
            </Button>
          </div>
        </>
      )}

      {/* Step Picker Modal — tabbed RA / Checklist with clear separation */}
      {showStepPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowStepPicker(false)}>
          <div className="relative w-full max-w-xl mx-4 max-h-[80vh] flex flex-col rounded-xl bg-background border shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 pb-0 space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Add Step to Procedure</h2>
                <p className="text-sm text-muted-foreground mt-1">Choose which type of step to add, then select a template.</p>
              </div>

              {/* Type tabs — clear visual distinction */}
              <div className="flex gap-2">
                <button
                  onClick={() => { setStepPickerTab("risk_assessment"); setStepPickerSearch(""); }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium transition-all border-2",
                    stepPickerTab === "risk_assessment"
                      ? "bg-orange-50 border-orange-300 text-orange-700 dark:bg-orange-950/40 dark:border-orange-700 dark:text-orange-400"
                      : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted",
                  )}
                >
                  <ShieldAlert className="h-4 w-4" />
                  Risk Assessments
                  <Badge variant="secondary" className="text-xs">{assessmentOptions.length}</Badge>
                </button>
                <button
                  onClick={() => { setStepPickerTab("checklist"); setStepPickerSearch(""); }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium transition-all border-2",
                    stepPickerTab === "checklist"
                      ? "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/40 dark:border-blue-700 dark:text-blue-400"
                      : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted",
                  )}
                >
                  <ClipboardCheck className="h-4 w-4" />
                  Checklists
                  <Badge variant="secondary" className="text-xs">{checklistOptions.length}</Badge>
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={stepPickerTab === "risk_assessment" ? "Search risk assessments..." : "Search checklists..."}
                  value={stepPickerSearch}
                  onChange={(e) => setStepPickerSearch(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
            </div>

            {/* Template list */}
            <div className="flex-1 overflow-y-auto p-6 pt-3">
              {stepPickerTab === "risk_assessment" && (
                <div className="space-y-1">
                  {filteredRA.length === 0 ? (
                    <div className="text-center py-10">
                      <ShieldAlert className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        {stepPickerSearch ? `No risk assessments match "${stepPickerSearch}"` : "No risk assessment templates available. Create one from the Template Library first."}
                      </p>
                    </div>
                  ) : filteredRA.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => addStep(tpl.id, tpl.name, "risk_assessment")}
                      className="w-full flex items-center gap-3 rounded-lg px-4 py-3 text-sm hover:bg-orange-50 dark:hover:bg-orange-950/20 text-left transition-colors border border-transparent hover:border-orange-200 dark:hover:border-orange-800"
                    >
                      <span className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-orange-100 dark:bg-orange-900/30">
                        <ShieldAlert className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{tpl.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{tpl.items.length} items {tpl.regulation ? `· ${tpl.regulation}` : ""}</p>
                      </div>
                      <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {stepPickerTab === "checklist" && (
                <div className="space-y-1">
                  {filteredCL.length === 0 ? (
                    <div className="text-center py-10">
                      <ClipboardCheck className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        {stepPickerSearch ? `No checklists match "${stepPickerSearch}"` : "No checklist templates available. Create one from the Template Library first."}
                      </p>
                    </div>
                  ) : filteredCL.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => addStep(tpl.id, tpl.name, "checklist")}
                      className="w-full flex items-center gap-3 rounded-lg px-4 py-3 text-sm hover:bg-blue-50 dark:hover:bg-blue-950/20 text-left transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                    >
                      <span className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/30">
                        <ClipboardCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{tpl.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{tpl.items.length} items</p>
                      </div>
                      <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t p-4 flex justify-end">
              <Button variant="outline" onClick={() => setShowStepPicker(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
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
